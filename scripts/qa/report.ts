import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { writeQaDashboard } from "./dashboard.ts";
import { discoverSiblingReports, readExistingReport } from "./types.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const includeSiblings = !process.argv.includes("--single");

const reports = includeSiblings
  ? discoverSiblingReports(repoRoot)
  : (() => {
      const own = readExistingReport(repoRoot);
      return own ? [own] : [];
    })();

if (reports.length === 0) {
  console.error(
    "[qa:report] No .qa/report.json found. Run `pnpm qa:verify` first."
  );
  process.exit(1);
}

const title =
  reports.length > 1
    ? "Vicacha Ecosystem QA Control Center"
    : `${reports[0].repoName} QA Report`;

const outPath = writeQaDashboard(repoRoot, title, reports);
process.stdout.write(
  `[qa:report] Generated interactive HTML dashboard (${reports.length} repo(s)):\n  ${outPath}\n`
);
