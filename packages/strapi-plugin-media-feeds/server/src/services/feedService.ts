import type { Core } from "@strapi/strapi";

import {
  computeSecondaryDates,
  generatePodcastRssXml,
  MEDIA_ITEM_UID,
  MEDIA_SERIES_UID,
  parseMediaUrl,
  PLUGIN_ID,
  type AlternateDateValue,
  type LiveBroadcastState,
  type MediaFeedItem,
  type MediaFeedsSettings,
  type MediaSeriesItem,
} from "../../../shared";
import { normalizeRawMediaRecord } from "./feedNormalizer";

export interface QueryMediaFeedOptions {
  locale?: string;
  type?: string;
  provider?: string;
  seriesSlug?: string;
  spokenLanguage?: string;
  featured?: boolean;
  search?: string;
  limit?: number;
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
  const typeMatch =
    !options.type ||
    options.type === "all" ||
    item.type.toLowerCase() === options.type.toLowerCase();
  const providerMatch =
    !options.provider ||
    item.provider.toLowerCase() === options.provider.toLowerCase();
  const seriesMatch =
    !options.seriesSlug ||
    (item.seriesSlug ?? "").toLowerCase() === options.seriesSlug.toLowerCase();
  return typeMatch && providerMatch && seriesMatch;
}

function matchesSingleEpisodeFilter(
  item: MediaFeedItem,
  options: QueryMediaFeedOptions
): boolean {
  if (!matchesCategoryAndProvider(item, options)) return false;
  if (
    options.spokenLanguage &&
    !matchesSpokenLanguage(item, options.spokenLanguage.toLowerCase())
  ) {
    return false;
  }
  if (typeof options.featured === "boolean") {
    return item.featured === options.featured;
  }
  return true;
}

function filterAndSortEpisodes(
  items: MediaFeedItem[],
  options: QueryMediaFeedOptions
): MediaFeedItem[] {
  const searchQuery = options.search?.trim().toLowerCase() ?? "";
  const filtered = items.filter((item) => {
    if (!matchesSingleEpisodeFilter(item, options)) return false;
    return !searchQuery || matchesSearchQuery(item, searchQuery);
  });

  filtered.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  if (options.limit && options.limit > 0) {
    return filtered.slice(0, options.limit);
  }
  return filtered;
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
    ? (r.spokenLanguages as string[])
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

function buildActiveLiveBroadcastState(
  liveEpisode: MediaFeedItem,
  settings: MediaFeedsSettings,
  secondaryDates?: Record<string, AlternateDateValue>
): LiveBroadcastState {
  return {
    status: "live",
    title: liveEpisode.title,
    description: liveEpisode.description,
    scheduleLabel:
      liveEpisode.publishedAtLabel || settings.liveStream.scheduleLabel,
    provider: liveEpisode.provider,
    watchUrl: liveEpisode.sourceUrl || settings.liveStream.watchUrl,
    embedUrl: liveEpisode.embedUrl ?? null,
    thumbnailUrl:
      liveEpisode.thumbnailUrl ?? settings.liveStream.thumbnailUrl ?? null,
    spokenLanguages: liveEpisode.spokenLanguages,
    activeEpisodeDocumentId: liveEpisode.documentId,
    secondaryDates,
    streams: settings.liveStreams ?? [],
  };
}

function buildStandbyLiveBroadcastState(
  settings: MediaFeedsSettings,
  episodes: MediaFeedItem[],
  secondaryDates?: Record<string, AlternateDateValue>
): LiveBroadcastState {
  const parsedWatch = parseMediaUrl(
    settings.liveStream.watchUrl,
    settings.liveStream.provider
  );
  const thumbnailUrl =
    settings.liveStream.thumbnailUrl ??
    parsedWatch.thumbnailUrl ??
    episodes[0]?.thumbnailUrl ??
    null;

  return {
    status: settings.liveStream.enabled ? "upcoming" : "offline",
    title: settings.liveStream.title,
    description: settings.liveStream.description,
    scheduleLabel: settings.liveStream.scheduleLabel,
    provider: parsedWatch.provider,
    watchUrl: settings.liveStream.watchUrl,
    embedUrl: settings.liveStream.embedUrl ?? parsedWatch.embedUrl,
    thumbnailUrl,
    spokenLanguages: settings.liveStream.spokenLanguages ?? ["es"],
    activeEpisodeDocumentId: null,
    secondaryDates,
    streams: settings.liveStreams ?? [],
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
    if (!strapi.contentTypes?.[uid]) return [];

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

    for (const source of settings.sources ?? []) {
      if (!source.enabled || !source.uid) continue;
      const populateFields = [
        source.fields.thumbnail,
        source.fields.audioFile,
        source.fields.transcriptFile,
      ].filter((f): f is string => Boolean(f));

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
    const activeLocale = (options.locale || settings.defaultLocale)
      .trim()
      .toLowerCase();
    const allItems = await this.collectSourceEpisodes(activeLocale, settings);
    return filterAndSortEpisodes(allItems, options);
  },

  async getSeriesList(locale?: string): Promise<MediaSeriesItem[]> {
    const settings = await this.getSettingsService().getSettings();
    const activeLocale = (locale || settings.defaultLocale)
      .trim()
      .toLowerCase();
    const records = await this.fetchRecordsWithLocaleFallback(
      MEDIA_SERIES_UID,
      activeLocale,
      settings
    );

    return records
      .filter((r) => r.active !== false)
      .map((r) => mapRawSeriesItem(r, settings.supportedLocales));
  },

  async getLiveStatus(locale?: string): Promise<LiveBroadcastState> {
    const settings = await this.getSettingsService().getSettings();
    const episodes = await this.getEpisodes({ locale, limit: 50 });
    const liveEpisode = episodes.find((ep) => ep.isLive);

    const secondaryDates =
      settings.secondaryCalendars?.length > 0
        ? computeSecondaryDates(
            new Date().toISOString(),
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
    return buildStandbyLiveBroadcastState(settings, episodes, secondaryDates);
  },

  async generateRssFeed(
    options: {
      locale?: string;
      seriesSlug?: string;
    } = {}
  ): Promise<string> {
    const settings = await this.getSettingsService().getSettings();
    const episodes = await this.getEpisodes({
      locale: options.locale,
      seriesSlug: options.seriesSlug,
      limit: 100,
    });

    let seriesTitle: string | undefined;
    let seriesDescription: string | undefined;
    if (options.seriesSlug) {
      const seriesList = await this.getSeriesList(options.locale);
      const matched = seriesList.find((s) => s.slug === options.seriesSlug);
      if (matched) {
        seriesTitle = matched.title;
        seriesDescription = matched.description;
      }
    }

    return generatePodcastRssXml(episodes, {
      feed: settings.podcastFeed,
      locale: options.locale || settings.defaultLocale,
      defaultLocale: settings.defaultLocale,
      seriesTitle,
      seriesDescription,
    });
  },
});
