import type { MediaFeedsSettings } from "./types";

export const PLUGIN_ID = "media-feeds";

export const MEDIA_ITEM_UID = "plugin::media-feeds.media-item";
export const MEDIA_SERIES_UID = "plugin::media-feeds.media-series";

export const SETTINGS_STORE_KEY = "settings";

export const MASKED_SECRET_VALUE = "••••••••";
export const MASKED_SECRET_REGEX = /^[•*]+$/;

export const ALLOWED_SOURCE_API_UID_REGEX = /^api::[a-z0-9-]+\.[a-z0-9-]+$/;

export function isAllowedMediaSourceUid(uid: unknown): uid is string {
  return (
    typeof uid === "string" &&
    (uid === MEDIA_ITEM_UID || ALLOWED_SOURCE_API_UID_REGEX.test(uid))
  );
}

export const DEFAULT_MEDIA_FEEDS_SETTINGS: MediaFeedsSettings = {
  defaultTimezone: "UTC",
  defaultLocale: "en",
  supportedLocales: ["en", "es", "ar", "tr"],
  fallbackToDefaultLocale: true,
  podcastFeed: {
    title: "Community Media & Podcast Feed",
    description: "Official lectures, podcasts, and community broadcasts.",
    author: "Media Hub",
    siteUrl: "http://localhost:4321",
    category: "Education",
    explicit: false,
  },
  liveStream: {
    enabled: true,
    title: "Weekly Live Broadcast",
    description: "Watch our scheduled community broadcast live.",
    scheduleLabel: "Every Friday at 12:15 PM",
    provider: "youtube",
    watchUrl: "https://www.youtube.com",
    embedUrl: null,
    thumbnailUrl: null,
    spokenLanguages: ["ar", "es"],
    recurringSlots: [
      {
        dayOfWeek: 5,
        startTime: "12:15",
        endTime: "13:15",
        label: "Weekly Live Broadcast",
      },
    ],
  },
  liveStreams: [
    {
      id: "jumuah-live",
      enabled: true,
      title: "Transmisión en Vivo de la Khutbah del Viernes (Jumu'ah)",
      scheduleLabel: "Every Friday at 12:15 PM",
      eventSlug: "jumuah-khutbah",
      provider: "youtube",
      watchUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
    },
    {
      id: "ramadan-tarawih-live",
      enabled: true,
      title: "Ramadan Tarawih & Nightly Tafsir — Live Stream",
      scheduleLabel: "Ramadan Nights at 7:30 PM",
      eventSlug: "ramadan-tarawih",
      provider: "youtube",
      watchUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    },
    {
      id: "community-conference-live",
      enabled: false,
      title: "Special Community Conference & Guest Lectures",
      scheduleLabel: "Scheduled Special Events",
      eventSlug: "annual-conference",
      provider: "youtube",
      watchUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    },
  ],
  youtubeSyncSources: [],
  secondaryCalendars: [],
  defaultSeries: [],
  schemaExtensions: {},
  sources: [],
};
