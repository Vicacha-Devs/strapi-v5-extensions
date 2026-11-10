import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../pluginId";
import type { SitemapSettingsUpdateInput } from "../services/types";

export interface SitemapControllerContext {
  params: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  request: {
    body?: Record<string, unknown>;
  };
  body?: unknown;
  set: (header: string, value: string) => void;
}

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  getSitemap: async (ctx: SitemapControllerContext) => {
    const sitemap = await strapi
      .plugin(PLUGIN_ID)
      .service("service")
      .getSitemap();
    ctx.set("Content-Type", "application/xml");
    ctx.body = sitemap;
  },
  getSitemapBySlug: async (ctx: SitemapControllerContext) => {
    const slug = ctx.params.slug;
    const sitemap = await strapi
      .plugin(PLUGIN_ID)
      .service("service")
      .getSitemap(slug);
    ctx.set("Content-Type", "application/xml");
    ctx.body = sitemap;
  },
  getSettings: async (ctx: SitemapControllerContext) => {
    ctx.body = await strapi.plugin(PLUGIN_ID).service("settings").getSettings();
  },
  updateSettings: async (ctx: SitemapControllerContext) => {
    const body = ctx.request.body;
    const rawData = body?.data !== undefined ? body.data : body;
    const requestData = (rawData ?? {}) as SitemapSettingsUpdateInput;
    ctx.body = await strapi
      .plugin(PLUGIN_ID)
      .service("settings")
      .updateSettings(requestData);
  },
  getContentTypes: async (ctx: SitemapControllerContext) => {
    ctx.body = await strapi
      .plugin(PLUGIN_ID)
      .service("service")
      .getContentTypes();
  },
  getLocales: async (ctx: SitemapControllerContext) => {
    ctx.body = await strapi.plugin(PLUGIN_ID).service("service").getLocales();
  },
  getAllowedFields: async (ctx: SitemapControllerContext) => {
    const typeName = ctx.query.singularName ?? ctx.query.type ?? "";
    const populateLinkedModels = ctx.query.populateLinkedModels === "true";
    ctx.body = await strapi
      .plugin(PLUGIN_ID)
      .service("service")
      .getAllowedFields(typeName, populateLinkedModels);
  },
});

export default {
  controller,
};
