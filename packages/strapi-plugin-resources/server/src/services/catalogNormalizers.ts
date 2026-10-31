import {
  buildAttachmentHeaders,
  formatSecondaryCalendarDate,
  isAllowedDownloadAsset,
  normalizeUploadFile,
  sanitizeFilename,
  type DownloadTicketResult,
  type GalleryAlbumCategory,
  type GalleryAlbumRecord,
  type GlossaryCategory,
  type GlossaryTermRecord,
  type MediaLibraryAsset,
  type PublicationCategory,
  type PublicationRecord,
  type ResourcesPluginSettings,
  type SecondaryCalendarId,
} from '../../../shared';

function asString(val: unknown, fallback = ''): string {
  return typeof val === 'string' ? val : fallback;
}

function asNonEmptyString(val: unknown, fallback: string): string {
  return typeof val === 'string' && val ? val : fallback;
}

function asOptString(val: unknown): string | undefined {
  return typeof val === 'string' ? val : undefined;
}

function asTrimmedOptString(val: unknown): string | undefined {
  return typeof val === 'string' && val.trim() ? val.trim() : undefined;
}

function asNumber(val: unknown, fallback = 0): number {
  return typeof val === 'number' ? val : fallback;
}

function asOptNumber(val: unknown): number | undefined {
  return typeof val === 'number' ? val : undefined;
}

function resolveDocId(row: Record<string, unknown>): string {
  return typeof row.documentId === 'string'
    ? row.documentId
    : String(row.id ?? '');
}

function resolveSecondaryDateFormatted(
  primaryDate: string | undefined,
  secondaryDateOverride: string | undefined,
  settings: ResourcesPluginSettings,
  locale: string
): string {
  if (secondaryDateOverride) return secondaryDateOverride;
  return formatSecondaryCalendarDate(
    primaryDate,
    settings.secondaryCalendar as SecondaryCalendarId,
    locale
  );
}

function normalizePhotoArray(
  rawPhotos: unknown,
  enableCloudinaryOptimization: boolean
): MediaLibraryAsset[] {
  if (!Array.isArray(rawPhotos)) return [];
  return rawPhotos
    .map((item) => normalizeUploadFile(item, enableCloudinaryOptimization))
    .filter((item): item is MediaLibraryAsset => item !== null);
}

export function normalizePublicationRow(
  row: Record<string, unknown>,
  settings: ResourcesPluginSettings
): PublicationRecord {
  const locale = asNonEmptyString(row.locale, settings.defaultLocale);
  const publishedAtDate = asOptString(row.publishedAtDate);
  const secondaryDateOverride = asTrimmedOptString(row.secondaryDateOverride);

  return {
    documentId: resolveDocId(row),
    title: asString(row.title),
    slug: asString(row.slug),
    summary: asString(row.summary),
    category: (row.category as PublicationCategory) || 'guide',
    authorName: asOptString(row.authorName),
    isbnOrReference: asOptString(row.isbnOrReference),
    pageCount: asOptNumber(row.pageCount),
    languageCode: asString(row.languageCode, locale),
    publishedAtDate,
    secondaryDateOverride,
    secondaryDateFormatted: resolveSecondaryDateFormatted(
      publishedAtDate,
      secondaryDateOverride,
      settings,
      locale
    ),
    mediaFolderPath: asOptString(row.mediaFolderPath),
    downloadCount: asNumber(row.downloadCount, 0),
    featured: Boolean(row.featured),
    allowPublicDownload: row.allowPublicDownload !== false,
    externalDownloadUrl: asOptString(row.externalDownloadUrl),
    file: normalizeUploadFile(row.file, settings.enableCloudinaryOptimization),
    coverImage: normalizeUploadFile(
      row.coverImage,
      settings.enableCloudinaryOptimization
    ),
    locale,
  };
}

export function normalizeGalleryAlbumRow(
  row: Record<string, unknown>,
  settings: ResourcesPluginSettings
): GalleryAlbumRecord {
  const locale = asNonEmptyString(row.locale, settings.defaultLocale);
  const eventDate = asOptString(row.eventDate);
  const secondaryDateOverride = asTrimmedOptString(row.secondaryDateOverride);
  const photos = normalizePhotoArray(
    row.photos,
    settings.enableCloudinaryOptimization
  );
  const coverPhoto =
    normalizeUploadFile(
      row.coverPhoto,
      settings.enableCloudinaryOptimization
    ) ??
    photos[0] ??
    null;
  const storedPhotoCount = Math.max(0, asNumber(row.photoCount, 0));

  return {
    documentId: resolveDocId(row),
    title: asString(row.title),
    slug: asString(row.slug),
    description: asString(row.description),
    category: (row.category as GalleryAlbumCategory) || 'community',
    eventDate,
    secondaryDateOverride,
    secondaryDateFormatted: resolveSecondaryDateFormatted(
      eventDate,
      secondaryDateOverride,
      settings,
      locale
    ),
    mediaFolderId:
      typeof row.mediaFolderId === 'number' ? row.mediaFolderId : null,
    mediaFolderPath: asOptString(row.mediaFolderPath),
    photographerCredit: asOptString(row.photographerCredit),
    framingNotes: asOptString(row.framingNotes),
    featured: Boolean(row.featured),
    sortOrder: asNumber(row.sortOrder, 0),
    photoCount: photos.length > 0 ? photos.length : storedPhotoCount,
    coverPhoto,
    photos,
    locale,
  };
}

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is string => typeof t === 'string');
}

export function normalizeGlossaryTermRow(
  row: Record<string, unknown>,
  settings: ResourcesPluginSettings
): GlossaryTermRecord {
  const locale = asNonEmptyString(row.locale, settings.defaultLocale);
  return {
    documentId: resolveDocId(row),
    term: asString(row.term),
    slug: asString(row.slug),
    nativeScript: asOptString(row.nativeScript),
    transliteration: asOptString(row.transliteration),
    definition: asString(row.definition),
    category: (row.category as GlossaryCategory) || 'general',
    letterGroup: asNonEmptyString(row.letterGroup, 'A'),
    relatedTerms: normalizeStringArray(row.relatedTerms),
    featured: Boolean(row.featured),
    pronunciationAudio: normalizeUploadFile(
      row.pronunciationAudio,
      settings.enableCloudinaryOptimization
    ),
    locale,
  };
}

export function assertPublicationDownloadable(
  record: PublicationRecord,
  slug: string,
  settings: ResourcesPluginSettings
): void {
  if (!record.allowPublicDownload) {
    throw new Error(`Public download is disabled for "${slug}"`);
  }
  if (!record.file) return;
  const allowed = isAllowedDownloadAsset(
    record.file.ext,
    record.file.mime,
    settings.allowedDownloadExtensions,
    settings.allowedDownloadMimeTypes
  );
  if (!allowed) {
    throw new Error(
      `Asset type (${record.file.ext} / ${record.file.mime}) is not in the download allow-list`
    );
  }
}

export function resolvePublicationDownloadUrl(
  record: PublicationRecord,
  slug: string
): string {
  const downloadUrl = record.file?.url || record.externalDownloadUrl || '';
  if (!downloadUrl) {
    throw new Error(`Publication "${slug}" has no downloadable file attached`);
  }
  return downloadUrl;
}

export function buildDownloadTicket(
  record: PublicationRecord,
  downloadUrl: string,
  nextCount: number
): DownloadTicketResult {
  const fileName = sanitizeFilename(
    record.file?.name || `${record.slug}.pdf`,
    record.file?.ext || '.pdf'
  );
  const mime = record.file?.mime || 'application/pdf';
  return {
    slug: record.slug,
    title: record.title,
    fileName,
    downloadUrl,
    mime,
    formattedSize: record.file?.formattedSize || 'PDF',
    downloadCount: nextCount,
    headers: buildAttachmentHeaders(fileName, mime),
  };
}

export async function findExistingDocumentOrThrow(
  docs: {
    findOne: (params: {
      documentId: string;
      locale?: string;
      populate?: string[];
    }) => Promise<Record<string, unknown> | null>;
  },
  documentId: string,
  locale: string | undefined,
  populate: string[],
  entityLabel: string
): Promise<Record<string, unknown>> {
  const existing = await docs.findOne({
    documentId,
    ...(locale ? { locale } : {}),
    populate,
  });
  if (!existing) {
    throw new Error(`${entityLabel} "${documentId}" not found`);
  }
  return existing;
}

export function mergeRecordPayload(
  existing: Record<string, unknown>,
  payload: unknown
): Record<string, unknown> {
  return {
    ...existing,
    ...(payload && typeof payload === 'object' ? payload : {}),
  };
}

export function buildGalleryAlbumUpdateData(
  validatedData: {
    photos?: Array<number | string>;
    coverPhoto?: number | string | null;
  },
  existing: Record<string, unknown>
): Record<string, unknown> {
  const photoIds = validatedData.photos;
  const hasPhotos = Array.isArray(photoIds);
  const shouldDefaultCover =
    hasPhotos &&
    photoIds.length > 0 &&
    !validatedData.coverPhoto &&
    !existing.coverPhoto;

  return {
    ...validatedData,
    ...(hasPhotos ? { photoCount: photoIds.length } : {}),
    ...(shouldDefaultCover ? { coverPhoto: photoIds[0] } : {}),
  };
}
