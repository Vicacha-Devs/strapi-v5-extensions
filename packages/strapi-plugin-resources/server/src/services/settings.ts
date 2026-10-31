import type { Core } from "@strapi/strapi";

import {
  DEFAULT_RESOURCES_SETTINGS,
  PLUGIN_ID,
  SECONDARY_CALENDAR_IDS,
  type ResourcesPluginSettings,
} from "../../../shared";

function getDefaultSettings(strapi: Core.Strapi): ResourcesPluginSettings {
  const cfg = (strapi.config?.get(`plugin::${PLUGIN_ID}`) ??
    {}) as Partial<ResourcesPluginSettings>;
  return {
    ...DEFAULT_RESOURCES_SETTINGS,
    ...cfg,
    supportedLocales:
      Array.isArray(cfg.supportedLocales) && cfg.supportedLocales.length > 0
        ? cfg.supportedLocales
        : [...DEFAULT_RESOURCES_SETTINGS.supportedLocales],
    allowedDownloadExtensions:
      Array.isArray(cfg.allowedDownloadExtensions) && cfg.allowedDownloadExtensions.length > 0
        ? cfg.allowedDownloadExtensions
        : [...DEFAULT_RESOURCES_SETTINGS.allowedDownloadExtensions],
    allowedDownloadMimeTypes:
      Array.isArray(cfg.allowedDownloadMimeTypes) && cfg.allowedDownloadMimeTypes.length > 0
        ? cfg.allowedDownloadMimeTypes
        : [...DEFAULT_RESOURCES_SETTINGS.allowedDownloadMimeTypes],
  };
}

function pickTrimmedString(val: unknown, fallback: string, maxLen?: number): string {
  if (typeof val !== "string" || !val.trim()) return fallback;
  const trimmed = val.trim();
  return maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

function pickStringList(val: unknown, fallback: string[]): string[] {
  if (!Array.isArray(val) || val.length === 0) return fallback;
  return val.filter((x): x is string => typeof x === "string");
}

function pickBoolean(val: unknown, fallback: boolean): boolean {
  return typeof val === "boolean" ? val : fallback;
}

function pickBoundedInt(val: unknown, min: number, max: number, fallback: number): number {
  const num = Number(val);
  return Number.isFinite(num) && num >= min && num <= max ? Math.round(num) : fallback;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getStore = () =>
    strapi.store({
      type: "plugin",
      name: PLUGIN_ID,
    });

  return {
    async getSettings(): Promise<ResourcesPluginSettings> {
      const defaults = getDefaultSettings(strapi);
      try {
        const stored = (await getStore().get({
          key: "settings",
        })) as Partial<ResourcesPluginSettings> | null;
        if (!stored || typeof stored !== "object") {
          return defaults;
        }
        return {
          ...defaults,
          ...stored,
        };
      } catch {
        return defaults;
      }
    },

    async updateSettings(
      input: Partial<ResourcesPluginSettings>
    ): Promise<ResourcesPluginSettings> {
      const current = await this.getSettings();
      const allowedCalendars: readonly string[] = SECONDARY_CALENDAR_IDS;
      const secondaryCalendar =
        typeof input.secondaryCalendar === "string" &&
        allowedCalendars.includes(input.secondaryCalendar)
          ? input.secondaryCalendar
          : current.secondaryCalendar;

      const next: ResourcesPluginSettings = {
        ...current,
        organizationName: pickTrimmedString(input.organizationName, current.organizationName, 140),
        defaultLocale: pickTrimmedString(input.defaultLocale, current.defaultLocale),
        supportedLocales: pickStringList(input.supportedLocales, current.supportedLocales),
        secondaryCalendar,
        enableCloudinaryOptimization: pickBoolean(
          input.enableCloudinaryOptimization,
          current.enableCloudinaryOptimization
        ),
        autoSyncMediaFolders: pickBoolean(input.autoSyncMediaFolders, current.autoSyncMediaFolders),
        defaultPublicationsFolderPath: pickTrimmedString(
          input.defaultPublicationsFolderPath,
          current.defaultPublicationsFolderPath,
          140
        ),
        defaultGalleriesFolderPath: pickTrimmedString(
          input.defaultGalleriesFolderPath,
          current.defaultGalleriesFolderPath,
          140
        ),
        allowedDownloadExtensions: pickStringList(
          input.allowedDownloadExtensions,
          current.allowedDownloadExtensions
        ),
        allowedDownloadMimeTypes: pickStringList(
          input.allowedDownloadMimeTypes,
          current.allowedDownloadMimeTypes
        ),
        maxPhotosPerAlbum: pickBoundedInt(
          input.maxPhotosPerAlbum,
          1,
          500,
          current.maxPhotosPerAlbum
        ),
      };

      await getStore().set({
        key: "settings",
        value: next,
      });
      return next;
    },

    async getPublicSummary() {
      const settings = await this.getSettings();
      return {
        organizationName: settings.organizationName,
        defaultLocale: settings.defaultLocale,
        supportedLocales: settings.supportedLocales,
        secondaryCalendar: settings.secondaryCalendar,
        enableCloudinaryOptimization: settings.enableCloudinaryOptimization,
        autoSyncMediaFolders: settings.autoSyncMediaFolders,
      };
    },
  };
};
