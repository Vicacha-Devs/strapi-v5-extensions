import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";

import type { OtelPluginConfig } from "./config";
import { extractPluginName, sanitizeError } from "./sanitize";

export interface DocumentServiceContext {
  uid: string;
  action: string;
}

export interface StrapiDocumentsLike {
  use: (
    middleware: (
      context: DocumentServiceContext,
      next: () => Promise<unknown>
    ) => Promise<unknown>
  ) => void;
}

const TRACER_NAME = "@vicacha-devs/strapi-plugin-opentelemetry";

/**
 * Instruments Strapi v5 Document Service operations with child spans and error recording.
 */
export function registerDocumentServiceInstrumentation(
  documents: StrapiDocumentsLike | undefined,
  config: OtelPluginConfig
): void {
  if (!config.enabled || !config.captureDocumentService || !documents?.use) {
    return;
  }

  const tracer = trace.getTracer(TRACER_NAME, config.serviceVersion);

  documents.use(async (context, next) => {
    const spanName = `strapi.document.${context.action} ${context.uid}`;
    const pluginName = extractPluginName({ uid: context.uid });

    return tracer.startActiveSpan(
      spanName,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          "strapi.document.uid": context.uid,
          "strapi.document.action": context.action,
          ...(pluginName ? { "strapi.plugin": pluginName } : {}),
        },
      },
      async (span) => {
        try {
          const result = await next();
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (err) {
          const error = sanitizeError(err);
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          throw err;
        } finally {
          span.end();
        }
      }
    );
  });
}
