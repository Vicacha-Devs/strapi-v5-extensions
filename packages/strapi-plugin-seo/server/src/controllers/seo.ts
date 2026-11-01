import type { Core } from "@strapi/strapi";

interface SeoControllerContext {
  body?: unknown;
}

export const seoController = ({ strapi }: { strapi: Core.Strapi }) => ({
  findSeoComponent(ctx: SeoControllerContext) {
    ctx.body = strapi.plugin("seo").service("seo").getSeoComponent();
  },
  findContentTypes(ctx: SeoControllerContext) {
    ctx.body = strapi.plugin("seo").service("seo").getContentTypes();
  },
  async createSeoComponent(ctx: SeoControllerContext) {
    if (strapi.reload) {
      strapi.reload.isWatching = false;
    }

    try {
      const data = await strapi
        .plugin("seo")
        .service("seo")
        .createSeoComponent();
      if (data && typeof strapi.reload === "function") {
        setImmediate(() => strapi.reload!());
      }
      ctx.body = data;
    } catch (error) {
      strapi.log?.error?.(String(error));
    }
  },
});
