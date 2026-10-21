import type { Core } from '@strapi/strapi';
import {
  PLUGIN_ID,
  type LiveBroadcastState,
  type MediaFeedItem,
  type MediaSeriesItem,
} from '../../../shared';
import type { QueryMediaFeedOptions } from '../services/feedService';

interface StrapiContext {
  query?: Record<string, string | undefined>;
  params?: Record<string, string | undefined>;
  request?: { body?: Record<string, unknown> };
  body?: unknown;
  status?: number;
  set(header: string, value: string): void;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  getFeedService() {
    return strapi.plugin(PLUGIN_ID).service('feedService') as {
      getEpisodes(options?: QueryMediaFeedOptions): Promise<MediaFeedItem[]>;
      getSeriesList(locale?: string): Promise<MediaSeriesItem[]>;
      getLiveStatus(locale?: string): Promise<LiveBroadcastState>;
      generateRssFeed(options?: {
        locale?: string;
        seriesSlug?: string;
      }): Promise<string>;
    };
  },

  async listEpisodes(ctx: StrapiContext) {
    const q = ctx.query ?? {};
    const limit = q.limit ? Number(q.limit) : undefined;
    const featured =
      q.featured === 'true'
        ? true
        : q.featured === 'false'
          ? false
          : undefined;

    const data = await this.getFeedService().getEpisodes({
      locale: q.locale,
      type: q.type,
      provider: q.provider,
      seriesSlug: q.series,
      spokenLanguage: q.spokenLanguage,
      featured,
      search: q.search,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    ctx.body = {
      data,
      meta: {
        count: data.length,
        locale: q.locale ?? 'default',
      },
    };
  },

  async listSeries(ctx: StrapiContext) {
    const q = ctx.query ?? {};
    const data = await this.getFeedService().getSeriesList(q.locale);
    ctx.body = {
      data,
      meta: {
        count: data.length,
      },
    };
  },

  async getLiveStatus(ctx: StrapiContext) {
    const q = ctx.query ?? {};
    const data = await this.getFeedService().getLiveStatus(q.locale);
    ctx.body = { data };
  },

  async getRssXml(ctx: StrapiContext) {
    const q = ctx.query ?? {};
    const xml = await this.getFeedService().generateRssFeed({
      locale: q.locale,
      seriesSlug: q.series,
    });
    ctx.set('Content-Type', 'application/rss+xml; charset=utf-8');
    ctx.body = xml;
  },
});
