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
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { PaymentFactory } from '@/domain/factories/payment.factory';
import { PaymentInitiatedEvent } from '@/domain/events/payment-initiated.event';
import { PaymentFailedEvent } from '@/domain/events/payment-failed.event';
import { InitiatePaymentCommand } from './initiate-payment.command';

const MOMO_MIN_AMOUNT = 1_000;
const MOMO_MAX_AMOUNT = 50_000_000;

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
    if (order.total < MOMO_MIN_AMOUNT || order.total > MOMO_MAX_AMOUNT) {
      throw new UnprocessableEntityException(
        `MoMo amount must be between ${MOMO_MIN_AMOUNT} and ${MOMO_MAX_AMOUNT} VND`,
      );
    }

    const now = new Date();
    const existing = await this.payments.findByOrderId(order.id);
    if (existing?.status === PaymentStatusEnum.PAID) {
      throw new UnprocessableEntityException('Order is already paid');
    }
    if (existing?.isReusable(now)) return existing;

    const momo = this.config.getOrThrow('momo', { infer: true });
    const lastAttempt = existing?.metadata.attempts.at(-1);
    const continuePendingAttempt =
      existing?.status === PaymentStatusEnum.PENDING &&
      existing.expiresAt !== null &&
      existing.expiresAt > now &&
      existing.providerOrderId !== null &&
      lastAttempt !== undefined;

    let payment: Payment;
    let providerOrderId: string;
    let requestId: string;
    if (continuePendingAttempt) {
      payment = existing;
      providerOrderId = existing.providerOrderId!;
      requestId = lastAttempt.requestId;
    } else {
      const attempt = (lastAttempt?.attempt ?? 0) + 1;
      const expiresAt = new Date(
        now.getTime() + momo.paymentExpiryMinutes * 60_000,
      );
      if (existing) {
        providerOrderId = `momo-${existing.id}-${attempt}`;
        requestId = `request-${existing.id}-${attempt}`;
        existing.startAttempt({
          providerOrderId,
          requestId,
          expiresAt,
          attempt,
          now,
        });
        payment = await this.payments.save(existing);
      } else {
        const created = PaymentFactory.create({
          orderId: order.id,
          provider: 'momo',
          amount: order.total,
          currency: 'VND',
          status: PaymentStatusEnum.PENDING,
          providerOrderId: null,
          providerTransId: null,
          payUrl: null,
          qrCodeUrl: null,
          deeplink: null,
          metadata: { attempts: [] },
          expiresAt: null,
          paidAt: null,
        });
        providerOrderId = `momo-${created.id}-${attempt}`;
        requestId = `request-${created.id}-${attempt}`;
        created.startAttempt({
          providerOrderId,
          requestId,
          expiresAt,
          attempt,
          now,
        });
        payment = await this.payments.create(created);
      }
    }

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
        payment.fail(session.message, session.resultCode);
        const failed = await this.payments.save(payment);
        await this.eventBus.publish(new PaymentFailedEvent(failed));
        throw new UnprocessableEntityException(
          session.message || 'MoMo could not create a payment session',
        );
      }
      payment.recordGatewaySession({
        payUrl: session.payUrl,
        qrCodeUrl: session.qrCodeUrl,
        deeplink: session.deeplink,
      });
      const saved = await this.payments.save(payment);
      await this.eventBus.publish(new PaymentInitiatedEvent(saved));
      return saved;
    } catch (error) {
      if (error instanceof UnprocessableEntityException) throw error;
      payment.fail('MoMo gateway request failed');
      const failed = await this.payments.save(payment);
      await this.eventBus.publish(new PaymentFailedEvent(failed));
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('MoMo payment is unavailable');
    }
  }
}
