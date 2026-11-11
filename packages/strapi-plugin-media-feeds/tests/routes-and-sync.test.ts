import assert from "node:assert/strict";
import { describe, it } from "node:test";

import createAdminController from "../server/src/controllers/admin";
import createContentApiController from "../server/src/controllers/content-api";
import contentApiRoutes from "../server/src/routes/content-api";
import createFeedService from "../server/src/services/feedService";
import createSettingsService from "../server/src/services/settings";
import createSyncService from "../server/src/services/syncService";
import {
  DEFAULT_MEDIA_FEEDS_SETTINGS,
  escapeXml,
  MASKED_SECRET_VALUE,
  stripInvalidXmlChars,
} from "../shared";
import { createTestStrapi } from "./testUtils";

describe("Settings Secret Round-Trip, Content-API Routes & Concurrent Sync", () => {
  it("supports clearing array settings and masks/preserves youtubeApiKey across round-trip saves", async () => {
    const strapi = createTestStrapi();
    const settingsService = createSettingsService({ strapi });
    const adminCtrl = createAdminController({ strapi });

    await settingsService.updateSettings({
      defaultLocale: "ar",
      supportedLocales: [],
      liveStreams: [],
      youtubeSyncSources: [],
      secondaryCalendars: [],
      sources: [],
      youtubeApiKey: "AIzaRealSecretKey999",
    });

    const stored = await settingsService.getSettings();
    assert.deepEqual(stored.liveStreams, []);
    assert.deepEqual(stored.youtubeSyncSources, []);
    assert.deepEqual(stored.secondaryCalendars, []);
    assert.deepEqual(stored.sources, []);
    assert.deepEqual(stored.supportedLocales, ["ar"]);
    assert.equal(stored.youtubeApiKey, "AIzaRealSecretKey999");

    const getSettingsCtx: any = { badRequest: () => undefined };
    await adminCtrl.getSettings(getSettingsCtx);
    assert.equal(getSettingsCtx.body.data.youtubeApiKey, MASKED_SECRET_VALUE);

    const overviewCtx: any = { query: {}, badRequest: () => undefined };
    await adminCtrl.getOverview(overviewCtx);
    assert.equal("youtubeApiKey" in overviewCtx.body.data.settings, false);

    const putMaskedCtx: any = {
      request: {
        body: {
          ...getSettingsCtx.body.data,
          defaultTimezone: "America/Bogota",
        },
      },
      badRequest: () => undefined,
    };
    await adminCtrl.updateSettings(putMaskedCtx);
    assert.equal(putMaskedCtx.body.data.youtubeApiKey, MASKED_SECRET_VALUE);

    const afterRoundTrip = await settingsService.getSettings();
    assert.equal(afterRoundTrip.youtubeApiKey, "AIzaRealSecretKey999");
    assert.equal(afterRoundTrip.defaultTimezone, "America/Bogota");
    assert.deepEqual(afterRoundTrip.liveStreams, []);
  });

  it("evaluates recurringSlots in defaultTimezone, serves /episodes/:slug & /podcast.xml, and deduplicates concurrent syncs with >200 items", async () => {
    const strapi = createTestStrapi({
      defaultTimezone: "America/Bogota",
      defaultLocale: "es",
      liveStream: {
        ...DEFAULT_MEDIA_FEEDS_SETTINGS.liveStream,
        enabled: true,
        recurringSlots: [
          {
            dayOfWeek: 5,
            startTime: "12:15",
            endTime: "13:15",
            label: "Jumu'ah Live Window",
          },
        ],
      },
      youtubeSyncSources: [
        {
          id: "yt-main",
          label: "Main Channel",
          channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
          enabled: true,
        },
      ],
    });

    for (let i = 1; i <= 240; i++) {
      const vid = `existing${String(i).padStart(3, "0")}`.padEnd(11, "_");
      const externalId = i === 235 ? "dQw4w9WgXcQ" : vid;
      strapi.mediaRecords.push({
        id: i,
        documentId: `seed-${i}`,
        status: i === 235 ? "draft" : "published",
        title: `Seed Episode ${i}`,
        slug: `seed-episode-${i}`,
        description: "Seeded",
        type: "video",
        provider: "youtube",
        externalId,
        sourceUrl: `https://www.youtube.com/watch?v=${externalId}`,
        publishedAt: "2026-02-01T10:00:00Z",
      });
    }

    const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
      <feed>
        <entry>
          <yt:videoId>dQw4w9WgXcQ</yt:videoId>
          <title>Already Existing Draft At #235</title>
        </entry>
        <entry>
          <yt:videoId>9bZkp7q19f0</yt:videoId>
          <title>Brand New Concurrent Video</title>
        </entry>
      </feed>`;

    const syncA = createSyncService({ strapi });
    const syncB = createSyncService({ strapi });
    const [resA, resB] = await Promise.all([
      syncA.syncYouTubeFeedXml(feedXml, "yt-main"),
      syncB.syncYouTubeFeedXml(feedXml, "yt-main"),
    ]);

    assert.equal(resA.syncedCount + resB.syncedCount, 1);
    assert.equal(
      strapi.mediaRecords.filter((r: any) => r.externalId === "9bZkp7q19f0")
        .length,
      1
    );
    assert.equal(
      strapi.mediaRecords.filter((r: any) => r.externalId === "dQw4w9WgXcQ")
        .length,
      1
    );

    const feedService = createFeedService({ strapi });
    const duringSlot = await feedService.getLiveStatus(
      "es",
      new Date("2026-02-13T17:30:00Z")
    );
    assert.equal(duringSlot.status, "live");
    assert.equal(duringSlot.scheduleLabel, "Jumu'ah Live Window");

    const outsideSlot = await feedService.getLiveStatus(
      "es",
      new Date("2026-02-13T20:00:00Z")
    );
    assert.equal(outsideSlot.status, "upcoming");

    const routePaths = contentApiRoutes.map((r) => `${r.method} ${r.path}`);
    assert.ok(routePaths.includes("GET /episodes/:slug"));
    assert.ok(routePaths.includes("GET /podcast.xml"));

    const contentCtrl = createContentApiController({ strapi });
    const listCtx: any = {
      query: { limit: "9999", page: "-4", search: { $ne: "bad" } },
      set: () => undefined,
      notFound: () => "not-found",
    };
    await contentCtrl.listEpisodes(listCtx);
    assert.equal(listCtx.body.meta.pageSize, 100);
    assert.equal(listCtx.body.meta.page, 1);
    assert.equal(listCtx.body.data.length, 100);

    const foundSlugCtx: any = {
      params: { slug: "seed-episode-10" },
      query: {},
      set: () => undefined,
      notFound: () => "not-found",
    };
    await contentCtrl.getEpisodeBySlug(foundSlugCtx);
    assert.equal(foundSlugCtx.body.data.slug, "seed-episode-10");

    let notFoundCalled = false;
    await contentCtrl.getEpisodeBySlug({
      params: { slug: "non-existent-episode" },
      query: {},
      set: () => undefined,
      notFound: () => {
        notFoundCalled = true;
        return "404";
      },
    });
    assert.equal(notFoundCalled, true);

    const headers: Record<string, string> = {};
    const xmlCtx: any = {
      query: { locale: "es" },
      set: (k: string, v: string) => {
        headers[k] = v;
      },
      notFound: () => undefined,
    };
    await contentCtrl.getRssXml(xmlCtx);
    assert.equal(headers["Content-Type"], "application/rss+xml; charset=utf-8");
    assert.equal(headers["X-Content-Type-Options"], "nosniff");
    assert.ok(String(xmlCtx.body).includes('<rss version="2.0"'));
  });

  it("sanitizes liveStreams/liveStream javascript: URLs, non-array spokenLanguages & null youtubeSyncSources", async () => {
    const strapi = createTestStrapi();
    const settingsService = createSettingsService({ strapi });
    const feedService = createFeedService({ strapi });
    const syncService = createSyncService({ strapi });

    await settingsService.updateSettings({
      defaultLocale: "en",
      liveStream: {
        ...DEFAULT_MEDIA_FEEDS_SETTINGS.liveStream,
        watchUrl: "javascript:void(0)",
        embedUrl: "javascript:void(0)",
        thumbnailUrl: "data:text/html,<h1>x</h1>",
        spokenLanguages: 42 as unknown as string[],
      },
      liveStreams: [
        null as unknown as never,
        {
          id: "bad-stream",
          enabled: true,
          title: "Evil Stream",
          provider: "youtube",
          watchUrl: "javascript:void(0)",
          embedUrl: "javascript:alert(1)",
          thumbnailUrl: "vbscript:msgbox(1)",
          spokenLanguages: "ar, tr" as unknown as string[],
        },
        {
          id: "good-stream",
          enabled: true,
          title: "Valid Stream",
          provider: "youtube",
          watchUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
        },
      ],
      youtubeSyncSources: [null as unknown as never],
    });

    const saved = await settingsService.getSettings();
    assert.equal(saved.liveStream.watchUrl, "");
    assert.equal(saved.liveStream.embedUrl, null);
    assert.equal(saved.liveStream.thumbnailUrl, null);
    assert.deepEqual(saved.liveStream.spokenLanguages, ["en"]);
    assert.equal(saved.liveStreams?.length, 2);
    assert.equal(saved.liveStreams?.[0]?.watchUrl, "");
    assert.equal(saved.liveStreams?.[0]?.embedUrl, null);
    assert.equal(saved.liveStreams?.[0]?.thumbnailUrl, null);
    assert.deepEqual(saved.liveStreams?.[0]?.spokenLanguages, ["ar", "tr"]);
    assert.equal(
      saved.liveStreams?.[1]?.watchUrl,
      "https://www.youtube.com/watch?v=M7lc1UVf-VE"
    );
    assert.deepEqual(saved.youtubeSyncSources, []);

    const liveStatus = await feedService.getLiveStatus("en");
    assert.equal(liveStatus.watchUrl, "");
    assert.equal(liveStatus.embedUrl, null);
    assert.ok(Array.isArray(liveStatus.spokenLanguages));
    assert.equal(liveStatus.streams?.[0]?.watchUrl, "");

    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async () =>
        new Response("<feed></feed>", { status: 200 })) as typeof fetch;
      const syncResult = await syncService.syncConfiguredYouTubeSources();
      assert.equal(syncResult.sourcesProcessed, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("strips lone UTF-16 surrogates, isolates per-video create failures, and serializes concurrent updateSettings", async () => {
    assert.equal(
      stripInvalidXmlChars("Valid 🕌 \uD800loneHigh \uDC00loneLow"),
      "Valid 🕌 loneHigh loneLow"
    );
    assert.equal(escapeXml("Test\uD800&\uDC00Ok"), "Test&amp;Ok");

    // Fault-isolated per-video sync + case-sensitive videoId slug
    const warnLogs: string[] = [];
    const strapi = createTestStrapi();
    strapi.log.warn = (msg: string) => {
      warnLogs.push(msg);
    };
    const origCreate = strapi.documents(
      "plugin::media-feeds.media-item"
    ).create;
    strapi.documents = (_uid: string) => ({
      findMany: async () => [],
      create: async (args: {
        data: Record<string, unknown>;
        status?: string;
      }) => {
        if (args.data.externalId === "AbCdEfGhIjK") {
          throw new Error("Unique constraint failed on slug");
        }
        return origCreate(args);
      },
    });

    const syncService = createSyncService({ strapi });
    const batchXml = `<?xml version="1.0"?>
      <feed>
        <entry>
          <yt:videoId>AbCdEfGhIjK</yt:videoId>
          <title>Colliding Item</title>
        </entry>
        <entry>
          <yt:videoId>ZxYwVuTsRqP</yt:videoId>
          <title>Healthy Item</title>
        </entry>
      </feed>`;
    const batchRes = await syncService.syncYouTubeFeedXml(batchXml);
    assert.equal(batchRes.syncedCount, 1);
    assert.equal(batchRes.skippedCount, 1);
    assert.equal(warnLogs.length, 1);
    assert.equal(strapi.mediaRecords[0]?.slug, "healthy-item-ZxYwVuTsRqP");

    // Concurrent updateSettings serialization with async store latency
    let slowStored: Record<string, unknown> | null = null;
    const slowStrapi = createTestStrapi();
    slowStrapi.store = () => ({
      get: async () => {
        await new Promise((r) => setTimeout(r, 10));
        return slowStored;
      },
      set: async ({ value }: { value: Record<string, unknown> }) => {
        await new Promise((r) => setTimeout(r, 10));
        slowStored = value;
      },
    });

    const svcA = createSettingsService({ strapi: slowStrapi });
    const svcB = createSettingsService({ strapi: slowStrapi });
    await Promise.all([
      svcA.updateSettings({ defaultLocale: "tr" }),
      svcB.updateSettings({ defaultTimezone: "Europe/Istanbul" }),
    ]);

    const finalSettings = await svcA.getSettings();
    assert.equal(finalSettings.defaultLocale, "tr");
    assert.equal(finalSettings.defaultTimezone, "Europe/Istanbul");
  });
});
