import type { Core } from "@strapi/strapi";

import {
  buildYouTubeAtomFeedUrl,
  MEDIA_ITEM_UID,
  parseMediaUrl,
  parseYouTubeAtomFeedXml,
  PLUGIN_ID,
  type MediaFeedsSettings,
  type ParsedMediaProviderInfo,
} from "../../../shared";

export interface EnrichedMediaMetadata extends ParsedMediaProviderInfo {
  title?: string | null;
  authorName?: string | null;
}

const OEMBED_BUILDERS: Record<string, (url: string) => string> = {
  youtube: (url) => `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  vimeo: (url) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
  spotify: (url) => `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
};

function mergeOembedPayload(
  parsed: ParsedMediaProviderInfo,
  payload: Record<string, unknown>
): EnrichedMediaMetadata {
  return {
    ...parsed,
    title: typeof payload.title === "string" ? payload.title : null,
    authorName: typeof payload.author_name === "string" ? payload.author_name : null,
    thumbnailUrl:
      typeof payload.thumbnail_url === "string" ? payload.thumbnail_url : parsed.thumbnailUrl,
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  getSettingsService() {
    return strapi.plugin(PLUGIN_ID).service("settings") as {
      getSettings(): Promise<MediaFeedsSettings>;
    };
  },

  async enrichUrl(rawUrl: string, fetchOembed = false): Promise<EnrichedMediaMetadata> {
    const parsed = parseMediaUrl(rawUrl);
    const buildEndpoint = OEMBED_BUILDERS[parsed.provider];
    if (
      !fetchOembed ||
      !parsed.canonicalUrl ||
      !buildEndpoint ||
      typeof globalThis.fetch !== "function"
    ) {
      return parsed;
    }

    try {
      const response = await globalThis.fetch(buildEndpoint(parsed.canonicalUrl));
      if (!response.ok) return parsed;
      const payload = (await response.json()) as Record<string, unknown>;
      return mergeOembedPayload(parsed, payload);
    } catch {
      return parsed;
    }
  },

  async syncYouTubeFeedXml(
    xmlContent: string,
    sourceId?: string
  ): Promise<{ syncedCount: number; skippedCount: number }> {
    const settings = await this.getSettingsService().getSettings();
    const sourceConfig = settings.youtubeSyncSources.find((s) => s.id === sourceId);
    const videos = parseYouTubeAtomFeedXml(xmlContent, sourceConfig);

    let syncedCount = 0;
    let skippedCount = 0;

    const existing = await strapi.documents(MEDIA_ITEM_UID).findMany({
      locale: settings.defaultLocale,
      limit: 200,
    });
    const existingIds = new Set(
      existing.map((r) => (typeof r.externalId === "string" ? r.externalId : null)).filter(Boolean)
    );

    for (const video of videos) {
      if (existingIds.has(video.videoId)) {
        skippedCount += 1;
        continue;
      }

      await strapi.documents(MEDIA_ITEM_UID).create({
        locale: settings.defaultLocale,
        status: "published",
        data: {
          title: video.title,
          slug: video.slug,
          description: video.description,
          type: video.type,
          provider: "youtube",
          externalId: video.videoId,
          sourceUrl: video.watchUrl,
          embedUrl: video.embedUrl,
          imageUrl: video.thumbnailUrl,
          imageAlt: video.title,
          speaker: video.authorName,
          seriesSlug: video.seriesSlug,
          spokenLanguages: video.spokenLanguages,
          featured: false,
          isLive: false,
        },
      });
      existingIds.add(video.videoId);
      syncedCount += 1;
    }

    return { syncedCount, skippedCount };
  },

  async syncConfiguredYouTubeSources(sourceId?: string): Promise<{
    syncedCount: number;
    skippedCount: number;
    sourcesProcessed: number;
  }> {
    const settings = await this.getSettingsService().getSettings();
    const targets = (settings.youtubeSyncSources ?? []).filter(
      (s) => s.enabled && (!sourceId || s.id === sourceId)
    );

    let totalSynced = 0;
    let totalSkipped = 0;
    let sourcesProcessed = 0;

    if (typeof globalThis.fetch !== "function") {
      return { syncedCount: 0, skippedCount: 0, sourcesProcessed: 0 };
    }

    for (const src of targets) {
      const feedUrl = buildYouTubeAtomFeedUrl(src);
      if (!feedUrl) continue;
      try {
        const res = await globalThis.fetch(feedUrl);
        if (!res.ok) continue;
        const xml = await res.text();
        const { syncedCount, skippedCount } = await this.syncYouTubeFeedXml(xml, src.id);
        totalSynced += syncedCount;
        totalSkipped += skippedCount;
        sourcesProcessed += 1;
      } catch (err) {
        strapi.log.warn(
          `[${PLUGIN_ID}] Failed to sync YouTube source "${src.id}": ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    return {
      syncedCount: totalSynced,
      skippedCount: totalSkipped,
      sourcesProcessed,
    };
  },
});
