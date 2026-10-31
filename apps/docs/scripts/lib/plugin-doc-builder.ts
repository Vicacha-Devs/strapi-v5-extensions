import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";

import type { PluginPackageMeta, SupportedLocale } from "../../docs-packages.ts";
import { buildContentManagerSectionMarkdown } from "./plugin-content-manager.ts";
import {
  type ContentTypeDoc,
  LOCALE_TEXT,
  type LocaleDocText,
  PLUGIN_SAMPLE_CONFIG,
  type SchemaAttributeDoc,
  SITEMAP_INLINE_CONTENT_TYPES,
} from "./plugin-doc-i18n.ts";
import { PLUGIN_ENTITY_GUIDE, type UseCaseScreenshotKind } from "./plugin-use-cases.ts";
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
  pluginOptions?: { "content-manager"?: { visible?: boolean }; "i18n"?: { localized?: boolean } };
  attributes?: Record<string, SchemaAttributeDoc>;
}

export function assertWithinBoundary(targetPath: string, baseDir: string): string {
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

export function inspectPluginDetails(
  pkgDir: string,
  serviceNames: string[] = ["service"]
): InspectedPluginDetails {
  const pkgJson = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")) as {
    name?: string;
    version?: string;
    description?: string;
  };
  const ctDir = join(pkgDir, "server/src/content-types");
  const compDir = join(pkgDir, "server/src/components");
  const contentTypes: ContentTypeDoc[] = [];

  if (existsSync(ctDir)) {
    for (const entry of readdirSync(ctDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const schemaPath = join(ctDir, entry.name, "schema.json");
      if (!existsSync(schemaPath)) continue;
      const raw = JSON.parse(readFileSync(schemaPath, "utf8")) as RawSchemaJson;
      contentTypes.push({
        singularName: raw.info?.singularName || entry.name,
        displayName: raw.info?.displayName || entry.name,
        kind: raw.kind || "collectionType",
        collectionName: raw.collectionName || entry.name,
        visibleInContentManager: raw.pluginOptions?.["content-manager"]?.visible !== false,
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
      const raw = JSON.parse(readFileSync(join(compDir, entry.name), "utf8")) as RawSchemaJson;
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
  const locales: SupportedLocale[] = ["en", "es", "ar", "tr"];
  for (const loc of locales) {
    const candidates = [
      join(pkgDir, `admin/src/translations/${loc}.json`),
      join(pkgDir, `admin/translations/${loc}.json`),
    ];
    const found = candidates.find(existsSync);
    translations[loc] = found
      ? (JSON.parse(readFileSync(found, "utf8")) as Record<string, string>)
      : {};
  }

  return { pkgJson, contentTypes, translations, serviceNames };
}

function buildSampleTranslationsTable(dict: Record<string, string>, t: LocaleDocText): string {
  const entries = Object.entries(dict)
    .filter(([k, v]) => typeof v === "string" && v.trim().length > 0 && !k.includes("."))
    .slice(0, 8);
  const fallbackEntries =
    entries.length >= 4
      ? entries
      : Object.entries(dict)
          .filter(([, v]) => typeof v === "string" && v.trim().length > 0 && v.length < 90)
          .slice(0, 8);

  if (fallbackEntries.length === 0) return "";
  const rows = fallbackEntries.map(
    ([k, v]) => `| \`${k}\` | ${String(v).replace(/\|/g, "\\|").replace(/\n/g, " ")} |`
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
  if (!kind) return null;
  if (kind === "palette" && pluginMeta.paletteScreenshot) {
    return {
      url: pluginMeta.paletteScreenshot,
      caption: `${pluginMeta.label} — Spotlight Cmd+K Command Palette`,
    };
  }
  if (kind === "content-manager" && pluginMeta.contentManagerScreenshot) {
    return {
      url: pluginMeta.contentManagerScreenshot,
      caption: `${pluginMeta.label} — Strapi v5 Content Manager Entities`,
    };
  }
  if (kind === "settings" && pluginMeta.settingsScreenshot) {
    return {
      url: pluginMeta.settingsScreenshot,
      caption: `${pluginMeta.label} — Strapi v5 Settings Panel`,
    };
  }
  if (kind === "admin" && pluginMeta.screenshot) {
    return {
      url: pluginMeta.screenshot,
      caption: `${pluginMeta.label} — Strapi v5 Admin Workspace`,
    };
  }
  return null;
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
    blocks.push(`### ${tResolved.whereToFindLabel}`, "");
    for (const locItem of entityGuide.whereToFind) {
      blocks.push(`- ${locItem}`);
    }
    blocks.push("");
  }

  if (contentTypes.length === 0) {
    blocks.push(tResolved.noSchemasNote, "");
    return blocks.join("\n");
  }

  for (const ct of contentTypes) {
    const uid = ct.uidOverride || `plugin::${pluginMeta.pluginId}.${ct.singularName}`;
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
      const req = attr.required ? "Yes" : "No";
      const details: string[] = [];
      if (attr.enum) details.push(`enum: \`${attr.enum.join(", ")}\``);
      if (attr.target) details.push(`target: \`${attr.target}\``);
      if (attr.customField) details.push(`customField: \`${attr.customField}\``);
      if (attr.component) details.push(`component: \`${attr.component}\``);
      if (attr.maxLength) details.push(`max: ${attr.maxLength}`);
      if (attr.default !== undefined) details.push(`default: \`${JSON.stringify(attr.default)}\``);
      if (attr.private) details.push("`private: true`");
      blocks.push(`| \`${attrName}\` | \`${attr.type}\` | ${req} | ${details.join("; ") || "—"} |`);
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
  const heading = headingOverride || tResolved.useCasesHeading;
  const lines = [`## ${heading}`, ""];
  for (const [title, purpose, workflow, mermaid, screenshotKind] of entityGuide.useCases) {
    lines.push(
      `### ${title}`,
      "",
      `- **What it is for**: ${purpose}`,
      `- **How it works**: ${workflow}`,
      ""
    );
    if (mermaid) {
      lines.push("```mermaid", mermaid, "```", "");
    }
    const shot = resolveUseCaseScreenshot(pluginMeta, screenshotKind);
    if (shot) {
      lines.push(`![${shot.caption}](${shot.url})`, "");
    }
  }
  return lines.join("\n");
}

export function buildUseCasesPageMarkdown(
  pluginMeta: PluginPackageMeta,
  details: InspectedPluginDetails,
  locale: SupportedLocale
): string {
  const t = LOCALE_TEXT[locale] || LOCALE_TEXT.en;
  const localizedLabel =
    locale === "en" ? pluginMeta.label : pluginMeta.translations[locale] || pluginMeta.label;
  const title = `${localizedLabel} — ${t.useCasesPageTitleSuffix}`;
  const description = `${t.useCasesPageDescPrefix} ${pluginMeta.npmName}.`;
  const prefixUrl = locale === "en" ? "" : `/${locale}`;

  return [
    "---",
    `title: ${yamlQuote(title)}`,
    `description: ${yamlQuote(description)}`,
    "---",
    "",
    `> **Package**: \`${pluginMeta.npmName}\` · **Plugin ID**: \`${pluginMeta.pluginId}\` · **Admin Workspace**: \`/admin/plugins/${pluginMeta.pluginId}\``,
    "",
    buildContentTypesMarkdown(
      pluginMeta,
      details.contentTypes,
      t,
      "1. " + t.schemasHeading.replace(/^\d+\.\s*/, "")
    ),
    buildContentManagerSectionMarkdown(pluginMeta, locale),
    buildUseCasesMarkdown(pluginMeta, t, "3. " + t.useCasesHeading.replace(/^\d+\.\s*/, "")),
    "---",
    "",
    `- [${t.exploreGuideLink}](${prefixUrl}/${pluginMeta.slug}/guide/)`,
    `- [${t.exploreApiLink}](/${pluginMeta.slug}/api/)`,
    "",
  ].join("\n");
}

function buildRoutesTableMarkdown(
  routes: NormalizedPluginRoute[],
  t: LocaleDocText,
  headingOverride?: string
): string {
  const heading = headingOverride || t.routesHeading;
  const rows = routes.map(
    (r) =>
      `| \`${r.method.toUpperCase()}\` | \`${r.path}\` | \`${r.routeType}\` | \`${r.handler}\` | ${r.authenticated ? "Bearer JWT" : "Public"} |`
  );
  return [
    `## ${heading}`,
    "",
    `| ${t.methodCol} | ${t.pathCol} | ${t.scopeCol} | ${t.handlerCol} | ${t.authCol} |`,
    "| :--- | :--- | :--- | :--- | :--- |",
    ...rows,
    "",
  ].join("\n");
}

export function buildGuidePageMarkdown(
  pluginMeta: PluginPackageMeta,
  details: InspectedPluginDetails,
  routes: NormalizedPluginRoute[],
  locale: SupportedLocale
): string {
  const t = LOCALE_TEXT[locale] || LOCALE_TEXT.en;
  const localizedLabel =
    locale === "en" ? pluginMeta.label : pluginMeta.translations[locale] || pluginMeta.label;
  const title = `${localizedLabel} — ${t.guideTitleSuffix}`;
  const description = `${t.guideDescPrefix} ${pluginMeta.npmName}.`;
  const peerInstall =
    pluginMeta.slug === "strapi-plugin-events" || pluginMeta.slug === "strapi-plugin-bookings"
      ? `pnpm add @vicacha-devs/strapi-plugin-calendar ${pluginMeta.npmName}`
      : `pnpm add ${pluginMeta.npmName}`;

  const docContentTypes = details.contentTypes.filter((ct) => ct.kind !== "component");
  const sampleUid =
    docContentTypes.length > 0
      ? `plugin::${pluginMeta.pluginId}.${docContentTypes[0].singularName}`
      : `plugin::${pluginMeta.pluginId}`;

  const sampleUiTable = buildSampleTranslationsTable(
    details.translations[locale] || details.translations.en || {},
    t
  );
  const configFields =
    PLUGIN_SAMPLE_CONFIG[pluginMeta.pluginId] || "      // Plugin configuration options";
  const serviceList =
    Array.isArray(details.serviceNames) && details.serviceNames.length > 0
      ? details.serviceNames
      : ["service"];
  const primaryService = serviceList.find((s) => s !== "settings") || serviceList[0] || "service";

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
    `  ${JSON.stringify(pluginMeta.pluginId)}: {`,
    "    enabled: true,",
    "    config: {",
    configFields,
    "    },",
    "  },",
    "});",
    "```",
    "",
    ...(pluginMeta.settingsScreenshot
      ? [`![${localizedLabel} — Strapi v5 Settings Panel](${pluginMeta.settingsScreenshot})`, ""]
      : []),
    `## ${t.adminHeading}`,
    "",
    t.adminIntro,
    "",
    `![${localizedLabel} — Strapi v5 Admin UI](${pluginMeta.screenshot})`,
    "",
    ...(pluginMeta.paletteScreenshot
      ? [
          `![${localizedLabel} — Spotlight Cmd+K Command Palette](${pluginMeta.paletteScreenshot})`,
          "",
        ]
      : []),
    sampleUiTable,
    buildContentTypesMarkdown(pluginMeta, details.contentTypes, t),
    buildContentManagerSectionMarkdown(pluginMeta, locale),
    buildUseCasesMarkdown(pluginMeta, t),
    buildRoutesTableMarkdown(routes, t),
    `## ${t.serviceHeading}`,
    "",
    "```ts",
    `// Registered services on plugin "${pluginMeta.pluginId}": ${serviceList.map((s) => `"${s}"`).join(", ")}`,
    `const pluginService = strapi.plugin(${JSON.stringify(pluginMeta.pluginId)})?.service(${JSON.stringify(primaryService)});`,
    "",
    docContentTypes.length > 0
      ? `// Querying records via the Strapi v5 Document Service API\nconst records = await strapi.documents(${JSON.stringify(sampleUid)}).findMany({\n  limit: 25,\n  sort: "createdAt:desc",\n});`
      : `// Retrieving plugin settings via Strapi plugin store\nconst store = strapi.store({ type: "plugin", name: ${JSON.stringify(pluginMeta.pluginId)} });\nconst settings = await store.get({ key: "settings" });`,
    "```",
    "",
    `## ${t.troubleshootingHeading}`,
    "",
    ...t.troubleshootingItems.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

export function buildLocalizedOverviewMarkdown(
  pluginMeta: PluginPackageMeta,
  details: InspectedPluginDetails,
  routes: NormalizedPluginRoute[],
  locale: SupportedLocale
): string {
  const t = LOCALE_TEXT[locale] || LOCALE_TEXT.en;
  const localizedLabel =
    locale === "en" ? pluginMeta.label : pluginMeta.translations[locale] || pluginMeta.label;
  const subtitle =
    pluginMeta.summary?.[locale] ||
    pluginMeta.summary?.en ||
    details.pkgJson.description ||
    localizedLabel;

  const prefixUrl = locale === "en" ? "" : `/${locale}`;

  return [
    "---",
    `title: ${yamlQuote(`${localizedLabel} (${pluginMeta.npmName})`)}`,
    `description: ${yamlQuote(subtitle)}`,
    "prev: false",
    "---",
    "",
    `> **Package**: \`${pluginMeta.npmName}\` · **Plugin ID**: \`${pluginMeta.pluginId}\` · **Category**: \`${pluginMeta.category}\` · **Version**: \`${details.pkgJson.version}\` · **Routes**: \`${routes.length}\``,
    "",
    subtitle,
    "",
    "```bash",
    `pnpm add ${pluginMeta.npmName}`,
    "```",
    "",
    `![${localizedLabel} — Strapi v5 Admin UI](${pluginMeta.screenshot})`,
    "",
    ...(pluginMeta.paletteScreenshot
      ? [
          `![${localizedLabel} — Spotlight Cmd+K Command Palette](${pluginMeta.paletteScreenshot})`,
          "",
        ]
      : []),
    ...(pluginMeta.settingsScreenshot
      ? [`![${localizedLabel} — Strapi v5 Settings Panel](${pluginMeta.settingsScreenshot})`, ""]
      : []),
    `## ${t.featuresHeading}`,
    "",
    `- [${t.exploreUseCasesLink}](${prefixUrl}/${pluginMeta.slug}/use-cases/)`,
    `- [${t.exploreGuideLink}](${prefixUrl}/${pluginMeta.slug}/guide/)`,
    `- [${t.exploreApiLink}](/strapi-plugin-${pluginMeta.slug.replace(/^strapi-plugin-/, "")}/api/)`,
    "",
    buildContentTypesMarkdown(pluginMeta, details.contentTypes, t, t.overviewSchemasHeading),
    buildContentManagerSectionMarkdown(pluginMeta, locale),
    buildUseCasesMarkdown(pluginMeta, t, t.overviewUseCasesHeading),
    buildRoutesTableMarkdown(routes.slice(0, 10), t, t.overviewRoutesHeading),
  ].join("\n");
}

export function writeMarkdownFile(rootDir: string, relativePath: string, content: string): void {
  const target = assertWithinBoundary(resolve(rootDir, relativePath), rootDir);
  mkdirSync(resolve(target, ".."), { recursive: true });
  const cleanName = basename(target);
  if (!cleanName.endsWith(".md") && !cleanName.endsWith(".mdx")) {
    throw new Error(`Invalid markdown filename: ${cleanName}`);
  }
  writeFileSync(target, content, "utf8");
}
