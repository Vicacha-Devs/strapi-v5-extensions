import {
  ALLOWED_GALLERY_CATEGORIES,
  ALLOWED_GLOSSARY_CATEGORIES,
  ALLOWED_PUBLICATION_CATEGORIES,
} from "./constants";
import { computeLetterGroup, toSafeHref } from "./mediaUtils";
import {
  BCP47_LOCALE_REGEX,
  fnv1aHex,
  isSafeObjectKey,
  isValidBcp47Locale,
  resolveSlug,
  SLUG_REGEX,
  toSlug,
  validateMediaFolderPath,
  type ValidationResult,
} from "./slugUtils";
import type {
  GalleryAlbumCategory,
  GlossaryCategory,
  PublicationCategory,
} from "./types";

export {
  BCP47_LOCALE_REGEX,
  fnv1aHex,
  isSafeObjectKey,
  isValidBcp47Locale,
  resolveSlug,
  toSlug,
  validateMediaFolderPath,
  type ValidationResult,
};

const MAX_INT32 = 2_147_483_647;

function asTrimmed(val: unknown): string {
  return typeof val === "string" ? val.trim() : "";
}

function asSlicedOptString(val: unknown, maxLen: number): string | undefined {
  return typeof val === "string" ? val.trim().slice(0, maxLen) : undefined;
}

function pickCategory<T extends string>(
  rawVal: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  const candidate = asTrimmed(rawVal) as T;
  return allowed.includes(candidate) ? candidate : fallback;
}

function checkOptionalFolderPath(
  rawPath: unknown,
  errors: string[]
): string | undefined {
  const trimmed = asTrimmed(rawPath);
  if (!trimmed) return undefined;
  const folderCheck = validateMediaFolderPath(trimmed);
  if (!folderCheck.valid) {
    errors.push(...folderCheck.errors);
    return undefined;
  }
  return folderCheck.data;
}

function checkOptionalExternalUrl(
  rawUrl: unknown,
  errors: string[]
): string | undefined {
  const trimmedUrl = asTrimmed(rawUrl);
  if (!trimmedUrl) return undefined;
  if (trimmedUrl.includes("..") || trimmedUrl.includes("\\")) {
    errors.push("externalDownloadUrl must not contain .. or backslashes");
    return undefined;
  }
  const safeHref = toSafeHref(trimmedUrl);
  if (!safeHref) {
    errors.push(
      "externalDownloadUrl must be a valid http(s) or safe root-relative URL"
    );
    return undefined;
  }
  return safeHref;
}

export function extractMediaRelationId(
  val: unknown
): number | string | null | undefined {
  if (val === undefined) return undefined;
  if (val === null) return null;
  if (typeof val === "number") {
    return Number.isFinite(val) && val > 0 ? Math.round(val) : null;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof val === "object" && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    if (typeof obj.id === "number" && Number.isFinite(obj.id) && obj.id > 0) {
      return Math.round(obj.id);
    }
    if (typeof obj.id === "string" && obj.id.trim().length > 0) {
      return obj.id.trim();
    }
  }
  return null;
}

function normalizeOptionalMediaId(
  key: string,
  primaryVal: unknown,
  aliasVal?: unknown
): Record<string, number | string | null> {
  const effective = aliasVal !== undefined ? aliasVal : primaryVal;
  if (effective === undefined) return {};
  const extracted = extractMediaRelationId(effective);
  return { [key]: extracted ?? null };
}

export function parsePositiveInt(val: unknown): number | undefined {
  if (
    val === null ||
    val === undefined ||
    val === "" ||
    typeof val === "boolean"
  ) {
    return undefined;
  }
  const num = Number(val);
  if (!Number.isFinite(num)) return undefined;
  const rounded = Math.round(num);
  return rounded >= 1 && rounded <= MAX_INT32 ? rounded : undefined;
}

export interface ValidatedPublicationInput {
  title: string;
  slug: string;
  summary: string;
  category: PublicationCategory;
  authorName?: string;
  isbnOrReference?: string;
  pageCount?: number;
  languageCode: string;
  publishedAtDate?: string;
  secondaryDateOverride?: string;
  mediaFolderPath?: string;
  featured: boolean;
  allowPublicDownload: boolean;
  externalDownloadUrl?: string;
  file?: number | string | null;
  coverImage?: number | string | null;
}

function collectPublicationErrors(
  title: string,
  slug: string,
  summary: string
): string[] {
  const errors: string[] = [];
  if (title.length < 2 || title.length > 200) {
    errors.push("Title must be between 2 and 200 characters");
  }
  if (!slug || !SLUG_REGEX.test(slug)) {
    errors.push("Slug must be lowercase alphanumeric with hyphens");
  }
  if (summary.length > 2000) {
    errors.push("Summary must be at most 2000 characters");
  }
  return errors;
}

export function validatePublicationInput(
  input: unknown
): ValidationResult<ValidatedPublicationInput> {
  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Publication payload must be an object"] };
  }
  const raw = input as Record<string, unknown>;
  const title = asTrimmed(raw.title);
  const slug = resolveSlug(raw.slug, title, raw.transliteration);
  const summary = asTrimmed(raw.summary);
  const errors = collectPublicationErrors(title, slug, summary);

  const mediaFolderPath = checkOptionalFolderPath(raw.mediaFolderPath, errors);
  const externalDownloadUrl = checkOptionalExternalUrl(
    raw.externalDownloadUrl,
    errors
  );

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      title,
      slug,
      summary,
      category: pickCategory(
        raw.category,
        ALLOWED_PUBLICATION_CATEGORIES,
        "guide"
      ),
      authorName: asSlicedOptString(raw.authorName, 140),
      isbnOrReference: asSlicedOptString(raw.isbnOrReference, 80),
      pageCount: parsePositiveInt(raw.pageCount),
      languageCode: asTrimmed(raw.languageCode).slice(0, 10) || "es",
      publishedAtDate: asSlicedOptString(raw.publishedAtDate, 32),
      secondaryDateOverride: asSlicedOptString(raw.secondaryDateOverride, 80),
      mediaFolderPath,
      featured: Boolean(raw.featured),
      allowPublicDownload: raw.allowPublicDownload !== false,
      externalDownloadUrl,
      ...normalizeOptionalMediaId("file", raw.file, raw.fileId),
      ...normalizeOptionalMediaId(
        "coverImage",
        raw.coverImage,
        raw.coverImageId
      ),
    },
  };
}

export interface ValidatedGalleryAlbumInput {
  title: string;
  slug: string;
  description: string;
  category: GalleryAlbumCategory;
  eventDate?: string;
  secondaryDateOverride?: string;
  mediaFolderId?: number | null;
  mediaFolderPath?: string;
  photographerCredit?: string;
  framingNotes?: string;
  featured: boolean;
  sortOrder: number;
  coverPhoto?: number | string | null;
  photos?: Array<number | string>;
}

function collectAlbumErrors(
  title: string,
  slug: string,
  description: string
): string[] {
  const errors: string[] = [];
  if (title.length < 2 || title.length > 200) {
    errors.push("Album title must be between 2 and 200 characters");
  }
  if (!slug || !SLUG_REGEX.test(slug)) {
    errors.push("Album slug must be lowercase alphanumeric with hyphens");
  }
  if (description.length > 2000) {
    errors.push("Album description must be at most 2000 characters");
  }
  return errors;
}

function normalizePhotoIdList(
  primaryPhotos: unknown,
  aliasPhotoIds?: unknown
): { photos: Array<number | string> } | Record<string, never> {
  const rawPhotos = aliasPhotoIds !== undefined ? aliasPhotoIds : primaryPhotos;
  if (!Array.isArray(rawPhotos)) return {};
  const ids: Array<number | string> = [];
  for (const item of rawPhotos) {
    const extracted = extractMediaRelationId(item);
    if (extracted !== null && extracted !== undefined) {
      ids.push(extracted);
    }
  }
  return { photos: ids };
}

function parseFiniteInt(val: unknown, fallback = 0): number {
  if (
    typeof val === "boolean" ||
    val === null ||
    val === undefined ||
    val === ""
  ) {
    return fallback;
  }
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(-MAX_INT32, Math.min(MAX_INT32, Math.round(num)));
}

export function validateGalleryAlbumInput(
  input: unknown
): ValidationResult<ValidatedGalleryAlbumInput> {
  if (!input || typeof input !== "object") {
    return {
      valid: false,
      errors: ["Gallery album payload must be an object"],
    };
  }
  const raw = input as Record<string, unknown>;
  const title = asTrimmed(raw.title);
  const slug = resolveSlug(raw.slug, title, raw.transliteration);
  const description = asTrimmed(raw.description);
  const errors = collectAlbumErrors(title, slug, description);
  const mediaFolderPath = checkOptionalFolderPath(raw.mediaFolderPath, errors);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      title,
      slug,
      description,
      category: pickCategory(
        raw.category,
        ALLOWED_GALLERY_CATEGORIES,
        "community"
      ),
      eventDate: asSlicedOptString(raw.eventDate, 32),
      secondaryDateOverride: asSlicedOptString(raw.secondaryDateOverride, 80),
      mediaFolderId: parsePositiveInt(raw.mediaFolderId) ?? null,
      mediaFolderPath,
      photographerCredit: asSlicedOptString(raw.photographerCredit, 140),
      framingNotes: asSlicedOptString(raw.framingNotes, 500),
      featured: Boolean(raw.featured),
      sortOrder: parseFiniteInt(raw.sortOrder, 0),
      ...normalizeOptionalMediaId(
        "coverPhoto",
        raw.coverPhoto,
        raw.coverPhotoId
      ),
      ...normalizePhotoIdList(raw.photos, raw.photoIds),
    },
  };
}

export interface ValidatedGlossaryTermInput {
  term: string;
  slug: string;
  nativeScript?: string;
  transliteration?: string;
  definition: string;
  category: GlossaryCategory;
  letterGroup: string;
  relatedTerms: string[];
  featured: boolean;
  pronunciationAudio?: number | string | null;
}

function collectGlossaryErrors(
  term: string,
  slug: string,
  definition: string
): string[] {
  const errors: string[] = [];
  if (term.length < 2 || term.length > 120) {
    errors.push("Term must be between 2 and 120 characters");
  }
  if (!slug || !SLUG_REGEX.test(slug)) {
    errors.push("Glossary slug must be lowercase alphanumeric with hyphens");
  }
  if (definition.length < 2 || definition.length > 4000) {
    errors.push("Definition must be between 2 and 4000 characters");
  }
  return errors;
}

function parseRelatedTerms(rawTerms: unknown): string[] {
  if (!Array.isArray(rawTerms)) return [];
  return rawTerms
    .filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0
    )
    .map((item) => item.trim().slice(0, 80));
}

export function validateGlossaryTermInput(
  input: unknown
): ValidationResult<ValidatedGlossaryTermInput> {
  if (!input || typeof input !== "object") {
    return {
      valid: false,
      errors: ["Glossary term payload must be an object"],
    };
  }
  const raw = input as Record<string, unknown>;
  const term = asTrimmed(raw.term);
  const slug = resolveSlug(raw.slug, term, raw.transliteration);
  const definition = asTrimmed(raw.definition);
  const errors = collectGlossaryErrors(term, slug, definition);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      term,
      slug,
      nativeScript: asSlicedOptString(raw.nativeScript, 200),
      transliteration: asSlicedOptString(raw.transliteration, 200),
      definition,
      category: pickCategory(
        raw.category,
        ALLOWED_GLOSSARY_CATEGORIES,
        "general"
      ),
      letterGroup: (() => {
        const fromTerm = computeLetterGroup(term);
        if (fromTerm !== "#") return fromTerm;
        return computeLetterGroup(raw.transliteration);
      })(),
      relatedTerms: parseRelatedTerms(raw.relatedTerms),
      featured: Boolean(raw.featured),
      ...normalizeOptionalMediaId(
        "pronunciationAudio",
        raw.pronunciationAudio,
        raw.pronunciationAudioId
      ),
    },
  };
}
