import { SpanStatusCode, trace } from "@opentelemetry/api";
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  BasicTracerProvider,
} from "@opentelemetry/sdk-trace-base";
import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultConfig,
  parseOtlpHeaders,
  resolveOtelConfig,
  validateOtelConfig,
} from "../server/src/config";
import { registerDocumentServiceInstrumentation } from "../server/src/documents";
import { instrumentStrapiLogger } from "../server/src/logger-hook";
import { createOtelRequestMiddleware } from "../server/src/middleware";
import {
  extractPluginName,
  redactUrlCredentials,
  sanitizeTelemetryText,
} from "../server/src/sanitize";

function setupInMemoryTracer() {
  const exporter = new InMemorySpanExporter();
  const provider = new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });
  trace.disable();
  trace.setGlobalTracerProvider(provider);
  return {
    exporter,
    async teardown() {
      await provider.shutdown();
      trace.disable();
    },
  };
}

test("parseOtlpHeaders parses comma-separated key=value pairs", () => {
  assert.deepEqual(
    parseOtlpHeaders("Authorization=Bearer abc=123, x-tenant=mosque "),
    {
      "Authorization": "Bearer abc=123",
      "x-tenant": "mosque",
    }
  );
  assert.deepEqual(parseOtlpHeaders(undefined), {});
});

test("resolveOtelConfig merges env vars with plugin config", () => {
  const prevEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const prevService = process.env.OTEL_SERVICE_NAME;
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4318/";
  process.env.OTEL_SERVICE_NAME = "env-service";

  try {
    const resolved = resolveOtelConfig({ sampleRate: 0.5 });
    assert.equal(resolved.otlpEndpoint, "http://localhost:4318");
    assert.equal(resolved.serviceName, "env-service");
    assert.equal(resolved.sampleRate, 0.5);
  } finally {
    if (prevEndpoint === undefined)
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    else process.env.OTEL_EXPORTER_OTLP_ENDPOINT = prevEndpoint;
    if (prevService === undefined) delete process.env.OTEL_SERVICE_NAME;
    else process.env.OTEL_SERVICE_NAME = prevService;
  }
});

test("validateOtelConfig rejects invalid fields and accepts valid config", () => {
  assert.doesNotThrow(() => validateOtelConfig(defaultConfig));
  assert.throws(() => validateOtelConfig(null), /must be an object/);
  assert.throws(
    () => validateOtelConfig({ sampleRate: 1.5 }),
    /between 0 and 1/
  );
  assert.throws(
    () => validateOtelConfig({ ignorePaths: [123] }),
    /array of strings/
  );
});

test("sanitizeTelemetryText redacts tokens, URL credentials, query secrets, and emails", () => {
  const raw =
    "Failed calling https://user:s3cr3t@api.example.com/hook?api_key=xyz999&ok=1 with Bearer eyJhbGciOiJIUzI1NiJ9 for admin@example.org";
  const cleaned = sanitizeTelemetryText(raw);
  assert.ok(!cleaned.includes("s3cr3t"));
  assert.ok(!cleaned.includes("xyz999"));
  assert.ok(!cleaned.includes("eyJhbGciOiJIUzI1NiJ9"));
  assert.ok(!cleaned.includes("admin@example.org"));
  assert.ok(cleaned.includes("api_key=[REDACTED]"));
  assert.ok(cleaned.includes("Bearer [REDACTED]"));
  assert.ok(cleaned.includes("[REDACTED_EMAIL]"));
});

test("extractPluginName identifies plugin from UID and route", () => {
  assert.equal(
    extractPluginName({ uid: "plugin::bookings.booking" }),
    "bookings"
  );
  assert.equal(
    extractPluginName({ route: "/api/donations/checkout" }),
    "donations"
  );
  assert.equal(extractPluginName({ uid: "api::article.article" }), undefined);
});

test("request middleware records HTTP attributes, user id, and sanitized unhandled errors", async () => {
  const { exporter, teardown } = setupInMemoryTracer();
  try {
    const errorsLogged: Array<{
      message: string;
      meta?: Record<string, unknown>;
    }> = [];
    const middleware = createOtelRequestMiddleware(defaultConfig, {
      error: (message, meta) => errorsLogged.push({ message, meta }),
    });

    await middleware(
      {
        method: "GET",
        path: "/api/events",
        status: 200,
        _matchedRoute: "/api/events",
        state: { user: { documentId: "user_123" } },
      },
      async () => {}
    );

    await assert.rejects(
      () =>
        middleware(
          {
            method: "POST",
            path: "/api/bookings",
            status: 500,
          },
          async () => {
            throw new Error(
              "DB failed for user@example.com with Bearer secret123"
            );
          }
        ),
      /DB failed/
    );

    const spans = exporter.getFinishedSpans();
    assert.equal(spans.length, 2);

    assert.equal(spans[0].attributes["http.route"], "/api/events");
    assert.equal(spans[0].attributes["strapi.plugin"], "events");
    assert.equal(spans[0].attributes["enduser.id"], "user_123");
    assert.equal(spans[0].status.code, SpanStatusCode.UNSET);

    assert.equal(spans[1].attributes["strapi.plugin"], "bookings");
    assert.equal(spans[1].status.code, SpanStatusCode.ERROR);
    assert.ok(!spans[1].status.message?.includes("secret123"));
    assert.ok(!spans[1].status.message?.includes("user@example.com"));
    assert.equal(spans[1].events[0]?.name, "exception");
    assert.equal(errorsLogged.length, 1);
    assert.ok(errorsLogged[0].meta?.trace_id);
  } finally {
    await teardown();
  }
});

test("request middleware skips ignored paths", async () => {
  const { exporter, teardown } = setupInMemoryTracer();
  try {
    const middleware = createOtelRequestMiddleware(defaultConfig);
    await middleware(
      { method: "GET", path: "/_health", status: 204 },
      async () => {}
    );
    assert.equal(exporter.getFinishedSpans().length, 0);
  } finally {
    await teardown();
  }
});

test("document service instrumentation wraps actions in child spans with plugin attribution", async () => {
  const { exporter, teardown } = setupInMemoryTracer();
  try {
    let registeredFn:
      | ((
          ctx: { uid: string; action: string },
          next: () => Promise<unknown>
        ) => Promise<unknown>)
      | undefined;

    registerDocumentServiceInstrumentation(
      {
        use(fn) {
          registeredFn = fn;
        },
      },
      defaultConfig
    );

    assert.ok(registeredFn);
    const result = await registeredFn(
      { uid: "plugin::bookings.booking", action: "findMany" },
      async () => ["ok"]
    );
    assert.deepEqual(result, ["ok"]);

    const spans = exporter.getFinishedSpans();
    assert.equal(spans.length, 1);
    assert.equal(
      spans[0].name,
      "strapi.document.findMany plugin::bookings.booking"
    );
    assert.equal(
      spans[0].attributes["strapi.document.uid"],
      "plugin::bookings.booking"
    );
    assert.equal(spans[0].attributes["strapi.plugin"], "bookings");
    assert.equal(spans[0].status.code, SpanStatusCode.OK);
  } finally {
    await teardown();
  }
});

test("instrumentStrapiLogger captures caught errors logged via strapi.log.error", async () => {
  const { exporter, teardown } = setupInMemoryTracer();
  try {
    const logged: unknown[][] = [];
    const logger = {
      error: (...args: unknown[]) => {
        logged.push(args);
      },
    };

    instrumentStrapiLogger(logger, defaultConfig);
    logger.error(new Error("SMTP failed for guest@example.com"));
    logger.error("[opentelemetry] internal log should not create a span");

    assert.equal(logged.length, 2);
    const spans = exporter.getFinishedSpans();
    assert.equal(spans.length, 1);
    assert.equal(spans[0].name, "strapi.log.error");
    assert.equal(spans[0].status.code, SpanStatusCode.ERROR);
    assert.ok(!spans[0].status.message?.includes("guest@example.com"));
  } finally {
    await teardown();
  }
});

test("redactUrlCredentials redacts userinfo and ignores URLs without credentials", () => {
  assert.equal(
    redactUrlCredentials("db postgres://admin:s3cret@db.local:5432/app ok"),
    "db postgres://[REDACTED]@db.local:5432/app ok"
  );
  assert.equal(
    redactUrlCredentials("a https://u:p@x.io and ftp://v:w@y.io"),
    "a https://[REDACTED]@x.io and ftp://[REDACTED]@y.io"
  );
  for (const safe of [
    "https://example.com/path",
    "https://user@example.com",
    "https://:pw@example.com",
    "https://user:@example.com",
    "no scheme user:pw@host",
  ]) {
    assert.equal(redactUrlCredentials(safe), safe);
  }
});

test("sanitizeTelemetryText stays fast on pathological error text", () => {
  const start = Date.now();
  sanitizeTelemetryText("a".repeat(500_000));
  sanitizeTelemetryText("a://".repeat(125_000));
  sanitizeTelemetryText(`${"x.".repeat(250_000)}@`);
  assert.ok(Date.now() - start < 1000, "sanitizer must not scan quadratically");
});

test("config normalizes the OTLP endpoint without trailing slashes", () => {
  const cfg = resolveOtelConfig({
    otlpEndpoint: "https://otel.example.com///",
  });
  assert.equal(cfg.otlpEndpoint, "https://otel.example.com");
});
