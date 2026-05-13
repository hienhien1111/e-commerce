/**
 * OpenTelemetry SDK bootstrap.
 *
 * MUST be imported BEFORE any other module (especially NestJS), otherwise
 * auto-instrumentations cannot patch the libraries at require time.
 *
 * Activation:
 * - Set OTEL_EXPORTER_OTLP_ENDPOINT (e.g. http://localhost:4318) to enable
 *   OTLP HTTP export.
 * - Or set OTEL_ENABLED=true to start the SDK with no exporter (spans created
 *   but dropped — useful for testing instrumentation overhead).
 * - Both unset → SDK is not started; zero runtime cost.
 *
 * Trace context propagates via `traceparent` HTTP header (W3C) by default.
 * Pino logs automatically receive trace_id / span_id via the pino
 * auto-instrumentation included in @opentelemetry/auto-instrumentations-node.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const otelEnabled = process.env.OTEL_ENABLED === 'true';
const shouldStart = Boolean(otlpEndpoint) || otelEnabled;

const serviceName =
  process.env.OTEL_SERVICE_NAME || 'nest-clean-arch-boilerplate';
const serviceVersion = process.env.npm_package_version || 'dev';

export const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    'deployment.environment': process.env.NODE_ENV || 'development',
  }),
  traceExporter: otlpEndpoint
    ? new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` })
    : undefined,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Avoid extremely noisy filesystem instrumentation
      '@opentelemetry/instrumentation-fs': { enabled: false },
      // DNS instrumentation rarely useful for backend services
      '@opentelemetry/instrumentation-dns': { enabled: false },
    }),
  ],
});

if (shouldStart) {
  sdk.start();

  const gracefulShutdown = (): void => {
    sdk
      .shutdown()
      .catch((err: Error) => {
        console.error('OpenTelemetry SDK shutdown error', err);
      })
      .finally(() => process.exit(0));
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}
