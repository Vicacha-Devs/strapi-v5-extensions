import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../pluginId';

export interface SitemapControllerContext {
  params: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  request: { body?: Record<string, unknown> };
  body?: unknown;
  set: (header: string, value: string) => void;
}

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  getSitemap: async (ctx: SitemapControllerContext) => {
    const sitemap = await strapi.plugin(PLUGIN_ID).service('service').getSitemap();
    ctx.set('Content-Type', 'application/xml');
    ctx.body = sitemap;
  },
  getSitemapBySlug: async (ctx: SitemapControllerContext) => {
    const slug = ctx.params.slug;
    const sitemap = await strapi.plugin(PLUGIN_ID).service('service').getSitemap(slug);
    ctx.set('Content-Type', 'application/xml');
    ctx.body = sitemap;
  },
  adminGETContentTypes: async (ctx: SitemapControllerContext) => {
    ctx.body = await strapi.plugin(PLUGIN_ID).service('service').getContentTypes();
  },
  adminGETLocales: async (ctx: SitemapControllerContext) => {
    ctx.body = await strapi.plugin(PLUGIN_ID).service('service').getLocales();
  },
  adminAllowedFields: async (ctx: SitemapControllerContext) => {
    ctx.body = await strapi
      .plugin(PLUGIN_ID)
      .service('service')
      .getAllowedFields(ctx.query.singularName ?? ctx.query.type ?? '');
  },
  adminGetSettings: async (ctx: SitemapControllerContext) => {
    ctx.body = await strapi.plugin(PLUGIN_ID).service('settings').getSettings();
  },
  adminPutSettings: async (ctx: SitemapControllerContext) => {
    const body = ctx.request.body;
    const requestData = body?.data !== undefined ? body.data : body;
    ctx.body = await strapi.plugin(PLUGIN_ID).service('settings').updateSettings(requestData);
  },
});

export default {
  controller,
};
