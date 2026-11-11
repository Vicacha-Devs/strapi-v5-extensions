import type { Core } from "@strapi/strapi";

import {
  PLUGIN_ID,
  type LiveBroadcastState,
  type MediaFeedItem,
  type MediaSeriesItem,
} from "../../../shared";
import type { QueryMediaFeedOptions } from "../services/feedService";

export interface StrapiContext {
  query?: Record<string, unknown>;
  params?: Record<string, string | undefined>;
  request?: { body?: unknown };
  body?: unknown;
  status?: number;
  set(header: string, value: string): void;
  notFound(message?: string): unknown;
  badRequest?(message?: string): unknown;
}

const MAX_FILTER_STRING_LENGTH = 120;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE_NUMBER = 10_000;

function readPlainQueryString(
  value: unknown,
  maxLen = MAX_FILTER_STRING_LENGTH
): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

function clampInteger(
  raw: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof raw !== "string" && typeof raw !== "number") {
    return fallback;
  }
  const str = typeof raw === "string" ? raw.trim() : String(raw);
  if (!str) return fallback;
  const parsed = Number(str);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  getFeedService() {
    return strapi.plugin(PLUGIN_ID).service("feedService") as {
      getEpisodes(options?: QueryMediaFeedOptions): Promise<MediaFeedItem[]>;
      getEpisodeBySlug(
        slug: string,
        locale?: string
      ): Promise<MediaFeedItem | null>;
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
    const paginationObj =
      q.pagination &&
      typeof q.pagination === "object" &&
      !Array.isArray(q.pagination)
        ? (q.pagination as Record<string, unknown>)
        : undefined;

    const rawPageSize = q.pageSize ?? paginationObj?.pageSize ?? q.limit;
    const rawPage = q.page ?? paginationObj?.page;
    const pageSize = clampInteger(
      rawPageSize,
      1,
      MAX_PAGE_SIZE,
      DEFAULT_PAGE_SIZE
    );
    const page = clampInteger(rawPage, 1, MAX_PAGE_NUMBER, 1);

    const featured =
      q.featured === "true" ? true : q.featured === "false" ? false : undefined;
    const locale = readPlainQueryString(q.locale);

    const data = await this.getFeedService().getEpisodes({
      locale,
      type: readPlainQueryString(q.type),
      provider: readPlainQueryString(q.provider),
      seriesSlug: readPlainQueryString(q.series),
      spokenLanguage: readPlainQueryString(q.spokenLanguage),
      featured,
      search: readPlainQueryString(q.search),
      page,
      pageSize,
      limit: pageSize,
    });

    ctx.body = {
      data,
      meta: {
        count: data.length,
        page,
        pageSize,
        locale: locale ?? "default",
      },
    };
  },

  async getEpisodeBySlug(ctx: StrapiContext) {
    const slug = readPlainQueryString(ctx.params?.slug);
    if (!slug) {
      return ctx.notFound("Episode not found");
    }
    const locale = readPlainQueryString(ctx.query?.locale);
    const episode = await this.getFeedService().getEpisodeBySlug(slug, locale);
    if (!episode) {
      return ctx.notFound("Episode not found");
    }
    ctx.body = {
      data: episode,
      meta: {
        locale: locale ?? "default",
      },
    };
  },

  async listSeries(ctx: StrapiContext) {
    const q = ctx.query ?? {};
    const locale = readPlainQueryString(q.locale);
    const data = await this.getFeedService().getSeriesList(locale);
    ctx.body = {
      data,
      meta: {
        count: data.length,
      },
    };
  },

  async getLiveStatus(ctx: StrapiContext) {
    const q = ctx.query ?? {};
    const locale = readPlainQueryString(q.locale);
    const data = await this.getFeedService().getLiveStatus(locale);
    ctx.body = { data };
  },

  async getRssXml(ctx: StrapiContext) {
    const q = ctx.query ?? {};
    const xml = await this.getFeedService().generateRssFeed({
      locale: readPlainQueryString(q.locale),
      seriesSlug: readPlainQueryString(q.series),
    });
    ctx.set("Content-Type", "application/rss+xml; charset=utf-8");
    ctx.set("X-Content-Type-Options", "nosniff");
    ctx.body = xml;
  },
});
