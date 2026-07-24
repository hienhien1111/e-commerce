import { Injectable } from '@nestjs/common';
import { OutboxMessage, OutboxStatus, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class PrismaOutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPublishable(limit = 50): Promise<OutboxMessage[]> {
    return this.prisma.outboxMessage.findMany({
      where: {
        status: OutboxStatus.PENDING,
        availableAt: { lte: new Date() },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async markPublished(id: string): Promise<void> {
    await this.prisma.outboxMessage.updateMany({
      where: { id, status: OutboxStatus.PENDING },
      data: { status: OutboxStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  async begin(id: string): Promise<OutboxMessage | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "outbox_messages" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const message = await tx.outboxMessage.findUnique({ where: { id } });
      const staleProcessingBefore = new Date(
        Date.now() - Number(process.env.OUTBOX_PROCESSING_TIMEOUT_MS ?? 25_000),
      );
      if (
        !message ||
        message.status === OutboxStatus.PROCESSED ||
        message.status === OutboxStatus.DEAD_LETTER ||
        (message.status === OutboxStatus.PROCESSING &&
          message.updatedAt > staleProcessingBefore)
      ) {
        return null;
      }
      return tx.outboxMessage.update({
        where: { id },
        data: { status: OutboxStatus.PROCESSING },
      });
    });
  }

  async complete(id: string): Promise<void> {
    await this.prisma.outboxMessage.update({
      where: { id },
      data: {
        status: OutboxStatus.PROCESSED,
        processedAt: new Date(),
        lastError: null,
      },
    });
  }

  async fail(
    id: string,
    error: unknown,
    maxAttempts = 10,
  ): Promise<{ attempts: number; deadLetter: boolean }> {
    const current = await this.prisma.outboxMessage.findUnique({
      where: { id },
      select: { attempts: true },
    });
    if (!current) return { attempts: 0, deadLetter: false };
    const attempts = current.attempts + 1;
    const delaySeconds = Math.min(3_600, 5 * 2 ** (attempts - 1));
    await this.prisma.outboxMessage.update({
      where: { id },
      data: {
        attempts,
        status:
          attempts >= maxAttempts
            ? OutboxStatus.DEAD_LETTER
            : OutboxStatus.PENDING,
        availableAt: new Date(Date.now() + delaySeconds * 1_000),
        lastError: this.errorMessage(error),
      },
    });
    return { attempts, deadLetter: attempts >= maxAttempts };
  }

  async retry(id: string): Promise<boolean> {
    const result = await this.prisma.outboxMessage.updateMany({
      where: { id, status: OutboxStatus.DEAD_LETTER },
      data: {
        status: OutboxStatus.PENDING,
        attempts: 0,
        availableAt: new Date(),
        lastError: null,
        processedAt: null,
      },
    });
    return result.count === 1;
  }

  listOperations(input: {
    status?: OutboxStatus;
    cursor?: string | null;
    limit: number;
  }) {
    return this.prisma.outboxMessage.findMany({
      where: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.cursor ? { id: { gt: input.cursor } } : {}),
      },
      orderBy: { id: 'asc' },
      take: input.limit,
    });
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message.slice(0, 4_000);
    try {
      return JSON.stringify(error).slice(0, 4_000);
    } catch {
      return 'Unknown commerce worker error';
    }
  }
}

export const jsonPayload = <T>(value: Prisma.JsonValue): T =>
  value as unknown as T;
