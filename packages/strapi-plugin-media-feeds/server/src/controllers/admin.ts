import type { Core } from '@strapi/strapi';
import {
  PLUGIN_ID,
  type LiveBroadcastState,
  type MediaFeedItem,
  type MediaFeedsSettings,
  type MediaSeriesItem,
} from '../../../shared';
import type { EnrichedMediaMetadata } from '../services/syncService';

interface StrapiContext {
  query?: Record<string, string | undefined>;
  request?: { body?: Record<string, unknown> };
  body?: unknown;
  badRequest(message: string): void;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  getSettingsService() {
    return strapi.plugin(PLUGIN_ID).service('settings') as {
      getSettings(): Promise<MediaFeedsSettings>;
      updateSettings(
        partial: Partial<MediaFeedsSettings>
      ): Promise<MediaFeedsSettings>;
    };
  },

  getFeedService() {
    return strapi.plugin(PLUGIN_ID).service('feedService') as {
      getEpisodes(options?: Record<string, unknown>): Promise<MediaFeedItem[]>;
      getSeriesList(locale?: string): Promise<MediaSeriesItem[]>;
      getLiveStatus(locale?: string): Promise<LiveBroadcastState>;
    };
  },

  getSyncService() {
    return strapi.plugin(PLUGIN_ID).service('syncService') as {
      enrichUrl(url: string, fetchOembed?: boolean): Promise<EnrichedMediaMetadata>;
      syncConfiguredYouTubeSources(sourceId?: string): Promise<{
        syncedCount: number;
        skippedCount: number;
        sourcesProcessed: number;
      }>;
    };
  },

  async getOverview(ctx: StrapiContext) {
    const locale = ctx.query?.locale;
    const [settings, episodes, series, live] = await Promise.all([
      this.getSettingsService().getSettings(),
      this.getFeedService().getEpisodes({ locale, limit: 100 }),
      this.getFeedService().getSeriesList(locale),
      this.getFeedService().getLiveStatus(locale),
    ]);

    ctx.body = {
      data: {
        settings,
        episodes,
        series,
        live,
      },
    };
  },

  async getSettings(ctx: StrapiContext) {
    const data = await this.getSettingsService().getSettings();
    ctx.body = { data };
  },

  async updateSettings(ctx: StrapiContext) {
    const payload = (ctx.request?.body ?? {}) as Partial<MediaFeedsSettings>;
    const data = await this.getSettingsService().updateSettings(payload);
    ctx.body = { data };
  },

  async enrichUrl(ctx: StrapiContext) {
    const rawUrl = String(ctx.request?.body?.url ?? '').trim();
    if (!rawUrl) {
      return ctx.badRequest('A media URL is required');
    }
    const fetchOembed = ctx.request?.body?.fetchOembed !== false;
    const data = await this.getSyncService().enrichUrl(rawUrl, fetchOembed);
    ctx.body = { data };
  },

  async syncYouTube(ctx: StrapiContext) {
    const sourceId =
      typeof ctx.request?.body?.sourceId === 'string'
        ? ctx.request.body.sourceId
        : undefined;
    const data = await this.getSyncService().syncConfiguredYouTubeSources(
      sourceId
    );
    ctx.body = { data };
  },
});
