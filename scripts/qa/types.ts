import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";

export type QaStatus = "pass" | "warn" | "fail" | "skip";

export type QaEcosystem = "medusa" | "strapi" | "astro" | "project";

export interface QaCheckResult {
  id: string;
  name: string;
  category: "doctor" | "judge" | "verify" | "smoke" | "e2e";
  status: QaStatus;
  durationMs: number;
  summary: string;
  details?: string[];
}

export interface QaPluginEntry {
  name: string;
  pluginId: string;
  ecosystem: "medusa" | "strapi" | "astro";
  version: string;
  hasTests: boolean;
  hasBuildScript: boolean;
  hasTypecheck: boolean;
  wiredInHost: boolean;
  localeCount: number;
  status: QaStatus;
  notes: string[];
}

export interface QaDriftItem {
  subject: string;
  expected: string;
  actual: string;
  severity: "warn" | "fail";
  sourceRepo: string;
}

export interface QaRepoReport {
  schemaVersion: "qa-report/v1";
  repoId: string;
  repoName: string;
  ecosystem: QaEcosystem;
  repoPath: string;
  generatedAt: string;
  nodeVersion: string;
  linkMode?: "local" | "npm" | "mixed" | "workspace";
  summary: {
    pass: number;
    warn: number;
    fail: number;
    skip: number;
    pluginsTotal: number;
  };
  checks: QaCheckResult[];
  plugins: QaPluginEntry[];
  drifts: QaDriftItem[];
}

export function assertWithinDir(targetPath: string, rootDir: string): string {
  const normalizedRoot = resolve(rootDir);
  const normalizedTarget = resolve(targetPath);
  if (
    normalizedTarget !== normalizedRoot &&
    !normalizedTarget.startsWith(`${normalizedRoot}${sep}`)
  ) {
    throw new Error(
      `Security boundary violation: "${normalizedTarget}" escapes "${normalizedRoot}"`
    );
  }
  return normalizedTarget;
}

export function safeReadJson<T>(filePath: string): T | null {
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

export function summarizeChecks(
  checks: QaCheckResult[],
  pluginsTotal: number
): QaRepoReport["summary"] {
  const summary = { pass: 0, warn: 0, fail: 0, skip: 0, pluginsTotal };
  for (const check of checks) {
    summary[check.status] += 1;
  }
  return summary;
}

export function writeQaReport(repoRoot: string, report: QaRepoReport): string {
  const qaDir = assertWithinDir(join(repoRoot, ".qa"), repoRoot);
  mkdirSync(qaDir, { recursive: true });
  const outPath = assertWithinDir(join(qaDir, "report.json"), repoRoot);
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return outPath;
}

export function readExistingReport(repoRoot: string): QaRepoReport | null {
  const reportPath = join(resolve(repoRoot), ".qa", "report.json");
  const parsed = safeReadJson<QaRepoReport>(reportPath);
  if (parsed?.schemaVersion === "qa-report/v1") {
    return parsed;
  }
  return null;
}

export function discoverSiblingReports(repoRoot: string): QaRepoReport[] {
  const absRoot = resolve(repoRoot);
  const parent = dirname(absRoot);
  const grandParent = dirname(parent);
  const candidates = [
    absRoot,
    join(parent, "plugins"),
    join(parent, "vicacha-travels-develop"),
    join(parent, "strapi-v5-extensions"),
    join(parent, "central-mosque-bogota"),
    join(parent, "astro-tiptap-blocks"),
    join(grandParent, "tourism", "plugins"),
    join(grandParent, "tourism", "vicacha-travels-develop"),
    join(grandParent, "mosque-website", "strapi-v5-extensions"),
    join(grandParent, "mosque-website", "central-mosque-bogota"),
    join(grandParent, "mosque-website", "astro-tiptap-blocks"),
  ];

  const seen = new Set<string>();
  const reports: QaRepoReport[] = [];
  for (const dir of candidates) {
    const resolved = resolve(dir);
    if (seen.has(resolved) || !existsSync(resolved)) {
      continue;
    }
    seen.add(resolved);
    const report = readExistingReport(resolved);
    if (report) {
      reports.push(report);
    }
  }
  return reports.toSorted((a, b) => a.repoId.localeCompare(b.repoId));
}
