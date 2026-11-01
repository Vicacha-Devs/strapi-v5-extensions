#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { type NonDefaultLocale, plugins } from "../docs-packages.ts";
import { generateLocalizedLandingAndGuides } from "./lib/i18n-guides.ts";
import { buildContentManagerSectionMarkdown } from "./lib/plugin-content-manager.ts";
import {
  assertWithinBoundary,
  buildGuidePageMarkdown,
  buildLocalizedOverviewMarkdown,
  buildUseCasesMarkdown,
  buildUseCasesPageMarkdown,
  inspectPluginDetails,
  writeMarkdownFile,
  yamlQuote,
} from "./lib/plugin-doc-builder.ts";
import { PLUGIN_ENTITY_GUIDE } from "./lib/plugin-use-cases.ts";
import {
  loadPluginRoutes,
  loadPluginServiceNames,
} from "./lib/route-loader.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = resolve(HERE, "..");
const REPO_ROOT = resolve(DOCS_ROOT, "../..");
const PACKAGES_ROOT = resolve(REPO_ROOT, "packages");
const CONTENT_DOCS_ROOT = resolve(DOCS_ROOT, "src/content/docs");

function cleanReadmeBody(md: string): string {
  return md
    .split("\n")
    .filter((line) => !/^#\s+/.test(line))
    .join("\n")
    .replace(/^\n+/, "")
    .replace(/\n{3,}/g, "\n\n");
}

async function main(): Promise<void> {
  generateLocalizedLandingAndGuides(CONTENT_DOCS_ROOT);

  for (const plugin of plugins) {
    const safeDir = basename(plugin.dir);
    const safeSlug = basename(plugin.slug);
    const pkgDir = assertWithinBoundary(
      resolve(PACKAGES_ROOT, safeDir),
      PACKAGES_ROOT
    );
    const readmePath = assertWithinBoundary(
      resolve(pkgDir, "README.md"),
      pkgDir
    );

    if (!existsSync(readmePath)) {
      console.error(`[sync-readmes] Missing README: ${readmePath}`);
      process.exit(1);
    }

    const serviceNames = await loadPluginServiceNames(pkgDir);
    const details = inspectPluginDetails(pkgDir, serviceNames);
    const routes = await loadPluginRoutes(pkgDir, plugin.pluginId);
    let body = cleanReadmeBody(readFileSync(readmePath, "utf8"));

    if (body.trim() === "") {
      body = `${details.pkgJson.description || "Documentation overview."}\n`;
    }

    if (!body.includes("```")) {
      body = [
        body.trimEnd(),
        "",
        "## Quick Installation & Configuration",
        "",
        "```bash",
        `pnpm add ${plugin.npmName}`,
        "```",
        "",
        "Enable the plugin in `config/plugins.ts`:",
        "",
        "```ts",
        "export default () => ({",
        `  "${plugin.pluginId}": {`,
        "    enabled: true,",
        "  },",
        "});",
        "```",
        "",
      ].join("\n");
    }

    const entityGuide = PLUGIN_ENTITY_GUIDE[plugin.pluginId];
    const entityAndUseCasesSection = entityGuide
      ? [
          "",
          "## Content-Type Entities & Where to Find Them",
          "",
          entityGuide.howItWorks,
          "",
          ...(entityGuide.entityMermaid
            ? ["```mermaid", entityGuide.entityMermaid, "```", ""]
            : []),
          ...entityGuide.whereToFind.map((item) => `- ${item}`),
          "",
          buildContentManagerSectionMarkdown(plugin, "en").trimEnd(),
          "",
          buildUseCasesMarkdown(
            plugin,
            undefined,
            "End-to-End Use Cases & Workflows"
          ).trimEnd(),
          "",
        ].join("\n")
      : "";

    const screenshotSection = plugin.screenshot
      ? [
          "",
          "## Admin Workspace, Content Manager & Settings Panel Preview",
          "",
          `![${plugin.label} — Strapi v5 Admin Workspace](${plugin.screenshot})`,
          "",
          ...(plugin.contentManagerScreenshot
            ? [
                "### Strapi v5 Content Manager Entities (`/admin/content-manager`)",
                "",
                `![${plugin.label} — Strapi v5 Content Manager Entities](${plugin.contentManagerScreenshot})`,
                "",
              ]
            : []),
          ...(plugin.paletteScreenshot
            ? [
                "### Spotlight Command Palette (`Cmd+K` / `Ctrl+K` Overlay)",
                "",
                `![${plugin.label} — Spotlight Cmd+K Command Palette](${plugin.paletteScreenshot})`,
                "",
              ]
            : []),
          ...(plugin.settingsScreenshot
            ? [
                "### Settings Panel (`Settings -> Configuration`)",
                "",
                `![${plugin.label} — Strapi v5 Settings Panel](${plugin.settingsScreenshot})`,
                "",
              ]
            : []),
          `> Explore [**Content Types & Use Cases**](/${safeSlug}/use-cases/), the [**Developer Guide & Admin UI Tour**](/${safeSlug}/guide/), and the [**Interactive OpenAPI Reference**](/${safeSlug}/api/) for complete schema, workflow diagram, and endpoint documentation.`,
          "",
        ].join("\n")
      : "";

    const frontmatter = [
      "---",
      `title: ${yamlQuote(`${plugin.label} (${plugin.npmName})`)}`,
      `description: ${yamlQuote(details.pkgJson.description || plugin.label)}`,
      "prev: false",
      "---",
      "",
    ].join("\n");

    writeMarkdownFile(
      CONTENT_DOCS_ROOT,
      `${safeSlug}/index.md`,
      `${frontmatter}${body}\n${entityAndUseCasesSection}${screenshotSection}`
    );
    writeMarkdownFile(
      CONTENT_DOCS_ROOT,
      `${safeSlug}/use-cases.md`,
      buildUseCasesPageMarkdown(plugin, details, "en")
    );
    writeMarkdownFile(
      CONTENT_DOCS_ROOT,
      `${safeSlug}/guide.md`,
      buildGuidePageMarkdown(plugin, details, routes, "en")
    );

    const nonDefaultLocales: NonDefaultLocale[] = ["es", "ar", "tr"];
    for (const locale of nonDefaultLocales) {
      writeMarkdownFile(
        CONTENT_DOCS_ROOT,
        `${locale}/${safeSlug}/index.md`,
        buildLocalizedOverviewMarkdown(plugin, details, routes, locale)
      );
      writeMarkdownFile(
        CONTENT_DOCS_ROOT,
        `${locale}/${safeSlug}/use-cases.md`,
        buildUseCasesPageMarkdown(plugin, details, locale)
      );
      writeMarkdownFile(
        CONTENT_DOCS_ROOT,
        `${locale}/${safeSlug}/guide.md`,
        buildGuidePageMarkdown(plugin, details, routes, locale)
      );
    }

    console.warn(`[sync-readmes] synced ${safeSlug} (en, es, ar, tr)`);
  }
}

await main();
