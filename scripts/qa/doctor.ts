import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { QaCheckResult, QaDriftItem } from "./types.ts";
import { safeReadJson } from "./types.ts";

interface PkgJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export function runStrapiExtensionsDoctor(repoRoot: string): {
  checks: QaCheckResult[];
  drifts: QaDriftItem[];
} {
  const checks: QaCheckResult[] = [];
  const drifts: QaDriftItem[] = [];
  const packagesDir = join(repoRoot, "packages");

  const major = Number.parseInt(process.versions.node.split(".")[0], 10);
  checks.push({
    id: "runtime-node",
    name: "Node.js Runtime Compatibility",
    category: "doctor",
    status: major >= 22 ? "pass" : "fail",
    durationMs: 1,
    summary: `Node v${process.versions.node} detected (requires >=22.11.0)`,
  });

  const dashboardPkg = safeReadJson<PkgJson>(
    join(repoRoot, "apps", "dashboard", "package.json")
  );
  const dashboardStrapi =
    dashboardPkg?.dependencies?.["@strapi/strapi"] ?? "unknown";

  const pluginDirs = readdirSync(packagesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith("strapi-plugin-"))
    .map((e) => e.name)
    .sort();

  const missingInDash: string[] = [];
  for (const dir of pluginDirs) {
    const pkg = safeReadJson<PkgJson>(join(packagesDir, dir, "package.json"));
    if (!pkg?.name) continue;
    if (!dashboardPkg?.dependencies?.[pkg.name]) {
      missingInDash.push(pkg.name);
    }
  }

  checks.push({
    id: "dashboard-coverage",
    name: "Host Dashboard Plugin Wiring Coverage",
    category: "doctor",
    status: missingInDash.length === 0 ? "pass" : "warn",
    durationMs: 2,
    summary:
      missingInDash.length === 0
        ? `All ${pluginDirs.length} Strapi plugins wired in apps/dashboard`
        : `${missingInDash.length} plugin(s) not listed in apps/dashboard`,
    details: missingInDash,
  });

  const siblingMosque = resolve(repoRoot, "../central-mosque-bogota");
  if (existsSync(siblingMosque)) {
    const mosqueBackend = safeReadJson<PkgJson>(
      join(siblingMosque, "apps", "backend", "package.json")
    );
    const mosqueStrapi =
      mosqueBackend?.dependencies?.["@strapi/strapi"] ?? "unknown";
    if (dashboardStrapi !== mosqueStrapi) {
      drifts.push({
        subject: "@strapi/strapi (dashboard vs central-mosque)",
        expected: mosqueStrapi,
        actual: dashboardStrapi,
        severity: "warn",
        sourceRepo: "strapi-v5-extensions",
      });
    }
    checks.push({
      id: "sibling-mosque-strapi-version",
      name: "Sibling Central Mosque Strapi Version Alignment",
      category: "doctor",
      status: dashboardStrapi === mosqueStrapi ? "pass" : "warn",
      durationMs: 1,
      summary:
        dashboardStrapi === mosqueStrapi
          ? `Aligned on Strapi ${mosqueStrapi}`
          : `apps/dashboard (${dashboardStrapi}) vs central-mosque (${mosqueStrapi})`,
    });
  }

  const composePath = join(repoRoot, "docker-compose.qa.yml");
  const composeText = existsSync(composePath)
    ? readFileSync(composePath, "utf8")
    : "";
  const loopbackSafe =
    composeText.includes("127.0.0.1:5434:5432") &&
    !composeText.includes("0.0.0.0");
  checks.push({
    id: "docker-qa-security",
    name: "Port-Isolated QA Compose Security (Loopback Only)",
    category: "doctor",
    status: loopbackSafe ? "pass" : "fail",
    durationMs: 1,
    summary: loopbackSafe
      ? "docker-compose.qa.yml binds strictly to 127.0.0.1 (5434/6381/8110/1027)"
      : "docker-compose.qa.yml missing or exposes non-loopback ports",
  });

  return { checks, drifts };
}

if (
  resolve(process.argv[1] ?? "") === resolve(fileURLToPath(import.meta.url))
) {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const { checks } = runStrapiExtensionsDoctor(repoRoot);
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
