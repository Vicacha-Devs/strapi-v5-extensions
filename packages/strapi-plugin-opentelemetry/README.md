# `@vicacha-devs/strapi-plugin-opentelemetry`

Vendor-neutral **OpenTelemetry** error tracking and performance monitoring (APM) plugin for **Strapi v5**.

Instruments Node.js, HTTP/Koa requests, PostgreSQL/SQLite queries, Strapi v5 Document Service operations, and caught plugin errors (`strapi.log.error`), exporting traces and metrics over **OTLP/HTTP** to **SigNoz**, **Grafana Tempo / Alloy**, **Sentry OTLP**, **Datadog**, **Jaeger**, or any OpenTelemetry Collector.

## Key Features

- **Automatic Node.js & Database Instrumentation**: Traces incoming/outgoing HTTP (`http`, `undici`) and database calls (`pg`, etc.) via `@opentelemetry/auto-instrumentations-node` (with noisy `fs` instrumentation disabled).
- **HTTP Request Tracking & APM Metrics**: Records `http.server.request.duration` histograms, `http.server.errors` counters, `http.route`, `http.response.status_code`, and authenticated `enduser.id`.
- **Strapi v5 Document Service Tracing**: Wraps `strapi.documents.use(...)` in child spans (`strapi.document.<action> <uid>`) with `strapi.document.uid`, `strapi.document.action`, and `strapi.plugin` attributes.
- **Per-Plugin Failure Attribution**: Automatically extracts `strapi.plugin` from `plugin::<name>.<model>` UIDs and plugin route paths (e.g., `/api/bookings/...` -> `bookings`).
- **Caught Plugin Error Capture**: Hooks `strapi.log.error` so errors caught and logged inside plugins, email lifecycles, or background jobs are recorded as `exception` span events and counted in `strapi.log.errors`.
- **Log-Trace Correlation**: Logs `trace_id`, `span_id`, `method`, `path`, and `plugin` on unhandled request errors.
- **Built-In Secret & PII Redaction**: Scrubs `Bearer`/`Basic` tokens, URL credentials (`user:pass@`), sensitive query parameters (`token`, `api_key`, `secret`, `password`, etc.), and email addresses from error messages, stack traces, and outgoing `url.full`/`http.url`/`url.query` span attributes before export.
- **Graceful Shutdown**: Flushes buffered spans and metrics in Strapi's `destroy()` lifecycle hook.

## Installation & Configuration

Add `@vicacha-devs/strapi-plugin-opentelemetry` to your Strapi v5 project and configure it in `config/plugins.ts`:

```ts
export default ({ env }) => ({
  opentelemetry: {
    enabled: env.bool("OTEL_ENABLED", true),
    config: {
      serviceName: env("OTEL_SERVICE_NAME", "strapi-backend"),
      serviceVersion: env("npm_package_version", "1.0.0"),
      environment: env("NODE_ENV", "development"),
      otlpEndpoint: env("OTEL_EXPORTER_OTLP_ENDPOINT", ""),
      sampleRate: Number(env("OTEL_TRACES_SAMPLE_RATE", "1.0")),
      ignorePaths: ["/_health", "/favicon.ico"],
      captureDocumentService: true,
      consoleExporter: env.bool("OTEL_CONSOLE_EXPORTER", false),
    },
  },
});
```

## Configuration Reference

All options are validated at Strapi boot time by `validateOtelConfig`. Standard OpenTelemetry environment variables (`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_HEADERS`) are automatically merged.

| Option | Env Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `enabled` | `OTEL_ENABLED` | `boolean` | `true` | Enable or disable SDK, middleware, and hooks |
| `serviceName` | `OTEL_SERVICE_NAME` | `string` | `"strapi"` | Service name reported in `service.name` |
| `serviceVersion` | — | `string` | `"1.0.0"` | Service version reported in `service.version` |
| `environment` | `NODE_ENV` | `string` | `process.env.NODE_ENV \|\| "development"` | Reported in `deployment.environment.name` |
| `otlpEndpoint` | `OTEL_EXPORTER_OTLP_ENDPOINT` | `string` | `""` | Base OTLP/HTTP URL (exports to `/v1/traces` and `/v1/metrics`) |
| `otlpHeaders` | `OTEL_EXPORTER_OTLP_HEADERS` | `Record<string, string>` | `{}` | Auth/tenant headers (env format: `k1=v1,k2=v2`) |
| `sampleRate` | `OTEL_TRACES_SAMPLE_RATE` | `number` (`0..1`) | `1.0` | Root trace sampling ratio wrapped in `ParentBasedSampler` |
| `ignorePaths` | — | `string[]` | `["/_health", "/favicon.ico"]` | URL path prefixes excluded from HTTP tracing/metrics |
| `captureDocumentService` | — | `boolean` | `true` | Wrap `strapi.documents.use(...)` calls in child spans |
| `consoleExporter` | `OTEL_CONSOLE_EXPORTER` | `boolean` | `false` | Export spans to stdout when `otlpEndpoint` is empty |
| `metricExportIntervalMs` | — | `number` (`>= 1000`) | `60000` | Interval in ms for `PeriodicExportingMetricReader` |

## Telemetry Emitted

### Span Attributes
- **HTTP Requests**: `http.request.method`, `url.path`, `http.route`, `http.response.status_code`, `strapi.plugin` (when matched), `enduser.id` (when authenticated).
- **Document Service**: `strapi.document.uid`, `strapi.document.action`, `strapi.plugin` (for `plugin::*` UIDs).
- **Errors**: `exception` span event with sanitized `Error` + `SpanStatusCode.ERROR` on unhandled exceptions, HTTP `>= 500` responses, and `strapi.log.error(...)` calls.

### Metrics
- `http.server.request.duration` (Histogram, `ms`) — Request latency by method, route, status/error type, and `strapi.plugin`.
- `http.server.errors` (Counter) — Count of `>= 500` and unhandled HTTP errors.
- `strapi.log.errors` (Counter) — Count of errors logged via `strapi.log.error`.

## Security & Privacy

- **Zero body/header logging**: Request/response payloads, `Authorization`, `Cookie`, and user emails/names are never attached to spans.
- **Automatic redaction**: `SanitizingSpanExporter`, `sanitizeError`, and `sanitizeTelemetryText` scrub `Bearer`/`Basic` tokens, URL credentials, sensitive query keys (`token`, `access_token`, `api_key`, `key`, `secret`, `password`, `auth`, `signature`, `code`), and email addresses before telemetry leaves the process.
- **Production checklist**:
  - Use `https://` for `OTEL_EXPORTER_OTLP_ENDPOINT` outside localhost/private VPCs.
  - Keep `OTEL_CONSOLE_EXPORTER=false` in production.
  - Store `OTEL_EXPORTER_OTLP_HEADERS` in your secrets manager.

## Collector Examples

- **SigNoz / Grafana Alloy / Local OTel Collector:**
  ```env
  OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
  ```
- **Sentry OTLP Ingest:**
  ```env
  OTEL_EXPORTER_OTLP_ENDPOINT=https://o0.ingest.sentry.io/api/<project-id>/integration/otlp
  OTEL_EXPORTER_OTLP_HEADERS="x-sentry-auth=sentry sentry_key=<public-key>"
  ```
- **Local Development (stdout only):**
  ```env
  OTEL_CONSOLE_EXPORTER=true
  ```

## Custom Instrumentation

Use `@opentelemetry/api` anywhere in your Strapi services, controllers, or plugins—spans will automatically nest under the active request trace:

```ts
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("my-plugin");

await tracer.startActiveSpan("bookings.syncCalendar", async (span) => {
  try {
    // your work
  } finally {
    span.end();
  }
});
```
