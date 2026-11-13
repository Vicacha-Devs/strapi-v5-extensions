import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ConsoleSpanExporter,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  type ReadableSpan,
  type SpanExporter,
} from "@opentelemetry/sdk-trace-base";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

import type { OtelPluginConfig } from "./config";
import { sanitizeTelemetryText } from "./sanitize";

const SDK_SYMBOL = Symbol.for("vicacha.strapi.otel.sdk");

type GlobalWithOtel = typeof globalThis & {
  [SDK_SYMBOL]?: NodeSDK;
};

const URL_ATTR_KEYS = ["url.full", "http.url", "url.query"];

class SanitizingSpanExporter implements SpanExporter {
  constructor(private readonly inner: SpanExporter) {}

  export(
    spans: ReadableSpan[],
    resultCallback: Parameters<SpanExporter["export"]>[1]
  ): void {
    for (const span of spans) {
      const attrs = span.attributes as Record<string, unknown>;
      for (const key of URL_ATTR_KEYS) {
        if (typeof attrs[key] === "string") {
          attrs[key] = sanitizeTelemetryText(attrs[key]);
        }
      }
    }
    this.inner.export(spans, resultCallback);
  }

  shutdown(): Promise<void> {
    return this.inner.shutdown();
  }

  forceFlush?(): Promise<void> {
    return this.inner.forceFlush?.() ?? Promise.resolve();
  }
}

/**
 * Starts the OpenTelemetry NodeSDK once per process.
 * Returns `true` if a new SDK instance was started, `false` if already running or disabled.
 */
export function startOtelSdk(config: OtelPluginConfig): boolean {
  if (!config.enabled) {
    return false;
  }

  const g = globalThis as GlobalWithOtel;
  if (g[SDK_SYMBOL]) {
    return false;
  }

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: config.serviceName,
    [ATTR_SERVICE_VERSION]: config.serviceVersion,
    "deployment.environment.name": config.environment,
  });

  const rawTraceExporter = config.otlpEndpoint
    ? new OTLPTraceExporter({
        url: `${config.otlpEndpoint}/v1/traces`,
        headers: config.otlpHeaders,
      })
    : config.consoleExporter
      ? new ConsoleSpanExporter()
      : undefined;

  const traceExporter = rawTraceExporter
    ? new SanitizingSpanExporter(rawTraceExporter)
    : undefined;

  const metricReader = config.otlpEndpoint
    ? new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: `${config.otlpEndpoint}/v1/metrics`,
          headers: config.otlpHeaders,
        }),
        exportIntervalMillis: config.metricExportIntervalMs,
      })
    : undefined;

  const sdk = new NodeSDK({
    resource,
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(config.sampleRate),
    }),
    ...(traceExporter ? { traceExporter } : {}),
    ...(metricReader ? { metricReader } : {}),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-http": {
          ignoreIncomingRequestHook: (req) => {
            const url = req.url ?? "";
            return config.ignorePaths.some((prefix) => url.startsWith(prefix));
          },
        },
      }),
    ],
  });

  sdk.start();
  g[SDK_SYMBOL] = sdk;
  return true;
}

/**
 * Flushes and shuts down the active OpenTelemetry NodeSDK instance, if any.
 */
export async function shutdownOtelSdk(): Promise<void> {
  const g = globalThis as GlobalWithOtel;
  const sdk = g[SDK_SYMBOL];
  if (!sdk) {
    return;
  }

  delete g[SDK_SYMBOL];
  await sdk.shutdown();
}
