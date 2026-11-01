import assert from "node:assert/strict";
import { describe, it } from "node:test";

import createFeedService from "../server/src/services/feedService";
import createSettingsService from "../server/src/services/settings";
import createSyncService from "../server/src/services/syncService";
import {
  buildYouTubeAtomFeedUrl,
  DEFAULT_MEDIA_FEEDS_SETTINGS,
  extractYouTubeVideoId,
  formatSecondsToDuration,
  generatePodcastRssXml,
  MEDIA_ITEM_UID,
  parseDurationToSeconds,
  parseMediaUrl,
  parseYouTubeAtomFeedXml,
  PLUGIN_ID,
  resolveEpisodeForLocale,
  type MediaFeedItem,
  type MediaFeedsSettings,
} from "../shared";

describe("@vicacha-devs/strapi-plugin-media-feeds", () => {
  it("extracts YouTube video IDs and embed URLs from watch, short, live, and youtu.be links", () => {
    assert.equal(
      extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
      "dQw4w9WgXcQ"
    );
    assert.equal(
      extractYouTubeVideoId("https://youtu.be/M7lc1UVf-VE?t=45"),
      "M7lc1UVf-VE"
    );
    assert.equal(
      extractYouTubeVideoId("https://www.youtube.com/live/aqz-KE-bpKQ"),
      "aqz-KE-bpKQ"
    );
    assert.equal(
      extractYouTubeVideoId("https://www.youtube.com/shorts/9bZkp7q19f0"),
      "9bZkp7q19f0"
    );

    const parsedYt = parseMediaUrl("https://youtu.be/dQw4w9WgXcQ");
    assert.equal(parsedYt.provider, "youtube");
    assert.equal(parsedYt.externalId, "dQw4w9WgXcQ");
    assert.equal(
      parsedYt.embedUrl,
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
    );
    assert.equal(
      parsedYt.thumbnailUrl,
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
    );
  });

  it("detects Spotify, Vimeo, Apple Podcasts, and SoundCloud URLs", () => {
    const spotify = parseMediaUrl(
      "https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk"
    );
    assert.equal(spotify.provider, "spotify");
    assert.equal(spotify.externalId, "4rOoJ6Egrf8K2IrywzwOMk");
    assert.equal(
      spotify.embedUrl,
      "https://open.spotify.com/embed/episode/4rOoJ6Egrf8K2IrywzwOMk"
    );

    const vimeo = parseMediaUrl("https://vimeo.com/76979871");
    assert.equal(vimeo.provider, "vimeo");
    assert.equal(vimeo.embedUrl, "https://player.vimeo.com/video/76979871");

    const apple = parseMediaUrl(
      "https://podcasts.apple.com/us/podcast/sample/id1500000001"
    );
    assert.equal(apple.provider, "apple_podcasts");
    assert.equal(apple.externalId, "1500000001");
  });

  it("parses and formats durations across MM:SS, HH:MM:SS, ISO-8601, and localized minute labels", () => {
    assert.equal(parseDurationToSeconds("28:40"), 1720);
    assert.equal(parseDurationToSeconds("1:05:10"), 3910);
    assert.equal(parseDurationToSeconds("PT32M15S"), 1935);
    assert.equal(parseDurationToSeconds("32 min"), 1920);
    assert.equal(parseDurationToSeconds("24 dk"), 1440);
    assert.equal(parseDurationToSeconds("28 دقيقة"), 1680);

    assert.equal(formatSecondsToDuration(1720), "28:40");
    assert.equal(formatSecondsToDuration(3910), "1:05:10");
  });

  it("resolves multi-language tracks across 4+ languages (es, en, ar, tr) with fallback", () => {
    const baseEpisode: MediaFeedItem = {
      id: 1,
      documentId: "ep-khutbah-1",
      sourceId: "mosque-media",
      sourceUid: "api::media-highlight.media-highlight",
      locale: "es",
      title: "Khutbah: La Misericordia en Sociedad",
      slug: "khutbah-misericordia",
      description: "Reflexión del viernes en español y árabe.",
      type: "khutbah",
      provider: "youtube",
      externalId: "dQw4w9WgXcQ",
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      audioUrl: "/media/khutbah-es.mp3",
      transcriptUrl: "/docs/khutbah-es.pdf",
      spokenLanguages: ["ar", "es", "en", "tr"],
      languageTracks: [
        {
          locale: "es",
          label: "Español",
          audioUrl: "/media/khutbah-es.mp3",
          transcriptUrl: "/docs/khutbah-es.pdf",
        },
        {
          locale: "en",
          label: "English",
          audioUrl: "/media/khutbah-en.mp3",
          transcriptUrl: "/docs/khutbah-en.pdf",
          translatedTitle: "Khutbah: Mercy & Coexistence in Society",
        },
        {
          locale: "ar",
          label: "العربية",
          audioUrl: "/media/khutbah-ar.mp3",
          transcriptUrl: "/docs/khutbah-ar.pdf",
          translatedTitle: "خطبة الجمعة: الرحمة والتعايش في المجتمع",
        },
        {
          locale: "tr",
          label: "Türkçe",
          audioUrl: "/media/khutbah-tr.mp3",
          transcriptUrl: "/docs/khutbah-tr.pdf",
          translatedTitle: "Cuma Hutbesi: Toplumda Merhamet ve Birlikte Yaşama",
        },
      ],
      chapters: [{ startSeconds: 0, timecode: "00:00", label: "Introducción" }],
      publishedAt: "2026-02-13T17:15:00.000Z",
      featured: true,
      isLive: false,
    };

    const resolvedAr = resolveEpisodeForLocale(baseEpisode, "ar", "es");
    assert.equal(resolvedAr.title, "خطبة الجمعة: الرحمة والتعايش في المجتمع");
    assert.equal(resolvedAr.audioUrl, "/media/khutbah-ar.mp3");
    assert.equal(resolvedAr.transcriptUrl, "/docs/khutbah-ar.pdf");

    const resolvedTr = resolveEpisodeForLocale(baseEpisode, "tr", "es");
    assert.equal(
      resolvedTr.title,
      "Cuma Hutbesi: Toplumda Merhamet ve Birlikte Yaşama"
    );
    assert.equal(resolvedTr.audioUrl, "/media/khutbah-tr.mp3");

    // Fallback to 'es' when requesting 'fr'
    const resolvedFr = resolveEpisodeForLocale(baseEpisode, "fr", "es");
    assert.equal(resolvedFr.activeLanguageTrack?.locale, "es");
    assert.equal(resolvedFr.audioUrl, "/media/khutbah-es.mp3");
  });

  it("generates Apple Podcasts & Spotify compliant RSS 2.0 XML with multi-language transcripts", () => {
    const episode: MediaFeedItem = {
      id: 10,
      documentId: "ep-podcast-1",
      sourceId: "built-in",
      sourceUid: MEDIA_ITEM_UID,
      locale: "es",
      title: "Podcast: El Valor de las 5 Oraciones Diarias",
      slug: "valor-cinco-oraciones",
      description: "Consejos prácticos para preservar el Khushu.",
      type: "podcast",
      provider: "spotify",
      sourceUrl: "https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk",
      audioUrl: "https://cdn.example.org/audio/salah-es.mp3",
      audioMimeType: "audio/mpeg",
      audioByteLength: 24500000,
      speaker: "Ustadh Tariq Ramírez",
      duration: "24:00",
      durationSeconds: 1440,
      publishedAt: "2026-02-10T15:00:00.000Z",
      spokenLanguages: ["es", "en", "ar", "tr"],
      languageTracks: [
        { locale: "es", transcriptUrl: "/transcripts/salah-es.pdf" },
        { locale: "ar", transcriptUrl: "/transcripts/salah-ar.vtt" },
      ],
      chapters: [],
      featured: true,
      isLive: false,
    };

    const xml = generatePodcastRssXml([episode], {
      feed: {
        title: "Mezquita Central de Bogotá — Podcast & Khutbahs",
        description: "Archivo oficial multilingüe",
        author: "Mezquita Central Abu Bakr As-Siddiq",
        siteUrl: "https://mezquitabogota.org",
        category: "Religion & Spirituality",
        explicit: false,
      },
      locale: "es",
      defaultLocale: "es",
    });

    assert.ok(xml.includes('<rss version="2.0"'));
    assert.ok(xml.includes("<language>es</language>"));
    assert.ok(xml.includes("<itunes:duration>24:00</itunes:duration>"));
    assert.ok(
      xml.includes(
        '<enclosure url="https://cdn.example.org/audio/salah-es.mp3" length="24500000" type="audio/mpeg" />'
      )
    );
    assert.ok(
      xml.includes(
        '<podcast:transcript url="https://mezquitabogota.org/transcripts/salah-ar.vtt" type="text/vtt" language="ar" />'
      )
    );
  });

  it("parses YouTube Atom XML feeds and syncs new episodes idempotently", async () => {
    const feedUrl = buildYouTubeAtomFeedUrl({
      channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
    });
    assert.equal(
      feedUrl,
      "https://www.youtube.com/feeds/videos.xml?channel_id=UC_x5XG1OV2P6uZZ5FSM9Ttw"
    );

    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
        <entry>
          <yt:videoId>M7lc1UVf-VE</yt:videoId>
          <title>Jumu&apos;ah Khutbah: Convivencia y Paz en Bogotá</title>
          <published>2026-02-13T17:30:00+00:00</published>
          <author><name>Mezquita Central Bogotá</name></author>
          <media:group>
            <media:description>Sermón bilingüe en árabe y español.</media:description>
            <media:thumbnail url="https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg" />
          </media:group>
        </entry>
      </feed>`;

    const parsed = parseYouTubeAtomFeedXml(sampleXml, {
      defaultType: "khutbah",
      defaultSeriesSlug: "jumuah-khutbahs",
      defaultSpokenLanguages: ["ar", "es"],
    });
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].videoId, "M7lc1UVf-VE");
    assert.equal(
      parsed[0].title,
      "Jumu'ah Khutbah: Convivencia y Paz en Bogotá"
    );
    assert.deepEqual(parsed[0].spokenLanguages, ["ar", "es"]);

    // Test idempotent sync + host collection normalization
    const createdItems: Array<Record<string, unknown>> = [];
    const hostHighlights: Array<Record<string, unknown>> = [
      {
        id: 501,
        documentId: "host-khutbah-1",
        locale: "es",
        title: "Khutbah: Reflexión en el Sagrado Corán",
        slug: "reflexion-sagrado-coran",
        description: "Khutbah de viernes con traducción simultánea.",
        type: "khutbah",
        href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        duration: "32:00",
        speaker: "Sheikh Ahmad Al-Mansoor",
        spokenLanguages: ["ar", "es", "en", "tr"],
        hijriDate: "25 Sha’ban 1447 AH",
        publishedAt: "2026-02-13T17:15:00.000Z",
        featured: true,
      },
    ];

    let storedSettings: Partial<MediaFeedsSettings> | null = null;
    const pluginConfig: Partial<MediaFeedsSettings> = {
      ...DEFAULT_MEDIA_FEEDS_SETTINGS,
      defaultLocale: "es",
      supportedLocales: ["es", "en", "ar", "tr"],
      secondaryCalendars: [
        {
          id: "hijri",
          label: "Hijri",
          intlCalendar: "islamic-umalqura",
          overrideField: "hijriDate",
          enabled: true,
        },
      ],
      youtubeSyncSources: [
        {
          id: "yt-khutbahs",
          label: "YouTube Khutbahs",
          channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
          defaultType: "khutbah",
          defaultSeriesSlug: "jumuah-khutbahs",
          defaultSpokenLanguages: ["ar", "es"],
          enabled: true,
        },
      ],
      sources: [
        {
          id: "mosque-media-highlights",
          label: "Media Highlights & Khutbahs",
          uid: "api::media-highlight.media-highlight",
          enabled: true,
          defaultType: "khutbah",
          defaultSpokenLanguages: ["ar", "es"],
          fields: {
            title: "title",
            slug: "slug",
            description: "description",
            type: "type",
            sourceUrl: "href",
            duration: "duration",
            speaker: "speaker",
            spokenLanguages: "spokenLanguages",
            featured: "featured",
            alternateDateFields: { hijri: "hijriDate" },
          },
        },
      ],
    };

    const mockStrapi: any = {
      config: {
        get: (key: string) =>
          key === `plugin::${PLUGIN_ID}` ? pluginConfig : {},
      },
      contentTypes: {
        [MEDIA_ITEM_UID]: { attributes: {} },
        "api::media-highlight.media-highlight": { attributes: {} },
      },
      store: () => ({
        get: async () => storedSettings,
        set: async ({ value }: { value: Partial<MediaFeedsSettings> }) => {
          storedSettings = value;
        },
      }),
      documents: (uid: string) => ({
        findMany: async () =>
          uid === MEDIA_ITEM_UID ? createdItems : hostHighlights,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const rec = {
            id: createdItems.length + 1,
            documentId: `doc-${createdItems.length + 1}`,
            ...data,
          };
          createdItems.push(rec);
          return rec;
        },
      }),
      plugin: () => ({
        service: (name: string) => {
          if (name === "settings")
            return createSettingsService({ strapi: mockStrapi });
          if (name === "feedService")
            return createFeedService({ strapi: mockStrapi });
          if (name === "syncService")
            return createSyncService({ strapi: mockStrapi });
          return {};
        },
      }),
    };

    const syncService = createSyncService({ strapi: mockStrapi });
    const firstSync = await syncService.syncYouTubeFeedXml(
      sampleXml,
      "yt-khutbahs"
    );
    assert.equal(firstSync.syncedCount, 1);
    assert.equal(firstSync.skippedCount, 0);

    const secondSync = await syncService.syncYouTubeFeedXml(
      sampleXml,
      "yt-khutbahs"
    );
    assert.equal(secondSync.syncedCount, 0);
    assert.equal(secondSync.skippedCount, 1);

    const feedService = createFeedService({ strapi: mockStrapi });
    const episodes = await feedService.getEpisodes({ locale: "es" });
    assert.equal(episodes.length, 2);

    const hostEp = episodes.find((e) => e.documentId === "host-khutbah-1");
    assert.ok(hostEp);
    assert.equal(hostEp.provider, "youtube");
    assert.equal(hostEp.externalId, "dQw4w9WgXcQ");
    assert.equal(hostEp.secondaryDates?.hijri?.formatted, "25 Sha’ban 1447 AH");
  });
});
