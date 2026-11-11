import type { Core } from "@strapi/strapi";

export interface SeoControllerContext {
  body?: unknown;
  status?: number;
  throw?(status: number, error: unknown): never;
}

export const seoController = ({ strapi }: { strapi: Core.Strapi }) => ({
  findSeoComponent(ctx: SeoControllerContext) {
    ctx.body = strapi.plugin("seo").service("seo").getSeoComponent();
    return ctx.body;
  },
  findContentTypes(ctx: SeoControllerContext) {
    ctx.body = strapi.plugin("seo").service("seo").getContentTypes();
    return ctx.body;
  },
  async createSeoComponent(ctx: SeoControllerContext) {
    const previousWatching = strapi.reload?.isWatching;
    if (strapi.reload) {
      strapi.reload.isWatching = false;
    }

    try {
      const data = await strapi
        .plugin("seo")
        .service("seo")
        .createSeoComponent();
      if (!data) {
        if (strapi.reload && previousWatching !== undefined) {
          strapi.reload.isWatching = previousWatching;
        }
        ctx.status = 500;
        ctx.body = { error: "Failed to create SEO component" };
        return ctx.body;
      }
      if (typeof strapi.reload === "function") {
        setImmediate(() => strapi.reload!());
      }
      ctx.body = data;
      return data;
    } catch (error) {
      if (strapi.reload && previousWatching !== undefined) {
        strapi.reload.isWatching = previousWatching;
      }
      strapi.log?.error?.(String(error));
      if (typeof ctx.throw === "function") {
        ctx.throw(500, error);
      }
      ctx.status = 500;
      ctx.body = { error: "Failed to create SEO component" };
      return ctx.body;
    }
  },
});
