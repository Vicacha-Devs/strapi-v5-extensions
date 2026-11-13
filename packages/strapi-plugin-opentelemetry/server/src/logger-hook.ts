import { SpanKind, SpanStatusCode, metrics, trace } from "@opentelemetry/api";

import type { OtelPluginConfig } from "./config";
import { sanitizeError, sanitizeTelemetryText } from "./sanitize";

const WRAPPED_SYMBOL = Symbol.for("vicacha.strapi.otel.logger.wrapped");
const TRACER_NAME = "@vicacha-devs/strapi-plugin-opentelemetry";

export interface StrapiLoggerWithError {
  error: (...args: unknown[]) => unknown;
  [WRAPPED_SYMBOL]?: boolean;
}

/**
 * Wraps `strapi.log.error` so caught plugin/lifecycle errors that are logged
 * without rethrowing are still recorded on the active span (or a new span).
 */
export function instrumentStrapiLogger(
  logger: StrapiLoggerWithError | undefined,
  config: OtelPluginConfig
): void {
  if (!config.enabled || !logger || typeof logger.error !== "function") {
    return;
  }

  if (logger[WRAPPED_SYMBOL]) {
    return;
  }

  const originalError = logger.error.bind(logger);
  const tracer = trace.getTracer(TRACER_NAME, config.serviceVersion);
  const meter = metrics.getMeter(TRACER_NAME, config.serviceVersion);
  const loggedErrorCounter = meter.createCounter("strapi.log.errors", {
    description: "Count of errors logged via strapi.log.error",
  });

  logger[WRAPPED_SYMBOL] = true;
  logger.error = (...args: unknown[]) => {
    try {
      const firstArg = args[0];
      // Skip errors already logged by our own HTTP middleware to avoid double-recording
      if (
        typeof firstArg === "string" &&
        firstArg.startsWith("[opentelemetry]")
      ) {
        return originalError(...args);
      }

      const errorObj = args.find((arg) => arg instanceof Error);
      const safeError = errorObj
        ? sanitizeError(errorObj)
        : new Error(
            sanitizeTelemetryText(
              args
                .map((a) => (typeof a === "string" ? a : ""))
                .filter(Boolean)
                .join(" ") || "Logged error"
            )
          );

      loggedErrorCounter.add(1, { "error.type": safeError.name });

      const activeSpan = trace.getActiveSpan();
      if (activeSpan) {
        activeSpan.recordException(safeError);
        activeSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: safeError.message,
        });
      } else {
        tracer.startActiveSpan(
          "strapi.log.error",
          { kind: SpanKind.INTERNAL },
          (span) => {
            span.recordException(safeError);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: safeError.message,
            });
            span.end();
          }
        );
      }
    } catch {
      // Never let telemetry instrumentation break application logging
    }

    return originalError(...args);
  };
}
