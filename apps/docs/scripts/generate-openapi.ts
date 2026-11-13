#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";

import { type PluginPackageMeta, plugins } from "../docs-packages.ts";
import { assertWithinBoundary } from "./lib/plugin-doc-builder.ts";
import {
  loadPluginRoutes,
  type NormalizedPluginRoute,
} from "./lib/route-loader.ts";

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

function strapiAttrToOpenApi(
  attr: RawStrapiAttribute
): Record<string, unknown> {
  const def = attr.default !== undefined ? { default: attr.default } : {};
  const t = attr.type || "string";
  if (t === "email" || t === "date") return { type: "string", format: t };
  if (t === "datetime") return { type: "string", format: "date-time" };
  if (t === "integer" || t === "biginteger") {
    return {
      type: "integer",
      ...(attr.min !== undefined ? { minimum: attr.min } : {}),
      ...def,
    };
  }
  if (t === "float" || t === "decimal") return { type: "number" };
  if (t === "boolean") return { type: "boolean", ...def };
  if (t === "enumeration") {
    return { type: "string", enum: attr.enum || [], ...def };
  }
  if (t === "json") return { type: "object", additionalProperties: true };
  if (t === "media") {
    return {
      type: "object",
      description: "Strapi Media Library asset reference",
      properties: {
        id: { type: "integer" },
        url: { type: "string" },
        mime: { type: "string" },
      },
    };
  }
  if (t === "relation") {
    return {
      type: "string",
      description: `Relation (${attr.relation || "manyToOne"}) to ${attr.target || "target entity"} documentId`,
    };
  }
  return {
    type: "string",
    ...(attr.maxLength ? { maxLength: attr.maxLength } : {}),
    ...def,
  };
}

function loadContentTypeSchemas(pkgDir: string) {
  const ctDir = join(pkgDir, "server/src/content-types");
  const schemas: Record<string, unknown> = {};
  const entriesMeta: ContentTypeEntryMeta[] = [];
  if (!existsSync(ctDir)) return { schemas, entriesMeta };

  for (const entry of readdirSync(ctDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const schemaPath = join(ctDir, entry.name, "schema.json");
    if (!existsSync(schemaPath)) continue;
    const raw = JSON.parse(readFileSync(schemaPath, "utf8")) as {
      info?: Record<string, string | undefined>;
      attributes?: Record<string, RawStrapiAttribute>;
    };
    const rawTitle = raw.info?.displayName || entry.name;
    const displayName = rawTitle.replace(/[^a-zA-Z0-9]/g, "");
    const singularName = (raw.info?.singularName || entry.name).toLowerCase();
    const pluralName = (
      raw.info?.pluralName || `${singularName}s`
    ).toLowerCase();
    const properties: Record<string, unknown> = {
      documentId: {
        type: "string",
        description: "Strapi v5 Document Service unique identifier",
      },
    };
    const required: string[] = [];

    for (const [fieldName, attr] of Object.entries(raw.attributes || {})) {
      if (attr.private) continue;
      properties[fieldName] = strapiAttrToOpenApi(attr);
      if (attr.required) required.push(fieldName);
    }

    schemas[displayName] = {
      type: "object",
      description: raw.info?.description || `${rawTitle} record`,
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
    const tokens = [
      meta.singularName,
      meta.pluralName,
      meta.folderName,
    ].flatMap((t) => t.split(/[-_]+/).filter((w) => w.length >= 4));
    if (tokens.some((tok) => hay.includes(tok))) {
      return `#/components/schemas/${meta.displayName}`;
    }
  }
  return entriesMeta.length === 1
    ? `#/components/schemas/${entriesMeta[0].displayName}`
    : undefined;
}

const STATIC_MEDIA_RESPONSES: Array<[string, string, string]> = [
  [".ics", "text/calendar", "RFC 5545 iCalendar (.ics) stream"],
  ["/csv", "text/csv", "Formula-injection-safe CSV export"],
  [".csv", "text/csv", "Formula-injection-safe CSV export"],
  [".xml", "application/xml", "UTF-8 XML feed / Sitemap document"],
  ["/print", "text/html", "Printable credential HTML document"],
  ["/printable", "text/html", "Printable credential HTML document"],
];

function resolveResponseMediaAndSchema(
  pathStr: string,
  matchedRef: string | undefined
): Record<string, unknown> {
  const staticHit = STATIC_MEDIA_RESPONSES.find(([ext]) =>
    pathStr.endsWith(ext)
  );
  if (staticHit) {
    const [, media, description] = staticHit;
    return { [media]: { schema: { type: "string", description } } };
  }
  const data = matchedRef
    ? { $ref: matchedRef }
    : { type: "object", additionalProperties: true };
  return {
    "application/json": { schema: { type: "object", properties: { data } } },
  };
}

function buildQueryParameters(
  method: string,
  pathStr: string
): OpenApiParameter[] {
  if (method !== "get") return [];
  const p = pathStr.toLowerCase();
  let specs: Array<[string, string, string?]> = [];

  if (/occurrences|feed\.ics$|\/calendar$/.test(p)) {
    specs = [
      ["from", "Start of ISO-8601 date/time query window"],
      ["to", "End of ISO-8601 date/time query window"],
      ["sourceId", "Filter by registered calendar collection source ID"],
      ["category", "Filter by category name"],
      ["locale", "BCP-47 content/display locale (e.g. en, es, ar, tr)"],
    ];
  } else if (p.includes("/slots")) {
    specs = [
      ["from", "Start date (YYYY-MM-DD)"],
      ["to", "End date (YYYY-MM-DD)"],
      ["partySize", "Requested guest count", "integer"],
      ["preferredLanguage", "Preferred host language code"],
    ];
  } else if (p.includes("/qibla")) {
    specs = [
      ["lat", "Observer latitude in decimal degrees", "number"],
      ["lng", "Observer longitude in decimal degrees", "number"],
    ];
  } else if (p.includes("/prayer-times")) {
    specs = [
      ["date", "Target Gregorian date (YYYY-MM-DD)"],
      ["method", "Astronomical calculation method code"],
    ];
  } else if (p.includes("/search")) {
    specs = [
      ["q", "Search query string"],
      ["locale", "Filter matches by Strapi locale"],
    ];
  } else if (p.includes("allowed-fields")) {
    specs = [
      ["singularName", "Singular name or UID of the target collection type"],
      [
        "populateLinkedModels",
        "Whether to include first-level relation scalar fields",
        "boolean",
      ],
    ];
  } else if (!/(\{|settings|public-key|content-types|locales)/.test(p)) {
    specs = [["locale", "Optional Strapi i18n locale filter"]];
  }
  return specs.map(([name, description, type = "string"]) => ({
    name,
    in: "query",
    required: false,
    description,
    schema: { type },
  }));
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

function humanizeHandler(
  handler: string,
  method: string,
  pathStr: string
): string {
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
) {
  const paths: Record<string, Record<string, OpenApiOperation>> = {};

  for (const r of routes) {
    if (!paths[r.path]) paths[r.path] = {};
    const pathParameters: OpenApiParameter[] = [
      ...r.path.matchAll(/\{(\w+)\}/g),
    ].map(([, name]) => ({
      name,
      in: "path",
      required: true,
      description: `Target ${name} identifier`,
      schema: { type: "string" },
    }));
    const parameters = [
      ...pathParameters,
      ...buildQueryParameters(r.method, r.path),
    ];

    const tag = r.routeType === "content-api" ? "Content API" : "Admin API";
    const matchedRef = resolveSchemaRefForRoute(r.path, r.handler, entriesMeta);
    const authNote =
      r.routeType === "content-api" && r.authenticated
        ? " Protected by Strapi Users & Permissions / API Token (`bearerAuth`); can be granted to the `Public` role in Strapi Settings."
        : "";

    const operation: OpenApiOperation = {
      operationId: buildOperationId(r.method, r.path),
      summary: humanizeHandler(r.handler, r.method, r.path),
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
              "401": {
                description: "Unauthorized — missing or invalid Bearer token",
              },
              "403": {
                description: "Forbidden — insufficient Strapi RBAC permissions",
              },
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
        pkgJson.description ||
        `OpenAPI specification for ${pluginMeta.npmName} Strapi v5 plugin.`,
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
      ...(Object.keys(contentTypeSchemas).length > 0
        ? { schemas: contentTypeSchemas }
        : {}),
    },
  };
}

function generateSidebarLinks(
  spec: { paths: Record<string, Record<string, OpenApiOperation>> },
  slug: string
) {
  const basePath = `/${slug}/api/`;
  const tagGroups: Record<string, Array<{ label: string; link: string }>> = {};

  for (const [, methods] of Object.entries(spec.paths || {})) {
    for (const [, op] of Object.entries(methods)) {
      if (!op.operationId) continue;
      const tag = op.tags?.[0] || "Operations";
      if (!tagGroups[tag]) tagGroups[tag] = [];
      tagGroups[tag].push({
        label: op.summary || op.operationId,
        link: `${basePath}operations/${slugify(op.operationId)}/`,
      });
    }
  }

  return Object.entries(tagGroups).map(([label, items]) => ({
    label,
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
    const pkgJson = JSON.parse(
      readFileSync(join(pkgDir, "package.json"), "utf8")
    ) as { version?: string; description?: string };
    // No HTTP routes means no OpenAPI spec to generate.
    if (!pluginMeta.schemaFile) continue;
    const routes = await loadPluginRoutes(pkgDir, pluginMeta.pluginId);
    const { schemas: ctSchemas, entriesMeta } = loadContentTypeSchemas(pkgDir);

    const spec = buildOpenApiSpec(
      pluginMeta,
      pkgJson,
      routes,
      ctSchemas,
      entriesMeta
    );
    const outPath = assertWithinBoundary(
      resolve(OUTPUT_DIR, `${basename(pluginMeta.schemaFile)}.yaml`),
      OUTPUT_DIR
    );
    writeFileSync(outPath, stringify(spec, { lineWidth: 110 }), "utf8");

    sidebarData[pluginMeta.slug] = generateSidebarLinks(spec, pluginMeta.slug);
    generatedCount++;
    console.warn(
      `[generate-openapi] ${pluginMeta.slug}: ${routes.length} routes, ${Object.keys(ctSchemas).length} schemas -> schemas/${pluginMeta.schemaFile}.yaml`
    );
  }

  const sidebarPath = assertWithinBoundary(
    resolve(OUTPUT_DIR, "_sidebar.json"),
    OUTPUT_DIR
  );
  writeFileSync(
    sidebarPath,
    `${JSON.stringify(sidebarData, null, 2)}\n`,
    "utf8"
  );
  console.warn(
    `[generate-openapi] Done! Generated ${generatedCount} OpenAPI specs.`
  );
}

await main();
