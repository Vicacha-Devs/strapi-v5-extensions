import type { Core } from '@strapi/strapi';

export const seoController = ({ strapi }: { strapi: Core.Strapi }) => ({
  findSeoComponent(ctx: Record<string, any>) {
    ctx.body = strapi.plugin('seo').service('seo').getSeoComponent();
  },
  findContentTypes(ctx: Record<string, any>) {
    ctx.body = strapi.plugin('seo').service('seo').getContentTypes();
  },
  async createSeoComponent(ctx: Record<string, any>) {
    if (strapi.reload) {
      strapi.reload.isWatching = false;
    }

    try {
      const data = await strapi.plugin('seo').service('seo').createSeoComponent();
      if (data && typeof strapi.reload === 'function') {
        setImmediate(() => strapi.reload!());
      }
      ctx.body = data;
    } catch (error) {
      strapi.log?.error?.(String(error));
    }
  },
});
