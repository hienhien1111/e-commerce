import { Global, Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';

/**
 * Exposes /metrics in Prometheus exposition format.
 *
 * Default Node.js process metrics (heap, CPU, event loop lag, GC, etc.) are
 * collected automatically via prom-client's `collectDefaultMetrics`.
 *
 * Add a custom counter or histogram by appending a provider here, then inject
 * via `@InjectMetric('metric_name')` in your service.
 */

const httpRequestDurationProvider = makeHistogramProvider({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const loginAttemptsProvider = makeCounterProvider({
  name: 'auth_login_attempts_total',
  help: 'Total number of login attempts',
  labelNames: ['result'],
});

const commerceOutboxLagProvider = makeGaugeProvider({
  name: 'commerce_outbox_lag_seconds',
  help: 'Age in seconds of the oldest publishable commerce outbox message',
});

const commerceQueueDepthProvider = makeGaugeProvider({
  name: 'commerce_queue_depth',
  help: 'BullMQ commerce jobs waiting, active, or delayed',
});

const commerceRetryProvider = makeCounterProvider({
  name: 'commerce_event_retries_total',
  help: 'Commerce outbox processing retries',
  labelNames: ['event_type'],
});

const commerceDeadLetterProvider = makeCounterProvider({
  name: 'commerce_dead_letters_total',
  help: 'Commerce events that exhausted automatic retries',
  labelNames: ['event_type'],
});

const commerceExpiredOrderProvider = makeCounterProvider({
  name: 'commerce_expired_orders_total',
  help: 'MoMo orders expired by the reservation scanner',
});

const commerceRefundProvider = makeCounterProvider({
  name: 'commerce_refund_operations_total',
  help: 'Refund workflow outcomes',
  labelNames: ['status'],
});

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: { enabled: true },
      defaultLabels: {
        app: process.env.OTEL_SERVICE_NAME || 'nest-clean-arch-boilerplate',
      },
      path: '/metrics',
    }),
  ],
  providers: [
    httpRequestDurationProvider,
    loginAttemptsProvider,
    commerceOutboxLagProvider,
    commerceQueueDepthProvider,
    commerceRetryProvider,
    commerceDeadLetterProvider,
    commerceExpiredOrderProvider,
    commerceRefundProvider,
  ],
  exports: [
    httpRequestDurationProvider,
    loginAttemptsProvider,
    commerceOutboxLagProvider,
    commerceQueueDepthProvider,
    commerceRetryProvider,
    commerceDeadLetterProvider,
    commerceExpiredOrderProvider,
    commerceRefundProvider,
  ],
})
export class MetricsModule {}
