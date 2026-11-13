---
title: "Observabilidad con OpenTelemetry — Guía de Desarrollo y Admin UI"
description: "Referencia completa para desarrolladores, entidades Content-Type, casos de uso, configuración del servidor y Admin UI para @vicacha-devs/strapi-plugin-opentelemetry."
---

## 1. Instalación y Dependencias

```bash
pnpm add @vicacha-devs/strapi-plugin-opentelemetry
```

## 2. Configuración del Servidor (`config/plugins.ts`)

Agregue la configuración del plugin en el archivo `config/plugins.ts` de su aplicación Strapi v5:

```ts
// config/plugins.ts
export default ({
  env,
}: {
  env: (key: string, defaultValue?: string) => string;
}) => ({
  opentelemetry: {
    enabled: true,
    config: {
      serviceName: env("OTEL_SERVICE_NAME", "strapi-backend"),
      otlpEndpoint: env("OTEL_EXPORTER_OTLP_ENDPOINT", ""),
      sampleRate: 1.0,
    },
  },
});
```

## 3. Recorrido por la Interfaz de Administración (Strapi v5 Admin UI)

Una vez habilitado, el plugin registra su espacio de trabajo y ajustes dentro del panel de administración de Strapi v5 utilizando Strapi Design System v2:

## 4. Entidades Content-Type, Ubicación y Esquemas (`strapi.documents`)

Registers no Content-Types, routes, or admin pages. When `enabled`, the server `register()` lifecycle validates the config, starts the OpenTelemetry Node SDK (OTLP/HTTP traces and metrics plus auto-instrumentations), hooks `strapi.log.error`, adds a request middleware (HTTP spans, the `http.server.request.duration` histogram, and the `http.server.errors` counter), and, when `captureDocumentService` is `true`, wraps Document Service calls in child spans named `strapi.document.<action> <uid>`. `bootstrap()` logs the active exporter and `destroy()` flushes buffered spans and metrics. All exported error text passes through built-in secret and PII redaction.

```mermaid
flowchart LR
  Req["Koa Request"] --> MW["Request Middleware (HTTP span, duration, errors)"]
  Docs["Document Service Calls"] --> Spans["Child Spans strapi.document.<action> <uid>"]
  Log["strapi.log.error"] --> Events["Exception Span Events + strapi.log.errors"]
  MW --> Redact["SanitizingSpanExporter (Secret and PII Redaction)"]
  Spans --> Redact
  Events --> Redact
  Redact --> OTLP["OTLP/HTTP Traces and Metrics"]
```

### Dónde Encontrar las Entidades Content-Type en Strapi v5

- **Strapi Boot Log**: `[opentelemetry] Active for service ...` is logged from `bootstrap()` with the service name and the exporter target (`otlpEndpoint`, `console`, or `no-exporter`).
- **Your OTLP Backend**: traces and metrics arrive at `<otlpEndpoint>/v1/traces` and `<otlpEndpoint>/v1/metrics` in SigNoz, Grafana, Sentry OTLP ingest, or any OTLP/HTTP collector.
- **Strapi Config**: `config/plugins.ts` -> `opentelemetry.config`, validated at boot by `validateOtelConfig`.
- **No Admin UI or Content-Types**: this plugin creates no entities, routes, settings page, or database tables.

Este plugin opera dinámicamente sobre las entidades Content-Type existentes de Strapi (`api::*` y `plugin::*`).

## Integración con el Content Manager de Strapi v5 (`/admin/content-manager`)

> **Grupo en la Barra Lateral del Content Manager**: `No Content Manager panel; instruments the Document Service calls that Content Manager actions trigger`

### Entidades y Componentes en el Content Manager

- Document Service calls (`strapi.documents(...)`) made when editors create, update, publish, or delete entries in `/admin/content-manager`, recorded as `strapi.document.<action> <uid>` child spans
- No Content-Type, route, or database table is created by this plugin

### Por Qué Este Plugin Crea e Integra Entidades en el Content Manager

`@vicacha-devs/strapi-plugin-opentelemetry` adds no Content Manager UI. Every create, update, publish, or delete an editor performs becomes a traced Document Service operation, so slow or failing saves can be tied to a specific content type and plugin in your observability backend.

- **Per-Content-Type Visibility**: spans carry `strapi.document.uid`, `strapi.document.action`, and `strapi.plugin` (for `plugin::*` UIDs).
- **Opt-Out per Environment**: set `captureDocumentService: false` to stop wrapping Document Service calls without disabling HTTP tracing.
- **Safe by Default**: payloads and user identity beyond `enduser.id` are never attached to spans, and error text is redacted before export.

### Cómo Usarlo en el Content Manager de Strapi (Paso a Paso)

1. **Enable the Plugin**: add `opentelemetry` to `config/plugins.ts` and set `OTEL_EXPORTER_OTLP_ENDPOINT` (or `OTEL_CONSOLE_EXPORTER=true` locally).
2. **Work Normally in Content Manager**: save or publish entries in `/admin/content-manager`.
3. **Inspect the Traces**: search your backend for `strapi.document.update` (or `create`, `publish`, `delete`) spans filtered by `strapi.document.uid`.

### Sincronización entre el Content Manager y el Espacio del Plugin

```mermaid
flowchart LR
  CM["Editor Saves or Publishes in Content Manager"] --> DS["Document Service Call"]
  DS --> Span["Child Span strapi.document.<action> <uid>"]
  Span --> Backend["OTLP Backend (Filter by uid and strapi.plugin)"]
```

### Casos de Uso en el Content Manager y Flujos Editoriales

#### Content Manager Use Case 1 — Diagnosing Slow Publishes

- **Para qué sirve y por qué usarlo**: Identify which content type and plugin make publishing slow, without logging any entry content.
- **Cómo ejecutarlo en el Content Manager**: Publish an entry in `/admin/content-manager`, then find the `strapi.document.publish <uid>` span under the request trace and compare its duration with other content types.

## 5. Casos de Uso y Flujos de Trabajo

### Use Case 1 — Tracing Slow or Failing Requests Across Plugins

- **What it is for**: Find which plugin makes an endpoint slow or failing, using the `strapi.plugin` attribute derived from `plugin::<name>.<model>` UIDs and plugin route paths (for example `/api/bookings/...` -> `bookings`).
- **How it works**: Point `otlpEndpoint` at your collector; each request produces an HTTP span with `http.route`, `http.response.status_code`, and `strapi.plugin`, and `http.server.request.duration` is recorded by method, route, and status.

```mermaid
flowchart LR
  Request["GET /api/bookings/slots"] --> Span["HTTP Span (http.route, status, strapi.plugin = bookings)"]
  Span --> Histogram["http.server.request.duration"]
  Histogram --> Backend["OTLP Backend Dashboard"]
```

### Use Case 2 — Capturing Caught Errors from Plugins and Background Jobs

- **What it is for**: Surface errors that plugins, email lifecycles, or background jobs catch and only log, which would otherwise never reach an error tracker.
- **How it works**: The plugin hooks `strapi.log.error`, records each call as an `exception` span event, and counts it in `strapi.log.errors`; unhandled request errors also log `trace_id`, `span_id`, `method`, `path`, and `plugin` for log-trace correlation.

```mermaid
flowchart LR
  Caught["Plugin Catches Error and Calls strapi.log.error"] --> Hook["Logger Hook"]
  Hook --> Event["exception Span Event + strapi.log.errors Counter"]
  Event --> Correlate["Logs Carry trace_id and span_id"]
```

### Use Case 3 — Shipping Telemetry Without Leaking Secrets or PII

- **What it is for**: Send traces to a third-party backend while keeping credentials and personal data out of them.
- **How it works**: Request bodies, `Authorization`, `Cookie`, and user emails or names are never attached to spans. Error text is redacted for `Bearer`/`Basic` tokens, URL credentials, sensitive query parameters, and email addresses, and is length-bounded before redaction so pathological input cannot stall the sanitizer.

```mermaid
flowchart LR
  Error["Error Message or Stack"] --> Bound["Bound Input Length"]
  Bound --> Redact["Redact Tokens, URL Credentials, Query Secrets, Emails"]
  Redact --> Export["Export to OTLP Backend"]
```

## 6. Endpoints REST API (`content-api` y `admin`)

| Método | Ruta del Endpoint | Ámbito | Controlador | Autenticación |
| :----- | :---------------- | :----- | :---------- | :------------ |

## 7. Uso Programático en el Servidor (`strapi.plugin` y `strapi.documents`)

```ts
// Registered services on plugin "opentelemetry": "service"
const pluginService = strapi.plugin("opentelemetry")?.service("service");

// Retrieving plugin settings via Strapi plugin store
const store = strapi.store({ type: "plugin", name: "opentelemetry" });
const settings = await store.get({ key: "settings" });
```

## 8. Solución de Problemas y Verificación

- **Cambios no visibles en el panel Admin**: Ejecute `pnpm strapi build` después de editar `config/plugins.ts`.
- **Aislamiento de dependencias peer**: Mantenga `hoistPattern: ["*", "!@strapi/*"]` en `pnpm-workspace.yaml` para evitar colisiones de contexto en React.
- **Verificación estricta de TypeScript**: Ejecute `pnpm check` para validar `admin/tsconfig.json` y `server/tsconfig.json`.
