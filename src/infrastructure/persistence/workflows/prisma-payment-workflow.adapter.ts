import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import type { PaymentInitiationPort } from '@/application/payment/ports/payment-initiation.port';
import type { MomoWebhookPayload } from '@/application/payment/ports/payment.gateway.port';
import type {
  PaymentSettlementPort,
  PaymentSettlementResult,
} from '@/application/payment/ports/payment-settlement.port';
import { Payment } from '@/domain/entities/payment';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';
import { PaymentFactory } from '@/domain/factories/payment.factory';
import {
  OrderMapper,
  PrismaOrderWithRelations,
} from '@/infrastructure/persistence/mappers/order.mapper';
import { PaymentMapper } from '@/infrastructure/persistence/mappers/payment.mapper';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { generateUuidV7 } from '@/utils/uuid-v7';

const ORDER_INCLUDE = {
  items: { orderBy: { id: 'asc' } },
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
} as const satisfies Prisma.OrderInclude;

@Injectable()
export class PrismaPaymentWorkflowAdapter
  implements PaymentInitiationPort, PaymentSettlementPort
{
  constructor(private readonly prisma: PrismaService) {}

  async reserveMomoInitiation(input: {
    orderId: string;
    amount: number;
    expiresAt: Date;
    now: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${input.orderId}::uuid FOR UPDATE`;
      const row = await tx.payment.findUnique({
        where: { orderId: input.orderId },
      });
      let payment = row ? PaymentMapper.toDomain(row) : null;
      if (payment?.status === PaymentStatusEnum.PAID) {
        return { state: 'REUSE' as const, payment };
      }
      if (payment?.isReusable(input.now)) {
        return { state: 'REUSE' as const, payment };
      }
      if (payment?.isInitiating(input.now)) {
        return { state: 'IN_PROGRESS' as const, payment };
      }

      const attempt = (payment?.latestAttempt?.attempt ?? 0) + 1;
      if (!payment) {
        payment = PaymentFactory.create({
          orderId: input.orderId,
          provider: 'momo',
          amount: input.amount,
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
      }
      const providerOrderId = `momo-${payment.id}-${attempt}`;
      const requestId = `request-${payment.id}-${attempt}`;
      payment.startAttempt({
        providerOrderId,
        requestId,
        expiresAt: input.expiresAt,
        attempt,
        now: input.now,
      });
      const persisted = row
        ? await tx.payment.update({
            where: { id: payment.id },
            data: PaymentMapper.toPersistence(payment),
          })
        : await tx.payment.create({
            data: PaymentMapper.toPersistence(payment),
          });
      return {
        state: 'INITIATE' as const,
        payment: PaymentMapper.toDomain(persisted),
        providerOrderId,
        requestId,
      };
    });
  }

  async completeMomoInitiation(input: {
    paymentId: string;
    requestId: string;
    session: {
      payUrl: string;
      qrCodeUrl: string | null;
      deeplink: string | null;
    };
  }): Promise<Payment> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "payments" WHERE "id" = ${input.paymentId}::uuid FOR UPDATE`;
      const row = await tx.payment.findUniqueOrThrow({
        where: { id: input.paymentId },
      });
      const payment = PaymentMapper.toDomain(row);
      if (
        payment.latestAttempt?.requestId !== input.requestId ||
        !payment.isInitiating()
      ) {
        return payment;
      }
      payment.recordGatewaySession(input.session);
      const saved = await tx.payment.update({
        where: { id: payment.id },
        data: PaymentMapper.toPersistence(payment),
      });
      return PaymentMapper.toDomain(saved);
    });
  }

  async failMomoInitiation(input: {
    paymentId: string;
    requestId: string;
    message: string;
    resultCode?: number;
  }): Promise<Payment> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "payments" WHERE "id" = ${input.paymentId}::uuid FOR UPDATE`;
      const row = await tx.payment.findUniqueOrThrow({
        where: { id: input.paymentId },
      });
      const payment = PaymentMapper.toDomain(row);
      if (
        payment.latestAttempt?.requestId !== input.requestId ||
        !payment.isInitiating()
      ) {
        return payment;
      }
      payment.fail(input.message, input.resultCode);
      const saved = await tx.payment.update({
        where: { id: payment.id },
        data: PaymentMapper.toPersistence(payment),
      });
      return PaymentMapper.toDomain(saved);
    });
  }

  async settleMomoWebhook(
    payload: MomoWebhookPayload,
  ): Promise<PaymentSettlementResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id" FROM "payments"
        WHERE "provider_order_id" = ${payload.orderId} FOR UPDATE
      `;
      const payment = await tx.payment.findFirst({
        where: { provider: 'momo', providerOrderId: payload.orderId },
      });
      if (!payment || payment.amount.toNumber() !== payload.amount) {
        return { ignored: true, payment: null, order: null, changed: false };
      }

      await tx.$queryRaw`
        SELECT "id" FROM "orders" WHERE "id" = ${payment.orderId}::uuid FOR UPDATE
      `;
      const order = await tx.order.findFirst({
        where: { id: payment.orderId, deletedAt: null },
        include: ORDER_INCLUDE,
      });
      if (!order) {
        return { ignored: true, payment: null, order: null, changed: false };
      }

      if (payload.resultCode === 0) {
        if (
          payment.status === PaymentStatusEnum.PAID ||
          payment.status === PaymentStatusEnum.REFUND_PENDING ||
          payment.status === PaymentStatusEnum.REFUND_FAILED ||
          payment.status === PaymentStatusEnum.REFUNDED
        ) {
          return {
            ignored: false,
            payment: PaymentMapper.toDomain(payment),
            order: OrderMapper.toDomain(order as PrismaOrderWithRelations),
            changed: false,
          };
        }
        const metadata = this.withIpn(payment.metadata, payload);
        const cancelled = order.status === OrderStatusEnum.CANCELLED;
        const nextPaymentStatus = cancelled
          ? PaymentStatusEnum.REFUND_PENDING
          : PaymentStatusEnum.PAID;
        const paidAt = new Date();
        const [settledPayment, settledOrder] = await Promise.all([
          tx.payment.update({
            where: { id: payment.id },
            data: {
              status: nextPaymentStatus,
              providerTransId: payload.transId,
              paidAt,
              metadata: metadata as Prisma.InputJsonValue,
            },
          }),
          tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: nextPaymentStatus,
              paidAt,
              ...(!cancelled && order.status === OrderStatusEnum.PENDING
                ? { status: OrderStatusEnum.CONFIRMED }
                : {}),
            },
            include: ORDER_INCLUDE,
          }),
        ]);
        if (cancelled) {
          await tx.outboxMessage.create({
            data: {
              id: generateUuidV7(),
              aggregateType: 'Payment',
              aggregateId: payment.id,
              eventType: 'RefundReconciliationRequested',
              payload: {
                paymentId: payment.id,
                orderId: order.id,
                reason: 'LATE_PAYMENT_AFTER_CANCELLATION',
              },
            },
          });
        }
        return {
          ignored: false,
          payment: PaymentMapper.toDomain(settledPayment),
          order: OrderMapper.toDomain(settledOrder as PrismaOrderWithRelations),
          changed: true,
        };
      }

      if (payment.status !== PaymentStatusEnum.PENDING) {
        return {
          ignored: false,
          payment: PaymentMapper.toDomain(payment),
          order: OrderMapper.toDomain(order as PrismaOrderWithRelations),
          changed: false,
        };
      }
      const failedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatusEnum.FAILED,
          metadata: this.withIpn(
            payment.metadata,
            payload,
          ) as Prisma.InputJsonValue,
        },
      });
      return {
        ignored: false,
        payment: PaymentMapper.toDomain(failedPayment),
        order: OrderMapper.toDomain(order as PrismaOrderWithRelations),
        changed: true,
      };
    });
  }

  private withIpn(
    raw: Prisma.JsonValue | null,
    payload: MomoWebhookPayload,
  ): Record<string, unknown> {
    const metadata =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};
    return { ...metadata, lastIpn: payload };
  }
}
