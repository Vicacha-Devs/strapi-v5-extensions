export const QA_DASHBOARD_CSS = `:root {
  --bg-light: #f8fafc;
  --bg-dark: #0b1120;
  --surface-light: #ffffff;
  --surface-dark: #111827;
  --surface-alt-light: #f1f5f9;
  --surface-alt-dark: #1e293b;
  --border-light: #cbd5e1;
  --border-dark: #334155;
  --text-light: #0f172a;
  --text-dark: #f1f5f9;
  --muted-light: #475569;
  --muted-dark: #94a3b8;
  --accent-light: #1d4ed8;
  --accent-dark: #60a5fa;
  --pass-light: #15803d;
  --pass-dark: #4ade80;
  --warn-light: #b45309;
  --warn-dark: #fbbf24;
  --fail-light: #b91c1c;
  --fail-dark: #f87171;
  --skip-light: #475569;
  --skip-dark: #94a3b8;

  --bg: var(--bg-light);
  --surface: var(--surface-light);
  --surface-alt: var(--surface-alt-light);
  --border: var(--border-light);
  --text: var(--text-light);
  --muted: var(--muted-light);
  --accent: var(--accent-light);
  --pass: var(--pass-light);
  --warn: var(--warn-light);
  --fail: var(--fail-light);
  --skip: var(--skip-light);

  color-scheme: light dark;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: var(--bg-dark);
    --surface: var(--surface-dark);
    --surface-alt: var(--surface-alt-dark);
    --border: var(--border-dark);
    --text: var(--text-dark);
    --muted: var(--muted-dark);
    --accent: var(--accent-dark);
    --pass: var(--pass-dark);
    --warn: var(--warn-dark);
    --fail: var(--fail-dark);
    --skip: var(--skip-dark);
  }
}

:root:has(> head > meta[name="color-scheme"][content="dark"]) {
  color-scheme: dark;
  --bg: var(--bg-dark);
  --surface: var(--surface-dark);
  --surface-alt: var(--surface-alt-dark);
  --border: var(--border-dark);
  --text: var(--text-dark);
  --muted: var(--muted-dark);
  --accent: var(--accent-dark);
  --pass: var(--pass-dark);
  --warn: var(--warn-dark);
  --fail: var(--fail-dark);
  --skip: var(--skip-dark);
}

:root:has(> head > meta[name="color-scheme"][content="light"]) {
  color-scheme: light;
  --bg: var(--bg-light);
  --surface: var(--surface-light);
  --surface-alt: var(--surface-alt-light);
  --border: var(--border-light);
  --text: var(--text-light);
  --muted: var(--muted-light);
  --accent: var(--accent-light);
  --pass: var(--pass-light);
  --warn: var(--warn-light);
  --fail: var(--fail-light);
  --skip: var(--skip-light);
}

@supports (color: light-dark(white, black)) {
  :root {
    --bg: light-dark(var(--bg-light), var(--bg-dark));
    --surface: light-dark(var(--surface-light), var(--surface-dark));
    --surface-alt: light-dark(var(--surface-alt-light), var(--surface-alt-dark));
    --border: light-dark(var(--border-light), var(--border-dark));
    --text: light-dark(var(--text-light), var(--text-dark));
    --muted: light-dark(var(--muted-light), var(--muted-dark));
    --accent: light-dark(var(--accent-light), var(--accent-dark));
    --pass: light-dark(var(--pass-light), var(--pass-dark));
    --warn: light-dark(var(--warn-light), var(--warn-dark));
    --fail: light-dark(var(--fail-light), var(--fail-dark));
    --skip: light-dark(var(--skip-light), var(--skip-dark));
  }
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
}
.visually-hidden:where(:not(:focus-within, :active)) {
  position: absolute !important;
  clip-path: inset(50%) !important;
  overflow: hidden !important;
  width: 1px !important;
  height: 1px !important;
  margin: -1px !important;
  padding: 0 !important;
  border: 0 !important;
  white-space: nowrap !important;
}
.skip-link:focus {
  position: fixed;
  inset-block-start: 0.75rem;
  inset-inline-start: 0.75rem;
  z-index: 100;
  background: var(--accent);
  color: #ffffff;
  padding: 0.5rem 0.9rem;
  border-radius: 0.5rem;
  text-decoration: none;
}
:where(a, button, input, select, summary, [tabindex="0"]):focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
.shell { max-inline-size: 1320px; margin-inline: auto; padding: 1.25rem; }
header.topbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding-block-end: 1rem;
  border-block-end: 1px solid var(--border);
}
header.topbar h1 { margin: 0; font-size: 1.5rem; }
.meta-line { margin: 0.2rem 0 0; color: var(--muted); font-size: 0.875rem; }
.controls-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.theme-group { display: inline-flex; border: 1px solid var(--border); border-radius: 0.5rem; overflow: hidden; }
.theme-btn {
  min-block-size: 32px;
  min-inline-size: 48px;
  padding: 0.35rem 0.7rem;
  border: 0;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  font-size: 0.8rem;
}
.theme-btn[aria-pressed="true"] { background: var(--accent); color: #ffffff; font-weight: 600; }
nav.section-nav ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  list-style: none;
  padding: 0;
  margin: 0.75rem 0 0;
}
nav.section-nav a { color: var(--accent); text-decoration: none; font-size: 0.9rem; font-weight: 600; }
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-block: 1.25rem;
}
.kpi-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 0.9rem 1rem;
}
.kpi-label { font-size: 0.78rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
.kpi-value { font-size: 1.65rem; font-weight: 700; margin-block-start: 0.25rem; }
.status-pass { color: var(--pass); }
.status-warn { color: var(--warn); }
.status-fail { color: var(--fail); }
.status-skip { color: var(--skip); }
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1rem;
  margin-block-end: 1.25rem;
}
.panel h2 { margin-block: 0 0.75rem; font-size: 1.15rem; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: end; margin-block-end: 0.9rem; }
.field { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
.field input, .field select {
  min-block-size: 36px;
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 0.45rem;
  background: var(--bg);
  color: var(--text);
}
.badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid currentColor;
  text-transform: uppercase;
}
.table-wrapper {
  overflow: auto;
  max-inline-size: 100%;
  max-block-size: min(560px, 72vh);
  container-type: inline-size;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
}
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.875rem;
}
caption {
  text-align: start;
  padding: 0.6rem 0.75rem;
  font-weight: 600;
  color: var(--muted);
  background: var(--surface-alt);
}
thead { position: sticky; inset-block-start: 0; z-index: 2; }
thead th {
  text-align: start;
  padding: 0.6rem 0.75rem;
  background: var(--surface-alt);
  border-block-end: 1px solid var(--border);
  white-space: nowrap;
}
tbody th, tbody td {
  padding: 0.55rem 0.75rem;
  border-block-end: 1px solid var(--border);
  vertical-align: top;
}
tbody th {
  position: sticky;
  inset-inline-start: 0;
  z-index: 1;
  background: var(--surface);
  text-align: start;
  font-weight: 600;
}
.repo-card {
  border: 1px solid var(--border);
  border-radius: 0.65rem;
  padding: 0.85rem 1rem;
  margin-block-end: 0.85rem;
  background: var(--bg);
}
.repo-card-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-block-end: 0.65rem;
}
.check-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.45rem; }
.check-item {
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 0.55rem 0.75rem;
  background: var(--surface);
}
.check-row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.5rem; align-items: center; }
.detail-list { margin: 0.4rem 0 0; padding-inline-start: 1.25rem; color: var(--muted); font-size: 0.82rem; }
footer.foot { color: var(--muted); font-size: 0.8rem; padding-block: 0.75rem 1.5rem; }

@container (width < 600px) {
  table.matrix-table,
  table.matrix-table thead,
  table.matrix-table tbody,
  table.matrix-table tr,
  table.matrix-table th,
  table.matrix-table td { display: block; }
  table.matrix-table thead { display: none; }
  table.matrix-table tbody tr {
    margin-block-end: 0.9rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    overflow: hidden;
  }
  table.matrix-table tbody th {
    position: sticky;
    inset-block-start: 0;
    z-index: 2;
    background: var(--surface-alt);
  }
  table.matrix-table {
    --label-2: "Ecosystem";
    --label-3: "Version";
    --label-4: "Tests";
    --label-5: "Host Wired";
    --label-6: "Locales";
    --label-7: "Status";
    --label-8: "Notes";
  }
  table.matrix-table td:nth-child(2)::before { content: var(--label-2) ": "; font-weight: 600; }
  table.matrix-table td:nth-child(3)::before { content: var(--label-3) ": "; font-weight: 600; }
  table.matrix-table td:nth-child(4)::before { content: var(--label-4) ": "; font-weight: 600; }
  table.matrix-table td:nth-child(5)::before { content: var(--label-5) ": "; font-weight: 600; }
  table.matrix-table td:nth-child(6)::before { content: var(--label-6) ": "; font-weight: 600; }
  table.matrix-table td:nth-child(7)::before { content: var(--label-7) ": "; font-weight: 600; }
  table.matrix-table td:nth-child(8)::before { content: var(--label-8) ": "; font-weight: 600; }
}
`;
