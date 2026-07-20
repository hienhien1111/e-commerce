import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import type { PaymentRepositoryPort } from '@/application/payment/ports/payment.repository.port';
import type {
  PaymentSettlementPort,
  PaymentSettlementResult,
} from '@/application/payment/ports/payment-settlement.port';
import type { MomoWebhookPayload } from '@/application/payment/ports/payment.gateway.port';
import { Payment } from '@/domain/entities/payment';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { PaymentMapper } from '@/infrastructure/persistence/mappers/payment.mapper';
import {
  OrderMapper,
  PrismaOrderWithRelations,
} from '@/infrastructure/persistence/mappers/order.mapper';
import { NullableType } from '@/utils/types/nullable.type';

const ORDER_INCLUDE = {
  items: { orderBy: { id: 'asc' } },
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
} as const satisfies Prisma.OrderInclude;

@Injectable()
export class PrismaPaymentRepository
  implements PaymentRepositoryPort, PaymentSettlementPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findByOrderId(orderId: string): Promise<NullableType<Payment>> {
    const row = await this.prisma.payment.findUnique({ where: { orderId } });
    return row ? PaymentMapper.toDomain(row) : null;
  }

  async create(payment: Payment): Promise<Payment> {
    const created = await this.prisma.payment.create({
      data: this.toPersistence(payment),
    });
    return PaymentMapper.toDomain(created);
  }

  async save(payment: Payment): Promise<Payment> {
    const saved = await this.prisma.payment.update({
      where: { id: payment.id },
      data: this.toPersistence(payment),
    });
    return PaymentMapper.toDomain(saved);
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
      if (!payment) {
        return { ignored: true, payment: null, order: null, changed: false };
      }
      if (payment.amount.toNumber() !== payload.amount) {
        return { ignored: true, payment: null, order: null, changed: false };
      }

      await tx.$queryRaw`
        SELECT "id" FROM "orders" WHERE "id" = ${payment.orderId} FOR UPDATE
      `;
      const order = await tx.order.findFirst({
        where: { id: payment.orderId, deletedAt: null },
        include: ORDER_INCLUDE,
      });
      if (!order) {
        return { ignored: true, payment: null, order: null, changed: false };
      }

      if (payload.resultCode === 0) {
        if (payment.status === PaymentStatusEnum.PAID) {
          return {
            ignored: false,
            payment: PaymentMapper.toDomain(payment),
            order: OrderMapper.toDomain(order as PrismaOrderWithRelations),
            changed: false,
          };
        }
        const metadata = this.withIpn(payment.metadata, payload);
        const [settledPayment, settledOrder] = await Promise.all([
          tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatusEnum.PAID,
              providerTransId: payload.transId,
              paidAt: new Date(),
              metadata: metadata as Prisma.InputJsonValue,
            },
          }),
          tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: PaymentStatusEnum.PAID,
              ...(order.status === OrderStatusEnum.PENDING
                ? { status: OrderStatusEnum.CONFIRMED }
                : {}),
            },
            include: ORDER_INCLUDE,
          }),
        ]);
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

  private toPersistence(payment: Payment): Prisma.PaymentUncheckedCreateInput {
    return {
      id: payment.id,
      orderId: payment.orderId,
      provider: payment.provider,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      providerOrderId: payment.providerOrderId,
      providerTransId: payment.providerTransId,
      payUrl: payment.payUrl,
      qrCodeUrl: payment.qrCodeUrl,
      deeplink: payment.deeplink,
      metadata: payment.metadata as unknown as Prisma.InputJsonValue,
      expiresAt: payment.expiresAt,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
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
