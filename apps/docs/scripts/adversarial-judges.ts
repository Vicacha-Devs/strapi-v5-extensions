#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { guides, plugins, SUPPORTED_LOCALES } from "../docs-packages.ts";

interface JudgeResult {
  name: string;
  checked: string;
  failures: string[];
}

const HERE = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = resolve(HERE, "..");
const REPO_ROOT = resolve(DOCS_ROOT, "../..");
const CONTENT_ROOT = join(DOCS_ROOT, "src/content/docs");
const DIST_ROOT = join(DOCS_ROOT, "dist");
const SCHEMAS_ROOT = join(DOCS_ROOT, "schemas");
const SCREENSHOTS_ROOT = join(DOCS_ROOT, "public/screenshots");

const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".astro",
  ".strapi",
  ".turbo",
  ".git",
  "coverage",
  "vendor",
]);

const IGNORE_FILES = new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "CHANGELOG.md",
  "_sidebar.json",
]);

function walkFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full.endsWith(join("apps", "docs", "schemas"))) continue;
      walkFiles(full, out);
    } else if (entry.isFile() && !IGNORE_FILES.has(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function readPngDimensions(
  filePath: string
): { width: number; height: number; bytes: number } | null {
  const buf = readFileSync(filePath);
  const pngMagic = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(pngMagic)) {
    return null;
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height, bytes: buf.length };
}

function judge1Modularity(): JudgeResult {
  const failures: string[] = [];
  const checkedExts = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".cjs",
    ".json",
    ".md",
    ".mdx",
    ".css",
  ]);
  const allFiles = walkFiles(REPO_ROOT).filter((f) =>
    checkedExts.has(extname(f))
  );

  for (const file of allFiles) {
    const lines = readFileSync(file, "utf8").split("\n").length;
    if (lines > 500) {
      failures.push(
        `${relative(REPO_ROOT, file)} has ${lines} lines (limit: 500)`
      );
    }
  }
  return {
    name: "Judge 1 — File Modularity (<= 500 lines per file)",
    checked: `${allFiles.length} source/doc/config files`,
    failures,
  };
}

function judge2Completeness(): JudgeResult {
  const failures: string[] = [];
  for (const p of plugins) {
    const schemaPath = join(SCHEMAS_ROOT, `${p.schemaFile}.yaml`);
    if (!existsSync(schemaPath)) {
      failures.push(`Missing OpenAPI schema: schemas/${p.schemaFile}.yaml`);
    } else {
      const yamlText = readFileSync(schemaPath, "utf8");
      if (
        !yamlText.includes("openapi: 3.0.3") ||
        !yamlText.includes("paths:")
      ) {
        failures.push(`Invalid OpenAPI spec in schemas/${p.schemaFile}.yaml`);
      }
    }

    for (const pageName of ["index.md", "use-cases.md", "guide.md"]) {
      const pagePath = join(CONTENT_ROOT, p.slug, pageName);
      if (!existsSync(pagePath)) {
        failures.push(
          `Missing plugin page: src/content/docs/${p.slug}/${pageName}`
        );
        continue;
      }
      const text = readFileSync(pagePath, "utf8");
      if (!text.includes("```mermaid")) {
        failures.push(
          `${p.slug}/${pageName} is missing Pele Mermaid diagrams (\`\`\`mermaid)`
        );
      }
      if (!text.includes(p.screenshot)) {
        failures.push(
          `${p.slug}/${pageName} is missing Playwright screenshot ${p.screenshot}`
        );
      }
      if (
        p.contentManagerScreenshot &&
        !text.includes(p.contentManagerScreenshot)
      ) {
        failures.push(
          `${p.slug}/${pageName} is missing Content Manager screenshot ${p.contentManagerScreenshot}`
        );
      }
      if (p.paletteScreenshot && !text.includes(p.paletteScreenshot)) {
        failures.push(
          `${p.slug}/${pageName} is missing Command Palette screenshot ${p.paletteScreenshot}`
        );
      }
      if (p.settingsScreenshot && !text.includes(p.settingsScreenshot)) {
        failures.push(
          `${p.slug}/${pageName} is missing Settings Panel screenshot ${p.settingsScreenshot}`
        );
      }
      if (
        !text.includes("Use Case 1 —") ||
        !text.includes("Content Manager Use Case 1 —")
      ) {
        failures.push(
          `${p.slug}/${pageName} is missing End-to-End or Content Manager Use Cases documentation`
        );
      }
      if (
        !text.includes(
          "Why This Plugin Creates & Integrates Content Manager Entities"
        ) ||
        !text.includes("How to Use in Strapi Content Manager (Step-by-Step)")
      ) {
        failures.push(
          `${p.slug}/${pageName} is missing Content Manager Why / How-to-Use sections`
        );
      }
      if (
        !text.includes("/admin/content-manager") &&
        !text.includes("/admin/plugins/")
      ) {
        failures.push(
          `${p.slug}/${pageName} is missing Content-Type entity Admin location paths`
        );
      }
      if (/\b(TODO:|FIXME:|coming soon|lorem ipsum)\b/i.test(text)) {
        failures.push(
          `${p.slug}/${pageName} contains forbidden placeholder text`
        );
      }
    }
  }
  return {
    name: `Judge 2 — Documentation Completeness, Content Manager Integration, Per-Plugin Entities, Use Cases, Pele Mermaid & OpenAPI (${plugins.length} Plugins)`,
    checked: `${plugins.length} plugins × (Overview + Use Cases + Guide + Content Manager + Pele Mermaid + OpenAPI YAML)`,
    failures,
  };
}

function judge3I18nAndRtlParity(): JudgeResult {
  const failures: string[] = [];
  const requiredRelativePages = [
    "index.mdx",
    ...guides.map((g) => `${g.slug}.md`),
    ...plugins.flatMap((p) => [
      `${p.slug}/index.md`,
      `${p.slug}/use-cases.md`,
      `${p.slug}/guide.md`,
    ]),
  ];

  for (const locale of SUPPORTED_LOCALES) {
    const prefix = locale === "en" ? "" : locale;
    for (const relPage of requiredRelativePages) {
      const fullPath = join(CONTENT_ROOT, prefix, relPage);
      if (!existsSync(fullPath)) {
        failures.push(
          `Missing [${locale}] page: ${relative(DOCS_ROOT, fullPath)}`
        );
        continue;
      }
      const content = readFileSync(fullPath, "utf8");
      if (content.trim().length < 200) {
        failures.push(
          `Page too short (<200 chars): ${relative(DOCS_ROOT, fullPath)}`
        );
      }
      if (locale === "ar" && !/[\u0600-\u06FF]/.test(content)) {
        failures.push(
          `Arabic page lacks Arabic script: ${relative(DOCS_ROOT, fullPath)}`
        );
      }
      if (locale === "tr" && !/[çğıöşüÇĞİÖŞÜ]/.test(content)) {
        failures.push(
          `Turkish page lacks Turkish characters: ${relative(DOCS_ROOT, fullPath)}`
        );
      }
    }
  }

  if (existsSync(DIST_ROOT)) {
    const arIndex = join(DIST_ROOT, "ar/index.html");
    if (!existsSync(arIndex)) {
      failures.push("Missing built Arabic landing page dist/ar/index.html");
    } else {
      const html = readFileSync(arIndex, "utf8");
      if (!html.includes('dir="rtl"') || !html.includes('lang="ar"')) {
        failures.push('dist/ar/index.html is missing dir="rtl" or lang="ar"');
      }
    }
  }

  return {
    name: "Judge 3 — Quadrilingual i18n (en, es, ar, tr) & RTL Parity",
    checked: `${requiredRelativePages.length * SUPPORTED_LOCALES.length} localized pages`,
    failures,
  };
}

function judge4VisualAndLinks(): JudgeResult {
  const failures: string[] = [];
  const expectedShots = [
    "dashboard-overview.png",
    ...plugins.flatMap((p) => [
      p.screenshot.replace("/screenshots/", ""),
      ...(p.contentManagerScreenshot
        ? [p.contentManagerScreenshot.replace("/screenshots/", "")]
        : []),
      ...(p.paletteScreenshot
        ? [p.paletteScreenshot.replace("/screenshots/", "")]
        : []),
      ...(p.settingsScreenshot
        ? [p.settingsScreenshot.replace("/screenshots/", "")]
        : []),
    ]),
  ];

  for (const shot of expectedShots) {
    const shotPath = join(SCREENSHOTS_ROOT, shot);
    if (!existsSync(shotPath)) {
      failures.push(`Missing screenshot: public/screenshots/${shot}`);
      continue;
    }
    const meta = readPngDimensions(shotPath);
    if (!meta) {
      failures.push(`Invalid PNG header: public/screenshots/${shot}`);
    } else if (meta.width < 960 || meta.height < 550 || meta.bytes < 15000) {
      failures.push(
        `Low-quality screenshot (${meta.width}x${meta.height}, ${meta.bytes}B): public/screenshots/${shot}`
      );
    }
  }

  if (!existsSync(DIST_ROOT)) {
    failures.push("dist/ folder does not exist — run `pnpm build` first");
  } else {
    for (const llmFile of ["llms.txt", "llms-full.txt"]) {
      const p = join(DIST_ROOT, llmFile);
      if (!existsSync(p) || statSync(p).size < 500) {
        failures.push(
          `Missing or empty AI documentation index: dist/${llmFile}`
        );
      }
    }

    for (const peleAsset of ["vendor/pele.global.js", "vendor/pele-init.js"]) {
      if (!existsSync(join(DIST_ROOT, peleAsset))) {
        failures.push(`Missing Pele diagram bundle in dist/${peleAsset}`);
      }
    }

    for (const p of plugins) {
      const useCasesHtmlPath = join(DIST_ROOT, p.slug, "use-cases/index.html");
      if (!existsSync(useCasesHtmlPath)) {
        failures.push(
          `Missing built Use Cases page: dist/${p.slug}/use-cases/index.html`
        );
      } else {
        const html = readFileSync(useCasesHtmlPath, "utf8");
        if (
          !html.includes('class="pele-diagram not-content" data-pele-b64="')
        ) {
          failures.push(
            `dist/${p.slug}/use-cases/index.html is missing Pele diagram containers`
          );
        }
      }
    }

    const htmlFiles: string[] = [];
    function collectHtml(d: string): void {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const f = join(d, e.name);
        if (e.isDirectory()) collectHtml(f);
        else if (e.isFile() && e.name.endsWith(".html")) htmlFiles.push(f);
      }
    }
    collectHtml(DIST_ROOT);

    const docsBase = (process.env.DOCS_BASE ?? "")
      .trim()
      .split("/")
      .filter(Boolean)
      .join("/");
    const basePrefix = docsBase ? `/${docsBase}/` : "";

    for (const htmlFile of htmlFiles) {
      const html = readFileSync(htmlFile, "utf8");
      const imgMatches = [...html.matchAll(/<img[^>]+src="(\/[^"#?]+)"/g)].map(
        (m) => m[1]
      );
      for (const src of imgMatches) {
        const normalizedSrc =
          basePrefix && src.startsWith(basePrefix)
            ? `/${src.slice(basePrefix.length)}`
            : src;
        const assetPath = join(DIST_ROOT, normalizedSrc);
        if (!existsSync(assetPath)) {
          failures.push(
            `Broken image src="${src}" in ${relative(DIST_ROOT, htmlFile)}`
          );
        }
      }
    }
  }

  return {
    name: "Judge 4 — Playwright Visual Captures, Pele Diagrams, Built Assets & llms.txt Integrity",
    checked: `${expectedShots.length} Playwright PNGs + ${plugins.length}×4 Pele Use-Case pages + llms.txt`,
    failures,
  };
}

function judge5Security(): JudgeResult {
  const failures: string[] = [];
  const headersPath = join(DOCS_ROOT, "public/_headers");
  if (!existsSync(headersPath)) {
    failures.push("Missing apps/docs/public/_headers security header rules");
  } else {
    const h = readFileSync(headersPath, "utf8");
    for (const requiredHeader of [
      "X-Frame-Options: DENY",
      "X-Content-Type-Options: nosniff",
      "Content-Security-Policy:",
      "Permissions-Policy:",
    ]) {
      if (!h.includes(requiredHeader)) {
        failures.push(`public/_headers missing ${requiredHeader}`);
      }
    }
  }

  const codeFiles = [
    ...walkFiles(join(DOCS_ROOT, "scripts")),
    ...walkFiles(join(REPO_ROOT, "apps/dashboard")),
  ].filter(
    (f) =>
      /\.(ts|tsx|js|mjs)$/.test(f) &&
      !f.endsWith("adversarial-judges.ts") &&
      !f.endsWith("adversarial-judges.mjs")
  );

  const forbiddenPatterns = [
    {
      regex: /0\.0\.0\.0/,
      reason: "Forbidden 0.0.0.0 binding (must use 127.0.0.1)",
    },
    {
      regex: /\b(innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/,
      reason: "Unsafe DOM sink",
    },
    { regex: /dangerouslySetInnerHTML/, reason: "Unsafe React HTML injection" },
    {
      regex: /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/,
      reason: "Hardcoded private key",
    },
    {
      regex: /localStorage\.setItem\s*\(\s*['"][^'"]*token/i,
      reason: "Token stored in localStorage",
    },
  ];

  for (const file of codeFiles) {
    const content = readFileSync(file, "utf8");
    for (const rule of forbiddenPatterns) {
      if (rule.regex.test(content)) {
        failures.push(`${relative(REPO_ROOT, file)}: ${rule.reason}`);
      }
    }
  }

  return {
    name: "Judge 5 — Security Headers, Localhost Binding & XSS/Secret Audit",
    checked: `${codeFiles.length} scripts/configs + _headers`,
    failures,
  };
}

const judges: JudgeResult[] = [
  judge1Modularity(),
  judge2Completeness(),
  judge3I18nAndRtlParity(),
  judge4VisualAndLinks(),
  judge5Security(),
];

let totalFailures = 0;
console.warn("\n========================================================");
console.warn("  ADVERSARIAL DOCUMENTATION JUDGES SUITE (5 JUDGES)");
console.warn("========================================================");
for (const res of judges) {
  if (res.failures.length === 0) {
    console.warn(`✔ PASS  ${res.name} (${res.checked})`);
  } else {
    console.error(`✖ FAIL  ${res.name} (${res.failures.length} issues):`);
    for (const f of res.failures.slice(0, 15)) {
      console.error(`    - ${f}`);
    }
    totalFailures += res.failures.length;
  }
}
console.warn("========================================================\n");

if (totalFailures > 0) {
  process.exit(1);
}
