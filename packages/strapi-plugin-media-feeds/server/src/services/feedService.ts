import type { Core } from '@strapi/strapi';
import {
  computeSecondaryDates,
  generatePodcastRssXml,
  MEDIA_ITEM_UID,
  MEDIA_SERIES_UID,
  parseMediaUrl,
  PLUGIN_ID,
  type LiveBroadcastState,
  type MediaFeedItem,
  type MediaFeedsSettings,
  type MediaSeriesItem,
} from '../../../shared';
import { normalizeRawMediaRecord } from './feedNormalizer';

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

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  getSettingsService() {
    return strapi.plugin(PLUGIN_ID).service('settings') as {
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
        status: 'published',
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
        status: 'published',
        populate,
        limit: 200,
      });
    } catch {
      return [];
    }
  },

  async getEpisodes(options: QueryMediaFeedOptions = {}): Promise<MediaFeedItem[]> {
    const settings = await this.getSettingsService().getSettings();
    const activeLocale = (options.locale || settings.defaultLocale)
      .trim()
      .toLowerCase();

    const allItems: MediaFeedItem[] = [];

    // 1. Built-in collection (`plugin::media-feeds.media-item`)
    const builtInRecords = await this.fetchRecordsWithLocaleFallback(
      MEDIA_ITEM_UID,
      activeLocale,
      settings,
      ['thumbnail', 'audioFile', 'transcriptFile']
    );
    for (const rec of builtInRecords) {
      allItems.push(
        normalizeRawMediaRecord(rec, {
          settings,
          requestedLocale: activeLocale,
        })
      );
    }

    // 2. Host collection sources (e.g. `api::media-highlight.media-highlight`)
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

    // 3. Apply filters
    let filtered = allItems;
    if (options.type && options.type !== 'all') {
      const t = options.type.toLowerCase();
      filtered = filtered.filter((item) => item.type.toLowerCase() === t);
    }
    if (options.provider) {
      const p = options.provider.toLowerCase();
      filtered = filtered.filter((item) => item.provider.toLowerCase() === p);
    }
    if (options.seriesSlug) {
      const s = options.seriesSlug.toLowerCase();
      filtered = filtered.filter(
        (item) => (item.seriesSlug ?? '').toLowerCase() === s
      );
    }
    if (options.spokenLanguage) {
      const lang = options.spokenLanguage.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.spokenLanguages.includes(lang) ||
          item.languageTracks.some((tr) => tr.locale.toLowerCase() === lang)
      );
    }
    if (typeof options.featured === 'boolean') {
      filtered = filtered.filter((item) => item.featured === options.featured);
    }
    if (options.search?.trim()) {
      const q = options.search.trim().toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (item.speaker ?? '').toLowerCase().includes(q)
      );
    }

    filtered.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    if (options.limit && options.limit > 0) {
      return filtered.slice(0, options.limit);
    }
    return filtered;
  },

  async getSeriesList(locale?: string): Promise<MediaSeriesItem[]> {
    const settings = await this.getSettingsService().getSettings();
    const activeLocale = (locale || settings.defaultLocale).trim().toLowerCase();
    const records = await this.fetchRecordsWithLocaleFallback(
      MEDIA_SERIES_UID,
      activeLocale,
      settings
    );

    return records
      .filter((r) => r.active !== false)
      .map((r) => ({
        id: (r.id as string | number) ?? String(r.slug ?? ''),
        documentId: String(r.documentId ?? r.id ?? r.slug ?? ''),
        title: String(r.title ?? 'Series'),
        slug: String(r.slug ?? ''),
        description: String(r.description ?? ''),
        author: typeof r.author === 'string' ? r.author : null,
        coverImageUrl:
          typeof r.coverImageUrl === 'string' ? r.coverImageUrl : null,
        category: typeof r.category === 'string' ? r.category : 'Education',
        defaultType: String(r.defaultType ?? 'podcast'),
        spokenLanguages: Array.isArray(r.spokenLanguages)
          ? (r.spokenLanguages as string[])
          : settings.supportedLocales,
        rssEnabled: r.rssEnabled !== false,
        youtubePlaylistId:
          typeof r.youtubePlaylistId === 'string' ? r.youtubePlaylistId : null,
        spotifyShowUrl:
          typeof r.spotifyShowUrl === 'string' ? r.spotifyShowUrl : null,
        applePodcastsUrl:
          typeof r.applePodcastsUrl === 'string' ? r.applePodcastsUrl : null,
        active: r.active !== false,
      }));
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
      return {
        status: 'live',
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
      };
    }

    const parsedWatch = parseMediaUrl(
      settings.liveStream.watchUrl,
      settings.liveStream.provider
    );

    return {
      status: settings.liveStream.enabled ? 'upcoming' : 'offline',
      title: settings.liveStream.title,
      description: settings.liveStream.description,
      scheduleLabel: settings.liveStream.scheduleLabel,
      provider: parsedWatch.provider,
      watchUrl: settings.liveStream.watchUrl,
      embedUrl: settings.liveStream.embedUrl ?? parsedWatch.embedUrl,
      thumbnailUrl:
        settings.liveStream.thumbnailUrl ??
        parsedWatch.thumbnailUrl ??
        episodes[0]?.thumbnailUrl ??
        null,
      spokenLanguages: settings.liveStream.spokenLanguages ?? ['es'],
      activeEpisodeDocumentId: null,
      secondaryDates,
    };
  },

  async generateRssFeed(options: {
    locale?: string;
    seriesSlug?: string;
  } = {}): Promise<string> {
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
