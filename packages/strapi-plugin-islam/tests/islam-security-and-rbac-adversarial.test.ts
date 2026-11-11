import assert from "node:assert/strict";
import { describe, it } from "node:test";

import adminPlugin from "../admin/src/index";
import { pluginPermissions } from "../admin/src/permissions";
import serverPlugin from "../server/src/index";
import adminRoutes from "../server/src/routes/admin";
import createIslamService, {
  clearQuranFoundationCaches,
  getUpstreamCacheSize,
} from "../server/src/services/islamService";
import createSettingsService from "../server/src/services/settings";
import {
  MAX_CACHE_ENTRIES,
  fetchQuranFoundationV4Json,
  getQuranFoundationAccessToken,
  setCached,
  tryFetchUpstreamJson,
} from "../server/src/services/upstreamCacheAndHttp";
import {
  DEFAULT_ISLAM_SETTINGS,
  PLUGIN_ID,
  buildSafeQueryUrl,
  sanitizeResourceIdsCsv,
  validateSafeHttpsBaseUrl,
} from "../shared";

function createTestStrapi(customConfig: Record<string, unknown> = {}) {
  const storeMap = new Map<string, unknown>();
  let donationsSettings: Record<string, unknown> = {
    assessmentProfiles: [
      {
        key: "standard_wealth_assessment",
        benchmarks: [
          { key: "gold_85g", unitPricesByCurrency: { COP: 300000, USD: 80 } },
          { key: "silver_595g", unitPricesByCurrency: { COP: 4000, USD: 1 } },
        ],
      },
    ],
  };

  const strapi: any = {
    config: {
      get(key: string, fallback?: unknown) {
        return key === `plugin::${PLUGIN_ID}` ? customConfig : fallback;
      },
    },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    contentTypes: {
      "plugin::islam.hilal-announcement": { kind: "collectionType" },
      "admin::user": { kind: "collectionType" },
    },
    store() {
      return {
        async get({ key }: { key: string }) {
          return storeMap.get(key);
        },
        async set({ key, value }: { key: string; value: unknown }) {
          storeMap.set(key, value);
        },
      };
    },
    documents(uid: string) {
      if (uid === "admin::user") {
        throw new Error("Forbidden UID admin::user must never be queried");
      }
      return {
        async findMany() {
          return [];
        },
        async create({ data }: { data: Record<string, unknown> }) {
          return { documentId: "hilal-1", ...data };
        },
        async update() {
          return null;
        },
      };
    },
    plugin(name: string) {
      if (name === PLUGIN_ID) {
        return {
          service(sName: string) {
            if (sName === "settings") return settingsService;
            if (sName === "islamService") return islamService;
            return null;
          },
        };
      }
      if (name === "donations") {
        return {
          service(sName: string) {
            if (sName === "settings") {
              return {
                async getSettings() {
                  return donationsSettings;
                },
                async updateSettings(next: Record<string, unknown>) {
                  donationsSettings = next;
                  return donationsSettings;
                },
              };
            }
            return null;
          },
        };
      }
      return { service: () => null };
    },
    __getDonationsSettings: () => donationsSettings,
  };

  const settingsService = createSettingsService({ strapi });
  const islamService = createIslamService({ strapi });
  return { strapi, settingsService, islamService };
}

describe("@vicacha-devs/strapi-plugin-islam — SSRF, Cache Bounds, RBAC & Settings Hardening", () => {
  it("blocks SSRF vectors, private IPv4/IPv6 ranges, URL credentials, and untrusted hostnames", async () => {
    const blockedUrls = [
      "http://islamicapi.com/api/v1/",
      "https://localhost/api",
      "https://sub.localhost/api",
      "https://127.0.0.1/api",
      "https://10.0.0.1/api",
      "https://172.16.0.1/api",
      "https://192.168.1.1/api",
      "https://169.254.169.254/latest/meta-data/",
      "https://100.64.0.1/api",
      "https://[::1]/api",
      "https://[fc00::1]/api",
      "https://[fe80::1]/api",
      "https://[::ffff:127.0.0.1]/api",
      "https://[::ffff:7f00:1]/api",
      "https://[::ffff:169.254.169.254]/api",
      "https://user:pass@islamicapi.com/api/v1/",
      "https://islamicapi.com/api/v1/?leak=1",
      "https://islamicapi.com/api/v1/#frag",
      "https://attacker.example.com/api/v1/",
      "https://evilquran.foundation/v4",
      "not a valid url %%%",
    ];

    for (const bad of blockedUrls) {
      assert.equal(
        validateSafeHttpsBaseUrl(bad, { service: "any" }),
        null,
        `Expected ${bad} to be rejected`
      );
    }

    assert.equal(
      buildSafeQueryUrl(
        "https://api.quran.com/api/v4",
        "../../etc/passwd",
        {},
        { service: "quran" }
      ),
      null
    );

    const prevFetch = globalThis.fetch;
    const prevKey = process.env.ISLAMIC_API_KEY;
    const prevQfId = process.env.QF_CLIENT_ID;
    const prevQfSecret = process.env.QF_CLIENT_SECRET;
    let fetchCalls = 0;

    process.env.ISLAMIC_API_KEY = "secret-islamic-key";
    process.env.QF_CLIENT_ID = "secret-qf-id";
    process.env.QF_CLIENT_SECRET = "secret-qf-secret";
    globalThis.fetch = (async () => {
      fetchCalls++;
      return new Response("not-json-{{{", { status: 200 });
    }) as typeof fetch;

    try {
      const leakAttempt1 = await tryFetchUpstreamJson(
        "https://evil.example.com/api/",
        "prayer-time/",
        { lat: 4 }
      );
      assert.equal(leakAttempt1, null);
      assert.equal(fetchCalls, 0);

      const leakAttempt2 = await getQuranFoundationAccessToken({
        ...DEFAULT_ISLAM_SETTINGS.quranFoundation,
        oauth2BaseUrlProduction: "https://evil.example.com",
      });
      assert.equal(leakAttempt2, null);
      assert.equal(fetchCalls, 0);

      // Trusted host returning malformed JSON must not crash
      const badJsonRes = await fetchQuranFoundationV4Json(
        {
          ...DEFAULT_ISLAM_SETTINGS.quranFoundation,
          publicFallbackBaseUrl: "https://api.quran.com/api/v4",
        },
        "chapters",
        {}
      );
      assert.equal(badJsonRes, null);
    } finally {
      globalThis.fetch = prevFetch;
      if (prevKey === undefined) delete process.env.ISLAMIC_API_KEY;
      else process.env.ISLAMIC_API_KEY = prevKey;
      if (prevQfId === undefined) delete process.env.QF_CLIENT_ID;
      else process.env.QF_CLIENT_ID = prevQfId;
      if (prevQfSecret === undefined) delete process.env.QF_CLIENT_SECRET;
      else process.env.QF_CLIENT_SECRET = prevQfSecret;
      clearQuranFoundationCaches();
    }
  });

  it("caps upstreamCache at 500 entries, caps CSV IDs to <= 5, and fixes short-lived OAuth2 token TTL", async () => {
    clearQuranFoundationCaches();
    for (let i = 0; i < 560; i++) {
      setCached(`test-key-${i}`, { i }, 3600);
    }
    assert.equal(getUpstreamCacheSize(), MAX_CACHE_ENTRIES);

    const cappedCsv = sanitizeResourceIdsCsv(
      "83,140,20,85,77,169,999,83,0,-5,99999",
      [83],
      5
    );
    assert.equal(cappedCsv, "83,140,20,85,77");

    const prevFetch = globalThis.fetch;
    const prevQfId = process.env.QF_CLIENT_ID;
    const prevQfSecret = process.env.QF_CLIENT_SECRET;
    let tokenCalls = 0;

    process.env.QF_CLIENT_ID = "short-ttl-client";
    process.env.QF_CLIENT_SECRET = "short-ttl-secret";
    globalThis.fetch = (async () => {
      tokenCalls++;
      return new Response(
        JSON.stringify({
          access_token: `tok-${tokenCalls}`,
          expires_in: 15,
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    try {
      const t1 = await getQuranFoundationAccessToken(
        DEFAULT_ISLAM_SETTINGS.quranFoundation
      );
      const t2 = await getQuranFoundationAccessToken(
        DEFAULT_ISLAM_SETTINGS.quranFoundation
      );
      assert.equal(t1?.accessToken, "tok-1");
      // expires_in=15s (< 30s safety margin) must NOT be cached as valid for 60s
      assert.equal(t2?.accessToken, "tok-2");
      assert.equal(tokenCalls, 2);
    } finally {
      globalThis.fetch = prevFetch;
      if (prevQfId === undefined) delete process.env.QF_CLIENT_ID;
      else process.env.QF_CLIENT_ID = prevQfId;
      if (prevQfSecret === undefined) delete process.env.QF_CLIENT_SECRET;
      else process.env.QF_CLIENT_SECRET = prevQfSecret;
      clearQuranFoundationCaches();
    }
  });

  it("enforces single-action RBAC policies on all 5 admin routes (preventing logical-AND lockout), wires menu/settings permissions, and normalizes locale subtags", async () => {
    assert.equal(adminRoutes.routes.length, 5);
    const actionsByRoute = new Map<string, string[]>();
    for (const route of adminRoutes.routes) {
      const policies = route.config.policies as Array<unknown>;
      assert.ok(policies.includes("admin::isAuthenticatedAdmin"));
      const rbacPolicy = policies.find(
        (p) =>
          typeof p === "object" &&
          p !== null &&
          (p as { name?: string }).name === "admin::hasPermissions"
      ) as { config?: { actions?: string[] } } | undefined;
      assert.ok(rbacPolicy, `Missing admin::hasPermissions on ${route.path}`);
      assert.equal(
        rbacPolicy.config?.actions?.length,
        1,
        `Expected exactly 1 RBAC action on ${route.method} ${route.path} to avoid Strapi .every() lockout`
      );
      actionsByRoute.set(
        `${route.method} ${route.path}`,
        rbacPolicy.config?.actions ?? []
      );
    }
    assert.deepEqual(actionsByRoute.get("GET /settings"), [
      "plugin::islam.settings.update",
    ]);
    assert.deepEqual(actionsByRoute.get("PUT /settings"), [
      "plugin::islam.settings.update",
    ]);
    assert.deepEqual(actionsByRoute.get("GET /overview"), [
      "plugin::islam.read",
    ]);

    let menuPerms: unknown[] = [];
    let settingsPerms: unknown[] = [];
    adminPlugin.register({
      addMenuLink(cfg) {
        menuPerms = cfg.permissions;
      },
      createSettingSection(_sec, links) {
        settingsPerms = links[0].permissions;
      },
      registerPlugin() {},
    });
    assert.deepEqual(menuPerms, pluginPermissions.main);
    assert.deepEqual(settingsPerms, pluginPermissions.settings);

    const regionalTrads = await adminPlugin.registerTrads({
      locales: ["es-CO"],
    });
    const esCoEntry = regionalTrads.find((entry) => entry.locale === "es-CO");
    assert.ok(esCoEntry);
    assert.equal(
      esCoEntry.data[
        "content-manager.content-types.plugin::islam.hilal-announcement.notes"
      ],
      "Notas"
    );
  });

  it("validates PUT /settings & POST /hilal/confirm inputs, strips prototype pollution, merges Kaffarah rates, serializes concurrent updates, and syncs Donations bridge", async () => {
    const { strapi, settingsService } = createTestStrapi();
    const adminCtrl = serverPlugin.controllers.admin({ strapi });

    const ctxArrayBody: any = { request: { body: ["bad"] }, body: null };
    await adminCtrl.updateSettings(ctxArrayBody);
    assert.equal(ctxArrayBody.status, 400);

    const ctxBadTz: any = {
      request: { body: { timezone: "Not/A_Timezone" } },
      body: null,
    };
    await adminCtrl.updateSettings(ctxBadTz);
    assert.equal(ctxBadTz.status, 400);

    const ctxSsrfUrl: any = {
      request: { body: { externalApiBaseUrl: "http://169.254.169.254/" } },
      body: null,
    };
    await adminCtrl.updateSettings(ctxSsrfUrl);
    assert.equal(ctxSsrfUrl.status, 400);

    const ctxForbiddenUid: any = {
      request: {
        body: {
          prayerSettingMapping: { enabled: true, uid: "admin::user" },
        },
      },
      body: null,
    };
    await adminCtrl.updateSettings(ctxForbiddenUid);
    assert.equal(ctxForbiddenUid.status, 400);

    const ctxBadHilal: any = {
      request: {
        body: {
          occasion: "ramadan",
          confirmedGregorianDate: "2026-02-31",
        },
      },
      body: null,
    };
    await adminCtrl.confirmHilal(ctxBadHilal);
    assert.equal(ctxBadHilal.status, 400);

    const pollutedPatch = JSON.parse(
      '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"fiqhRates":{"kaffarahFastByCurrency":{"USD":750},"goldPricePerGramByCurrency":{"USD":99.5}}}'
    );
    await Promise.all([
      settingsService.updateSettings({ city: "Medellín" }),
      settingsService.updateSettings(pollutedPatch),
    ]);
    assert.equal(({} as Record<string, unknown>).polluted, undefined);

    const finalSettings = await settingsService.getSettings();
    assert.equal(finalSettings.city, "Medellín");
    assert.equal(finalSettings.fiqhRates.kaffarahFastByCurrency.USD, 750);
    assert.equal(
      finalSettings.fiqhRates.kaffarahFastByCurrency.COP,
      DEFAULT_ISLAM_SETTINGS.fiqhRates.kaffarahFastByCurrency.COP
    );

    const syncedDonations = strapi.__getDonationsSettings() as any;
    assert.equal(
      syncedDonations.assessmentProfiles[0].benchmarks[0].unitPricesByCurrency
        .USD,
      99.5
    );
  });

  it("sanitizes malformed nested arrays/maps and javascript: adhan audio URLs without 500 crashes on prayer-times or quran chapters", async () => {
    const { strapi, settingsService } = createTestStrapi();
    const adminCtrl = serverPlugin.controllers.admin({ strapi });
    const contentCtrl = serverPlugin.controllers["content-api"]({ strapi });

    const invalidPatches = [
      { jumuahShifts: null },
      { iqamahRules: "bad" },
      { quranFoundation: { defaultTranslationIdsByLocale: { es: 83 } } },
      {
        adhanProfiles: [
          {
            id: "xss",
            name: "XSS",
            muezzin: "M",
            origin: "O",
            standardAudioUrl: "javascript:alert(1)",
            fajrAudioUrl: "data:text/html,<script>alert(1)</script>",
          },
        ],
      },
    ];
    for (const badBody of invalidPatches) {
      const ctx: any = { request: { body: badBody }, body: null };
      await adminCtrl.updateSettings(ctx);
      assert.equal(ctx.status, 400);
    }

    // Direct service/store poisoning defense-in-depth check
    const sanitized = await settingsService.updateSettings({
      externalApiEnabled: false,
      jumuahShifts: null as any,
      iqamahRules: "bad" as any,
      supportedLocales: "es" as any,
      eid: {
        ...DEFAULT_ISLAM_SETTINGS.eid,
        eidAlFitrShifts: null as any,
      },
      quranFoundation: {
        ...DEFAULT_ISLAM_SETTINGS.quranFoundation,
        enabled: false,
        defaultTranslationIdsByLocale: {
          es: 83 as unknown as number[],
        } as any,
      },
      adhanProfiles: [
        {
          id: "mixed",
          name: "Mixed Profile",
          muezzin: "Tester",
          origin: "Local",
          standardAudioUrl: "javascript:alert(1)",
          fajrAudioUrl: "/uploads/fajr-safe.mp3",
        },
      ],
    });

    assert.ok(Array.isArray(sanitized.jumuahShifts));
    assert.ok(sanitized.jumuahShifts.length >= 1);
    assert.ok(Array.isArray(sanitized.iqamahRules));
    assert.ok(Array.isArray(sanitized.eid.eidAlFitrShifts));
    assert.deepEqual(
      sanitized.quranFoundation.defaultTranslationIdsByLocale.es,
      DEFAULT_ISLAM_SETTINGS.quranFoundation.defaultTranslationIdsByLocale.es
    );
    assert.equal(sanitized.adhanProfiles[0].standardAudioUrl, "");
    assert.equal(
      sanitized.adhanProfiles[0].fajrAudioUrl,
      "/uploads/fajr-safe.mp3"
    );

    const prayerCtx: any = {
      query: { date: "2026-03-20" },
      body: null,
      set() {},
    };
    await contentCtrl.getPrayerTimes(prayerCtx);
    assert.ok((prayerCtx.body as any)?.data?.times?.dhuhr);

    const prevFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ verses: [], pagination: {} }), {
        status: 200,
      })) as typeof fetch;
    try {
      const quranCtx: any = {
        params: { chapterNumber: "1" },
        query: { locale: "es" },
        body: null,
        set() {},
      };
      await contentCtrl.getQuranChapterVerses(quranCtx);
      assert.equal((quranCtx.body as any)?.data?.chapterNumber, 1);
    } finally {
      globalThis.fetch = prevFetch;
      clearQuranFoundationCaches();
    }
  });
});
