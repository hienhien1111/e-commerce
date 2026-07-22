import {
  ForbiddenException,
  Inject,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import type { PaymentRepositoryPort } from '@/application/payment/ports/payment.repository.port';
import { PAYMENT_REPOSITORY_PORT } from '@/application/payment/ports/payment.repository.port.token';
import type { PaymentGatewayPort } from '@/application/payment/ports/payment.gateway.port';
import { PAYMENT_GATEWAY_PORT } from '@/application/payment/ports/payment.gateway.port.token';
import type { OrderRepositoryPort } from '@/application/order/ports/order.repository.port';
import { ORDER_REPOSITORY_PORT } from '@/application/order/ports/order.repository.port.token';
import type { AllConfigType } from '@/config/config.type';
import { Payment } from '@/domain/entities/payment';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';
import { PaymentMethodEnum } from '@/domain/enums/payment-method.enum';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { PaymentInitiatedEvent } from '@/domain/events/payment-initiated.event';
import { PaymentFailedEvent } from '@/domain/events/payment-failed.event';
import { InitiatePaymentCommand } from './initiate-payment.command';

const MOMO_MIN_AMOUNT = 1_000;
const MOMO_MAX_AMOUNT = 50_000_000;

export function toMomoProviderFailure(resultCode: number, rawMessage?: string) {
  if (/signature|chữ\s*ký|chu\s*ky/i.test(rawMessage ?? '')) {
    return {
      code: 'MOMO_SIGNATURE_INVALID',
      retryable: false,
      message:
        'MoMo không xác thực được chữ ký. Kiểm tra Partner Code, Access Key và Secret Key của cùng một môi trường Sandbox.',
    };
  }
  return {
    code: 'MOMO_PROVIDER_REJECTED',
    retryable: true,
    message: `MoMo từ chối tạo phiên thanh toán (mã ${resultCode}).`,
  };
}

@CommandHandler(InitiatePaymentCommand)
export class InitiatePaymentHandler
  implements ICommandHandler<InitiatePaymentCommand>
{
  constructor(
    @Inject(ORDER_REPOSITORY_PORT)
    private readonly orders: OrderRepositoryPort,
    @Inject(PAYMENT_REPOSITORY_PORT)
    private readonly payments: PaymentRepositoryPort,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly gateway: PaymentGatewayPort,
    private readonly config: ConfigService<AllConfigType>,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: InitiatePaymentCommand): Promise<Payment> {
    if (!this.gateway.isConfigured()) {
      throw new ServiceUnavailableException('MoMo payment is not configured');
    }
    const order = await this.orders.findById(command.orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== command.userId) {
      throw new ForbiddenException('You cannot pay for this order');
    }
    if (order.status === OrderStatusEnum.CANCELLED) {
      throw new UnprocessableEntityException('Cancelled orders cannot be paid');
    }
    if (order.paymentStatus === PaymentStatusEnum.PAID) {
      throw new UnprocessableEntityException('Order is already paid');
    }
    if (order.paymentMethod !== PaymentMethodEnum.MOMO) {
      throw new UnprocessableEntityException({
        code: 'PAYMENT_METHOD_NOT_MOMO',
        retryable: false,
        message: 'Đơn hàng này được chọn thanh toán khi nhận hàng.',
      });
    }
    if (order.total < MOMO_MIN_AMOUNT || order.total > MOMO_MAX_AMOUNT) {
      throw new UnprocessableEntityException(
        `MoMo amount must be between ${MOMO_MIN_AMOUNT} and ${MOMO_MAX_AMOUNT} VND`,
      );
    }

    const momo = this.config.getOrThrow('momo', { infer: true });
    const now = new Date();
    const reservation = await this.payments.reserveMomoInitiation({
      orderId: order.id,
      amount: order.total,
      now,
      expiresAt: new Date(now.getTime() + momo.paymentExpiryMinutes * 60_000),
    });
    if (reservation.payment.status === PaymentStatusEnum.PAID) {
      throw new UnprocessableEntityException('Order is already paid');
    }
    if (reservation.state !== 'INITIATE') {
      return reservation.payment;
    }
    const { payment, providerOrderId, requestId } = reservation;

    try {
      const session = await this.gateway.initiate({
        providerOrderId,
        requestId,
        amount: order.total,
        orderInfo: `Thanh toan don hang ${order.id}`,
        items: order.items.map((item) => ({
          id: item.productId,
          name: item.snapshot.name,
          price: item.unitPrice,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
        })),
        userInfo: {
          name: order.shippingAddress.fullName,
          phoneNumber: order.shippingAddress.phone,
          email: order.customer?.email ?? '',
        },
        deliveryInfo: {
          deliveryAddress: [
            order.shippingAddress.addressLine,
            order.shippingAddress.ward,
            order.shippingAddress.district,
            order.shippingAddress.city,
          ].join(', '),
          deliveryFee: '0',
          quantity: String(
            order.items.reduce((total, item) => total + item.quantity, 0),
          ),
        },
        extraData: Buffer.from(
          JSON.stringify({ orderId: order.id }),
          'utf8',
        ).toString('base64'),
        redirectUrl: momo.redirectUrl!,
        ipnUrl: momo.ipnUrl!,
      });
      if (session.resultCode !== 0 || !session.payUrl) {
        const providerFailure = toMomoProviderFailure(
          session.resultCode,
          session.message,
        );
        const failed = await this.payments.failMomoInitiation({
          paymentId: payment.id,
          requestId,
          message: providerFailure.message,
          resultCode: session.resultCode,
        });
        await this.eventBus.publish(new PaymentFailedEvent(failed));
        throw new UnprocessableEntityException(providerFailure);
      }
      const saved = await this.payments.completeMomoInitiation({
        paymentId: payment.id,
        requestId,
        session: {
          payUrl: session.payUrl,
          qrCodeUrl: session.qrCodeUrl,
          deeplink: session.deeplink,
        },
      });
      await this.eventBus.publish(new PaymentInitiatedEvent(saved));
      return saved;
    } catch (error) {
      if (error instanceof UnprocessableEntityException) throw error;
      const failed = await this.payments.failMomoInitiation({
        paymentId: payment.id,
        requestId,
        message: 'MoMo gateway request failed',
      });
      await this.eventBus.publish(new PaymentFailedEvent(failed));
      if (error instanceof ServiceUnavailableException) {
        throw new ServiceUnavailableException({
          code: 'MOMO_UNAVAILABLE',
          retryable: true,
          message: 'Không thể kết nối MoMo. Vui lòng thử lại.',
        });
      }
      throw new ServiceUnavailableException({
        code: 'MOMO_UNAVAILABLE',
        retryable: true,
        message: 'Không thể kết nối MoMo. Vui lòng thử lại.',
      });
    }
  }
}
