import type {
  AlternateDateValue,
  CalendarSystemConfig,
} from './calendarSystems';

export type MediaFeedType =
  | 'video'
  | 'podcast'
  | 'audio'
  | 'lecture'
  | 'short'
  | 'live'
  | (string & {});

export type MediaProviderType =
  | 'youtube'
  | 'spotify'
  | 'apple_podcasts'
  | 'vimeo'
  | 'soundcloud'
  | 'direct'
  | 'upload';

export interface MediaLanguageTrack {
  /** ISO-639-1 or BCP-47 locale code, e.g. 'es', 'en', 'ar', 'tr', 'fr', 'ur' */
  locale: string;
  /** Human-readable language label, e.g. 'Español', 'العربية', 'Türkçe' */
  label?: string;
  /** Optional language-specific audio stream or MP3 URL */
  audioUrl?: string | null;
  /** Optional language-specific video or dubbed URL */
  videoUrl?: string | null;
  /** Optional WebVTT / SRT captions URL */
  captionsUrl?: string | null;
  /** Optional PDF or text transcript URL */
  transcriptUrl?: string | null;
  /** Optional inline transcript text */
  transcriptText?: string | null;
  /** Optional localized title override when stored inside a single multi-track record */
  translatedTitle?: string | null;
  /** Optional localized description override */
  translatedDescription?: string | null;
}

export interface MediaChapterMarker {
  startSeconds: number;
  timecode?: string;
  label: string;
}

export interface ParsedMediaProviderInfo {
  provider: MediaProviderType;
  externalId: string | null;
  canonicalUrl: string;
  embedUrl: string | null;
  thumbnailUrl: string | null;
}

export interface MediaSeriesItem {
  id: string | number;
  documentId: string;
  title: string;
  slug: string;
  description: string;
  author?: string | null;
  coverImageUrl?: string | null;
  category?: string | null;
  defaultType: MediaFeedType;
  spokenLanguages: string[];
  rssEnabled: boolean;
  youtubePlaylistId?: string | null;
  spotifyShowUrl?: string | null;
  applePodcastsUrl?: string | null;
  active: boolean;
}

export interface MediaFeedItem {
  id: string | number;
  documentId: string;
  sourceId: string;
  sourceUid: string;
  locale: string;
  title: string;
  slug: string;
  description: string;
  type: MediaFeedType;
  typeLabel?: string | null;
  provider: MediaProviderType;
  externalId?: string | null;
  sourceUrl: string;
  embedUrl?: string | null;
  audioUrl?: string | null;
  audioMimeType?: string;
  audioByteLength?: number;
  transcriptUrl?: string | null;
  thumbnailUrl?: string | null;
  thumbnailAlt?: string | null;
  speaker?: string | null;
  seriesSlug?: string | null;
  duration?: string | null;
  durationSeconds?: number | null;
  publishedAt: string;
  publishedAtLabel?: string | null;
  spokenLanguages: string[];
  languageTracks: MediaLanguageTrack[];
  activeLanguageTrack?: MediaLanguageTrack | null;
  chapters: MediaChapterMarker[];
  featured: boolean;
  isLive: boolean;
  secondaryDates?: Record<string, AlternateDateValue>;
  customData?: Record<string, unknown>;
}

export interface LiveBroadcastScheduleSlot {
  /** ISO weekday 1 (Monday) .. 7 (Sunday), e.g. 5 for Friday */
  dayOfWeek: number;
  /** 'HH:mm' in defaultTimezone, e.g. '12:15' */
  startTime: string;
  /** 'HH:mm' in defaultTimezone, e.g. '13:15' */
  endTime: string;
  label?: string;
}

export interface LiveBroadcastConfig {
  enabled: boolean;
  title: string;
  description: string;
  scheduleLabel?: string;
  provider: MediaProviderType;
  watchUrl: string;
  embedUrl?: string | null;
  thumbnailUrl?: string | null;
  spokenLanguages: string[];
  recurringSlots?: LiveBroadcastScheduleSlot[];
}

export interface LiveBroadcastState {
  status: 'live' | 'upcoming' | 'offline';
  title: string;
  description: string;
  scheduleLabel?: string;
  provider: MediaProviderType;
  watchUrl: string;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  spokenLanguages: string[];
  activeEpisodeDocumentId?: string | null;
  secondaryDates?: Record<string, AlternateDateValue>;
}

export interface YouTubeSyncSourceConfig {
  id: string;
  label: string;
  channelId?: string;
  playlistId?: string;
  defaultType?: MediaFeedType;
  defaultSeriesSlug?: string;
  defaultSpeaker?: string;
  defaultSpokenLanguages?: string[];
  enabled: boolean;
}

export interface MediaFeedsSourceFieldMap {
  title: string;
  slug?: string;
  description?: string;
  type?: string;
  provider?: string;
  externalId?: string;
  sourceUrl?: string;
  embedUrl?: string;
  audioFile?: string;
  transcriptFile?: string;
  thumbnail?: string;
  imageUrl?: string;
  imageAlt?: string;
  speaker?: string;
  duration?: string;
  publishedAt?: string;
  publishedAtLabel?: string;
  seriesSlug?: string;
  spokenLanguages?: string;
  languageTracks?: string;
  chapters?: string;
  featured?: string;
  isLive?: string;
  alternateDateFields?: Record<string, string>;
  customFields?: string[];
}

export interface MediaFeedsSourceConfig {
  id: string;
  label: string;
  uid: string;
  enabled: boolean;
  defaultType?: MediaFeedType;
  defaultSpokenLanguages?: string[];
  typeLabels?: Record<string, Record<string, string>>;
  fields: MediaFeedsSourceFieldMap;
}

export interface PodcastFeedConfig {
  title: string;
  description: string;
  author: string;
  ownerName?: string;
  ownerEmail?: string;
  siteUrl: string;
  feedUrl?: string;
  imageUrl?: string;
  category: string;
  subcategory?: string;
  explicit: boolean;
  copyright?: string;
}

export interface MediaFeedsSettings {
  defaultTimezone: string;
  defaultLocale: string;
  supportedLocales: string[];
  fallbackToDefaultLocale: boolean;
  podcastFeed: PodcastFeedConfig;
  liveStream: LiveBroadcastConfig;
  youtubeApiKey?: string;
  youtubeSyncSources: YouTubeSyncSourceConfig[];
  secondaryCalendars: CalendarSystemConfig[];
  defaultSeries?: Array<Partial<MediaSeriesItem>>;
  schemaExtensions?: Record<string, Record<string, unknown>>;
  sources: MediaFeedsSourceConfig[];
}
