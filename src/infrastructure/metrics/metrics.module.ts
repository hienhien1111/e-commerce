import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
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
  providers: [httpRequestDurationProvider, loginAttemptsProvider],
  exports: [httpRequestDurationProvider, loginAttemptsProvider],
})
export class MetricsModule {}
