import type { Core } from "@strapi/strapi";

import {
  isAllowedMediaSourceUid,
  MAX_MEDIA_URL_LENGTH,
  parseMediaUrl,
  PLUGIN_ID,
  type LiveBroadcastState,
  type MediaFeedItem,
  type MediaFeedsSettings,
  type MediaSeriesItem,
} from "../../../shared";
import {
  isPlainObject,
  maskSettingsSecrets,
  stripDangerousKeys,
  stripOverviewSecrets,
} from "../services/settings";
import type { EnrichedMediaMetadata } from "../services/syncService";

export interface StrapiContext {
  query?: Record<string, unknown>;
  request?: { body?: unknown };
  body?: unknown;
  badRequest(message: string): unknown;
}

function readBoundedString(value: unknown, maxLen = 120): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

function hasInvalidSourceUid(sources: unknown): boolean {
  if (!Array.isArray(sources)) return true;
  return sources.some(
    (item) => !isPlainObject(item) || !isAllowedMediaSourceUid(item.uid)
  );
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  getSettingsService() {
    return strapi.plugin(PLUGIN_ID).service("settings") as {
      getSettings(): Promise<MediaFeedsSettings>;
      updateSettings(
        partial: Partial<MediaFeedsSettings>
      ): Promise<MediaFeedsSettings>;
    };
  },

  getFeedService() {
    return strapi.plugin(PLUGIN_ID).service("feedService") as {
      getEpisodes(options?: Record<string, unknown>): Promise<MediaFeedItem[]>;
      getSeriesList(locale?: string): Promise<MediaSeriesItem[]>;
      getLiveStatus(locale?: string): Promise<LiveBroadcastState>;
    };
  },

  getSyncService() {
    return strapi.plugin(PLUGIN_ID).service("syncService") as {
      enrichUrl(
        url: string,
        fetchOembed?: boolean
      ): Promise<EnrichedMediaMetadata>;
      syncConfiguredYouTubeSources(sourceId?: string): Promise<{
        syncedCount: number;
        skippedCount: number;
        sourcesProcessed: number;
      }>;
    };
  },

  async getOverview(ctx: StrapiContext) {
    const locale = readBoundedString(ctx.query?.locale, 32);
    const [settings, episodes, series, live] = await Promise.all([
      this.getSettingsService().getSettings(),
      this.getFeedService().getEpisodes({ locale, limit: 100 }),
      this.getFeedService().getSeriesList(locale),
      this.getFeedService().getLiveStatus(locale),
    ]);

    ctx.body = {
      data: {
        settings: stripOverviewSecrets(settings),
        episodes,
        series,
        live,
      },
    };
  },

  async getSettings(ctx: StrapiContext) {
    const data = await this.getSettingsService().getSettings();
    ctx.body = { data: maskSettingsSecrets(data) };
  },

  async updateSettings(ctx: StrapiContext) {
    const rawBody = ctx.request?.body;
    if (!isPlainObject(rawBody)) {
      return ctx.badRequest("Settings payload must be a JSON object");
    }
    const sanitized = stripDangerousKeys(rawBody);
    if (
      sanitized.sources !== undefined &&
      hasInvalidSourceUid(sanitized.sources)
    ) {
      return ctx.badRequest(
        "Each source.uid must match api::<name>.<name> or plugin::media-feeds.media-item"
      );
    }

    const updated = await this.getSettingsService().updateSettings(
      sanitized as Partial<MediaFeedsSettings>
    );
    ctx.body = { data: maskSettingsSecrets(updated) };
  },

  async enrichUrl(ctx: StrapiContext) {
    const rawBody = ctx.request?.body;
    if (!isPlainObject(rawBody)) {
      return ctx.badRequest("Request body must be a JSON object");
    }
    const rawUrl = typeof rawBody.url === "string" ? rawBody.url.trim() : "";
    if (!rawUrl || rawUrl.length > MAX_MEDIA_URL_LENGTH) {
      return ctx.badRequest("A valid media URL is required");
    }
    const preview = parseMediaUrl(rawUrl);
    if (!preview.canonicalUrl) {
      return ctx.badRequest("Unsupported or unsafe media URL scheme");
    }
    const fetchOembed = rawBody.fetchOembed !== false;
    const data = await this.getSyncService().enrichUrl(rawUrl, fetchOembed);
    ctx.body = { data };
  },

  async syncYouTube(ctx: StrapiContext) {
    const rawBody = ctx.request?.body;
    if (rawBody !== undefined && !isPlainObject(rawBody)) {
      return ctx.badRequest("Request body must be a JSON object");
    }
    const sourceId = isPlainObject(rawBody)
      ? readBoundedString(rawBody.sourceId, 120)
      : undefined;
    const data =
      await this.getSyncService().syncConfiguredYouTubeSources(sourceId);
    ctx.body = { data };
  },
});
