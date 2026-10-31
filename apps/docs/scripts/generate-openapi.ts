#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";

import { type PluginPackageMeta, plugins } from "../docs-packages.ts";
import { assertWithinBoundary } from "./lib/plugin-doc-builder.ts";
import { loadPluginRoutes, type NormalizedPluginRoute } from "./lib/route-loader.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = resolve(HERE, "..");
const REPO_ROOT = resolve(DOCS_ROOT, "../..");
const PACKAGES_DIR = resolve(REPO_ROOT, "packages");
const OUTPUT_DIR = resolve(DOCS_ROOT, "schemas");

interface RawStrapiAttribute {
  type?: string;
  maxLength?: number;
  min?: number;
  default?: unknown;
  enum?: string[];
  relation?: string;
  target?: string;
  required?: boolean;
  private?: boolean;
}

interface ContentTypeEntryMeta {
  displayName: string;
  singularName: string;
  pluralName: string;
  folderName: string;
}

interface OpenApiParameter {
  name: string;
  in: "path" | "query";
  required: boolean;
  description: string;
  schema: { type: string };
}

interface OpenApiOperation {
  operationId: string;
  summary: string;
  description: string;
  tags: string[];
  parameters?: OpenApiParameter[];
  security?: Array<Record<string, string[]>>;
  requestBody?: Record<string, unknown>;
  responses: Record<string, unknown>;
}

function strapiAttrToOpenApi(attr: RawStrapiAttribute): Record<string, unknown> {
  switch (attr.type) {
    case "string":
    case "uid":
    case "text":
    case "richtext":
      return {
        type: "string",
        ...(attr.maxLength ? { maxLength: attr.maxLength } : {}),
        ...(attr.default !== undefined ? { default: attr.default } : {}),
      };
    case "email":
      return { type: "string", format: "email" };
    case "date":
      return { type: "string", format: "date" };
    case "datetime":
      return { type: "string", format: "date-time" };
    case "integer":
    case "biginteger":
      return {
        type: "integer",
        ...(attr.min !== undefined ? { minimum: attr.min } : {}),
        ...(attr.default !== undefined ? { default: attr.default } : {}),
      };
    case "float":
    case "decimal":
      return { type: "number" };
    case "boolean":
      return {
        type: "boolean",
        ...(attr.default !== undefined ? { default: attr.default } : {}),
      };
    case "enumeration":
      return {
        type: "string",
        enum: attr.enum || [],
        ...(attr.default !== undefined ? { default: attr.default } : {}),
      };
    case "json":
      return { type: "object", additionalProperties: true };
    case "media":
      return {
        type: "object",
        description: "Strapi Media Library asset reference",
        properties: {
          id: { type: "integer" },
          url: { type: "string" },
          mime: { type: "string" },
        },
      };
    case "relation":
      return {
        type: "string",
        description: `Relation (${attr.relation || "manyToOne"}) to ${attr.target || "target entity"} documentId`,
      };
    default:
      return { type: "string" };
  }
}

function loadContentTypeSchemas(pkgDir: string): {
  schemas: Record<string, unknown>;
  entriesMeta: ContentTypeEntryMeta[];
} {
  const ctDir = join(pkgDir, "server/src/content-types");
  const schemas: Record<string, unknown> = {};
  const entriesMeta: ContentTypeEntryMeta[] = [];
  if (!existsSync(ctDir)) return { schemas, entriesMeta };

  for (const entry of readdirSync(ctDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const schemaPath = join(ctDir, entry.name, "schema.json");
    if (!existsSync(schemaPath)) continue;
    const raw = JSON.parse(readFileSync(schemaPath, "utf8")) as {
      info?: {
        displayName?: string;
        singularName?: string;
        pluralName?: string;
        description?: string;
      };
      attributes?: Record<string, RawStrapiAttribute>;
    };
    const displayName = (raw.info?.displayName || entry.name).replace(/[^a-zA-Z0-9]/g, "");
    const singularName = String(raw.info?.singularName || entry.name).toLowerCase();
    const pluralName = String(raw.info?.pluralName || `${singularName}s`).toLowerCase();
    const properties: Record<string, unknown> = {
      documentId: { type: "string", description: "Strapi v5 Document Service unique identifier" },
    };
    const required: string[] = [];

    for (const [fieldName, attr] of Object.entries(raw.attributes || {})) {
      if (attr.private) continue;
      properties[fieldName] = strapiAttrToOpenApi(attr);
      if (attr.required) required.push(fieldName);
    }

    schemas[displayName] = {
      type: "object",
      description: raw.info?.description || `${raw.info?.displayName || entry.name} record`,
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
    entriesMeta.push({
      displayName,
      singularName,
      pluralName,
      folderName: entry.name.toLowerCase(),
    });
  }
  return { schemas, entriesMeta };
}

function resolveSchemaRefForRoute(
  pathStr: string,
  handlerStr: string,
  entriesMeta: ContentTypeEntryMeta[]
): string | undefined {
  if (entriesMeta.length === 0) return undefined;
  const hay = `${pathStr} ${handlerStr}`.toLowerCase();
  if (
    /\b(settings|rotate-keys|public-key|qibla|prayer-times|zakat|fitrana|fidyah|calculate|calculator|quran|asma|tasbih|pillars|content-types|locales|allowed-fields|options|live|webhook|clear-settings)\b/.test(
      hay
    )
  ) {
    return undefined;
  }

  for (const meta of entriesMeta) {
    const tokens = [meta.singularName, meta.pluralName, meta.folderName].flatMap((t) =>
      t.split(/[-_]+/).filter((w) => w.length >= 4)
    );
    if (tokens.some((tok) => hay.includes(tok))) {
      return `#/components/schemas/${meta.displayName}`;
    }
  }
  if (entriesMeta.length === 1) {
    return `#/components/schemas/${entriesMeta[0].displayName}`;
  }
  return undefined;
}

function resolveResponseMediaAndSchema(
  pathStr: string,
  matchedRef: string | undefined
): Record<string, unknown> {
  if (pathStr.endsWith(".ics")) {
    return {
      "text/calendar": {
        schema: { type: "string", description: "RFC 5545 iCalendar (.ics) stream" },
      },
    };
  }
  if (pathStr.endsWith("/csv") || pathStr.endsWith(".csv")) {
    return {
      "text/csv": {
        schema: { type: "string", description: "Formula-injection-safe CSV export" },
      },
    };
  }
  if (pathStr.endsWith(".xml")) {
    return {
      "application/xml": {
        schema: { type: "string", description: "UTF-8 XML feed / Sitemap document" },
      },
    };
  }
  if (pathStr.endsWith("/print") || pathStr.endsWith("/printable")) {
    return {
      "text/html": {
        schema: { type: "string", description: "Printable credential HTML document" },
      },
    };
  }
  return {
    "application/json": {
      schema: matchedRef
        ? { type: "object", properties: { data: { $ref: matchedRef } } }
        : {
            type: "object",
            properties: { data: { type: "object", additionalProperties: true } },
          },
    },
  };
}

function buildQueryParameters(method: string, pathStr: string): OpenApiParameter[] {
  if (method !== "get") return [];
  const p = pathStr.toLowerCase();
  const params: OpenApiParameter[] = [];
  const addQ = (name: string, description: string, type = "string"): void => {
    params.push({ name, in: "query", required: false, description, schema: { type } });
  };

  if (p.includes("occurrences") || p.endsWith("feed.ics") || p.endsWith("/calendar")) {
    addQ("from", "Start of ISO-8601 date/time query window");
    addQ("to", "End of ISO-8601 date/time query window");
    addQ("sourceId", "Filter by registered calendar collection source ID");
    addQ("category", "Filter by category name");
    addQ("locale", "BCP-47 content/display locale (e.g. en, es, ar, tr)");
  } else if (p.includes("/slots")) {
    addQ("from", "Start date (YYYY-MM-DD)");
    addQ("to", "End date (YYYY-MM-DD)");
    addQ("partySize", "Requested guest count", "integer");
    addQ("preferredLanguage", "Preferred host language code");
  } else if (p.includes("/qibla")) {
    addQ("lat", "Observer latitude in decimal degrees", "number");
    addQ("lng", "Observer longitude in decimal degrees", "number");
  } else if (p.includes("/prayer-times")) {
    addQ("date", "Target Gregorian date (YYYY-MM-DD)");
    addQ("method", "Astronomical calculation method code");
  } else if (p.includes("/search")) {
    addQ("q", "Search query string");
    addQ("locale", "Filter matches by Strapi locale");
  } else if (!p.includes("{") && !p.includes("settings") && !p.includes("public-key")) {
    addQ("locale", "Optional Strapi i18n locale filter");
  }
  return params;
}

function buildOperationId(method: string, pathStr: string): string {
  const parts = pathStr
    .replace(/^\//, "")
    .replace(/\{(\w+)\}/g, "By_$1")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  return `${method.toLowerCase()}${parts.join("")}`;
}

function humanizeHandler(handler: string, method: string, pathStr: string): string {
  const action = handler.split(".").pop() || "";
  if (action && action !== "index") {
    return action
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return `${method.toUpperCase()} ${pathStr}`;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildOpenApiSpec(
  pluginMeta: PluginPackageMeta,
  pkgJson: { version?: string; description?: string },
  routes: NormalizedPluginRoute[],
  contentTypeSchemas: Record<string, unknown>,
  entriesMeta: ContentTypeEntryMeta[]
): {
  openapi: string;
  info: Record<string, string>;
  servers: Array<Record<string, string>>;
  paths: Record<string, Record<string, OpenApiOperation>>;
  components: Record<string, unknown>;
} {
  const paths: Record<string, Record<string, OpenApiOperation>> = {};

  for (const r of routes) {
    if (!paths[r.path]) paths[r.path] = {};
    const paramMatches = [...r.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    const pathParameters: OpenApiParameter[] = paramMatches.map((paramName) => ({
      name: paramName,
      in: "path",
      required: true,
      description: `Target ${paramName} identifier`,
      schema: { type: "string" },
    }));
    const queryParameters = buildQueryParameters(r.method, r.path);
    const parameters = [...pathParameters, ...queryParameters];

    const tag = r.routeType === "content-api" ? "Content API" : "Admin API";
    const summary = humanizeHandler(r.handler, r.method, r.path);
    const operationId = buildOperationId(r.method, r.path);
    const matchedRef = resolveSchemaRefForRoute(r.path, r.handler, entriesMeta);
    const authNote =
      r.routeType === "content-api" && r.authenticated
        ? " Protected by Strapi Users & Permissions / API Token (`bearerAuth`); can be granted to the `Public` role in Strapi Settings."
        : "";

    const operation: OpenApiOperation = {
      operationId,
      summary,
      description: `Strapi v5 ${tag} endpoint handled by \`${r.handler}\`.${authNote}`,
      tags: [tag],
      ...(parameters.length > 0 ? { parameters } : {}),
      ...(r.authenticated ? { security: [{ bearerAuth: [] }] } : {}),
      responses: {
        "200": {
          description: "Successful response",
          content: resolveResponseMediaAndSchema(r.path, matchedRef),
        },
        "400": { description: "Bad Request — validation or parameter error" },
        ...(r.authenticated
          ? {
              "401": { description: "Unauthorized — missing or invalid Bearer token" },
              "403": { description: "Forbidden — insufficient Strapi RBAC permissions" },
            }
          : {}),
      },
    };

    if (["post", "put", "patch"].includes(r.method)) {
      const isActionRoute =
        /\b(rotate-keys|seed|clear-settings|approve|reject|cancel|complete|confirm|check-in|sync|dispatch)\b/i.test(
          r.path
        );
      operation.requestBody = {
        required: !isActionRoute,
        content: {
          "application/json": {
            schema:
              matchedRef && !isActionRoute
                ? { $ref: matchedRef }
                : { type: "object", additionalProperties: true },
          },
        },
      };
    }

    paths[r.path][r.method] = operation;
  }

  return {
    openapi: "3.0.3",
    info: {
      title: `${pluginMeta.label} (${pluginMeta.npmName})`,
      version: pkgJson.version || "1.0.0",
      description:
        pkgJson.description || `OpenAPI specification for ${pluginMeta.npmName} Strapi v5 plugin.`,
    },
    servers: [
      {
        url: "http://127.0.0.1:1337",
        description: "Local Strapi v5 development server",
      },
    ],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Strapi v5 API Token or Admin JWT Bearer authentication",
        },
      },
      ...(Object.keys(contentTypeSchemas).length > 0 ? { schemas: contentTypeSchemas } : {}),
    },
  };
}

function generateSidebarLinks(
  spec: { paths: Record<string, Record<string, OpenApiOperation>> },
  slug: string
): Array<{ label: string; collapsed: boolean; items: Array<{ label: string; link: string }> }> {
  const basePath = `/${slug}/api/`;
  const tagGroups: Record<string, Array<{ label: string; link: string }>> = {};

  for (const [, methods] of Object.entries(spec.paths || {})) {
    for (const [, op] of Object.entries(methods)) {
      if (!op.operationId) continue;
      const tag = (op.tags && op.tags[0]) || "Operations";
      if (!tagGroups[tag]) tagGroups[tag] = [];
      tagGroups[tag].push({
        label: op.summary || op.operationId,
        link: `${basePath}operations/${slugify(op.operationId)}/`,
      });
    }
  }

  return Object.entries(tagGroups).map(([tag, items]) => ({
    label: tag,
    collapsed: true,
    items,
  }));
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const sidebarData: Record<string, unknown> = {};
  let generatedCount = 0;

  for (const pluginMeta of plugins) {
    const pkgDir = assertWithinBoundary(
      resolve(PACKAGES_DIR, basename(pluginMeta.dir)),
      PACKAGES_DIR
    );
    const pkgJson = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")) as {
      version?: string;
      description?: string;
    };
    const routes = await loadPluginRoutes(pkgDir, pluginMeta.pluginId);
    const { schemas: ctSchemas, entriesMeta } = loadContentTypeSchemas(pkgDir);

    const spec = buildOpenApiSpec(pluginMeta, pkgJson, routes, ctSchemas, entriesMeta);
    const yamlContent = stringify(spec, { lineWidth: 110 });
    const outPath = assertWithinBoundary(
      resolve(OUTPUT_DIR, `${basename(pluginMeta.schemaFile)}.yaml`),
      OUTPUT_DIR
    );
    writeFileSync(outPath, yamlContent, "utf8");

    sidebarData[pluginMeta.slug] = generateSidebarLinks(spec, pluginMeta.slug);
    generatedCount++;
    console.warn(
      `[generate-openapi] ${pluginMeta.slug}: ${routes.length} routes, ${Object.keys(ctSchemas).length} schemas -> schemas/${pluginMeta.schemaFile}.yaml`
    );
  }

  const sidebarPath = assertWithinBoundary(resolve(OUTPUT_DIR, "_sidebar.json"), OUTPUT_DIR);
  writeFileSync(sidebarPath, `${JSON.stringify(sidebarData, null, 2)}\n`, "utf8");
  console.warn(`[generate-openapi] Done! Generated ${generatedCount} OpenAPI specs.`);
}

await main();
