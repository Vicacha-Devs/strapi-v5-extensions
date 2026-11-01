import type { Core } from "@strapi/strapi";

import type { SeoSettingsMap } from "../../../shared";

export interface SettingsControllerContext {
  request: {
    body?: unknown;
  };
  throw(status: number, error: unknown): never;
}

interface SettingsService {
  getSettings(): Promise<SeoSettingsMap>;
  setSettings(settings: SeoSettingsMap): Promise<void>;
}

export const settingsController = ({ strapi }: { strapi: Core.Strapi }) => {
  const settingsService = strapi
    .plugin("seo")
    .service<SettingsService>("settings");

  const getSettings = async (
    ctx: SettingsControllerContext
  ): Promise<SeoSettingsMap | undefined> => {
    try {
      return await settingsService.getSettings();
    } catch (err) {
      ctx.throw(500, err);
    }
  };

  const setSettings = async (
    ctx: SettingsControllerContext
  ): Promise<SeoSettingsMap | undefined> => {
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
