import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import { Counter, Gauge } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type {
  OrderReleaseRequestedPayload,
  OrderSubmittedPayload,
  RefundRequestedPayload,
} from '@/infrastructure/messaging/commerce-event.constants';
import { CommerceEventType } from '@/infrastructure/messaging/commerce-event.constants';
import {
  jsonPayload,
  PrismaOutboxRepository,
} from '@/infrastructure/messaging/prisma-outbox.repository';
import { PrismaCommerceSagaRepository } from '@/infrastructure/persistence/repositories/prisma-commerce-saga.repository';
import { PrismaPaymentRefundRepository } from '@/infrastructure/persistence/repositories/prisma-payment-refund.repository';
import type { PaymentGatewayPort } from '@/application/payment/ports/payment.gateway.port';
import { PAYMENT_GATEWAY_PORT } from '@/application/payment/ports/payment.gateway.port.token';

const QUEUE_NAME = 'commerce-events';
const EXPIRY_JOB = 'CommerceExpiryScan';

@Injectable()
export class CommerceQueueService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(CommerceQueueService.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private dispatcherTimer: NodeJS.Timeout | null = null;
  private dispatching = false;

  constructor(
    private readonly outbox: PrismaOutboxRepository,
    private readonly saga: PrismaCommerceSagaRepository,
    private readonly refunds: PrismaPaymentRefundRepository,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly paymentGateway: PaymentGatewayPort,
    @InjectMetric('commerce_outbox_lag_seconds')
    private readonly outboxLag: Gauge,
    @InjectMetric('commerce_queue_depth')
    private readonly queueDepth: Gauge,
    @InjectMetric('commerce_event_retries_total')
    private readonly retries: Counter,
    @InjectMetric('commerce_dead_letters_total')
    private readonly deadLetters: Counter,
    @InjectMetric('commerce_expired_orders_total')
    private readonly expiredOrders: Counter,
    @InjectMetric('commerce_refund_operations_total')
    private readonly refundOperations: Counter,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.COMMERCE_WORKERS_ENABLED === 'false') return;
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error(
        'REDIS_URL is required when COMMERCE_WORKERS_ENABLED is enabled',
      );
    }
    const connection = this.connectionOptions(redisUrl);
    this.queue = new Queue(QUEUE_NAME, {
      connection,
      prefix: this.queuePrefix(),
    });
    this.worker = new Worker(QUEUE_NAME, (job) => this.process(job), {
      connection,
      prefix: this.queuePrefix(),
      concurrency: Number(process.env.COMMERCE_WORKER_CONCURRENCY ?? 5),
    });
    this.worker.on('error', (error) => {
      this.logger.error({ err: error }, 'Commerce worker error');
    });
    await this.queue.upsertJobScheduler(
      EXPIRY_JOB,
      { every: Number(process.env.ORDER_EXPIRY_SCAN_MS ?? 30_000) },
      {
        name: EXPIRY_JOB,
        data: {},
        opts: { removeOnComplete: true, removeOnFail: true },
      },
    );
    await this.dispatch();
    this.dispatcherTimer = setInterval(
      () => void this.dispatch(),
      Number(process.env.OUTBOX_POLL_MS ?? 250),
    );
    this.dispatcherTimer.unref();
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.dispatcherTimer) clearInterval(this.dispatcherTimer);
    await this.worker?.close();
    await this.queue?.close();
  }

  private async dispatch(): Promise<void> {
    if (!this.queue || this.dispatching) return;
    this.dispatching = true;
    try {
      const messages = await this.outbox.findPublishable();
      this.outboxLag.set(
        messages[0]
          ? Math.max(0, (Date.now() - messages[0].createdAt.getTime()) / 1_000)
          : 0,
      );
      for (const message of messages) {
        await this.queue.add(
          message.eventType,
          { outboxId: message.id },
          {
            jobId: message.id,
            removeOnComplete: true,
            removeOnFail: true,
          },
        );
        await this.outbox.markPublished(message.id);
      }
      const counts = await this.queue.getJobCounts(
        'waiting',
        'active',
        'delayed',
      );
      this.queueDepth.set(counts.waiting + counts.active + counts.delayed);
    } catch (error) {
      this.logger.warn({ err: error }, 'Outbox dispatch failed');
    } finally {
      this.dispatching = false;
    }
  }

  private async process(job: Job): Promise<void> {
    if (job.name === EXPIRY_JOB) {
      const count = await this.saga.enqueueExpiredOrders();
      if (count > 0) {
        this.expiredOrders.inc(count);
        this.logger.log({ count }, 'Expired MoMo orders enqueued');
      }
      return;
    }
    const outboxId =
      typeof job.data?.outboxId === 'string' ? job.data.outboxId : null;
    if (!outboxId) return;
    const message = await this.outbox.begin(outboxId);
    if (!message) return;
    let refundPayload: RefundRequestedPayload | null = null;
    try {
      switch (message.eventType) {
        case CommerceEventType.ORDER_SUBMITTED:
          await this.saga.reserveOrder(
            jsonPayload<OrderSubmittedPayload>(message.payload),
          );
          break;
        case CommerceEventType.ORDER_RELEASE_REQUESTED:
          await this.saga.releaseOrder(
            jsonPayload<OrderReleaseRequestedPayload>(message.payload),
          );
          break;
        case CommerceEventType.CATALOG_PROJECTION_REFRESH_REQUESTED:
          await this.saga.refreshCatalogProjection(
            jsonPayload<{ productId: string }>(message.payload).productId,
          );
          break;
        case CommerceEventType.REFUND_RECONCILIATION_REQUESTED:
          refundPayload = jsonPayload<RefundRequestedPayload>(message.payload);
          await this.processRefund(refundPayload);
          break;
        case CommerceEventType.ORDER_RESERVED:
        case CommerceEventType.ORDER_RESERVATION_FAILED:
        case CommerceEventType.ORDER_RELEASED:
          break;
        default:
          throw new Error(`Unsupported commerce event: ${message.eventType}`);
      }
      await this.outbox.complete(message.id);
    } catch (error) {
      const failed = await this.outbox.fail(message.id, error);
      if (refundPayload) {
        await this.refunds.fail(
          refundPayload.paymentId,
          error instanceof Error ? error.message : String(error),
          failed.deadLetter,
        );
        this.refundOperations.inc({
          status: failed.deadLetter ? 'failed' : 'retry',
        });
      }
      this.retries.inc({ event_type: message.eventType });
      if (failed.deadLetter) {
        this.deadLetters.inc({ event_type: message.eventType });
      }
      this.logger.warn(
        {
          err: error,
          eventId: message.id,
          aggregateId: message.aggregateId,
          attempts: failed.attempts,
          deadLetter: failed.deadLetter,
        },
        'Commerce event processing failed',
      );
    }
  }

  private async processRefund(payload: RefundRequestedPayload): Promise<void> {
    const refund = await this.refunds.prepare(payload.paymentId);
    if (!refund) return;
    this.refundOperations.inc({ status: 'pending' });
    const query = await this.paymentGateway.queryTransaction({
      providerOrderId: refund.providerOrderId,
      requestId: refund.requestId,
    });
    if (query.refundedAmount >= refund.amount.toNumber()) {
      await this.refunds.succeed(refund.id);
      this.refundOperations.inc({ status: 'reconciled' });
      return;
    }
    if (query.resultCode !== 0) {
      throw new Error(
        `MoMo transaction query failed (${query.resultCode}): ${query.message}`,
      );
    }
    const result = await this.paymentGateway.refund({
      providerRefundOrderId: refund.providerRefundOrderId,
      requestId: refund.requestId,
      amount: refund.amount.toNumber(),
      providerTransId: refund.providerTransId,
      description: `Hoan tien don hang ${refund.orderId}: ${payload.reason}`,
    });
    if (result.resultCode !== 0) {
      throw new Error(
        `MoMo refund failed (${result.resultCode}): ${result.message}`,
      );
    }
    await this.refunds.succeed(refund.id, result.refundTransId);
    this.refundOperations.inc({ status: 'succeeded' });
  }

  private queuePrefix(): string {
    return `shop:${process.env.NODE_ENV ?? 'development'}`;
  }

  private connectionOptions(redisUrl: string) {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: Number(url.port || 6379),
      ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
      ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
      ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
      maxRetriesPerRequest: null,
    };
  }
}
