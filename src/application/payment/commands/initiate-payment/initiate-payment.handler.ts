import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { OrderRepositoryPort } from '@/application/order/ports/order.repository.port';
import { ORDER_REPOSITORY_PORT } from '@/application/order/ports/order.repository.port.token';
import type { PaymentGatewayPort } from '@/application/payment/ports/payment.gateway.port';
import { PAYMENT_GATEWAY_PORT } from '@/application/payment/ports/payment.gateway.port.token';
import type { PaymentInitiationPort } from '@/application/payment/ports/payment-initiation.port';
import { PAYMENT_INITIATION_PORT } from '@/application/payment/ports/payment-initiation.port.token';
import { ApplicationError } from '@/application/shared/errors/application.error';
import type { AllConfigType } from '@/config/config.type';
import { Payment } from '@/domain/entities/payment';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { PaymentMethodEnum } from '@/domain/enums/payment-method.enum';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';
import { ReservationStatusEnum } from '@/domain/enums/reservation-status.enum';
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
    @Inject(PAYMENT_INITIATION_PORT)
    private readonly payments: PaymentInitiationPort,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly gateway: PaymentGatewayPort,
    private readonly config: ConfigService<AllConfigType>,
  ) {}

  async execute(command: InitiatePaymentCommand): Promise<Payment> {
    if (!this.gateway.isConfigured()) {
      throw new ApplicationError(
        'MOMO_NOT_CONFIGURED',
        'MoMo payment is not configured',
        'UNAVAILABLE',
        true,
      );
    }
    const order = await this.orders.findById(command.orderId);
    if (!order) {
      throw new ApplicationError(
        'ORDER_NOT_FOUND',
        'Order not found',
        'NOT_FOUND',
      );
    }
    if (order.userId !== command.userId) {
      throw new ApplicationError(
        'PAYMENT_FORBIDDEN',
        'You cannot pay for this order',
        'FORBIDDEN',
      );
    }
    if (order.status === OrderStatusEnum.CANCELLED) {
      throw new ApplicationError(
        'ORDER_CANCELLED',
        'Cancelled orders cannot be paid',
        'UNPROCESSABLE',
      );
    }
    if (order.reservationStatus !== ReservationStatusEnum.RESERVED) {
      throw new ApplicationError(
        'ORDER_NOT_RESERVED',
        order.reservationStatus === ReservationStatusEnum.PENDING
          ? 'Đơn hàng đang giữ tồn kho. Vui lòng thử lại sau.'
          : 'Đơn hàng không còn giữ được tồn kho.',
        'UNPROCESSABLE',
        order.reservationStatus === ReservationStatusEnum.PENDING,
      );
    }
    if (order.paymentStatus === PaymentStatusEnum.PAID) {
      throw new ApplicationError(
        'ORDER_ALREADY_PAID',
        'Order is already paid',
        'UNPROCESSABLE',
      );
    }
    if (order.paymentMethod !== PaymentMethodEnum.MOMO) {
      throw new ApplicationError(
        'PAYMENT_METHOD_NOT_MOMO',
        'Đơn hàng này được chọn thanh toán khi nhận hàng.',
        'UNPROCESSABLE',
      );
    }
    if (order.total < MOMO_MIN_AMOUNT || order.total > MOMO_MAX_AMOUNT) {
      throw new ApplicationError(
        'MOMO_AMOUNT_INVALID',
        `MoMo amount must be between ${MOMO_MIN_AMOUNT} and ${MOMO_MAX_AMOUNT} VND`,
        'UNPROCESSABLE',
      );
    }

    const momo = this.config.getOrThrow('momo', { infer: true });
    const now = new Date();
    if (order.reservationExpiresAt && order.reservationExpiresAt <= now) {
      throw new ApplicationError(
        'ORDER_RESERVATION_EXPIRED',
        'Thời gian giữ hàng đã hết.',
        'UNPROCESSABLE',
      );
    }
    const gatewayExpiry = new Date(
      now.getTime() + momo.paymentExpiryMinutes * 60_000,
    );
    const reservation = await this.payments.reserveMomoInitiation({
      orderId: order.id,
      amount: order.total,
      now,
      expiresAt:
        order.reservationExpiresAt && order.reservationExpiresAt < gatewayExpiry
          ? order.reservationExpiresAt
          : gatewayExpiry,
    });
    if (reservation.payment.status === PaymentStatusEnum.PAID) {
      throw new ApplicationError(
        'ORDER_ALREADY_PAID',
        'Order is already paid',
        'UNPROCESSABLE',
      );
    }
    if (reservation.state !== 'INITIATE') return reservation.payment;
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
        const failure = toMomoProviderFailure(
          session.resultCode,
          session.message,
        );
        await this.payments.failMomoInitiation({
          paymentId: payment.id,
          requestId,
          message: failure.message,
          resultCode: session.resultCode,
        });
        throw new ApplicationError(
          failure.code,
          failure.message,
          'UNPROCESSABLE',
          failure.retryable,
        );
      }
      return this.payments.completeMomoInitiation({
        paymentId: payment.id,
        requestId,
        session: {
          payUrl: session.payUrl,
          qrCodeUrl: session.qrCodeUrl,
          deeplink: session.deeplink,
        },
      });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      await this.payments.failMomoInitiation({
        paymentId: payment.id,
        requestId,
        message: 'MoMo gateway request failed',
      });
      throw new ApplicationError(
        'MOMO_UNAVAILABLE',
        'Không thể kết nối MoMo. Vui lòng thử lại.',
        'UNAVAILABLE',
        true,
      );
    }
  }
}
