import {
  SpanKind,
  SpanStatusCode,
  metrics,
  trace,
  type Span,
} from "@opentelemetry/api";

import type { OtelPluginConfig } from "./config";
import { extractPluginName, sanitizeError } from "./sanitize";

export interface KoaLikeContext {
  method: string;
  path: string;
  status: number;
  _matchedRoute?: string;
  state?: {
    user?: {
      id?: string | number;
      documentId?: string;
    };
  };
}

export interface StrapiLoggerLike {
  error: (message: string, meta?: Record<string, unknown>) => void;
}

const TRACER_NAME = "@vicacha-devs/strapi-plugin-opentelemetry";

/**
 * Enriches an active span and records HTTP metrics and errors for Strapi requests.
 */
export function createOtelRequestMiddleware(
  config: OtelPluginConfig,
  logger?: StrapiLoggerLike
) {
  const tracer = trace.getTracer(TRACER_NAME, config.serviceVersion);
  const meter = metrics.getMeter(TRACER_NAME, config.serviceVersion);

  const durationHistogram = meter.createHistogram(
    "http.server.request.duration",
    {
      description: "Duration of Strapi HTTP server requests in milliseconds",
      unit: "ms",
    }
  );
  const errorCounter = meter.createCounter("http.server.errors", {
    description: "Count of failed Strapi HTTP requests (5xx or unhandled)",
  });

  return async function otelRequestTracker(
    ctx: KoaLikeContext,
    next: () => Promise<void>
  ): Promise<void> {
    if (
      !config.enabled ||
      config.ignorePaths.some((prefix) => ctx.path.startsWith(prefix))
    ) {
      await next();
      return;
    }

    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      await executeWithSpan(activeSpan, ctx, next);
      return;
    }

    await tracer.startActiveSpan(
      `${ctx.method} ${ctx.path}`,
      { kind: SpanKind.SERVER },
      async (span) => {
        try {
          await executeWithSpan(span, ctx, next);
        } finally {
          span.end();
        }
      }
    );
  };

  async function executeWithSpan(
    span: Span,
    ctx: KoaLikeContext,
    next: () => Promise<void>
  ): Promise<void> {
    const startMs = performance.now();
    span.setAttributes({
      "http.request.method": ctx.method,
      "url.path": ctx.path,
    });

    try {
      await next();

      const route = ctx._matchedRoute || ctx.path;
      const status = ctx.status ?? 200;
      const pluginName = extractPluginName({ route });
      span.setAttributes({
        "http.route": route,
        "http.response.status_code": status,
        ...(pluginName ? { "strapi.plugin": pluginName } : {}),
      });
      attachUserContext(span, ctx);

      if (status >= 500) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${status}`,
        });
        errorCounter.add(1, {
          "http.request.method": ctx.method,
          "http.route": route,
          "http.response.status_code": status,
          ...(pluginName ? { "strapi.plugin": pluginName } : {}),
        });
      }

      durationHistogram.record(performance.now() - startMs, {
        "http.request.method": ctx.method,
        "http.route": route,
        "http.response.status_code": status,
        ...(pluginName ? { "strapi.plugin": pluginName } : {}),
      });
    } catch (err) {
      const error = sanitizeError(err);
      const route = ctx._matchedRoute || ctx.path;
      const pluginName = extractPluginName({ route });

      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.setAttribute("http.route", route);
      if (pluginName) {
        span.setAttribute("strapi.plugin", pluginName);
      }
      attachUserContext(span, ctx);

      errorCounter.add(1, {
        "http.request.method": ctx.method,
        "http.route": route,
        "error.type": error.name,
        ...(pluginName ? { "strapi.plugin": pluginName } : {}),
      });
      durationHistogram.record(performance.now() - startMs, {
        "http.request.method": ctx.method,
        "http.route": route,
        "error.type": error.name,
        ...(pluginName ? { "strapi.plugin": pluginName } : {}),
      });

      const spanCtx = span.spanContext();
      logger?.error(
        `[opentelemetry] Unhandled request error: ${error.message}`,
        {
          trace_id: spanCtx.traceId,
          span_id: spanCtx.spanId,
          method: ctx.method,
          path: ctx.path,
          ...(pluginName ? { plugin: pluginName } : {}),
        }
      );

      throw err;
    }
  }
}

function attachUserContext(span: Span, ctx: KoaLikeContext): void {
  const user = ctx.state?.user;
  if (!user) return;
  const userId = user.documentId ?? user.id;
  if (userId !== undefined && userId !== null) {
    span.setAttribute("enduser.id", String(userId));
  }
}
