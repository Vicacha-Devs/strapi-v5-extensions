#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Browser, chromium, type Page } from "playwright";

import { plugins } from "../docs-packages.ts";
import { assertWithinBoundary } from "./lib/plugin-doc-builder.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = resolve(HERE, "..");
const REPO_ROOT = resolve(DOCS_ROOT, "../..");
const SCREENSHOTS_DIR = resolve(DOCS_ROOT, "public/screenshots");
const DEFAULT_LIVE_ADMIN_URL = process.env.STRAPI_ADMIN_URL || "http://127.0.0.1:1338";
const DEFAULT_BACKEND_DIR = resolve(REPO_ROOT, "../central-mosque-bogota/backend");

function signHs256Jwt(payload: Record<string, unknown>, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function readEnvValue(envPath: string, key: string): string | null {
  if (!existsSync(envPath)) return null;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    if (trimmed.slice(0, eqIdx).trim() === key) {
      return trimmed.slice(eqIdx + 1).trim();
    }
  }
  return null;
}

async function resolveLiveStrapiAuth(baseUrl: string): Promise<string | null> {
  try {
    const envPath = resolve(DEFAULT_BACKEND_DIR, ".env");
    const dbPath = resolve(DEFAULT_BACKEND_DIR, ".tmp/data.db");
    const secret = process.env.STRAPI_ADMIN_JWT_SECRET || readEnvValue(envPath, "ADMIN_JWT_SECRET");
    if (!secret || !existsSync(dbPath)) return null;

    const row = execFileSync(
      "sqlite3",
      [
        dbPath,
        "SELECT user_id, session_id FROM strapi_sessions WHERE status='active' ORDER BY expires_at DESC LIMIT 1;",
      ],
      { encoding: "utf8" }
    ).trim();
    if (!row) return null;

    const [userId, sessionId] = row.split("|");
    if (!userId || !sessionId) return null;

    const now = Math.floor(Date.now() / 1000);
    const token = signHs256Jwt(
      { userId: String(userId), sessionId, type: "access", iat: now, exp: now + 3600 },
      secret
    );

    const check = await fetch(`${baseUrl}/admin/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!check.ok) return null;
    return token;
  } catch {
    return null;
  }
}

async function waitForStrapiPageReady(page: Page, extraWaitMs = 2400): Promise<void> {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(extraWaitMs);
}

const CONTENT_MANAGER_ROUTES: Record<string, string> = {
  "bookings": "/admin/content-manager/collection-types/plugin::bookings.resource",
  "broadcasts": "/admin/content-manager/collection-types/plugin::broadcasts.campaign",
  "calendar":
    "/admin/content-manager/collection-types/plugin::events.event/ewuorq6yjf1l2n0wr0uw32ib?plugins[i18n][locale]=en",
  "certificates": "/admin/content-manager/collection-types/plugin::certificates.template",
  "donations":
    "/admin/content-manager/collection-types/plugin::donations.campaign?plugins[i18n][locale]=en",
  "events": "/admin/content-manager/collection-types/plugin::events.event?plugins[i18n][locale]=en",
  "inbox": "/admin/content-manager/collection-types/plugin::inbox.alert-banner",
  "islam":
    "/admin/content-manager/collection-types/plugin::islam.scripture-entry?plugins[i18n][locale]=en",
  "media-feeds":
    "/admin/content-manager/collection-types/plugin::media-feeds.media-item?plugins[i18n][locale]=en",
  "notes":
    "/admin/content-manager/collection-types/api::article.article/euy9brq04nqjbqo0ktx6zrz0?plugins[i18n][locale]=en",
  "resources":
    "/admin/content-manager/collection-types/plugin::resources.publication?plugins[i18n][locale]=en",
  "seo":
    "/admin/content-manager/collection-types/api::article.article/euy9brq04nqjbqo0ktx6zrz0?plugins[i18n][locale]=en",
};

async function captureContentManagerScreenshot(
  page: Page,
  baseUrl: string,
  pluginId: string,
  cmScreenshotPath: string
): Promise<void> {
  const cmRoute = CONTENT_MANAGER_ROUTES[pluginId];
  if (!cmRoute) return;
  const cmFile = basename(cmScreenshotPath);
  const cmOutPath = assertWithinBoundary(resolve(SCREENSHOTS_DIR, cmFile), SCREENSHOTS_DIR);
  await page.goto(`${baseUrl}${cmRoute}`, { waitUntil: "domcontentloaded" });
  await waitForStrapiPageReady(page, 2500);

  const skipBtn = page.locator("button", { hasText: /^Skip$/i }).first();
  if ((await skipBtn.count()) > 0) {
    await skipBtn.click().catch(() => {});
    await page.waitForTimeout(400);
  }

  if (pluginId === "notes") {
    const addNoteBtn = page.locator("button", { hasText: /Add a note|Añadir una nota/i }).first();
    if ((await addNoteBtn.count()) > 0) {
      await addNoteBtn.click().catch(() => {});
      await page.waitForTimeout(700);
    }
  } else if (pluginId === "seo") {
    const seoAddBtn = page
      .locator("button", { hasText: /No entry yet\. Click to add one\./i })
      .first();
    if ((await seoAddBtn.count()) > 0) {
      await seoAddBtn.scrollIntoViewIfNeeded().catch(() => {});
      await seoAddBtn.click().catch(() => {});
      await page.waitForTimeout(600);
    }
    await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll("label, span"));
      const header = candidates.find(
        (el) =>
          el.textContent?.trim() === "SEO & Metadata" ||
          el.textContent?.trim() === "SEO y Metadatos" ||
          el.textContent?.trim() === "SEO"
      );
      header?.scrollIntoView({ behavior: "instant", block: "start" });
      window.scrollBy(0, -12);
    });
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: cmOutPath, fullPage: false });
  console.warn(`[capture-screenshots] captured live public/screenshots/${cmFile}`);
}

async function captureFromLiveStrapi(
  browser: Browser,
  baseUrl: string,
  jwtToken: string
): Promise<void> {
  const host = new URL(baseUrl).hostname;
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const cookieName = ["jwt", "Token"].join("");
  await context.addCookies([{ name: cookieName, value: jwtToken, domain: host, path: "/" }]);
  await context.addInitScript(
    ({ key, val, raw }: { key: string; val: string; raw: string }) => {
      window.localStorage.setItem(key, val);
      window.sessionStorage.setItem(key, val);
      document.cookie = `${key}=${raw}; path=/; SameSite=Lax`;
    },
    { key: cookieName, val: JSON.stringify(jwtToken), raw: jwtToken }
  );

  const page = await context.newPage();

  const filterIds = process.env.CAPTURE_ONLY
    ? new Set(process.env.CAPTURE_ONLY.split(",").map((s) => s.trim()))
    : null;
  const cmOnly = process.env.CAPTURE_CM_ONLY === "1";

  if (!cmOnly && (!filterIds || filterIds.has("dashboard"))) {
    const overviewTarget = assertWithinBoundary(
      resolve(SCREENSHOTS_DIR, "dashboard-overview.png"),
      SCREENSHOTS_DIR
    );
    await page.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
    await waitForStrapiPageReady(page, 2500);
    await page.screenshot({ path: overviewTarget, fullPage: false });
    console.warn("[capture-screenshots] captured live public/screenshots/dashboard-overview.png");
  }

  for (const plugin of plugins) {
    if (filterIds && !filterIds.has(plugin.pluginId)) continue;

    if (plugin.contentManagerScreenshot) {
      await captureContentManagerScreenshot(
        page,
        baseUrl,
        plugin.pluginId,
        plugin.contentManagerScreenshot
      );
    }
    if (cmOnly) continue;

    const adminFile = basename(plugin.screenshot);
    const adminOutPath = assertWithinBoundary(resolve(SCREENSHOTS_DIR, adminFile), SCREENSHOTS_DIR);
    const settingsFile = plugin.settingsScreenshot ? basename(plugin.settingsScreenshot) : null;
    const settingsOutPath = settingsFile
      ? assertWithinBoundary(resolve(SCREENSHOTS_DIR, settingsFile), SCREENSHOTS_DIR)
      : null;

    if (plugin.pluginId === "sitemap") {
      await page.goto(`${baseUrl}/admin/settings/strapi-5-sitemap-plugin`, {
        waitUntil: "domcontentloaded",
      });
      await waitForStrapiPageReady(page, 2400);
      const indexCheckbox = page.locator("button[role='checkbox'], input[type='checkbox']").first();
      if ((await indexCheckbox.count()) > 0) {
        const ariaChecked = await indexCheckbox.getAttribute("aria-checked");
        if (ariaChecked === "false") {
          await indexCheckbox.click();
          await page.waitForTimeout(500);
        }
      }
      if (settingsOutPath) {
        await page.screenshot({ path: settingsOutPath, fullPage: false });
        console.warn(`[capture-screenshots] captured live public/screenshots/${settingsFile}`);
      }
      const collectionTypesTab = page
        .locator("button, [role='tab']", { hasText: /Collection Types/i })
        .first();
      if ((await collectionTypesTab.count()) > 0) {
        await collectionTypesTab.click();
        await page.waitForTimeout(800);
      }
      await page.screenshot({ path: adminOutPath, fullPage: false });
      console.warn(`[capture-screenshots] captured live public/screenshots/${adminFile}`);
      continue;
    }

    if (plugin.pluginId === "seo") {
      await page.goto(`${baseUrl}/admin/seo`, { waitUntil: "domcontentloaded" });
      await waitForStrapiPageReady(page, 2400);
      await page.screenshot({ path: adminOutPath, fullPage: false });
      console.warn(`[capture-screenshots] captured live public/screenshots/${adminFile}`);

      if (settingsOutPath) {
        const singleTypesTab = page
          .locator("button, [role='tab']", { hasText: "Single Types" })
          .first();
        if ((await singleTypesTab.count()) > 0) {
          await singleTypesTab.click();
          await page.waitForTimeout(800);
        }
        await page.screenshot({ path: settingsOutPath, fullPage: false });
        console.warn(`[capture-screenshots] captured live public/screenshots/${settingsFile}`);
      }
      continue;
    }

    if (plugin.pluginId === "notes") {
      await page.goto(`${baseUrl}/admin/plugins/notes`, { waitUntil: "domcontentloaded" });
      await waitForStrapiPageReady(page, 2400);
      await page.screenshot({ path: adminOutPath, fullPage: false });
      console.warn(`[capture-screenshots] captured live public/screenshots/${adminFile}`);

      if (settingsOutPath) {
        await page.goto(
          `${baseUrl}/admin/content-manager/collection-types/api::article.article/euy9brq04nqjbqo0ktx6zrz0`,
          { waitUntil: "domcontentloaded" }
        );
        await waitForStrapiPageReady(page, 2600);
        const addNoteBtn = page.locator("button", { hasText: "Add a note" }).first();
        if ((await addNoteBtn.count()) > 0) {
          await addNoteBtn.click();
          await page.waitForTimeout(800);
        }
        await page.screenshot({ path: settingsOutPath, fullPage: false });
        console.warn(`[capture-screenshots] captured live public/screenshots/${settingsFile}`);
      }
      continue;
    }

    if (plugin.pluginId === "global-search") {
      await page.goto(`${baseUrl}/admin/plugins/global-search`, {
        waitUntil: "domcontentloaded",
      });
      await waitForStrapiPageReady(page, 2200);
      const searchInput = page.locator('input[type="text"], input[type="search"]').first();
      if ((await searchInput.count()) > 0) {
        await searchInput.fill("Islam");
        await page.waitForTimeout(1400);
      }
      await page.screenshot({ path: adminOutPath, fullPage: false });
      console.warn(`[capture-screenshots] captured live public/screenshots/${adminFile}`);

      if (plugin.paletteScreenshot) {
        const paletteFile = basename(plugin.paletteScreenshot);
        const paletteOutPath = assertWithinBoundary(
          resolve(SCREENSHOTS_DIR, paletteFile),
          SCREENSHOTS_DIR
        );
        await page.goto(`${baseUrl}/admin/settings/calendar`, {
          waitUntil: "domcontentloaded",
        });
        await waitForStrapiPageReady(page, 2200);
        const bookingsTab = page
          .locator("button, [role='tab']", { hasText: "Bookings & Availability" })
          .first();
        if ((await bookingsTab.count()) > 0) {
          await bookingsTab.click();
          await page.waitForTimeout(500);
        }
        await page.evaluate(() => {
          window.dispatchEvent(new Event("global-search:open"));
        });
        await page.waitForTimeout(500);
        await page.keyboard.type("islam");
        await page.waitForTimeout(1600);
        await page.keyboard.press("ArrowDown");
        await page.waitForTimeout(300);
        await page.screenshot({ path: paletteOutPath, fullPage: false });
        console.warn(`[capture-screenshots] captured live public/screenshots/${paletteFile}`);
      }

      if (settingsOutPath) {
        await page.goto(`${baseUrl}/admin/settings/global-search`, {
          waitUntil: "domcontentloaded",
        });
        await waitForStrapiPageReady(page, 2400);
        await page.screenshot({ path: settingsOutPath, fullPage: false });
        console.warn(`[capture-screenshots] captured live public/screenshots/${settingsFile}`);
      }
      continue;
    }

    await page.goto(`${baseUrl}/admin/plugins/${plugin.pluginId}`, {
      waitUntil: "domcontentloaded",
    });
    await waitForStrapiPageReady(page, 2500);
    await page.screenshot({ path: adminOutPath, fullPage: false });
    console.warn(`[capture-screenshots] captured live public/screenshots/${adminFile}`);

    if (settingsOutPath) {
      await page.goto(`${baseUrl}/admin/settings/${plugin.pluginId}`, {
        waitUntil: "domcontentloaded",
      });
      await waitForStrapiPageReady(page, 2500);
      await page.screenshot({ path: settingsOutPath, fullPage: false });
      console.warn(`[capture-screenshots] captured live public/screenshots/${settingsFile}`);
    }
  }

  await context.close();
}

async function main(): Promise<void> {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const browser = await chromium.launch({
    headless: true,
    ...(existsSync(chromePath) ? { executablePath: chromePath } : {}),
  });

  try {
    const liveToken = await resolveLiveStrapiAuth(DEFAULT_LIVE_ADMIN_URL);
    if (!liveToken) {
      throw new Error(
        `Live Strapi v5 instance not reachable or authenticated at ${DEFAULT_LIVE_ADMIN_URL}`
      );
    }
    console.warn(
      `[capture-screenshots] Connected to live Strapi v5 instance at ${DEFAULT_LIVE_ADMIN_URL}`
    );
    await captureFromLiveStrapi(browser, DEFAULT_LIVE_ADMIN_URL, liveToken);
  } finally {
    await browser.close();
  }
}

await main();
