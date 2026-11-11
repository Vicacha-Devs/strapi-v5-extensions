import assert from "node:assert/strict";
import { describe, it } from "node:test";

import adminPlugin, { SUPPORTED_ADMIN_LOCALES } from "../admin/src/index";
import { pluginPermissions } from "../admin/src/permissions";
import createAdminController from "../server/src/controllers/admin";
import registerPlugin from "../server/src/register";
import adminRoutes from "../server/src/routes/admin";
import {
  extractCustomFields,
  normalizeRawMediaRecord,
} from "../server/src/services/feedNormalizer";
import createFeedService, {
  filterAndSortEpisodes,
} from "../server/src/services/feedService";
import createSettingsService from "../server/src/services/settings";
import {
  buildYouTubeAtomFeedUrl,
  computeSecondaryDates,
  DEFAULT_MEDIA_FEEDS_SETTINGS,
  escapeXml,
  extractYouTubeVideoId,
  generatePodcastRssXml,
  MASKED_SECRET_VALUE,
  parseMediaUrl,
  parseYouTubeAtomFeedXml,
  toRfc2822Date,
  wrapCdata,
  type MediaFeedItem,
} from "../shared";
import { createTestStrapi } from "./testUtils";

describe("Adversarial Security, RBAC, Settings & RSS Hardening", () => {
  it("enforces RBAC policies on all 5 admin routes and wires permissions + 10 locales in admin entry", async () => {
    assert.equal(adminRoutes.length, 5);
    for (const route of adminRoutes) {
      const policies = route.config.policies as Array<unknown>;
      assert.ok(policies.includes("admin::isAuthenticatedAdmin"));
      const permPolicy = policies.find(
        (p): p is { name: string; config: { actions: string[] } } =>
          typeof p === "object" && p !== null && "name" in p
      );
      assert.ok(permPolicy);
      assert.equal(permPolicy.name, "admin::hasPermissions");
      assert.equal(permPolicy.config.actions.length, 1);
      assert.ok(
        permPolicy.config.actions[0]?.startsWith("plugin::media-feeds.")
      );
    }

    assert.equal(pluginPermissions.main[0]?.action, "plugin::media-feeds.read");
    assert.equal(pluginPermissions.sync[0]?.action, "plugin::media-feeds.sync");
    assert.equal(
      pluginPermissions.settings[0]?.action,
      "plugin::media-feeds.settings.update"
    );

    let capturedMenu: Record<string, unknown> | null = null;
    let capturedSection: Record<string, any> | null = null;
    let capturedSettingsLinks: Array<Record<string, unknown>> = [];

    adminPlugin.register({
      customFields: { register: () => undefined },
      addMenuLink: (cfg: Record<string, unknown>) => {
        capturedMenu = cfg;
      },
      addSettingsLink: () => {
        throw new Error("broadcasts section missing");
      },
      createSettingSection: (
        sec: Record<string, unknown>,
        links: Array<Record<string, unknown>>
      ) => {
        capturedSection = sec;
        capturedSettingsLinks = links;
      },
      registerPlugin: () => undefined,
    });

    assert.deepEqual(capturedMenu?.permissions, pluginPermissions.main);
    assert.equal(
      capturedSection?.intlLabel?.id,
      "media-feeds.settings.section"
    );
    assert.deepEqual(
      capturedSettingsLinks[0]?.permissions,
      pluginPermissions.settings
    );

    assert.equal(SUPPORTED_ADMIN_LOCALES.length, 10);
    const loaded = await adminPlugin.registerTrads({
      locales: [...SUPPORTED_ADMIN_LOCALES, "es-CO"],
    });
    for (const loc of SUPPORTED_ADMIN_LOCALES) {
      const entry = loaded.find((item) => item.locale === loc);
      assert.ok(entry, `Missing registerTrads entry for ${loc}`);
      assert.ok(entry.data["media-feeds.plugin.name"]);
      assert.ok(entry.data["media-feeds.field.supported_locales"]);
    }
    const esCo = loaded.find((item) => item.locale === "es-CO");
    assert.equal(
      esCo?.data[
        "content-manager.content-types.plugin::media-feeds.media-item.title"
      ],
      "Título"
    );
  });

  it("rejects admin::user and users-permissions UIDs, blocks prototype pollution & sensitive fields", async () => {
    const strapi = createTestStrapi({
      schemaExtensions: {
        "admin::user": { hacked: { type: "string" } },
        "plugin::users-permissions.user": { hacked: { type: "string" } },
        "api::sermon.sermon": { mosqueBranch: { type: "string" } },
      },
      sources: [
        {
          id: "evil-admin",
          label: "Admin Users",
          uid: "admin::user",
          enabled: true,
          fields: { title: "email" },
        },
        {
          id: "evil-up",
          label: "UP Users",
          uid: "plugin::users-permissions.user",
          enabled: true,
          fields: { title: "username" },
        },
      ],
    });

    registerPlugin({ strapi });
    assert.equal(
      strapi.contentTypes["admin::user"].attributes.hacked,
      undefined
    );
    assert.equal(
      strapi.contentTypes["plugin::users-permissions.user"].attributes.hacked,
      undefined
    );
    assert.deepEqual(
      strapi.contentTypes["api::sermon.sermon"].attributes.mosqueBranch,
      { type: "string" }
    );

    const settingsService = createSettingsService({ strapi });
    const merged = await settingsService.getSettings();
    assert.equal(merged.sources.length, 0);

    const feedService = createFeedService({ strapi });
    await feedService.getEpisodes();
    assert.ok(!strapi.queriedUids.includes("admin::user"));
    assert.ok(!strapi.queriedUids.includes("plugin::users-permissions.user"));

    const adminCtrl = createAdminController({ strapi });
    let badReqMsg = "";
    await adminCtrl.updateSettings({
      request: {
        body: {
          sources: [
            {
              id: "x",
              label: "x",
              uid: "admin::user",
              enabled: true,
              fields: { title: "email" },
            },
          ],
        },
      },
      badRequest: (msg: string) => {
        badReqMsg = msg;
      },
    });
    assert.match(badReqMsg, /source\.uid/i);

    let arrayBodyMsg = "";
    await adminCtrl.updateSettings({
      request: { body: ["not-an-object"] },
      badRequest: (msg: string) => {
        arrayBodyMsg = msg;
      },
    });
    assert.match(arrayBodyMsg, /object/i);

    const pollutedPayload = JSON.parse(
      '{"defaultTimezone":"America/Bogota","__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}'
    );
    const saved = await settingsService.updateSettings(pollutedPayload);
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
    assert.equal(Object.hasOwn(saved, "__proto__"), false);

    const custom = extractCustomFields(
      {
        safeTopic: "Tafsir",
        password: "hash",
        resetPasswordToken: "tok1",
        registrationToken: "tok2",
        confirmationToken: "tok3",
        accessKey: "key",
        secret: "sec",
        createdBy: { id: 1 },
        updatedBy: { id: 1 },
      },
      [
        "safeTopic",
        "__proto__",
        "constructor",
        "prototype",
        "password",
        "resetPasswordToken",
        "registrationToken",
        "confirmationToken",
        "accessKey",
        "secret",
        "createdBy",
        "updatedBy",
        "toString",
      ]
    );
    assert.deepEqual(custom, { safeTopic: "Tafsir" });

    const dates = computeSecondaryDates("2026-02-13T12:00:00Z", [
      { id: "__proto__", label: "Bad", intlCalendar: "gregory", enabled: true },
      {
        id: "hijri",
        label: "Hijri",
        intlCalendar: "islamic-umalqura",
        enabled: true,
      },
    ]);
    assert.equal(Object.hasOwn(dates, "__proto__"), false);
    assert.ok(dates.hijri);
  });

  it("rejects XSS schemes, lookalike domains, 15-char YouTube IDs & hardens RSS XML", () => {
    const jsParsed = parseMediaUrl("javascript:alert(1)", "youtube");
    assert.equal(jsParsed.canonicalUrl, "");
    assert.equal(jsParsed.embedUrl, null);
    assert.equal(parseMediaUrl("data:text/html,<h1>x</h1>").canonicalUrl, "");
    assert.equal(parseMediaUrl("//evil.example.com/embed").canonicalUrl, "");
    assert.equal(parseMediaUrl("/uploads/../etc/passwd").canonicalUrl, "");
    assert.equal(parseMediaUrl("/uploads\\evil.mp3").canonicalUrl, "");
    assert.equal(parseMediaUrl("/uploads/khutbah.mp3").provider, "upload");

    const spoofed = parseMediaUrl("https://notyoutube.com/watch?v=dQw4w9WgXcQ");
    assert.equal(spoofed.provider, "direct");
    assert.equal(spoofed.externalId, null);
    assert.equal(spoofed.embedUrl, null);

    assert.equal(
      extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ1234"),
      null
    );
    assert.equal(
      extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ1234"),
      null
    );
    assert.equal(
      extractYouTubeVideoId(
        `https://www.youtube.com/watch?${"a=1&".repeat(700)}v=dQw4w9WgXcQ`
      ),
      null
    );
    assert.equal(
      buildYouTubeAtomFeedUrl({ channelId: "../evil&foo=bar" }),
      null
    );

    const maliciousXml = `<?xml version="1.0"?>
      <feed>
        <entry><yt:videoId>../evil</yt:videoId><title>Bad</title></entry>
        <entry>
          <yt:videoId>M7lc1UVf-VE</yt:videoId>
          <title>Valid</title>
          <media:thumbnail url="http://insecure.example.com/thumb.jpg" />
        </entry>
      </feed>`;
    const videos = parseYouTubeAtomFeedXml(maliciousXml);
    assert.equal(videos.length, 1);
    assert.equal(
      videos[0]?.thumbnailUrl,
      "https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg"
    );

    assert.equal(escapeXml("Hello\x0C\x00World\uFFFF"), "HelloWorld");
    assert.equal(wrapCdata("a]]>b\x0Cc"), "<![CDATA[a]]]]><![CDATA[>bc]]>");
    assert.ok(!toRfc2822Date("not-a-valid-date").includes("Invalid"));

    const ep: MediaFeedItem = normalizeRawMediaRecord(
      {
        id: 1,
        documentId: "ep-1",
        title: "Lecture\x0C One",
        slug: "lecture one",
        description: "Summary\x00 text",
        sourceUrl: "javascript:alert(1)",
        publishedAt: "invalid-date",
        languageTracks: [
          {
            locale: "ar",
            captionsUrl: "https://cdn.example.org/subs/ar.VTT?token=1",
          },
        ],
      },
      { settings: DEFAULT_MEDIA_FEEDS_SETTINGS }
    );
    ep.audioUrl = "https://cdn.example.org/media/ep1.M4A?token=abc";
    ep.audioByteLength = -999;

    const xml = generatePodcastRssXml([ep], {
      feed: {
        ...DEFAULT_MEDIA_FEEDS_SETTINGS.podcastFeed,
        siteUrl: "javascript:alert(1)",
      },
      locale: "ar",
      defaultLocale: "es",
    });

    assert.ok(!xml.includes("\x0C") && !xml.includes("javascript:"));
    assert.ok(xml.includes('length="0"') && xml.includes('type="audio/x-m4a"'));
    assert.ok(
      xml.includes(
        'url="https://cdn.example.org/subs/ar.VTT?token=1" type="text/vtt" language="ar"'
      )
    );

    const sorted = filterAndSortEpisodes(
      [
        { ...ep, slug: "bad", publishedAt: "not-a-date" },
        { ...ep, slug: "good", publishedAt: "2026-03-01T10:00:00Z" },
      ],
      {}
    );
    assert.equal(sorted[0]?.slug, "good");
    assert.equal(sorted[1]?.slug, "bad");
    assert.ok(MASKED_SECRET_VALUE.length > 0);
  });
});
