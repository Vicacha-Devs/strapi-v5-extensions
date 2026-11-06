import type { Core } from "@strapi/strapi";

import type { SeoSettingsMap } from "../../../shared";

export interface SettingsControllerContext {
  body?: unknown;
  request: {
    body?: unknown;
  };
  badRequest?(message: string): unknown;
  throw(status: number, error: unknown): never;
}

interface SettingsService {
  getSettings(): Promise<SeoSettingsMap>;
  setSettings(settings: SeoSettingsMap): Promise<SeoSettingsMap>;
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const settingsController = ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsService = () =>
    strapi.plugin("seo").service<SettingsService>("settings");

  const getSettings = async (
    ctx: SettingsControllerContext
  ): Promise<SeoSettingsMap | undefined> => {
    try {
      const result = await getSettingsService().getSettings();
      ctx.body = result;
      return result;
    } catch (err) {
      ctx.throw(500, err);
    }
  };

  const setSettings = async (
    ctx: SettingsControllerContext
  ): Promise<unknown> => {
    const { body } = ctx.request ?? {};
    if (!isPlainRecord(body)) {
      if (typeof ctx.badRequest === "function") {
        return ctx.badRequest("Invalid SEO settings payload");
      }
      return ctx.throw(400, "Invalid SEO settings payload");
    }

    try {
      const settingsService = getSettingsService();
      await settingsService.setSettings(body as SeoSettingsMap);
      const updated = await settingsService.getSettings();
      ctx.body = updated;
      return updated;
    } catch (err) {
      ctx.throw(500, err);
    }
  };

  return {
    getSettings,
    setSettings,
  };
};
