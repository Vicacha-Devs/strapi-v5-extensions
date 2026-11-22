import { expect, test } from "@playwright/test";

test.describe("Strapi v5 Extensions Dashboard — Health, Auth & Admin E2E", () => {
  test("GET /_health returns healthy status", async ({ request }) => {
    const res = await request.get("/_health");
    expect([200, 204]).toContain(res.status());
  });

  test("unauthenticated admin API requests return 401/403", async ({
    request,
  }) => {
    const res = await request.get("/admin/users/me");
    expect([401, 403]).toContain(res.status());
  });

  test("Admin shell renders with accessible title and zero uncaught page errors", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/Strapi/i);
    // The admin is a SPA: wait for it to render instead of checking once.
    await expect(page.locator("main, h1, form").first()).toBeVisible({
      timeout: 20_000,
    });
    expect(pageErrors).toEqual([]);
  });
});
