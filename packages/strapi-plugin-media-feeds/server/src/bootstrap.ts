import type { Core } from '@strapi/strapi';
import {
  MEDIA_SERIES_UID,
  PLUGIN_ID,
  type MediaFeedsSettings,
} from '../../shared';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  const settingsService = strapi.plugin(PLUGIN_ID).service('settings') as {
    ensureDefaultSettings(): Promise<MediaFeedsSettings>;
  };

  const settings = await settingsService.ensureDefaultSettings();

  // Seed default series if configured and not yet present
  if (
    Array.isArray(settings.defaultSeries) &&
    settings.defaultSeries.length > 0 &&
    strapi.contentTypes?.[MEDIA_SERIES_UID]
  ) {
    try {
      const existing = await strapi.documents(MEDIA_SERIES_UID).findMany({
        locale: settings.defaultLocale,
        limit: 100,
      });
      const existingSlugs = new Set(
        existing.map((s) => (typeof s.slug === 'string' ? s.slug : ''))
      );

      for (const series of settings.defaultSeries) {
        if (!series.slug || !series.title || existingSlugs.has(series.slug)) {
          continue;
        }
        await strapi.documents(MEDIA_SERIES_UID).create({
          locale: settings.defaultLocale,
          status: 'published',
          data: {
            title: series.title,
            slug: series.slug,
            description: series.description ?? series.title,
            author: series.author ?? settings.podcastFeed.author,
            coverImageUrl: series.coverImageUrl ?? null,
            category: series.category ?? settings.podcastFeed.category,
            defaultType: series.defaultType ?? 'podcast',
            spokenLanguages:
              series.spokenLanguages ?? settings.supportedLocales,
            rssEnabled: series.rssEnabled !== false,
            youtubePlaylistId: series.youtubePlaylistId ?? null,
            spotifyShowUrl: series.spotifyShowUrl ?? null,
            applePodcastsUrl: series.applePodcastsUrl ?? null,
            active: series.active !== false,
          },
        });
      }
    } catch (err) {
      strapi.log.warn(
        `[${PLUGIN_ID}] Could not seed default series: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  // Register RBAC permissions
  const actionProvider = strapi.admin?.services?.permission?.actionProvider;
  if (actionProvider?.registerMany) {
    await actionProvider.registerMany([
      {
        section: 'plugins',
        displayName: 'Read media feeds & episodes',
        uid: 'read',
        pluginName: PLUGIN_ID,
      },
      {
        section: 'plugins',
        displayName: 'Sync external YouTube & podcast sources',
        uid: 'sync',
        pluginName: PLUGIN_ID,
      },
      {
        section: 'plugins',
        displayName: 'Configure media feeds settings',
        uid: 'settings.update',
        pluginName: PLUGIN_ID,
      },
    ]);
  }
};
