import { Injectable } from '@nestjs/common';
import { PaymentRefund, RefundStatus } from '@/generated/prisma/client';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { generateUuidV7 } from '@/utils/uuid-v7';

export type PreparedRefund = PaymentRefund & {
  providerOrderId: string;
  orderId: string;
};

@Injectable()
export class PrismaPaymentRefundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async prepare(paymentId: string): Promise<PreparedRefund | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "payments" WHERE "id" = ${paymentId}::uuid FOR UPDATE`;
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { order: true, refund: true },
      });
      if (
        !payment ||
        payment.provider !== 'momo' ||
        payment.order.status !== OrderStatusEnum.CANCELLED ||
        !payment.providerTransId ||
        !payment.providerOrderId
      ) {
        return null;
      }
      if (payment.refund?.status === RefundStatus.SUCCEEDED) {
        return {
          ...payment.refund,
          providerOrderId: payment.providerOrderId,
          orderId: payment.orderId,
        };
      }
      const refundId = payment.refund?.id ?? generateUuidV7();
      const refund =
        payment.refund ??
        (await tx.paymentRefund.create({
          data: {
            id: refundId,
            paymentId: payment.id,
            provider: 'momo',
            amount: payment.amount,
            providerTransId: payment.providerTransId,
            providerRefundOrderId: `refund-${refundId}`,
            requestId: `refund-request-${refundId}`,
          },
        }));
      await Promise.all([
        tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatusEnum.REFUND_PENDING },
        }),
        tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: PaymentStatusEnum.REFUND_PENDING },
        }),
        tx.paymentRefund.update({
          where: { id: refund.id },
          data: {
            status: RefundStatus.PROCESSING,
            attempts: { increment: 1 },
            lastError: null,
          },
        }),
      ]);
      return {
        ...refund,
        status: RefundStatus.PROCESSING,
        attempts: refund.attempts + 1,
        providerOrderId: payment.providerOrderId,
        orderId: payment.orderId,
      };
    });
  }

  async succeed(
    refundId: string,
    refundTransId?: string | null,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "payment_refunds" WHERE "id" = ${refundId}::uuid FOR UPDATE`;
      const refund = await tx.paymentRefund.findUnique({
        where: { id: refundId },
      });
      if (!refund || refund.status === RefundStatus.SUCCEEDED) return;
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: refund.paymentId },
      });
      await Promise.all([
        tx.paymentRefund.update({
          where: { id: refund.id },
          data: {
            status: RefundStatus.SUCCEEDED,
            refundTransId: refundTransId ?? refund.refundTransId,
            completedAt: new Date(),
            lastError: null,
          },
        }),
        tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatusEnum.REFUNDED },
        }),
        tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: PaymentStatusEnum.REFUNDED },
        }),
      ]);
    });
  }

  async fail(
    paymentId: string,
    error: string,
    terminal: boolean,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const refund = await tx.paymentRefund.findUnique({
        where: { paymentId },
      });
      if (!refund || refund.status === RefundStatus.SUCCEEDED) return;
      await tx.paymentRefund.update({
        where: { id: refund.id },
        data: {
          status: terminal ? RefundStatus.FAILED : RefundStatus.PENDING,
          lastError: error.slice(0, 4_000),
        },
      });
      if (!terminal) return;
      const payment = await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatusEnum.REFUND_FAILED },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: PaymentStatusEnum.REFUND_FAILED },
      });
    });
  }

  list(input: { status?: RefundStatus; limit: number }) {
    return this.prisma.paymentRefund.findMany({
      where: input.status ? { status: input.status } : undefined,
      include: { payment: { select: { orderId: true } } },
      orderBy: { createdAt: 'desc' },
      take: input.limit,
    });
  }
}
