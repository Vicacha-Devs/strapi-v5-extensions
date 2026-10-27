import type { Core } from '@strapi/strapi';
import type { SeoSettingsMap } from '../../../shared';

export const settingsController = ({ strapi }: { strapi: Core.Strapi }) => {
  const settingsService = strapi.plugin('seo').service('settings');

  const getSettings = async (ctx: Record<string, any>): Promise<SeoSettingsMap | undefined> => {
    try {
      return await settingsService.getSettings();
    } catch (err) {
      ctx.throw(500, err);
    }
  };

  const setSettings = async (ctx: Record<string, any>): Promise<SeoSettingsMap | undefined> => {
    const { body } = ctx.request;
    try {
      await settingsService.setSettings(body as SeoSettingsMap);
      return await settingsService.getSettings();
    } catch (err) {
      ctx.throw(500, err);
    }
  };

  return {
    getSettings,
    setSettings,
  };
};
