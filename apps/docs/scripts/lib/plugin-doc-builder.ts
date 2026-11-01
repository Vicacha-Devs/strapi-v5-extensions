import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve, sep } from "node:path";

import type {
  PluginPackageMeta,
  SupportedLocale,
} from "../../docs-packages.ts";
import { buildContentManagerSectionMarkdown } from "./plugin-content-manager.ts";
import {
  type ContentTypeDoc,
  LOCALE_TEXT,
  type LocaleDocText,
  PLUGIN_SAMPLE_CONFIG,
  type SchemaAttributeDoc,
  SITEMAP_INLINE_CONTENT_TYPES,
} from "./plugin-doc-i18n.ts";
import {
  PLUGIN_ENTITY_GUIDE,
  type UseCaseScreenshotKind,
} from "./plugin-use-cases.ts";
import type { NormalizedPluginRoute } from "./route-loader.ts";

export interface InspectedPluginDetails {
  pkgJson: { name?: string; version?: string; description?: string };
  contentTypes: ContentTypeDoc[];
  translations: Record<SupportedLocale, Record<string, string>>;
  serviceNames: string[];
}

interface RawSchemaJson {
  kind?: string;
  collectionName?: string;
  info?: { singularName?: string; displayName?: string; description?: string };
  options?: { draftAndPublish?: boolean };
  pluginOptions?: {
    "content-manager"?: { visible?: boolean };
    "i18n"?: { localized?: boolean };
  };
  attributes?: Record<string, SchemaAttributeDoc>;
}

export function assertWithinBoundary(
  targetPath: string,
  baseDir: string
): string {
  const resolved = resolve(targetPath);
  const boundary = resolve(baseDir) + sep;
  if (!resolved.startsWith(boundary)) {
    throw new Error(`Security error: path escapes boundary: ${resolved}`);
  }
  return resolved;
}

export function yamlQuote(s: unknown): string {
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function inspectPluginDetails(
  pkgDir: string,
  serviceNames: string[] = ["service"]
): InspectedPluginDetails {
  const pkgJson = readJson<InspectedPluginDetails["pkgJson"]>(
    join(pkgDir, "package.json")
  );
  const ctDir = join(pkgDir, "server/src/content-types");
  const compDir = join(pkgDir, "server/src/components");
  const contentTypes: ContentTypeDoc[] = [];

  if (existsSync(ctDir)) {
    for (const entry of readdirSync(ctDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const schemaPath = join(ctDir, entry.name, "schema.json");
      if (!existsSync(schemaPath)) continue;
      const raw = readJson<RawSchemaJson>(schemaPath);
      contentTypes.push({
        singularName: raw.info?.singularName || entry.name,
        displayName: raw.info?.displayName || entry.name,
        kind: raw.kind || "collectionType",
        collectionName: raw.collectionName || entry.name,
        visibleInContentManager:
          raw.pluginOptions?.["content-manager"]?.visible !== false,
        draftAndPublish: Boolean(raw.options?.draftAndPublish),
        localized: Boolean(raw.pluginOptions?.i18n?.localized),
        description: raw.info?.description || "",
        attributes: raw.attributes || {},
      });
    }
    if (contentTypes.length === 0 && existsSync(join(ctDir, "index.ts"))) {
      contentTypes.push(...SITEMAP_INLINE_CONTENT_TYPES);
    }
  }

  if (existsSync(compDir)) {
    for (const entry of readdirSync(compDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const raw = readJson<RawSchemaJson>(join(compDir, entry.name));
      const compSlug = entry.name.replace(/\.json$/, "");
      contentTypes.push({
        uidOverride: `shared.${compSlug}`,
        singularName: compSlug,
        displayName: `Component: ${raw.info?.displayName || compSlug}`,
        kind: "component",
        collectionName: raw.collectionName || `components_shared_${compSlug}`,
        visibleInContentManager: true,
        draftAndPublish: false,
        localized: true,
        description: `Shared Strapi component (shared.${compSlug}) managed in Content-Type Builder and Content Manager`,
        attributes: raw.attributes || {},
      });
    }
  }

  const translations = {} as Record<SupportedLocale, Record<string, string>>;
  for (const loc of ["en", "es", "ar", "tr"] as SupportedLocale[]) {
    const found = [
      join(pkgDir, `admin/src/translations/${loc}.json`),
      join(pkgDir, `admin/translations/${loc}.json`),
    ].find(existsSync);
    translations[loc] = found ? readJson<Record<string, string>>(found) : {};
  }

  return { pkgJson, contentTypes, translations, serviceNames };
}

function buildSampleTranslationsTable(
  dict: Record<string, string>,
  t: LocaleDocText
): string {
  const valid = Object.entries(dict).filter(
    ([, v]) => typeof v === "string" && v.trim().length > 0
  );
  const direct = valid.filter(([k]) => !k.includes(".")).slice(0, 8);
  const chosen =
    direct.length >= 4
      ? direct
      : valid.filter(([, v]) => v.length < 90).slice(0, 8);
  if (chosen.length === 0) return "";
  const rows = chosen.map(
    ([k, v]) => `| \`${k}\` | ${v.replace(/\|/g, "\\|").replace(/\n/g, " ")} |`
  );
  return [
    `### ${t.uiKeysHeading}`,
    "",
    `| ${t.uiKeyCol} | ${t.uiValCol} |`,
    "| :--- | :--- |",
    ...rows,
    "",
  ].join("\n");
}

function resolveUseCaseScreenshot(
  pluginMeta: PluginPackageMeta,
  kind?: UseCaseScreenshotKind
): { url: string; caption: string } | null {
  const map: Record<UseCaseScreenshotKind, [string | undefined, string]> = {
    "palette": [
      pluginMeta.paletteScreenshot,
      "Spotlight Cmd+K Command Palette",
    ],
    "content-manager": [
      pluginMeta.contentManagerScreenshot,
      "Strapi v5 Content Manager Entities",
    ],
    "settings": [pluginMeta.settingsScreenshot, "Strapi v5 Settings Panel"],
    "admin": [pluginMeta.screenshot, "Strapi v5 Admin Workspace"],
  };
  const entry = kind ? map[kind] : undefined;
  if (!entry?.[0]) return null;
  return { url: entry[0], caption: `${pluginMeta.label} — ${entry[1]}` };
}

function optShot(
  label: string,
  url: string | undefined,
  kind: "settings" | "palette"
): string[] {
  const suffix =
    kind === "settings"
      ? "Strapi v5 Settings Panel"
      : "Spotlight Cmd+K Command Palette";
  return url ? [`![${label} — ${suffix}](${url})`, ""] : [];
}

function localeMeta(meta: PluginPackageMeta, locale: SupportedLocale) {
  const t = LOCALE_TEXT[locale] || LOCALE_TEXT.en;
  const label =
    locale === "en" ? meta.label : meta.translations[locale] || meta.label;
  const prefixUrl = locale === "en" ? "" : `/${locale}`;
  return { t, label, prefixUrl };
}

export function buildContentTypesMarkdown(
  pluginMeta: PluginPackageMeta,
  contentTypes: ContentTypeDoc[],
  t?: LocaleDocText,
  headingOverride?: string
): string {
  const tResolved = t || LOCALE_TEXT.en;
  const heading = headingOverride || tResolved.schemasHeading;
  const entityGuide = PLUGIN_ENTITY_GUIDE[pluginMeta.pluginId];
  const blocks = [`## ${heading}`, ""];

  if (entityGuide) {
    blocks.push(entityGuide.howItWorks, "");
    if (entityGuide.entityMermaid) {
      blocks.push("```mermaid", entityGuide.entityMermaid, "```", "");
    }
    blocks.push(
      `### ${tResolved.whereToFindLabel}`,
      "",
      ...entityGuide.whereToFind.map((locItem) => `- ${locItem}`),
      ""
    );
  }

  if (contentTypes.length === 0) {
    blocks.push(tResolved.noSchemasNote, "");
    return blocks.join("\n");
  }

  for (const ct of contentTypes) {
    const uid =
      ct.uidOverride || `plugin::${pluginMeta.pluginId}.${ct.singularName}`;
    const cmLocation =
      ct.kind === "component"
        ? "`/admin/plugins/content-type-builder` (Component)"
        : ct.visibleInContentManager
          ? `\`/admin/content-manager/collection-types/${uid}\``
          : `Internal (\`/admin/plugins/${pluginMeta.pluginId}\`)`;

    blocks.push(`### \`${uid}\` — ${ct.displayName}`);
    if (ct.description) blocks.push("", ct.description);
    blocks.push(
      "",
      `> **Kind**: \`${ct.kind || "collectionType"}\` · **DB Table**: \`${ct.collectionName || ct.singularName}\` · **Admin Location**: ${cmLocation} · **Draft & Publish**: \`${ct.draftAndPublish ? "Yes" : "No"}\` · **i18n**: \`${ct.localized ? "Yes" : "No"}\``,
      "",
      `| ${tResolved.fieldCol} | ${tResolved.typeCol} | ${tResolved.reqCol} | ${tResolved.detailsCol} |`,
      "| :--- | :--- | :--- | :--- |"
    );
    for (const [attrName, attr] of Object.entries(ct.attributes)) {
      const details = [
        attr.enum && `enum: \`${attr.enum.join(", ")}\``,
        attr.target && `target: \`${attr.target}\``,
        attr.customField && `customField: \`${attr.customField}\``,
        attr.component && `component: \`${attr.component}\``,
        attr.maxLength && `max: ${attr.maxLength}`,
        attr.default !== undefined &&
          `default: \`${JSON.stringify(attr.default)}\``,
        attr.private && "`private: true`",
      ].filter(Boolean);
      blocks.push(
        `| \`${attrName}\` | \`${attr.type}\` | ${attr.required ? "Yes" : "No"} | ${details.join("; ") || "—"} |`
      );
    }
    blocks.push("");
  }
  return blocks.join("\n");
}

export function buildUseCasesMarkdown(
  pluginMeta: PluginPackageMeta,
  t?: LocaleDocText,
  headingOverride?: string
): string {
  const tResolved = t || LOCALE_TEXT.en;
  const entityGuide = PLUGIN_ENTITY_GUIDE[pluginMeta.pluginId];
  if (!entityGuide || !Array.isArray(entityGuide.useCases)) return "";
  const lines = [`## ${headingOverride || tResolved.useCasesHeading}`, ""];
  for (const [title, purpose, flow, mmd, kind] of entityGuide.useCases) {
    lines.push(
      `### ${title}`,
      "",
      `- **What it is for**: ${purpose}`,
      `- **How it works**: ${flow}`,
      ""
    );
    if (mmd) lines.push("```mermaid", mmd, "```", "");
    const shot = resolveUseCaseScreenshot(pluginMeta, kind);
    if (shot) lines.push(`![${shot.caption}](${shot.url})`, "");
  }
  return lines.join("\n");
}

export function buildUseCasesPageMarkdown(
  meta: PluginPackageMeta,
  details: InspectedPluginDetails,
  locale: SupportedLocale
): string {
  const { t, label, prefixUrl } = localeMeta(meta, locale);
  const title = `${label} — ${t.useCasesPageTitleSuffix}`;
  const description = `${t.useCasesPageDescPrefix} ${meta.npmName}.`;
  const h1 = "1. " + t.schemasHeading.replace(/^\d+\.\s*/, "");
  const h3 = "3. " + t.useCasesHeading.replace(/^\d+\.\s*/, "");

  return [
    "---",
    `title: ${yamlQuote(title)}`,
    `description: ${yamlQuote(description)}`,
    "---",
    "",
    `> **Package**: \`${meta.npmName}\` · **Plugin ID**: \`${meta.pluginId}\` · **Admin Workspace**: \`/admin/plugins/${meta.pluginId}\``,
    "",
    buildContentTypesMarkdown(meta, details.contentTypes, t, h1),
    buildContentManagerSectionMarkdown(meta, locale),
    buildUseCasesMarkdown(meta, t, h3),
    "---",
    "",
    `- [${t.exploreGuideLink}](${prefixUrl}/${meta.slug}/guide/)`,
    `- [${t.exploreApiLink}](/${meta.slug}/api/)`,
    "",
  ].join("\n");
}

function buildRoutesTableMarkdown(
  routes: NormalizedPluginRoute[],
  t: LocaleDocText,
  headingOverride?: string
): string {
  const rows = routes.map(
    (r) =>
      `| \`${r.method.toUpperCase()}\` | \`${r.path}\` | \`${r.routeType}\` | \`${r.handler}\` | ${r.authenticated ? "Bearer JWT" : "Public"} |`
  );
  return [
    `## ${headingOverride || t.routesHeading}`,
    "",
    `| ${t.methodCol} | ${t.pathCol} | ${t.scopeCol} | ${t.handlerCol} | ${t.authCol} |`,
    "| :--- | :--- | :--- | :--- | :--- |",
    ...rows,
    "",
  ].join("\n");
}

export function buildGuidePageMarkdown(
  meta: PluginPackageMeta,
  details: InspectedPluginDetails,
  routes: NormalizedPluginRoute[],
  locale: SupportedLocale
): string {
  const { t, label } = localeMeta(meta, locale);
  const title = `${label} — ${t.guideTitleSuffix}`;
  const description = `${t.guideDescPrefix} ${meta.npmName}.`;
  const peerInstall =
    meta.slug === "strapi-plugin-events" ||
    meta.slug === "strapi-plugin-bookings"
      ? `pnpm add @vicacha-devs/strapi-plugin-calendar ${meta.npmName}`
      : `pnpm add ${meta.npmName}`;

  const docCts = details.contentTypes.filter((ct) => ct.kind !== "component");
  const sampleUid =
    docCts.length > 0
      ? `plugin::${meta.pluginId}.${docCts[0].singularName}`
      : `plugin::${meta.pluginId}`;

  const sampleUiTable = buildSampleTranslationsTable(
    details.translations[locale] || details.translations.en || {},
    t
  );
  const configFields =
    PLUGIN_SAMPLE_CONFIG[meta.pluginId] ||
    "      // Plugin configuration options";
  const serviceList =
    Array.isArray(details.serviceNames) && details.serviceNames.length > 0
      ? details.serviceNames
      : ["service"];
  const primaryService =
    serviceList.find((s) => s !== "settings") || serviceList[0] || "service";

  return [
    "---",
    `title: ${yamlQuote(title)}`,
    `description: ${yamlQuote(description)}`,
    "---",
    "",
    `## ${t.installHeading}`,
    "",
    "```bash",
    peerInstall,
    "```",
    "",
    `## ${t.configHeading}`,
    "",
    t.configIntro,
    "",
    "```ts",
    "// config/plugins.ts",
    "export default ({ env }: { env: (key: string, defaultValue?: string) => string }) => ({",
    `  ${JSON.stringify(meta.pluginId)}: {`,
    "    enabled: true,",
    "    config: {",
    configFields,
    "    },",
    "  },",
    "});",
    "```",
    "",
    ...optShot(label, meta.settingsScreenshot, "settings"),
    `## ${t.adminHeading}`,
    "",
    t.adminIntro,
    "",
    `![${label} — Strapi v5 Admin UI](${meta.screenshot})`,
    "",
    ...optShot(label, meta.paletteScreenshot, "palette"),
    sampleUiTable,
    buildContentTypesMarkdown(meta, details.contentTypes, t),
    buildContentManagerSectionMarkdown(meta, locale),
    buildUseCasesMarkdown(meta, t),
    buildRoutesTableMarkdown(routes, t),
    `## ${t.serviceHeading}`,
    "",
    "```ts",
    `// Registered services on plugin "${meta.pluginId}": ${serviceList.map((s) => `"${s}"`).join(", ")}`,
    `const pluginService = strapi.plugin(${JSON.stringify(meta.pluginId)})?.service(${JSON.stringify(primaryService)});`,
    "",
    docCts.length > 0
      ? `// Querying records via the Strapi v5 Document Service API\nconst records = await strapi.documents(${JSON.stringify(sampleUid)}).findMany({\n  limit: 25,\n  sort: "createdAt:desc",\n});`
      : `// Retrieving plugin settings via Strapi plugin store\nconst store = strapi.store({ type: "plugin", name: ${JSON.stringify(meta.pluginId)} });\nconst settings = await store.get({ key: "settings" });`,
    "```",
    "",
    `## ${t.troubleshootingHeading}`,
    "",
    ...t.troubleshootingItems.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

export function buildLocalizedOverviewMarkdown(
  meta: PluginPackageMeta,
  details: InspectedPluginDetails,
  routes: NormalizedPluginRoute[],
  locale: SupportedLocale
): string {
  const { t, label, prefixUrl } = localeMeta(meta, locale);
  const s = meta.summary;
  const subtitle = s?.[locale] || s?.en || details.pkgJson.description || label;

  return [
    "---",
    `title: ${yamlQuote(`${label} (${meta.npmName})`)}`,
    `description: ${yamlQuote(subtitle)}`,
    "prev: false",
    "---",
    "",
    `> **Package**: \`${meta.npmName}\` · **Plugin ID**: \`${meta.pluginId}\` · **Category**: \`${meta.category}\` · **Version**: \`${details.pkgJson.version}\` · **Routes**: \`${routes.length}\``,
    "",
    subtitle,
    "",
    "```bash",
    `pnpm add ${meta.npmName}`,
    "```",
    "",
    `![${label} — Strapi v5 Admin UI](${meta.screenshot})`,
    "",
    ...optShot(label, meta.paletteScreenshot, "palette"),
    ...optShot(label, meta.settingsScreenshot, "settings"),
    `## ${t.featuresHeading}`,
    "",
    `- [${t.exploreUseCasesLink}](${prefixUrl}/${meta.slug}/use-cases/)`,
    `- [${t.exploreGuideLink}](${prefixUrl}/${meta.slug}/guide/)`,
    `- [${t.exploreApiLink}](/strapi-plugin-${meta.slug.replace(/^strapi-plugin-/, "")}/api/)`,
    "",
    buildContentTypesMarkdown(
      meta,
      details.contentTypes,
      t,
      t.overviewSchemasHeading
    ),
    buildContentManagerSectionMarkdown(meta, locale),
    buildUseCasesMarkdown(meta, t, t.overviewUseCasesHeading),
    buildRoutesTableMarkdown(routes.slice(0, 10), t, t.overviewRoutesHeading),
  ].join("\n");
}

export function writeMarkdownFile(
  rootDir: string,
  relativePath: string,
  content: string
): void {
  const target = assertWithinBoundary(resolve(rootDir, relativePath), rootDir);
  mkdirSync(resolve(target, ".."), { recursive: true });
  const cleanName = basename(target);
  if (!cleanName.endsWith(".md") && !cleanName.endsWith(".mdx")) {
    throw new Error(`Invalid markdown filename: ${cleanName}`);
  }
  writeFileSync(target, content, "utf8");
}
