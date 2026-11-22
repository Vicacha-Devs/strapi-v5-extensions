import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  QA_DASHBOARD_CLIENT_JS,
  QA_THEME_INIT_JS,
} from "./dashboard-client.ts";
import { QA_DASHBOARD_CSS } from "./dashboard-styles.ts";
import type { QaRepoReport } from "./types.ts";
import { assertWithinDir } from "./types.ts";

function sha256Csp(content: string): string {
  const hash = createHash("sha256").update(content, "utf8").digest("base64");
  return `'sha256-${hash}'`;
}

function escapeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderQaDashboardHtml(
  title: string,
  reports: QaRepoReport[]
): string {
  const generatedAt = new Date().toISOString();
  const safeTitle = escapeHtmlText(title);
  const styleHash = sha256Csp(QA_DASHBOARD_CSS);
  const initHash = sha256Csp(QA_THEME_INIT_JS);
  const clientHash = sha256Csp(QA_DASHBOARD_CLIENT_JS);
  const csp = [
    "default-src 'none'",
    `style-src ${styleHash}`,
    `script-src ${initHash} ${clientHash}`,
    "img-src 'self' data:",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");

  const safeData = escapeJsonForScript({ generatedAt, reports });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>${safeTitle} | Vicacha QA Control Center</title>
  <script>${QA_THEME_INIT_JS}</script>
  <style>${QA_DASHBOARD_CSS}</style>
</head>
<body>
  <a href="#qa-title" class="skip-link visually-hidden">Skip to main content</a>
  <div class="shell">
    <header class="topbar">
      <div>
        <h1 id="qa-title" tabindex="-1">${safeTitle}</h1>
        <p class="meta-line">Generated ${escapeHtmlText(generatedAt)} &middot; ${reports.length} repository report(s)</p>
        <nav class="section-nav" aria-label="Dashboard sections">
          <ul>
            <li><a href="#section-kpis">Overview</a></li>
            <li><a href="#section-plugins">Plugin Matrix</a></li>
            <li><a href="#section-repos">Repository Gates</a></li>
            <li><a href="#section-drift">Drift Inspector</a></li>
          </ul>
        </nav>
      </div>
      <div class="controls-row">
        <div class="theme-group" role="group" aria-label="Color scheme">
          <button type="button" class="theme-btn" data-theme-mode="system" aria-pressed="true">System</button>
          <button type="button" class="theme-btn" data-theme-mode="light" aria-pressed="false">Light</button>
          <button type="button" class="theme-btn" data-theme-mode="dark" aria-pressed="false">Dark</button>
        </div>
      </div>
    </header>

    <main>
      <p id="qa-live" class="visually-hidden" aria-live="polite"></p>

      <section id="section-kpis" aria-labelledby="heading-kpis">
        <h2 id="heading-kpis" class="visually-hidden">Quality Summary</h2>
        <div id="qa-kpis" class="kpi-grid"></div>
      </section>

      <section id="section-plugins" class="panel" aria-labelledby="heading-plugins">
        <h2 id="heading-plugins">Plugin Quality Matrix</h2>
        <div class="filter-bar">
          <div class="field">
            <label for="plugin-search">Search plugin</label>
            <input id="plugin-search" type="search" placeholder="Filter by package or id">
          </div>
          <div class="field">
            <label for="plugin-eco">Ecosystem</label>
            <select id="plugin-eco">
              <option value="all">All ecosystems</option>
              <option value="medusa">Medusa v2</option>
              <option value="strapi">Strapi v5</option>
              <option value="astro">Astro</option>
            </select>
          </div>
          <div class="field">
            <label for="plugin-status">Status</label>
            <select id="plugin-status">
              <option value="all">All statuses</option>
              <option value="pass">Pass</option>
              <option value="warn">Warn</option>
              <option value="fail">Fail</option>
            </select>
          </div>
        </div>
        <div tabindex="0" role="region" aria-labelledby="matrix-caption" class="table-wrapper">
          <table class="matrix-table">
            <caption id="matrix-caption">Tracked plugins across discovered Vicacha repositories</caption>
            <thead>
              <tr>
                <th scope="col">Package</th>
                <th scope="col">Ecosystem</th>
                <th scope="col">Version</th>
                <th scope="col">Tests</th>
                <th scope="col">Host Wired</th>
                <th scope="col">Locales</th>
                <th scope="col">Status</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody id="plugin-matrix-body"></tbody>
          </table>
        </div>
      </section>

      <section id="section-repos" class="panel" aria-labelledby="heading-repos">
        <h2 id="heading-repos">Repository Verification Gates</h2>
        <div class="filter-bar">
          <div class="field">
            <label for="repo-filter">Repository</label>
            <select id="repo-filter">
              <option value="all">All repositories</option>
            </select>
          </div>
        </div>
        <div id="repos-list"></div>
      </section>

      <section id="section-drift" class="panel" aria-labelledby="heading-drift">
        <h2 id="heading-drift">Version &amp; Configuration Drift Inspector</h2>
        <div tabindex="0" role="region" aria-labelledby="drift-caption" class="table-wrapper">
          <table>
            <caption id="drift-caption">Detected cross-repo version, link, and configuration drift</caption>
            <thead>
              <tr>
                <th scope="col">Subject</th>
                <th scope="col">Source Repo</th>
                <th scope="col">Expected</th>
                <th scope="col">Actual</th>
                <th scope="col">Severity</th>
              </tr>
            </thead>
            <tbody id="drift-body"></tbody>
          </table>
        </div>
      </section>
    </main>

    <footer class="foot">
      Vicacha QA Control Center &middot; Offline-first &middot; Strict SHA-256 CSP &middot; Zero External Dependencies
    </footer>
  </div>
  <script id="qa-data" type="application/json">${safeData}</script>
  <script>${QA_DASHBOARD_CLIENT_JS}</script>
</body>
</html>
`;
}

export function writeQaDashboard(
  repoRoot: string,
  title: string,
  reports: QaRepoReport[]
): string {
  const qaDir = assertWithinDir(join(repoRoot, ".qa"), repoRoot);
  mkdirSync(qaDir, { recursive: true });
  const outPath = assertWithinDir(join(qaDir, "dashboard.html"), repoRoot);
  writeFileSync(outPath, renderQaDashboardHtml(title, reports), "utf8");
  return outPath;
}
