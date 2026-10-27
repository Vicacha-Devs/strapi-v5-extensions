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
  adminGET: async (ctx: any) => {
    ctx.body = await strapi.plugin(PLUGIN_ID).service('service').getAdminData();
  },
  adminPOST: async (ctx: any) => {
    const requestData = ctx.request.body;
    ctx.body = await strapi.plugin(PLUGIN_ID).service('service').saveAdminData(requestData);
  },
  adminPUT: async (ctx: any) => {
    const requestData = ctx.request.body;
    ctx.body = await strapi.plugin(PLUGIN_ID).service('service').updateAdminData(requestData);
  },
  adminDELETE: async (ctx: any) => {
    ctx.body = await strapi.plugin(PLUGIN_ID).service('service').deleteAdminData(ctx.query.id);
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
      .getAllowedFields(ctx.query.type);
  },
  adminPutOptions: async (ctx: any) => {
    const body = ctx.request.body;
    const requestData = body?.data !== undefined ? body.data : body;
    ctx.body = await strapi.plugin(PLUGIN_ID).service('service').updateOptions(requestData);
  },
  adminGetOptions: async (ctx: any) => {
    ctx.body = await strapi.plugin(PLUGIN_ID).service('service').getOptions();
  },
  adminGetSettings: async (ctx: any) => {
    ctx.body = await strapi.plugin(PLUGIN_ID).service('settings').getSettings();
  },
  adminPutSettings: async (ctx: any) => {
    const body = ctx.request.body;
    const requestData = body?.data !== undefined ? body.data : body;
    ctx.body = await strapi.plugin(PLUGIN_ID).service('settings').updateSettings(requestData);
  },
  adminGetCustomURLs: async (ctx: any) => {
    ctx.body = await strapi.plugin(PLUGIN_ID).service('service').getCustomURLs();
  },
  adminPostCustomURLs: async (ctx: any) => {
    const requestData = ctx.request.body;
    ctx.body = await strapi.plugin(PLUGIN_ID).service('service').postCustomURLs(requestData);
  },
  adminPutCustomURLs: async (ctx: any) => {
    const requestData = ctx.request.body;
    ctx.body = await strapi.plugin(PLUGIN_ID).service('service').putCustomURLs(requestData);
  },
  adminDeleteCustomURLs: async (ctx: any) => {
    ctx.body = await strapi
      .plugin(PLUGIN_ID)
      .service('service')
      .deleteCustomURLs(ctx.query.id);
  },
});

export default {
  controller,
};
