import type { Core } from "@strapi/strapi";

export interface SeoControllerContext {
  body?: unknown;
  status?: number;
  request?: {
    body?: {
      uid?: string;
      doc?: Record<string, unknown>;
      locale?: string | null;
    };
  };
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
  async generateSeo(ctx: SeoControllerContext) {
    const body = ctx.request?.body ?? {};
    const uid = typeof body.uid === "string" ? body.uid : "";
    const doc =
      body.doc && typeof body.doc === "object" && !Array.isArray(body.doc)
        ? body.doc
        : {};
    const locale = typeof body.locale === "string" ? body.locale : null;
    const seoSvc = strapi.plugin("seo").service("seo") as {
      generateSeoMetadata: (args: {
        uid: string;
        doc: Record<string, unknown>;
        locale: string | null;
      }) => Promise<unknown>;
    };
    ctx.body = await seoSvc.generateSeoMetadata({ uid, doc, locale });
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
