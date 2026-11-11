import type { Core } from "@strapi/strapi";

import {
  computeSecondaryDates,
  generatePodcastRssXml,
  isAllowedMediaSourceUid,
  MEDIA_ITEM_UID,
  MEDIA_SERIES_UID,
  PLUGIN_ID,
  type LiveBroadcastState,
  type MediaFeedItem,
  type MediaFeedsSettings,
  type MediaSeriesItem,
} from "../../../shared";
import {
  isBlockedRecordFieldName,
  normalizeRawMediaRecord,
} from "./feedNormalizer";
import {
  buildActiveLiveBroadcastState,
  buildStandbyLiveBroadcastState,
  findActiveRecurringSlot,
} from "./liveStatusHelper";

export { findActiveRecurringSlot };

export interface QueryMediaFeedOptions {
  locale?: string;
  type?: string;
  provider?: string;
  seriesSlug?: string;
  spokenLanguage?: string;
  featured?: boolean;
  search?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
}

function safeTimestamp(iso?: string | null): number {
  if (typeof iso !== "string" || !iso.trim()) return 0;
  const ts = Date.parse(iso);
  return Number.isFinite(ts) ? ts : 0;
}

function clampServiceInt(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function capFilterStr(raw?: string): string {
  return typeof raw === "string" ? raw.trim().slice(0, 120) : "";
}

function matchesSpokenLanguage(item: MediaFeedItem, lang: string): boolean {
  return (
    item.spokenLanguages.includes(lang) ||
    item.languageTracks.some((tr) => tr.locale.toLowerCase() === lang)
  );
}

function matchesSearchQuery(item: MediaFeedItem, q: string): boolean {
  return (
    item.title.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q) ||
    (item.speaker ?? "").toLowerCase().includes(q)
  );
}

function matchesCategoryAndProvider(
  item: MediaFeedItem,
  options: QueryMediaFeedOptions
): boolean {
  const typeFilter = capFilterStr(options.type).toLowerCase();
  const providerFilter = capFilterStr(options.provider).toLowerCase();
  const seriesFilter = capFilterStr(options.seriesSlug).toLowerCase();

  const typeMatch =
    !typeFilter ||
    typeFilter === "all" ||
    item.type.toLowerCase() === typeFilter;
  const providerMatch =
    !providerFilter || item.provider.toLowerCase() === providerFilter;
  const seriesMatch =
    !seriesFilter || (item.seriesSlug ?? "").toLowerCase() === seriesFilter;
  return typeMatch && providerMatch && seriesMatch;
}

function matchesSingleEpisodeFilter(
  item: MediaFeedItem,
  options: QueryMediaFeedOptions
): boolean {
  if (!matchesCategoryAndProvider(item, options)) return false;
  const spoken = capFilterStr(options.spokenLanguage).toLowerCase();
  if (spoken && !matchesSpokenLanguage(item, spoken)) {
    return false;
  }
  if (typeof options.featured === "boolean") {
    return item.featured === options.featured;
  }
  return true;
}

export function filterAndSortEpisodes(
  items: MediaFeedItem[],
  options: QueryMediaFeedOptions
): MediaFeedItem[] {
  const searchQuery = capFilterStr(options.search).toLowerCase();
  const filtered = items.filter((item) => {
    if (!matchesSingleEpisodeFilter(item, options)) return false;
    return !searchQuery || matchesSearchQuery(item, searchQuery);
  });

  filtered.sort(
    (a, b) => safeTimestamp(b.publishedAt) - safeTimestamp(a.publishedAt)
  );

  const hasPaging =
    options.page !== undefined ||
    options.pageSize !== undefined ||
    options.limit !== undefined;
  if (!hasPaging) {
    return filtered.slice(0, 100);
  }

  const page = clampServiceInt(options.page, 1, 10_000, 1);
  const size = clampServiceInt(options.pageSize ?? options.limit, 1, 100, 25);
  const offset = (page - 1) * size;
  return filtered.slice(offset, offset + size);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function mapRawSeriesItem(
  r: Record<string, unknown>,
  supportedLocales: string[]
): MediaSeriesItem {
  const slug = String(r.slug ?? "");
  const id = (r.id as string | number) ?? slug;
  const documentId = String(r.documentId ?? id);
  const spokenLanguages = Array.isArray(r.spokenLanguages)
    ? r.spokenLanguages.filter((v): v is string => typeof v === "string")
    : supportedLocales;

  return {
    id,
    documentId,
    title: String(r.title ?? "Series"),
    slug,
    description: String(r.description ?? ""),
    author: stringOrNull(r.author),
    coverImageUrl: stringOrNull(r.coverImageUrl),
    category: stringOrNull(r.category) ?? "Education",
    defaultType: String(r.defaultType ?? "podcast"),
    spokenLanguages,
    rssEnabled: r.rssEnabled !== false,
    youtubePlaylistId: stringOrNull(r.youtubePlaylistId),
    spotifyShowUrl: stringOrNull(r.spotifyShowUrl),
    applePodcastsUrl: stringOrNull(r.applePodcastsUrl),
    active: r.active !== false,
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  getSettingsService() {
    return strapi.plugin(PLUGIN_ID).service("settings") as {
      getSettings(): Promise<MediaFeedsSettings>;
    };
  },

  async fetchRecordsWithLocaleFallback(
    uid: string,
    requestedLocale: string,
    settings: MediaFeedsSettings,
    populate: string[] = []
  ): Promise<Array<Record<string, unknown>>> {
    const isPermittedUid =
      uid === MEDIA_SERIES_UID || isAllowedMediaSourceUid(uid);
    if (!isPermittedUid || !Object.hasOwn(strapi.contentTypes ?? {}, uid)) {
      return [];
    }

    try {
      const primary = await strapi.documents(uid).findMany({
        locale: requestedLocale,
        status: "published",
        populate,
        limit: 200,
      });

      if (
        primary.length > 0 ||
        !settings.fallbackToDefaultLocale ||
        requestedLocale === settings.defaultLocale
      ) {
        return primary;
      }

      return await strapi.documents(uid).findMany({
        locale: settings.defaultLocale,
        status: "published",
        populate,
        limit: 200,
      });
    } catch {
      return [];
    }
  },

  async collectSourceEpisodes(
    activeLocale: string,
    settings: MediaFeedsSettings
  ): Promise<MediaFeedItem[]> {
    const allItems: MediaFeedItem[] = [];
    const validSources = (settings.sources ?? []).filter(
      (s) => s && s.enabled && isAllowedMediaSourceUid(s.uid)
    );
    const hasCustomBuiltInSource = validSources.some(
      (s) => s.uid === MEDIA_ITEM_UID
    );

    if (!hasCustomBuiltInSource) {
      const builtInRecords = await this.fetchRecordsWithLocaleFallback(
        MEDIA_ITEM_UID,
        activeLocale,
        settings,
        ["thumbnail", "audioFile", "transcriptFile"]
      );
      for (const rec of builtInRecords) {
        allItems.push(
          normalizeRawMediaRecord(rec, {
            settings,
            requestedLocale: activeLocale,
          })
        );
      }
    }

    for (const source of validSources) {
      const populateFields = [
        source.fields?.thumbnail,
        source.fields?.audioFile,
        source.fields?.transcriptFile,
      ].filter((f): f is string => Boolean(f) && !isBlockedRecordFieldName(f));

      const sourceRecords = await this.fetchRecordsWithLocaleFallback(
        source.uid,
        activeLocale,
        settings,
        populateFields
      );
      for (const rec of sourceRecords) {
        allItems.push(
          normalizeRawMediaRecord(rec, {
            source,
            settings,
            requestedLocale: activeLocale,
          })
        );
      }
    }
    return allItems;
  },

  async getEpisodes(
    options: QueryMediaFeedOptions = {}
  ): Promise<MediaFeedItem[]> {
    const settings = await this.getSettingsService().getSettings();
    const activeLocale = (
      capFilterStr(options.locale) || settings.defaultLocale
    ).toLowerCase();
    const allItems = await this.collectSourceEpisodes(activeLocale, settings);
    return filterAndSortEpisodes(allItems, options);
  },

  async getEpisodeBySlug(
    slug: string,
    locale?: string
  ): Promise<MediaFeedItem | null> {
    const cleanSlug = capFilterStr(slug).toLowerCase();
    if (!cleanSlug) return null;

    const settings = await this.getSettingsService().getSettings();
    const activeLocale = (
      capFilterStr(locale) || settings.defaultLocale
    ).toLowerCase();
    const allItems = await this.collectSourceEpisodes(activeLocale, settings);
    allItems.sort(
      (a, b) => safeTimestamp(b.publishedAt) - safeTimestamp(a.publishedAt)
    );
    return allItems.find((ep) => ep.slug.toLowerCase() === cleanSlug) ?? null;
  },

  async getSeriesList(locale?: string): Promise<MediaSeriesItem[]> {
    const settings = await this.getSettingsService().getSettings();
    const activeLocale = (
      capFilterStr(locale) || settings.defaultLocale
    ).toLowerCase();
    const records = await this.fetchRecordsWithLocaleFallback(
      MEDIA_SERIES_UID,
      activeLocale,
      settings
    );

    return records
      .filter((r) => r.active !== false)
      .map((r) => mapRawSeriesItem(r, settings.supportedLocales));
  },

  async getLiveStatus(
    locale?: string,
    now: Date = new Date()
  ): Promise<LiveBroadcastState> {
    const safeNow = Number.isNaN(now.getTime()) ? new Date() : now;
    const settings = await this.getSettingsService().getSettings();
    const episodes = await this.getEpisodes({ locale, limit: 50 });
    const liveEpisode = episodes.find((ep) => ep.isLive);

    const secondaryDates =
      settings.secondaryCalendars?.length > 0
        ? computeSecondaryDates(
            safeNow.toISOString(),
            settings.secondaryCalendars
          )
        : undefined;

    if (liveEpisode) {
      return buildActiveLiveBroadcastState(
        liveEpisode,
        settings,
        secondaryDates
      );
    }
    return buildStandbyLiveBroadcastState(
      settings,
      episodes,
      secondaryDates,
      safeNow
    );
  },

  async generateRssFeed(
    options: {
      locale?: string;
      seriesSlug?: string;
    } = {}
  ): Promise<string> {
    const settings = await this.getSettingsService().getSettings();
    const cleanLocale = capFilterStr(options.locale) || settings.defaultLocale;
    const cleanSeries = capFilterStr(options.seriesSlug) || undefined;
    const episodes = await this.getEpisodes({
      locale: cleanLocale,
      seriesSlug: cleanSeries,
      limit: 100,
    });

    let seriesTitle: string | undefined;
    let seriesDescription: string | undefined;
    if (cleanSeries) {
      const seriesList = await this.getSeriesList(cleanLocale);
      const matched = seriesList.find(
        (s) => s.slug.toLowerCase() === cleanSeries.toLowerCase()
      );
      if (matched) {
        seriesTitle = matched.title;
        seriesDescription = matched.description;
      }
    }

    return generatePodcastRssXml(episodes, {
      feed: settings.podcastFeed,
      locale: cleanLocale,
      defaultLocale: settings.defaultLocale,
      seriesTitle,
      seriesDescription,
    });
  },
});
