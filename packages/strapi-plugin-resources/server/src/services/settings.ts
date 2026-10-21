import type { Core } from '@strapi/strapi';
import {
  DEFAULT_RESOURCES_SETTINGS,
  PLUGIN_ID,
  SECONDARY_CALENDAR_IDS,
  type ResourcesPluginSettings,
} from '../../../shared';

function getDefaultSettings(strapi: Core.Strapi): ResourcesPluginSettings {
  const cfg = (strapi.config?.get(`plugin::${PLUGIN_ID}`) ?? {}) as Partial<ResourcesPluginSettings>;
  return {
    ...DEFAULT_RESOURCES_SETTINGS,
    ...cfg,
    supportedLocales:
      Array.isArray(cfg.supportedLocales) && cfg.supportedLocales.length > 0
        ? cfg.supportedLocales
        : [...DEFAULT_RESOURCES_SETTINGS.supportedLocales],
    allowedDownloadExtensions:
      Array.isArray(cfg.allowedDownloadExtensions) &&
      cfg.allowedDownloadExtensions.length > 0
        ? cfg.allowedDownloadExtensions
        : [...DEFAULT_RESOURCES_SETTINGS.allowedDownloadExtensions],
    allowedDownloadMimeTypes:
      Array.isArray(cfg.allowedDownloadMimeTypes) &&
      cfg.allowedDownloadMimeTypes.length > 0
        ? cfg.allowedDownloadMimeTypes
        : [...DEFAULT_RESOURCES_SETTINGS.allowedDownloadMimeTypes],
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getStore = () =>
    strapi.store({
      type: 'plugin',
      name: PLUGIN_ID,
    });

  return {
    async getSettings(): Promise<ResourcesPluginSettings> {
      const defaults = getDefaultSettings(strapi);
      try {
        const stored = (await getStore().get({
          key: 'settings',
        })) as Partial<ResourcesPluginSettings> | null;
        if (!stored || typeof stored !== 'object') {
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
        typeof input.secondaryCalendar === 'string' &&
        allowedCalendars.includes(input.secondaryCalendar)
          ? input.secondaryCalendar
          : current.secondaryCalendar;

      const maxPhotosNum = Number(input.maxPhotosPerAlbum);

      const next: ResourcesPluginSettings = {
        ...current,
        organizationName:
          typeof input.organizationName === 'string' &&
          input.organizationName.trim()
            ? input.organizationName.trim().slice(0, 140)
            : current.organizationName,
        defaultLocale:
          typeof input.defaultLocale === 'string' && input.defaultLocale.trim()
            ? input.defaultLocale.trim()
            : current.defaultLocale,
        supportedLocales:
          Array.isArray(input.supportedLocales) &&
          input.supportedLocales.length > 0
            ? input.supportedLocales.filter((x) => typeof x === 'string')
            : current.supportedLocales,
        secondaryCalendar,
        enableCloudinaryOptimization:
          typeof input.enableCloudinaryOptimization === 'boolean'
            ? input.enableCloudinaryOptimization
            : current.enableCloudinaryOptimization,
        autoSyncMediaFolders:
          typeof input.autoSyncMediaFolders === 'boolean'
            ? input.autoSyncMediaFolders
            : current.autoSyncMediaFolders,
        defaultPublicationsFolderPath:
          typeof input.defaultPublicationsFolderPath === 'string' &&
          input.defaultPublicationsFolderPath.trim()
            ? input.defaultPublicationsFolderPath.trim().slice(0, 140)
            : current.defaultPublicationsFolderPath,
        defaultGalleriesFolderPath:
          typeof input.defaultGalleriesFolderPath === 'string' &&
          input.defaultGalleriesFolderPath.trim()
            ? input.defaultGalleriesFolderPath.trim().slice(0, 140)
            : current.defaultGalleriesFolderPath,
        allowedDownloadExtensions:
          Array.isArray(input.allowedDownloadExtensions) &&
          input.allowedDownloadExtensions.length > 0
            ? input.allowedDownloadExtensions.filter((x) => typeof x === 'string')
            : current.allowedDownloadExtensions,
        allowedDownloadMimeTypes:
          Array.isArray(input.allowedDownloadMimeTypes) &&
          input.allowedDownloadMimeTypes.length > 0
            ? input.allowedDownloadMimeTypes.filter((x) => typeof x === 'string')
            : current.allowedDownloadMimeTypes,
        maxPhotosPerAlbum:
          Number.isFinite(maxPhotosNum) && maxPhotosNum >= 1 && maxPhotosNum <= 500
            ? Math.round(maxPhotosNum)
            : current.maxPhotosPerAlbum,
      };

      await getStore().set({
        key: 'settings',
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
