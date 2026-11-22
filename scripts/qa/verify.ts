import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { writeQaDashboard } from "./dashboard.ts";
import { runStrapiExtensionsDoctor } from "./doctor.ts";
import { runStrapiExtensionsJudges } from "./judges.ts";
import type { QaCheckResult, QaRepoReport } from "./types.ts";
import {
  discoverSiblingReports,
  safeReadJson,
  summarizeChecks,
  writeQaReport,
} from "./types.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const strict = process.argv.includes("--strict");
const packagesDir = join(repoRoot, "packages");
const hasNodeModules = existsSync(join(repoRoot, "node_modules"));
const wsResolver = join(repoRoot, "scripts", "qa", "workspace-ts-resolver.mjs");

function runGate(
  id: string,
  name: string,
  bin: string,
  args: string[],
  cwd: string
): QaCheckResult {
  const start = Date.now();
  try {
    execFileSync(bin, args, { cwd, stdio: "pipe", encoding: "utf8" });
    return {
      id,
      name,
      category: "verify",
      status: "pass",
      durationMs: Date.now() - start,
      summary: `Passed in ${Date.now() - start}ms`,
    };
  } catch (err) {
    const out = String(
      (err as { stderr?: string; stdout?: string; message?: string }).stderr ||
        (err as { stdout?: string }).stdout ||
        (err as Error).message
    );
    if (!hasNodeModules && out.includes("ERR_MODULE_NOT_FOUND")) {
      return {
        id,
        name,
        category: "verify",
        status: "skip",
        durationMs: Date.now() - start,
        summary: "Skipped offline (external dependency requires pnpm install)",
      };
    }
    return {
      id,
      name,
      category: "verify",
      status: "fail",
      durationMs: Date.now() - start,
      summary: `Failed (${Date.now() - start}ms)`,
      details: out.trim().split("\n").slice(-10),
    };
  }
}

const doctor = runStrapiExtensionsDoctor(repoRoot);
const judges = runStrapiExtensionsJudges(repoRoot);
const verifyChecks: QaCheckResult[] = [];

const pkgDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter(
    (e) =>
      e.isDirectory() &&
      (e.name.startsWith("strapi-plugin-") || e.name === "plugin-shared")
  )
  .map((e) => e.name)
  .sort();

for (const dir of pkgDirs) {
  const pkgDir = join(packagesDir, dir);
  const pkg = safeReadJson<{ scripts?: { test?: string } }>(
    join(pkgDir, "package.json")
  );
  const testScript = pkg?.scripts?.test ?? "";
  const testsDir = join(pkgDir, "tests");
  if (!existsSync(testsDir)) continue;

  if (testScript.includes("vitest")) {
    const vitestBin = join(repoRoot, "node_modules", ".bin", "vitest");
    if (!existsSync(vitestBin)) {
      verifyChecks.push({
        id: `test-${dir}`,
        name: `Unit Suite: ${dir}`,
        category: "verify",
        status: "skip",
        durationMs: 0,
        summary: "Skipped offline (vitest requires pnpm install)",
      });
      continue;
    }
    verifyChecks.push(
      runGate(`test-${dir}`, `Vitest Suite: ${dir}`, vitestBin, ["run"], pkgDir)
    );
    continue;
  }

  const testFiles = readdirSync(testsDir)
    .filter((f) => f.endsWith(".test.ts") || f.endsWith(".spec.ts"))
    .sort()
    .map((f) => join("tests", f));
  if (testFiles.length === 0) continue;

  const localTsResolver = join(testsDir, "register-ts-resolver.ts");
  const localMjsResolver = join(testsDir, "register-ts-resolver.mjs");
  const localResolver = existsSync(localTsResolver)
    ? localTsResolver
    : existsSync(localMjsResolver)
      ? localMjsResolver
      : null;

  const args = ["--import", wsResolver];
  if (localResolver) {
    args.push("--import", localResolver);
  }
  args.push("--test", ...testFiles);
  verifyChecks.push(
    runGate(
      `test-${dir}`,
      `Offline Unit Suite: ${dir}`,
      process.execPath,
      args,
      pkgDir
    )
  );
}

const allChecks = [...doctor.checks, ...judges.checks, ...verifyChecks];
const report: QaRepoReport = {
  schemaVersion: "qa-report/v1",
  repoId: "strapi-v5-extensions",
  repoName: "@vicacha-devs/strapi-v5-extensions",
  ecosystem: "strapi",
  repoPath: repoRoot,
  generatedAt: new Date().toISOString(),
  nodeVersion: process.versions.node,
  linkMode: "workspace",
  summary: summarizeChecks(allChecks, judges.plugins.length),
  checks: allChecks,
  plugins: judges.plugins,
  drifts: doctor.drifts,
};

const reportPath = writeQaReport(repoRoot, report);
const siblingReports = discoverSiblingReports(repoRoot);
const dashPath = writeQaDashboard(
  repoRoot,
  siblingReports.length > 1
    ? "Vicacha Ecosystem QA Control Center"
    : `${report.repoName} QA Report`,
  siblingReports.length > 0 ? siblingReports : [report]
);

for (const c of allChecks) {
  process.stdout.write(
    `[${c.status.toUpperCase()}] ${c.name} (${c.durationMs}ms) — ${c.summary}\n`
  );
}
process.stdout.write(`\nReport: ${reportPath}\nDashboard: ${dashPath}\n`);

if (report.summary.fail > 0 || (strict && report.summary.warn > 0)) {
  process.exit(1);
}
