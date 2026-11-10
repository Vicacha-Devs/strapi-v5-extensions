import {
  buildAttachmentHeaders,
  extractMediaRelationId,
  extractUrlExtension,
  formatSecondaryCalendarDate,
  isAllowedDownloadAsset,
  isAllowedExternalDownloadUrl,
  isSafeObjectKey,
  normalizeUploadFile,
  sanitizeFilename,
  toSafeHref,
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
} from "../../../shared";
import { ResourceNotFoundError, ResourceValidationError } from "./errors";
import {
  sanitizePublicGalleryAlbum,
  sanitizePublicGlossaryTerm,
  sanitizePublicPublication,
} from "./publicSanitizers";

export {
  sanitizePublicGalleryAlbum,
  sanitizePublicGlossaryTerm,
  sanitizePublicPublication,
};

function asString(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val : fallback;
}

function asNonEmptyString(val: unknown, fallback: string): string {
  return typeof val === "string" && val ? val : fallback;
}

function asOptString(val: unknown): string | undefined {
  return typeof val === "string" ? val : undefined;
}

function asTrimmedOptString(val: unknown): string | undefined {
  return typeof val === "string" && val.trim() ? val.trim() : undefined;
}

function asNumber(val: unknown, fallback = 0): number {
  return typeof val === "number" && Number.isFinite(val) ? val : fallback;
}

function asOptNumber(val: unknown): number | undefined {
  return typeof val === "number" && Number.isFinite(val) ? val : undefined;
}

function resolveDocId(row: Record<string, unknown>): string {
  return typeof row.documentId === "string"
    ? row.documentId
    : String(row.id ?? "");
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
  const rawCount = Math.trunc(asNumber(row.downloadCount, 0));

  return {
    documentId: resolveDocId(row),
    title: asString(row.title),
    slug: asString(row.slug),
    summary: asString(row.summary),
    category: (row.category as PublicationCategory) || "guide",
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
    downloadCount: Math.max(0, rawCount),
    featured: Boolean(row.featured),
    allowPublicDownload: row.allowPublicDownload !== false,
    externalDownloadUrl: toSafeHref(row.externalDownloadUrl) ?? undefined,
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
  const storedPhotoCount = Math.max(0, Math.trunc(asNumber(row.photoCount, 0)));
  const hasPopulatedPhotos = Array.isArray(row.photos);

  return {
    documentId: resolveDocId(row),
    title: asString(row.title),
    slug: asString(row.slug),
    description: asString(row.description),
    category: (row.category as GalleryAlbumCategory) || "community",
    eventDate,
    secondaryDateOverride,
    secondaryDateFormatted: resolveSecondaryDateFormatted(
      eventDate,
      secondaryDateOverride,
      settings,
      locale
    ),
    mediaFolderId:
      typeof row.mediaFolderId === "number" &&
      Number.isFinite(row.mediaFolderId)
        ? row.mediaFolderId
        : null,
    mediaFolderPath: asOptString(row.mediaFolderPath),
    photographerCredit: asOptString(row.photographerCredit),
    framingNotes: asOptString(row.framingNotes),
    featured: Boolean(row.featured),
    sortOrder: Math.trunc(asNumber(row.sortOrder, 0)),
    photoCount: hasPopulatedPhotos ? photos.length : storedPhotoCount,
    coverPhoto,
    photos,
    locale,
  };
}

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is string => typeof t === "string");
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
    category: (row.category as GlossaryCategory) || "general",
    letterGroup: asNonEmptyString(row.letterGroup, "A"),
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
    throw new ResourceValidationError(
      `Public download is disabled for "${slug}"`
    );
  }
  if (record.file) {
    const allowed = isAllowedDownloadAsset(
      record.file.ext,
      record.file.mime,
      settings.allowedDownloadExtensions,
      settings.allowedDownloadMimeTypes
    );
    if (!allowed) {
      throw new ResourceValidationError(
        `Asset type (${record.file.ext} / ${record.file.mime}) is not in the download allow-list`
      );
    }
    return;
  }

  if (!record.externalDownloadUrl) {
    throw new ResourceValidationError(
      `Publication "${slug}" has no downloadable file attached`
    );
  }
  const extAllowed = isAllowedExternalDownloadUrl(
    record.externalDownloadUrl,
    settings.allowedDownloadExtensions
  );
  if (!extAllowed) {
    const ext = extractUrlExtension(record.externalDownloadUrl) || "unknown";
    throw new ResourceValidationError(
      `External download URL extension (${ext}) is not in the download allow-list`
    );
  }
}

export function resolvePublicationDownloadUrl(
  record: PublicationRecord,
  slug: string
): string {
  const rawCandidate = record.file?.url || record.externalDownloadUrl || "";
  if (!rawCandidate) {
    throw new ResourceValidationError(
      `Publication "${slug}" has no downloadable file attached`
    );
  }
  const safeUrl = toSafeHref(rawCandidate);
  if (!safeUrl) {
    throw new ResourceValidationError(
      `Publication "${slug}" has an unsafe download URL`
    );
  }
  return safeUrl;
}

const EXT_TO_MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".epub": "application/epub+zip",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".zip": "application/zip",
};

export function buildDownloadTicket(
  record: PublicationRecord,
  downloadUrl: string,
  nextCount: number,
  expiresAt: number,
  signature: string
): DownloadTicketResult {
  const resolvedExt =
    record.file?.ext || extractUrlExtension(downloadUrl) || ".pdf";
  const fileName = sanitizeFilename(
    record.file?.name || `${record.slug}${resolvedExt}`,
    resolvedExt
  );
  const mime =
    record.file?.mime ||
    EXT_TO_MIME_MAP[resolvedExt.toLowerCase()] ||
    "application/pdf";
  const recommendedHeaders = buildAttachmentHeaders(fileName, mime);

  return {
    documentId: record.documentId || record.slug,
    slug: record.slug,
    title: record.title,
    fileName,
    downloadUrl,
    mime,
    formattedSize:
      record.file?.formattedSize ||
      resolvedExt.replace(".", "").toUpperCase() ||
      "PDF",
    downloadCount: nextCount,
    expiresAt,
    signature,
    recommendedHeaders,
    headers: recommendedHeaders,
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
    throw new ResourceNotFoundError(`${entityLabel} "${documentId}" not found`);
  }
  return existing;
}

const MEDIA_ALIAS_PAIRS: ReadonlyArray<[string, string]> = [
  ["file", "fileId"],
  ["coverImage", "coverImageId"],
  ["coverPhoto", "coverPhotoId"],
  ["photos", "photoIds"],
  ["pronunciationAudio", "pronunciationAudioId"],
];

export function mergeRecordPayload(
  existing: Record<string, unknown>,
  payload: unknown
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(existing)) {
    if (Object.hasOwn(existing, k) && isSafeObjectKey(k)) {
      merged[k] = v;
    }
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return merged;
  }

  const incoming = payload as Record<string, unknown>;
  for (const [k, v] of Object.entries(incoming)) {
    if (Object.hasOwn(incoming, k) && isSafeObjectKey(k)) {
      merged[k] = v;
    }
  }

  for (const [primaryKey, aliasKey] of MEDIA_ALIAS_PAIRS) {
    const hasPrimary = Object.hasOwn(incoming, primaryKey);
    const hasAlias = Object.hasOwn(incoming, aliasKey);
    if (hasPrimary) {
      merged[primaryKey] = incoming[primaryKey];
      delete merged[aliasKey];
    } else if (hasAlias) {
      merged[primaryKey] = incoming[aliasKey];
      delete merged[aliasKey];
    }
  }

  return merged;
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
  const existingCoverId = extractMediaRelationId(existing.coverPhoto);
  const shouldDefaultCover =
    hasPhotos &&
    photoIds.length > 0 &&
    !validatedData.coverPhoto &&
    !existingCoverId;

  return {
    ...validatedData,
    ...(hasPhotos ? { photoCount: photoIds.length } : {}),
    ...(shouldDefaultCover ? { coverPhoto: photoIds[0] } : {}),
  };
}
