import type { MediaFeedsSettings } from './types';

export const PLUGIN_ID = 'media-feeds';

export const MEDIA_ITEM_UID = 'plugin::media-feeds.media-item';
export const MEDIA_SERIES_UID = 'plugin::media-feeds.media-series';

export const SETTINGS_STORE_KEY = 'settings';

export const DEFAULT_MEDIA_FEEDS_SETTINGS: MediaFeedsSettings = {
  defaultTimezone: 'UTC',
  defaultLocale: 'en',
  supportedLocales: ['en', 'es', 'ar', 'tr'],
  fallbackToDefaultLocale: true,
  podcastFeed: {
    title: 'Community Media & Podcast Feed',
    description: 'Official lectures, podcasts, and community broadcasts.',
    author: 'Media Hub',
    siteUrl: 'http://localhost:4321',
    category: 'Education',
    explicit: false,
  },
  liveStream: {
    enabled: true,
    title: 'Weekly Live Broadcast',
    description: 'Watch our scheduled community broadcast live.',
    scheduleLabel: 'Every Friday at 12:15 PM',
    provider: 'youtube',
    watchUrl: 'https://www.youtube.com',
    embedUrl: null,
    thumbnailUrl: null,
    spokenLanguages: ['ar', 'es'],
    recurringSlots: [
      {
        dayOfWeek: 5,
        startTime: '12:15',
        endTime: '13:15',
        label: 'Weekly Live Broadcast',
      },
    ],
  },
  youtubeSyncSources: [],
  secondaryCalendars: [],
  defaultSeries: [],
  schemaExtensions: {},
  sources: [],
};
