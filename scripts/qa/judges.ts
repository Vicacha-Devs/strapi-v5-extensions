import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { QaCheckResult, QaPluginEntry } from "./types.ts";
import { safeReadJson } from "./types.ts";

interface StrapiPluginPkg {
  name: string;
  version?: string;
  files?: string[];
  exports?: Record<string, unknown>;
  scripts?: Record<string, string>;
  strapi?: { name?: string; kind?: string };
}

const CORE_LOCALES = ["en", "es", "ar", "tr", "fr"];

function collectTests(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTests(full, out);
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".test.ts") ||
        entry.name.endsWith(".test.tsx") ||
        entry.name.endsWith(".spec.ts"))
    ) {
      out.push(full);
    }
  }
  return out;
}

function checkTranslations(pluginDir: string): {
  count: number;
  issues: string[];
} {
  const tradsDir = join(pluginDir, "admin", "src", "translations");
  if (!existsSync(tradsDir)) {
    return { count: 0, issues: [] };
  }
  const files = readdirSync(tradsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  const locales = new Set(files.map((f) => f.replace(/\.json$/, "")));
  const issues: string[] = [];

  for (const req of CORE_LOCALES) {
    if (!locales.has(req)) {
      issues.push(`missing core locale ${req}.json`);
    }
  }

  const enMap = safeReadJson<Record<string, unknown>>(
    join(tradsDir, "en.json")
  );
  if (enMap) {
    const enKeys = Object.keys(enMap);
    for (const file of files) {
      const map = safeReadJson<Record<string, unknown>>(join(tradsDir, file));
      if (!map) continue;
      const missing = enKeys.filter((k) => !(k in map));
      if (missing.length > 0) {
        issues.push(`${file} missing ${missing.length} key(s) from en.json`);
      }
    }
  }
  return { count: files.length, issues };
}

export function runStrapiExtensionsJudges(repoRoot: string): {
  checks: QaCheckResult[];
  plugins: QaPluginEntry[];
} {
  const packagesDir = join(repoRoot, "packages");
  const dashConfigPath = join(
    repoRoot,
    "apps",
    "dashboard",
    "config",
    "plugins.ts"
  );
  const dashConfig = existsSync(dashConfigPath)
    ? readFileSync(dashConfigPath, "utf8")
    : "";

  const dirs = readdirSync(packagesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith("strapi-plugin-"))
    .map((e) => e.name)
    .sort();

  const plugins: QaPluginEntry[] = [];
  const manifestIssues: string[] = [];
  const missingTests: string[] = [];
  const i18nIssues: string[] = [];
  const unwired: string[] = [];

  for (const dir of dirs) {
    const fullDir = join(packagesDir, dir);
    const pkg = safeReadJson<StrapiPluginPkg>(join(fullDir, "package.json"));
    if (!pkg) {
      manifestIssues.push(`${dir}: unreadable package.json`);
      continue;
    }

    const pluginId = pkg.strapi?.name ?? dir.replace(/^strapi-plugin-/, "");
    const notes: string[] = [];

    if (!pkg.exports?.["./strapi-server"]) {
      manifestIssues.push(`${pkg.name}: missing ./strapi-server export`);
      notes.push("Missing ./strapi-server export");
    }
    if (!pkg.strapi?.kind || pkg.strapi.kind !== "plugin") {
      manifestIssues.push(`${pkg.name}: strapi.kind must be "plugin"`);
      notes.push("Missing strapi.kind=plugin");
    }

    const testsDir = join(fullDir, "tests");
    const testFiles = collectTests(testsDir);
    const hasTests = testFiles.length > 0;
    if (!hasTests) {
      missingTests.push(pkg.name);
      notes.push("No unit tests in tests/");
    }

    const wiredInHost =
      dashConfig.includes(`"${pluginId}"`) ||
      dashConfig.includes(`'${pluginId}'`) ||
      dashConfig.includes(`${pluginId}:`);
    if (!wiredInHost) {
      unwired.push(pkg.name);
      notes.push("Not wired in apps/dashboard/config/plugins.ts");
    }

    const trads = checkTranslations(fullDir);
    for (const issue of trads.issues) {
      i18nIssues.push(`${pkg.name}: ${issue}`);
      notes.push(issue);
    }

    const hasFail =
      !hasTests || manifestIssues.some((m) => m.startsWith(pkg.name));
    const status = hasFail
      ? "fail"
      : !wiredInHost || trads.issues.length > 0
        ? "warn"
        : "pass";

    plugins.push({
      name: pkg.name,
      pluginId,
      ecosystem: "strapi",
      version: pkg.version ?? "0.0.0",
      hasTests,
      hasBuildScript: Boolean(pkg.scripts?.build),
      hasTypecheck: Boolean(pkg.scripts?.["test:ts"]),
      wiredInHost,
      localeCount: trads.count,
      status,
      notes,
    });
  }

  const readmePath = join(repoRoot, "README.md");
  const readmeText = existsSync(readmePath)
    ? readFileSync(readmePath, "utf8")
    : "";
  const readmeCountOk = readmeText.includes(`(${plugins.length} Packages)`);

  const checks: QaCheckResult[] = [
    {
      id: "judge-strapi-manifests",
      name: "Judge 1: Strapi v5 Plugin Manifests & Exports",
      category: "judge",
      status: manifestIssues.length === 0 ? "pass" : "fail",
      durationMs: 2,
      summary:
        manifestIssues.length === 0
          ? `All ${plugins.length} Strapi v5 plugins passed manifest checks`
          : `${manifestIssues.length} manifest issue(s) found`,
      details: manifestIssues,
    },
    {
      id: "judge-strapi-tests",
      name: "Judge 2: Offline Unit Test Presence",
      category: "judge",
      status: missingTests.length === 0 ? "pass" : "fail",
      durationMs: 1,
      summary:
        missingTests.length === 0
          ? `All ${plugins.length} Strapi plugins include offline tests`
          : `${missingTests.length} plugin(s) lack tests`,
      details: missingTests,
    },
    {
      id: "judge-strapi-i18n",
      name: "Judge 3: 5-Core-Locale Admin i18n Parity (en/es/ar/tr/fr)",
      category: "judge",
      status: i18nIssues.length === 0 ? "pass" : "warn",
      durationMs: 3,
      summary:
        i18nIssues.length === 0
          ? "All Admin i18n plugins maintain 100% key parity across core locales"
          : `${i18nIssues.length} i18n parity issue(s) found`,
      details: i18nIssues,
    },
    {
      id: "judge-dashboard-wiring",
      name: "Judge 4: Dashboard Config Wiring Parity",
      category: "judge",
      status: unwired.length === 0 ? "pass" : "warn",
      durationMs: 1,
      summary:
        unwired.length === 0
          ? `All ${plugins.length} plugins enabled in apps/dashboard`
          : `${unwired.length} plugin(s) not enabled in apps/dashboard`,
      details: unwired,
    },
    {
      id: "judge-readme-count",
      name: "Judge 5: README Plugin Inventory Parity",
      category: "judge",
      status: readmeCountOk ? "pass" : "warn",
      durationMs: 1,
      summary: readmeCountOk
        ? `README accurately documents ${plugins.length} plugins`
        : `README heading count differs from actual ${plugins.length} plugins`,
    },
  ];

  return { checks, plugins };
}

if (
  resolve(process.argv[1] ?? "") === resolve(fileURLToPath(import.meta.url))
) {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const { checks } = runStrapiExtensionsJudges(repoRoot);
  let failed = 0;
  for (const c of checks) {
    process.stdout.write(
      `[${c.status.toUpperCase()}] ${c.name}: ${c.summary}\n`
    );
    for (const d of c.details ?? []) {
      process.stdout.write(`    - ${d}\n`);
    }
    if (c.status === "fail") failed += 1;
  }
  if (failed > 0) process.exit(1);
}
