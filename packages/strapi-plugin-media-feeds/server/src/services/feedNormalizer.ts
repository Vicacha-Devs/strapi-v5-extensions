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
  type ParsedMediaProviderInfo,
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

function readField(
  raw: Record<string, unknown>,
  mappedKey?: string,
  fallbackKey?: string
): unknown {
  if (mappedKey && raw[mappedKey] !== undefined && raw[mappedKey] !== null) {
    return raw[mappedKey];
  }
  if (fallbackKey && raw[fallbackKey] !== undefined && raw[fallbackKey] !== null) {
    return raw[fallbackKey];
  }
  return undefined;
}

function readStringField(
  raw: Record<string, unknown>,
  mappedKey?: string,
  fallbackKey?: string
): string | null {
  const val = readField(raw, mappedKey, fallbackKey);
  return typeof val === 'string' ? val : null;
}

function readStringWithDefault(
  raw: Record<string, unknown>,
  mappedKey: string | undefined,
  fallbackKey: string,
  defaultValue: string
): string {
  const val = readField(raw, mappedKey, fallbackKey);
  return val !== undefined ? String(val) : defaultValue;
}

function extractMediaFieldUrl(mediaField: unknown): {
  url: string | null;
  mime?: string;
  sizeBytes?: number;
} {
  if (!mediaField) return { url: null };
  if (typeof mediaField === 'string') return { url: mediaField };
  if (typeof mediaField !== 'object') return { url: null };

  const obj = mediaField as Record<string, unknown>;
  if (typeof obj.url !== 'string') return { url: null };

  const sizeKb = typeof obj.size === 'number' ? obj.size : undefined;
  return {
    url: obj.url,
    mime: typeof obj.mime === 'string' ? obj.mime : undefined,
    sizeBytes: sizeKb ? Math.round(sizeKb * 1024) : undefined,
  };
}

function resolveRecordLocale(
  raw: Record<string, unknown>,
  requestedLocale: string | undefined,
  defaultLocale: string
): string {
  if (typeof raw.locale === 'string' && raw.locale) {
    return raw.locale;
  }
  return requestedLocale || defaultLocale;
}

function resolveSlug(
  raw: Record<string, unknown>,
  f: MediaFeedsSourceFieldMap
): string {
  const candidate =
    readField(raw, f.slug, 'slug') ?? raw.documentId ?? raw.id ?? 'media-item';
  return String(candidate);
}

function resolveIdentityIds(
  raw: Record<string, unknown>,
  slug: string,
  source?: MediaFeedsSourceConfig
) {
  const id = (raw.id as string | number) ?? slug;
  const documentId = String(raw.documentId ?? id);
  return {
    id,
    documentId,
    sourceId: source?.id ?? 'built-in',
    sourceUid: source?.uid ?? MEDIA_ITEM_UID,
  };
}

function resolvePublishedAt(
  raw: Record<string, unknown>,
  f: MediaFeedsSourceFieldMap
): string {
  const candidate =
    readField(raw, f.publishedAt, 'publishedAt') ??
    raw.createdAt ??
    new Date().toISOString();
  return String(candidate);
}

function resolveDurationInfo(
  raw: Record<string, unknown>,
  f: MediaFeedsSourceFieldMap
): { duration: string | null; durationSeconds: number | null } {
  const durationRaw = readField(raw, f.duration, 'duration') as
    | string
    | number
    | null;
  const durationSeconds = parseDurationToSeconds(durationRaw);
  const trimmed = typeof durationRaw === 'string' ? durationRaw.trim() : '';
  const duration = trimmed || formatSecondsToDuration(durationSeconds);
  return { duration, durationSeconds };
}

function resolveTypeLabel(
  raw: Record<string, unknown>,
  type: string,
  recordLocale: string,
  defaultLocale: string,
  source?: MediaFeedsSourceConfig
): string {
  if (typeof raw.typeLabel === 'string' && raw.typeLabel) {
    return raw.typeLabel;
  }
  const labels =
    source?.typeLabels?.[recordLocale] ??
    source?.typeLabels?.[defaultLocale] ??
    {};
  return labels[type] || type;
}

function extractCustomFields(
  raw: Record<string, unknown>,
  customFieldNames?: string[]
): Record<string, unknown> | undefined {
  const customData: Record<string, unknown> = {};
  for (const fieldName of customFieldNames ?? []) {
    if (fieldName in raw) {
      customData[fieldName] = raw[fieldName];
    }
  }
  return Object.keys(customData).length > 0 ? customData : undefined;
}

function resolveMediaUrls(
  raw: Record<string, unknown>,
  f: MediaFeedsSourceFieldMap,
  parsedProvider: ParsedMediaProviderInfo
) {
  const audioExtracted = extractMediaFieldUrl(
    readField(raw, f.audioFile, 'audioFile') ?? raw.audioUrl
  );
  const transcriptCandidate =
    readField(raw, f.transcriptFile, 'transcriptFile') ??
    raw.transcriptPdf ??
    raw.transcriptUrl;
  const transcriptExtracted = extractMediaFieldUrl(transcriptCandidate);
  const thumbExtracted = extractMediaFieldUrl(
    readField(raw, f.thumbnail, 'thumbnail')
  );
  const explicitImageUrl = readStringField(raw, f.imageUrl, 'imageUrl');

  return {
    audioUrl: audioExtracted.url,
    audioMimeType: audioExtracted.mime,
    audioByteLength: audioExtracted.sizeBytes,
    transcriptUrl: transcriptExtracted.url,
    thumbnailUrl:
      thumbExtracted.url || explicitImageUrl || parsedProvider.thumbnailUrl,
  };
}

function resolveProviderFields(
  raw: Record<string, unknown>,
  f: MediaFeedsSourceFieldMap
) {
  const rawSourceUrl = String(
    readField(raw, f.sourceUrl, 'sourceUrl') ?? raw.href ?? ''
  );
  const explicitProvider = readStringField(raw, f.provider, 'provider');
  const parsedProvider = parseMediaUrl(rawSourceUrl, explicitProvider);

  return {
    parsedProvider,
    provider: parsedProvider.provider,
    externalId:
      readStringField(raw, f.externalId, 'externalId') ??
      parsedProvider.externalId,
    sourceUrl: parsedProvider.canonicalUrl || rawSourceUrl,
    embedUrl:
      readStringField(raw, f.embedUrl, 'embedUrl') ?? parsedProvider.embedUrl,
  };
}

function computeOptionalSecondaryDates(
  publishedAt: string,
  settings: MediaFeedsSettings,
  raw: Record<string, unknown>,
  alternateDateFields?: Record<string, string>
) {
  if (!settings.secondaryCalendars?.length) return undefined;
  return computeSecondaryDates(
    publishedAt,
    settings.secondaryCalendars,
    raw,
    alternateDateFields
  );
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
  const recordLocale = resolveRecordLocale(
    raw,
    requestedLocale,
    settings.defaultLocale
  );

  const title = readStringWithDefault(raw, f.title, 'title', 'Untitled Media');
  const slug = resolveSlug(raw, f);
  const description = readStringWithDefault(
    raw,
    f.description,
    'description',
    ''
  );
  const type = readStringWithDefault(
    raw,
    f.type,
    'type',
    source?.defaultType ?? 'video'
  );
  const providerInfo = resolveProviderFields(raw, f);
  const mediaUrls = resolveMediaUrls(raw, f, providerInfo.parsedProvider);
  const durationInfo = resolveDurationInfo(raw, f);
  const publishedAt = resolvePublishedAt(raw, f);
  const defaultSpoken = source?.defaultSpokenLanguages ?? [recordLocale];

  const baseItem: MediaFeedItem = {
    ...resolveIdentityIds(raw, slug, source),
    locale: recordLocale,
    title,
    slug,
    description,
    type,
    typeLabel: resolveTypeLabel(
      raw,
      type,
      recordLocale,
      settings.defaultLocale,
      source
    ),
    provider: providerInfo.provider,
    externalId: providerInfo.externalId,
    sourceUrl: providerInfo.sourceUrl,
    embedUrl: providerInfo.embedUrl,
    ...mediaUrls,
    thumbnailAlt: readStringField(raw, f.imageAlt, 'imageAlt') ?? title,
    speaker: readStringField(raw, f.speaker, 'speaker'),
    seriesSlug: readStringField(raw, f.seriesSlug, 'seriesSlug'),
    ...durationInfo,
    publishedAt,
    publishedAtLabel: readStringField(
      raw,
      f.publishedAtLabel,
      'publishedAtLabel'
    ),
    spokenLanguages: normalizeSpokenLanguages(
      readField(raw, f.spokenLanguages, 'spokenLanguages'),
      defaultSpoken
    ),
    languageTracks: normalizeLanguageTracks(
      readField(raw, f.languageTracks, 'languageTracks')
    ),
    chapters: normalizeChapterMarkers(readField(raw, f.chapters, 'chapters')),
    featured: Boolean(readField(raw, f.featured, 'featured')),
    isLive: Boolean(readField(raw, f.isLive, 'isLive')),
    secondaryDates: computeOptionalSecondaryDates(
      publishedAt,
      settings,
      raw,
      f.alternateDateFields
    ),
    customData: extractCustomFields(raw, f.customFields),
  };

  return resolveEpisodeForLocale(
    baseItem,
    requestedLocale || recordLocale,
    settings.defaultLocale
  );
}
