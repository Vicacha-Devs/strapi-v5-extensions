import type { StrapiLike } from "../types";
import { PLUGIN_ID } from "../utils/constants";

type Ctx = {
  request: { query: Record<string, unknown>; body?: Record<string, unknown> };
  state: {
    userAbility?: { can: (action: string, subject: string) => boolean } | null;
  };
  body?: unknown;
  throw: (code: number, msg: string) => void;
};

/** `?types[]=a&types[]=b`, `?types[0]=a`, and `?types=a,b` are all accepted. */
const toArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(","))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .flatMap((item) => String(item).split(","))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export default ({ strapi }: { strapi: StrapiLike }) => ({
  async find(ctx: Ctx) {
    const { q, locale, page, pageSize } = ctx.request.query;
    const rawTypes = ctx.request.query.types ?? ctx.request.query["types[]"];

    try {
      ctx.body = await strapi
        .plugin(PLUGIN_ID)
        .service("search")
        .search({
          query: typeof q === "string" ? q : undefined,
          types: toArray(rawTypes),
          locale: typeof locale === "string" ? locale : undefined,
          page: page !== undefined ? Number(page) : undefined,
          pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
          userAbility: ctx.state.userAbility,
        });
    } catch (error) {
      const detail = (error as Error).stack || (error as Error).message;
      strapi.log.error(`[${PLUGIN_ID}] search request failed: ${detail}`);
      ctx.throw(
        500,
        "Global search failed. Check the server logs for details."
      );
    }
  },
});
