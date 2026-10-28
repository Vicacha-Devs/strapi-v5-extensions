import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../pluginId';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  getSitemap: async (ctx: any) => {
    const sitemap = await strapi.plugin(PLUGIN_ID).service('service').getSitemap();
    ctx.set('Content-Type', 'application/xml');
    ctx.body = sitemap;
  },
  getSitemapBySlug: async (ctx: any) => {
    const slug = ctx.params.slug;
    const sitemap = await strapi.plugin(PLUGIN_ID).service('service').getSitemap(slug);
    ctx.set('Content-Type', 'application/xml');
    ctx.body = sitemap;
  },
  adminGETContentTypes: async (ctx: any) => {
    ctx.body = await strapi.plugin(PLUGIN_ID).service('service').getContentTypes();
  },
  adminGETLocales: async (ctx: any) => {
    ctx.body = await strapi.plugin(PLUGIN_ID).service('service').getLocales();
  },
  adminAllowedFields: async (ctx: any) => {
    ctx.body = await strapi
      .plugin(PLUGIN_ID)
      .service('service')
      .getAllowedFields(ctx.query.singularName ?? ctx.query.type);
  },
  adminGetSettings: async (ctx: any) => {
    ctx.body = await strapi.plugin(PLUGIN_ID).service('settings').getSettings();
  },
  adminPutSettings: async (ctx: any) => {
    const body = ctx.request.body;
    const requestData = body?.data !== undefined ? body.data : body;
    ctx.body = await strapi.plugin(PLUGIN_ID).service('settings').updateSettings(requestData);
  },
});

export default {
  controller,
};
