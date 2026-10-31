import type { Core } from '@strapi/strapi';
import {
  DEFAULT_MEDIA_FEEDS_SETTINGS,
  PLUGIN_ID,
  SETTINGS_STORE_KEY,
  type MediaFeedsSettings,
} from '../../../shared';

function getPluginConfig(strapi: Core.Strapi): Partial<MediaFeedsSettings> {
  return (
    strapi.config.get<Partial<MediaFeedsSettings>>(`plugin::${PLUGIN_ID}`) ?? {}
  );
}

function pickNonEmptyArray<T>(
  primary?: T[],
  secondary?: T[],
  fallback: T[] = []
): T[] {
  if (primary && primary.length > 0) return primary;
  if (secondary && secondary.length > 0) return secondary;
  return fallback;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  getStore() {
    return strapi.store({
      type: 'plugin',
      name: PLUGIN_ID,
    });
  },

  mergeSettings(
    fileConfig: Partial<MediaFeedsSettings>,
    stored: Partial<MediaFeedsSettings> | null
  ): MediaFeedsSettings {
    const safeStored = stored ?? {};
    return {
      ...DEFAULT_MEDIA_FEEDS_SETTINGS,
      ...fileConfig,
      ...safeStored,
      podcastFeed: {
        ...DEFAULT_MEDIA_FEEDS_SETTINGS.podcastFeed,
        ...(fileConfig.podcastFeed ?? {}),
        ...(safeStored.podcastFeed ?? {}),
      },
      liveStream: {
        ...DEFAULT_MEDIA_FEEDS_SETTINGS.liveStream,
        ...(fileConfig.liveStream ?? {}),
        ...(safeStored.liveStream ?? {}),
      },
      liveStreams: pickNonEmptyArray(
        safeStored.liveStreams,
        fileConfig.liveStreams,
        DEFAULT_MEDIA_FEEDS_SETTINGS.liveStreams ?? []
      ),
      supportedLocales: pickNonEmptyArray(
        safeStored.supportedLocales,
        fileConfig.supportedLocales,
        DEFAULT_MEDIA_FEEDS_SETTINGS.supportedLocales
      ),
      youtubeSyncSources: pickNonEmptyArray(
        safeStored.youtubeSyncSources,
        fileConfig.youtubeSyncSources,
        []
      ),
      secondaryCalendars: pickNonEmptyArray(
        safeStored.secondaryCalendars,
        fileConfig.secondaryCalendars,
        []
      ),
      sources: pickNonEmptyArray(safeStored.sources, fileConfig.sources, []),
    };
  },

  async getSettings(): Promise<MediaFeedsSettings> {
    const store = this.getStore();
    const stored = (await store.get({
      key: SETTINGS_STORE_KEY,
    })) as Partial<MediaFeedsSettings> | null;
    const fileConfig = getPluginConfig(strapi);
    return this.mergeSettings(fileConfig, stored);
  },

  async updateSettings(
    partial: Partial<MediaFeedsSettings>
  ): Promise<MediaFeedsSettings> {
    const current = await this.getSettings();
    const updated = this.mergeSettings(current, partial);
    await this.getStore().set({
      key: SETTINGS_STORE_KEY,
      value: updated,
    });
    return updated;
  },

  async ensureDefaultSettings(): Promise<MediaFeedsSettings> {
    const store = this.getStore();
    const existing = (await store.get({
      key: SETTINGS_STORE_KEY,
    })) as Partial<MediaFeedsSettings> | null;
    const fileConfig = getPluginConfig(strapi);
    const merged = this.mergeSettings(fileConfig, existing);
    await store.set({
      key: SETTINGS_STORE_KEY,
      value: merged,
    });
    return merged;
  },
});
