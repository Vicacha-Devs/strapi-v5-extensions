import type { PluginSettings, StrapiLike } from "../types";
import { PLUGIN_ID } from "../utils/constants";

type Ctx = {
  request: { query: Record<string, unknown>; body?: Partial<PluginSettings> };
  state: { userAbility?: { can: (action: string, subject: string) => boolean } | null };
  body?: unknown;
  throw: (code: number, msg: string) => void;
};

export default ({ strapi }: { strapi: StrapiLike }) => ({
  async find(ctx: Ctx) {
    ctx.body = await strapi.plugin(PLUGIN_ID).service("settings").get();
  },

  async update(ctx: Ctx) {
    try {
      ctx.body = await strapi
        .plugin(PLUGIN_ID)
        .service("settings")
        .set(ctx.request.body || {});
    } catch (error) {
      ctx.throw(400, (error as Error).message);
    }
  },

  async reset(ctx: Ctx) {
    ctx.body = await strapi.plugin(PLUGIN_ID).service("settings").reset();
  },
});
