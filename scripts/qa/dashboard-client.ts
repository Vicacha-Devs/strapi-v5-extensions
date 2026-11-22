export const QA_THEME_INIT_JS = `(() => {
  try {
    const saved = localStorage.getItem("qa-color-scheme");
    if (saved === "light" || saved === "dark") {
      const m = document.querySelector('meta[name="color-scheme"]');
      if (m) m.setAttribute("content", saved);
    }
  } catch {
    // Ignore restricted storage contexts
  }
})();`;

export const QA_DASHBOARD_CLIENT_JS = `(() => {
  const dataEl = document.getElementById("qa-data");
  if (!dataEl) return;
  const payload = JSON.parse(dataEl.textContent || "{}");
  const reports = Array.isArray(payload.reports) ? payload.reports : [];
  const allPlugins = reports.flatMap((r) =>
    (r.plugins || []).map((p) => ({ ...p, repoId: r.repoId }))
  );
  const allDrifts = reports.flatMap((r) => r.drifts || []);

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };

  const makeBadge = (status) => {
    const s = ["pass", "warn", "fail", "skip"].includes(status) ? status : "skip";
    return el("span", "badge status-" + s, s);
  };

  const liveRegion = document.getElementById("qa-live");
  const announce = (msg) => {
    if (liveRegion) liveRegion.textContent = msg;
  };

  const metaScheme = document.querySelector('meta[name="color-scheme"]');
  const themeButtons = Array.from(document.querySelectorAll("[data-theme-mode]"));
  const applyTheme = (mode, persist) => {
    const normalized = mode === "light" || mode === "dark" ? mode : "system";
    if (metaScheme) {
      metaScheme.setAttribute(
        "content",
        normalized === "system" ? "light dark" : normalized
      );
    }
    for (const btn of themeButtons) {
      btn.setAttribute(
        "aria-pressed",
        String(btn.getAttribute("data-theme-mode") === normalized)
      );
    }
    if (persist) {
      try {
        if (normalized === "system") localStorage.removeItem("qa-color-scheme");
        else localStorage.setItem("qa-color-scheme", normalized);
      } catch {
        // Storage unavailable
      }
    }
  };

  let initialMode = "system";
  try {
    const stored = localStorage.getItem("qa-color-scheme");
    if (stored === "light" || stored === "dark") initialMode = stored;
  } catch {
    initialMode = "system";
  }
  applyTheme(initialMode, false);
  for (const btn of themeButtons) {
    btn.addEventListener("click", () => {
      const m = btn.getAttribute("data-theme-mode") || "system";
      applyTheme(m, true);
      announce("Color scheme set to " + m);
    });
  }
  window.addEventListener("storage", (ev) => {
    if (ev.key === "qa-color-scheme") applyTheme(ev.newValue || "system", false);
  });

  const kpiHost = document.getElementById("qa-kpis");
  if (kpiHost) {
    const totals = reports.reduce(
      (acc, r) => {
        acc.pass += r.summary?.pass || 0;
        acc.warn += r.summary?.warn || 0;
        acc.fail += r.summary?.fail || 0;
        acc.skip += r.summary?.skip || 0;
        return acc;
      },
      { pass: 0, warn: 0, fail: 0, skip: 0 }
    );
    const cards = [
      ["Repositories", reports.length, ""],
      ["Plugins Tracked", allPlugins.length, ""],
      ["Checks Passed", totals.pass, "status-pass"],
      ["Warnings", totals.warn, "status-warn"],
      ["Failures", totals.fail, "status-fail"],
      ["Drift Alerts", allDrifts.length, allDrifts.length ? "status-warn" : "status-pass"],
    ];
    kpiHost.replaceChildren();
    for (const [label, value, cls] of cards) {
      const card = el("div", "kpi-card");
      card.appendChild(el("div", "kpi-label", label));
      card.appendChild(el("div", "kpi-value " + cls, value));
      kpiHost.appendChild(card);
    }
  }

  const searchInput = document.getElementById("plugin-search");
  const ecoSelect = document.getElementById("plugin-eco");
  const statusSelect = document.getElementById("plugin-status");
  const matrixBody = document.getElementById("plugin-matrix-body");

  const renderPlugins = () => {
    if (!matrixBody) return;
    const q = (searchInput?.value || "").trim().toLowerCase();
    const eco = ecoSelect?.value || "all";
    const st = statusSelect?.value || "all";
    const rows = allPlugins.filter((p) => {
      if (eco !== "all" && p.ecosystem !== eco) return false;
      if (st !== "all" && p.status !== st) return false;
      if (q && !(p.name + " " + p.pluginId + " " + p.repoId).toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
    matrixBody.replaceChildren();
    if (rows.length === 0) {
      const tr = el("tr");
      const td = el("td", "", "No plugins match the current filters.");
      td.colSpan = 8;
      tr.appendChild(td);
      matrixBody.appendChild(tr);
    } else {
      for (const p of rows) {
        const tr = el("tr");
        const th = el("th", "", p.name);
        th.setAttribute("scope", "row");
        tr.appendChild(th);
        tr.appendChild(el("td", "", p.ecosystem));
        tr.appendChild(el("td", "", p.version));
        tr.appendChild(el("td", p.hasTests ? "status-pass" : "status-fail", p.hasTests ? "Yes" : "Missing"));
        tr.appendChild(el("td", p.wiredInHost ? "status-pass" : "status-warn", p.wiredInHost ? "Wired" : "Unwired"));
        tr.appendChild(el("td", "", p.localeCount > 0 ? String(p.localeCount) : "—"));
        const stTd = el("td");
        stTd.appendChild(makeBadge(p.status));
        tr.appendChild(stTd);
        tr.appendChild(el("td", "", (p.notes || []).join("; ") || "OK"));
        matrixBody.appendChild(tr);
      }
    }
    announce("Showing " + rows.length + " of " + allPlugins.length + " plugins.");
  };

  searchInput?.addEventListener("input", renderPlugins);
  ecoSelect?.addEventListener("change", renderPlugins);
  statusSelect?.addEventListener("change", renderPlugins);
  renderPlugins();

  const repoFilter = document.getElementById("repo-filter");
  if (repoFilter) {
    for (const r of reports) {
      const opt = el("option", "", r.repoName + " (" + r.ecosystem + ")");
      opt.value = r.repoId;
      repoFilter.appendChild(opt);
    }
  }

  const reposHost = document.getElementById("repos-list");
  const renderRepos = () => {
    if (!reposHost) return;
    const selected = repoFilter?.value || "all";
    reposHost.replaceChildren();
    for (const r of reports) {
      if (selected !== "all" && r.repoId !== selected) continue;
      const card = el("article", "repo-card");
      const head = el("div", "repo-card-head");
      const title = el("h3", "", r.repoName);
      title.style.margin = "0";
      head.appendChild(title);
      const meta = el(
        "span",
        "meta-line",
        "Ecosystem: " + r.ecosystem + (r.linkMode ? " · Links: " + r.linkMode : "") + " · Node " + r.nodeVersion
      );
      head.appendChild(meta);
      card.appendChild(head);

      const ul = el("ul", "check-list");
      for (const c of r.checks || []) {
        const li = el("li", "check-item");
        const row = el("div", "check-row");
        const left = el("strong", "", "[" + c.category.toUpperCase() + "] " + c.name);
        const right = el("span");
        right.appendChild(makeBadge(c.status));
        right.appendChild(el("span", "meta-line", " " + c.durationMs + "ms"));
        row.appendChild(left);
        row.appendChild(right);
        li.appendChild(row);
        li.appendChild(el("div", "meta-line", c.summary));
        if (Array.isArray(c.details) && c.details.length > 0) {
          const det = el("ul", "detail-list");
          for (const d of c.details.slice(0, 15)) {
            det.appendChild(el("li", "", d));
          }
          li.appendChild(det);
        }
        ul.appendChild(li);
      }
      card.appendChild(ul);
      reposHost.appendChild(card);
    }
  };
  repoFilter?.addEventListener("change", renderRepos);
  renderRepos();

  const driftBody = document.getElementById("drift-body");
  if (driftBody) {
    driftBody.replaceChildren();
    if (allDrifts.length === 0) {
      const tr = el("tr");
      const td = el("td", "status-pass", "No cross-repo version or configuration drift detected.");
      td.colSpan = 5;
      tr.appendChild(td);
      driftBody.appendChild(tr);
    } else {
      for (const d of allDrifts) {
        const tr = el("tr");
        const th = el("th", "", d.subject);
        th.setAttribute("scope", "row");
        tr.appendChild(th);
        tr.appendChild(el("td", "", d.sourceRepo));
        tr.appendChild(el("td", "", d.expected));
        tr.appendChild(el("td", "", d.actual));
        const td = el("td");
        td.appendChild(makeBadge(d.severity));
        tr.appendChild(td);
        driftBody.appendChild(tr);
      }
    }
  }
})();`;
