import { Injectable } from '@nestjs/common';
import {
  OutboxMessage,
  OutboxStatus,
  PaymentStatus,
  RefundStatus,
} from '@/generated/prisma/client';
import type { CommerceOperationRepositoryPort } from '@/application/admin/ports/commerce-operation.repository.port';
import type {
  CommerceOperation,
  CommerceOperationPage,
} from '@/application/admin/types/commerce-operation.types';
import { CommerceOperationStatusEnum } from '@/domain/enums/commerce-operation-status.enum';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class PrismaCommerceOperationRepository
  implements CommerceOperationRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findPage(input: {
    status?: CommerceOperationStatusEnum;
    eventType?: string;
    cursor: string | null;
    limit: number;
  }): Promise<CommerceOperationPage> {
    const rows = await this.prisma.outboxMessage.findMany({
      where: {
        ...(input.status ? { status: input.status as OutboxStatus } : {}),
        ...(input.eventType ? { eventType: input.eventType } : {}),
        ...(input.cursor ? { id: { gt: input.cursor } } : {}),
      },
      orderBy: { id: 'asc' },
      take: input.limit + 1,
    });
    const data = rows.slice(0, input.limit).map((row) => this.toOperation(row));
    return {
      data,
      nextCursor: rows.length > input.limit ? (data.at(-1)?.id ?? null) : null,
    };
  }

  async findById(id: string): Promise<CommerceOperation | null> {
    const row = await this.prisma.outboxMessage.findUnique({ where: { id } });
    return row ? this.toOperation(row) : null;
  }

  async retry(id: string): Promise<CommerceOperation | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "outbox_messages" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const message = await tx.outboxMessage.findUnique({ where: { id } });
      if (!message || message.status !== OutboxStatus.DEAD_LETTER) return null;
      if (message.eventType === 'RefundReconciliationRequested') {
        await tx.paymentRefund.updateMany({
          where: { paymentId: message.aggregateId },
          data: { status: RefundStatus.PENDING, lastError: null },
        });
        const payment = await tx.payment.update({
          where: { id: message.aggregateId },
          data: { status: PaymentStatus.REFUND_PENDING },
        });
        await tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: PaymentStatus.REFUND_PENDING },
        });
      }
      const updated = await tx.outboxMessage.update({
        where: { id },
        data: {
          status: OutboxStatus.PENDING,
          attempts: 0,
          availableAt: new Date(),
          publishedAt: null,
          processedAt: null,
          lastError: null,
        },
      });
      return this.toOperation(updated);
    });
  }

  private toOperation(row: OutboxMessage): CommerceOperation {
    return {
      id: row.id,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      eventType: row.eventType,
      status: row.status as CommerceOperationStatusEnum,
      attempts: row.attempts,
      availableAt: row.availableAt,
      lastError: row.lastError,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
