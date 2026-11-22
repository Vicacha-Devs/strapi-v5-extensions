const baseUrl = process.env.STRAPI_DASHBOARD_URL || "http://127.0.0.1:1338";

interface SmokeTarget {
  name: string;
  path: string;
  expectedStatuses: number[];
}

const targets: SmokeTarget[] = [
  {
    name: "Strapi Dashboard /_health",
    path: "/_health",
    expectedStatuses: [200, 204],
  },
  {
    name: "Strapi Admin UI (/admin)",
    path: "/admin",
    expectedStatuses: [200, 302],
  },
  {
    name: "Protected Admin API (/admin/users/me)",
    path: "/admin/users/me",
    expectedStatuses: [401, 403],
  },
];

let failed = 0;
for (const target of targets) {
  const url = new URL(target.path, baseUrl).toString();
  try {
    const res = await fetch(url, { redirect: "manual" });
    const ok = target.expectedStatuses.includes(res.status);
    process.stdout.write(
      `[${ok ? "PASS" : "FAIL"}] ${target.name} -> HTTP ${res.status}\n`
    );
    if (!ok) failed += 1;
  } catch (err) {
    console.error(`[FAIL] ${target.name} -> ${(err as Error).message}`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(
    `[qa:smoke] ${failed} check(s) failed against ${baseUrl}. Ensure dashboard is running.`
  );
  process.exit(1);
}
process.stdout.write("[qa:smoke] All Strapi dashboard smoke checks passed.\n");
