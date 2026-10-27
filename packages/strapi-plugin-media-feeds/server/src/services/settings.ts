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
    const merged: MediaFeedsSettings = {
      ...DEFAULT_MEDIA_FEEDS_SETTINGS,
      ...fileConfig,
      ...(stored ?? {}),
      podcastFeed: {
        ...DEFAULT_MEDIA_FEEDS_SETTINGS.podcastFeed,
        ...(fileConfig.podcastFeed ?? {}),
        ...(stored?.podcastFeed ?? {}),
      },
      liveStream: {
        ...DEFAULT_MEDIA_FEEDS_SETTINGS.liveStream,
        ...(fileConfig.liveStream ?? {}),
        ...(stored?.liveStream ?? {}),
      },
      liveStreams:
        stored?.liveStreams?.length
          ? stored.liveStreams
          : fileConfig.liveStreams?.length
            ? fileConfig.liveStreams
            : DEFAULT_MEDIA_FEEDS_SETTINGS.liveStreams ?? [],
      supportedLocales:
        stored?.supportedLocales?.length
          ? stored.supportedLocales
          : fileConfig.supportedLocales?.length
            ? fileConfig.supportedLocales
            : DEFAULT_MEDIA_FEEDS_SETTINGS.supportedLocales,
      youtubeSyncSources:
        stored?.youtubeSyncSources?.length
          ? stored.youtubeSyncSources
          : fileConfig.youtubeSyncSources ?? [],
      secondaryCalendars:
        stored?.secondaryCalendars?.length
          ? stored.secondaryCalendars
          : fileConfig.secondaryCalendars ?? [],
      sources:
        stored?.sources?.length
          ? stored.sources
          : fileConfig.sources ?? [],
    };
    return merged;
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
