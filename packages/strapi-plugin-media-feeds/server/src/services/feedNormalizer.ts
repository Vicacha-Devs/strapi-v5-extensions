import {
  computeSecondaryDates,
  formatSecondsToDuration,
  MEDIA_ITEM_UID,
  normalizeChapterMarkers,
  normalizeLanguageTracks,
  normalizeSpokenLanguages,
  parseDurationToSeconds,
  parseMediaUrl,
  resolveEpisodeForLocale,
  type MediaFeedItem,
  type MediaFeedsSettings,
  type MediaFeedsSourceConfig,
  type MediaFeedsSourceFieldMap,
} from '../../../shared';

const DEFAULT_BUILT_IN_FIELDS: MediaFeedsSourceFieldMap = {
  title: 'title',
  slug: 'slug',
  description: 'description',
  type: 'type',
  provider: 'provider',
  externalId: 'externalId',
  sourceUrl: 'sourceUrl',
  embedUrl: 'embedUrl',
  audioFile: 'audioFile',
  transcriptFile: 'transcriptFile',
  thumbnail: 'thumbnail',
  imageUrl: 'imageUrl',
  imageAlt: 'imageAlt',
  speaker: 'speaker',
  duration: 'duration',
  publishedAt: 'publishedAt',
  publishedAtLabel: 'publishedAtLabel',
  seriesSlug: 'seriesSlug',
  spokenLanguages: 'spokenLanguages',
  languageTracks: 'languageTracks',
  chapters: 'chapters',
  featured: 'featured',
  isLive: 'isLive',
};

function extractMediaFieldUrl(mediaField: unknown): {
  url: string | null;
  mime?: string;
  sizeBytes?: number;
} {
  if (!mediaField) return { url: null };
  if (typeof mediaField === 'string') return { url: mediaField };
  if (typeof mediaField === 'object') {
    const obj = mediaField as Record<string, unknown>;
    if (typeof obj.url === 'string') {
      const sizeKb = typeof obj.size === 'number' ? obj.size : undefined;
      return {
        url: obj.url,
        mime: typeof obj.mime === 'string' ? obj.mime : undefined,
        sizeBytes: sizeKb ? Math.round(sizeKb * 1024) : undefined,
      };
    }
  }
  return { url: null };
}

export function normalizeRawMediaRecord(
  raw: Record<string, unknown>,
  options: {
    source?: MediaFeedsSourceConfig;
    settings: MediaFeedsSettings;
    requestedLocale?: string;
  }
): MediaFeedItem {
  const { source, settings, requestedLocale } = options;
  const f = source?.fields ?? DEFAULT_BUILT_IN_FIELDS;
  const recordLocale =
    (typeof raw.locale === 'string' && raw.locale) ||
    requestedLocale ||
    settings.defaultLocale;

  const title = String(raw[f.title] ?? raw.title ?? 'Untitled Media');
  const slug = String(
    (f.slug && raw[f.slug]) ??
      raw.slug ??
      raw.documentId ??
      raw.id ??
      'media-item'
  );
  const description = String(
    (f.description && raw[f.description]) ?? raw.description ?? ''
  );
  const type = String(
    (f.type && raw[f.type]) ?? raw.type ?? source?.defaultType ?? 'video'
  );

  const rawSourceUrl = String(
    (f.sourceUrl && raw[f.sourceUrl]) ??
      raw.sourceUrl ??
      raw.href ??
      ''
  );
  const explicitProvider = String(
    (f.provider && raw[f.provider]) ?? raw.provider ?? ''
  );
  const parsedProvider = parseMediaUrl(rawSourceUrl, explicitProvider || null);

  const audioExtracted = extractMediaFieldUrl(
    (f.audioFile && raw[f.audioFile]) ?? raw.audioFile ?? raw.audioUrl
  );
  const transcriptExtracted = extractMediaFieldUrl(
    (f.transcriptFile && raw[f.transcriptFile]) ??
      raw.transcriptFile ??
      raw.transcriptPdf ??
      raw.transcriptUrl
  );
  const thumbExtracted = extractMediaFieldUrl(
    (f.thumbnail && raw[f.thumbnail]) ?? raw.thumbnail
  );
  const explicitImageUrl =
    (f.imageUrl && typeof raw[f.imageUrl] === 'string'
      ? (raw[f.imageUrl] as string)
      : null) ?? (typeof raw.imageUrl === 'string' ? raw.imageUrl : null);

  const durationRaw =
    (f.duration ? raw[f.duration] : raw.duration) as string | number | null;
  const durationSeconds = parseDurationToSeconds(durationRaw);
  const duration =
    typeof durationRaw === 'string' && durationRaw.trim()
      ? durationRaw.trim()
      : formatSecondsToDuration(durationSeconds);

  const publishedAt = String(
    (f.publishedAt && raw[f.publishedAt]) ??
      raw.publishedAt ??
      raw.createdAt ??
      new Date().toISOString()
  );

  const spokenLanguages = normalizeSpokenLanguages(
    (f.spokenLanguages && raw[f.spokenLanguages]) ?? raw.spokenLanguages,
    source?.defaultSpokenLanguages ?? [recordLocale]
  );
  const languageTracks = normalizeLanguageTracks(
    (f.languageTracks && raw[f.languageTracks]) ?? raw.languageTracks
  );
  const chapters = normalizeChapterMarkers(
    (f.chapters && raw[f.chapters]) ?? raw.chapters
  );

  const localizedTypeLabels = source?.typeLabels?.[recordLocale] ??
    source?.typeLabels?.[settings.defaultLocale] ?? {};
  const typeLabel =
    (typeof raw.typeLabel === 'string' && raw.typeLabel) ||
    localizedTypeLabels[type] ||
    type;

  const secondaryDates =
    settings.secondaryCalendars?.length > 0
      ? computeSecondaryDates(
          publishedAt,
          settings.secondaryCalendars,
          raw,
          f.alternateDateFields
        )
      : undefined;

  const customData: Record<string, unknown> = {};
  for (const fieldName of f.customFields ?? []) {
    if (fieldName in raw) {
      customData[fieldName] = raw[fieldName];
    }
  }

  const baseItem: MediaFeedItem = {
    id: (raw.id as string | number) ?? slug,
    documentId: String(raw.documentId ?? raw.id ?? slug),
    sourceId: source?.id ?? 'built-in',
    sourceUid: source?.uid ?? MEDIA_ITEM_UID,
    locale: recordLocale,
    title,
    slug,
    description,
    type,
    typeLabel,
    provider: parsedProvider.provider,
    externalId:
      (f.externalId && typeof raw[f.externalId] === 'string'
        ? (raw[f.externalId] as string)
        : null) ??
      (typeof raw.externalId === 'string' ? raw.externalId : null) ??
      parsedProvider.externalId,
    sourceUrl: parsedProvider.canonicalUrl || rawSourceUrl,
    embedUrl:
      (f.embedUrl && typeof raw[f.embedUrl] === 'string'
        ? (raw[f.embedUrl] as string)
        : null) ??
      (typeof raw.embedUrl === 'string' ? raw.embedUrl : null) ??
      parsedProvider.embedUrl,
    audioUrl: audioExtracted.url,
    audioMimeType: audioExtracted.mime,
    audioByteLength: audioExtracted.sizeBytes,
    transcriptUrl: transcriptExtracted.url,
    thumbnailUrl:
      thumbExtracted.url || explicitImageUrl || parsedProvider.thumbnailUrl,
    thumbnailAlt:
      (f.imageAlt && typeof raw[f.imageAlt] === 'string'
        ? (raw[f.imageAlt] as string)
        : null) ??
      (typeof raw.imageAlt === 'string' ? raw.imageAlt : title),
    speaker:
      (f.speaker && typeof raw[f.speaker] === 'string'
        ? (raw[f.speaker] as string)
        : null) ?? (typeof raw.speaker === 'string' ? raw.speaker : null),
    seriesSlug:
      (f.seriesSlug && typeof raw[f.seriesSlug] === 'string'
        ? (raw[f.seriesSlug] as string)
        : null) ?? (typeof raw.seriesSlug === 'string' ? raw.seriesSlug : null),
    duration,
    durationSeconds,
    publishedAt,
    publishedAtLabel:
      (f.publishedAtLabel && typeof raw[f.publishedAtLabel] === 'string'
        ? (raw[f.publishedAtLabel] as string)
        : null) ??
      (typeof raw.publishedAtLabel === 'string' ? raw.publishedAtLabel : null),
    spokenLanguages,
    languageTracks,
    chapters,
    featured: Boolean((f.featured ? raw[f.featured] : raw.featured) ?? false),
    isLive: Boolean((f.isLive ? raw[f.isLive] : raw.isLive) ?? false),
    secondaryDates,
    customData: Object.keys(customData).length > 0 ? customData : undefined,
  };

  return resolveEpisodeForLocale(
    baseItem,
    requestedLocale || recordLocale,
    settings.defaultLocale
  );
}
