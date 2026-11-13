/** Removes trailing "/" in one linear pass (a `/\/+$/` regex backtracks). */
function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) end -= 1;
  return value.slice(0, end);
}

export interface OtelPluginConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  environment: string;
  otlpEndpoint: string;
  otlpHeaders: Record<string, string>;
  sampleRate: number;
  ignorePaths: string[];
  captureDocumentService: boolean;
  consoleExporter: boolean;
  metricExportIntervalMs: number;
}

export const defaultConfig: OtelPluginConfig = {
  enabled: true,
  serviceName: "strapi",
  serviceVersion: "1.0.0",
  environment: process.env.NODE_ENV || "development",
  otlpEndpoint: "",
  otlpHeaders: {},
  sampleRate: 1.0,
  ignorePaths: ["/_health", "/favicon.ico"],
  captureDocumentService: true,
  consoleExporter: false,
  metricExportIntervalMs: 60_000,
};

/**
 * Parses an OTLP header string (`key1=val1,key2=val2`) into a plain object.
 */
export function parseOtlpHeaders(
  raw: string | undefined
): Record<string, string> {
  if (!raw || typeof raw !== "string") {
    return {};
  }

  const headers: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    if (key) {
      headers[key] = value;
    }
  }
  return headers;
}

/**
 * Merges plugin config with standard `OTEL_*` environment variables.
 */
export function resolveOtelConfig(
  rawConfig: Partial<OtelPluginConfig> = {}
): OtelPluginConfig {
  const envEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim() ?? "";
  const envServiceName = process.env.OTEL_SERVICE_NAME?.trim() ?? "";
  const envHeaders = parseOtlpHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);

  return {
    ...defaultConfig,
    ...rawConfig,
    serviceName:
      rawConfig.serviceName || envServiceName || defaultConfig.serviceName,
    otlpEndpoint: stripTrailingSlashes(rawConfig.otlpEndpoint || envEndpoint),
    otlpHeaders: {
      ...envHeaders,
      ...rawConfig.otlpHeaders,
    },
    ignorePaths: rawConfig.ignorePaths ?? defaultConfig.ignorePaths,
  };
}

/**
 * Validates the OpenTelemetry plugin configuration at Strapi boot time.
 */
export function validateOtelConfig(pluginConfig: unknown): void {
  if (
    pluginConfig === null ||
    typeof pluginConfig !== "object" ||
    Array.isArray(pluginConfig)
  ) {
    throw new Error("OpenTelemetry plugin config must be an object");
  }

  const cfg = pluginConfig as Record<string, unknown>;

  if (cfg.enabled !== undefined && typeof cfg.enabled !== "boolean") {
    throw new Error("OpenTelemetry plugin config.enabled must be a boolean");
  }
  if (cfg.serviceName !== undefined && typeof cfg.serviceName !== "string") {
    throw new Error("OpenTelemetry plugin config.serviceName must be a string");
  }
  if (
    cfg.serviceVersion !== undefined &&
    typeof cfg.serviceVersion !== "string"
  ) {
    throw new Error(
      "OpenTelemetry plugin config.serviceVersion must be a string"
    );
  }
  if (cfg.environment !== undefined && typeof cfg.environment !== "string") {
    throw new Error("OpenTelemetry plugin config.environment must be a string");
  }
  if (cfg.otlpEndpoint !== undefined && typeof cfg.otlpEndpoint !== "string") {
    throw new Error(
      "OpenTelemetry plugin config.otlpEndpoint must be a string"
    );
  }
  if (
    cfg.otlpHeaders !== undefined &&
    (cfg.otlpHeaders === null ||
      typeof cfg.otlpHeaders !== "object" ||
      Array.isArray(cfg.otlpHeaders))
  ) {
    throw new Error(
      "OpenTelemetry plugin config.otlpHeaders must be a key-value object"
    );
  }
  if (
    cfg.sampleRate !== undefined &&
    (typeof cfg.sampleRate !== "number" ||
      Number.isNaN(cfg.sampleRate) ||
      cfg.sampleRate < 0 ||
      cfg.sampleRate > 1)
  ) {
    throw new Error(
      "OpenTelemetry plugin config.sampleRate must be a number between 0 and 1"
    );
  }
  if (
    cfg.ignorePaths !== undefined &&
    (!Array.isArray(cfg.ignorePaths) ||
      cfg.ignorePaths.some((p) => typeof p !== "string"))
  ) {
    throw new Error(
      "OpenTelemetry plugin config.ignorePaths must be an array of strings"
    );
  }
  if (
    cfg.captureDocumentService !== undefined &&
    typeof cfg.captureDocumentService !== "boolean"
  ) {
    throw new Error(
      "OpenTelemetry plugin config.captureDocumentService must be a boolean"
    );
  }
  if (
    cfg.consoleExporter !== undefined &&
    typeof cfg.consoleExporter !== "boolean"
  ) {
    throw new Error(
      "OpenTelemetry plugin config.consoleExporter must be a boolean"
    );
  }
  if (
    cfg.metricExportIntervalMs !== undefined &&
    (typeof cfg.metricExportIntervalMs !== "number" ||
      cfg.metricExportIntervalMs < 1000)
  ) {
    throw new Error(
      "OpenTelemetry plugin config.metricExportIntervalMs must be a number >= 1000"
    );
  }
}
