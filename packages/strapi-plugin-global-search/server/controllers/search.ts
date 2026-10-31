import type { StrapiLike } from "../types";
import { PLUGIN_ID } from "../utils/constants";

type Ctx = {
  request: { query: Record<string, unknown>; body?: Record<string, unknown> };
  state: { userAbility?: { can: (action: string, subject: string) => boolean } | null };
  body?: unknown;
  throw: (code: number, msg: string) => void;
};

/** `?types[]=a&types[]=b` and `?types=a,b` are both accepted. */
const toArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export default ({ strapi }: { strapi: StrapiLike }) => ({
  async find(ctx: Ctx) {
    const { q, types, locale, page, pageSize } = ctx.request.query;

    try {
      ctx.body = await strapi
        .plugin(PLUGIN_ID)
        .service("search")
        .search({
          query: typeof q === "string" ? q : undefined,
          types: toArray(types),
          locale: typeof locale === "string" ? locale : undefined,
          page: page !== undefined ? Number(page) : undefined,
          pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
          userAbility: ctx.state.userAbility,
        });
    } catch (error) {
      strapi.log.error(
        `[${PLUGIN_ID}] search request failed: ${(error as Error).stack || (error as Error).message}`
      );
      ctx.throw(500, "Global search failed. Check the server logs for details.");
    }
  },
});
