import {
  ALLOWED_GALLERY_CATEGORIES,
  ALLOWED_GLOSSARY_CATEGORIES,
  ALLOWED_PUBLICATION_CATEGORIES,
} from "./constants";
import { computeLetterGroup } from "./mediaUtils";
import type { GalleryAlbumCategory, GlossaryCategory, PublicationCategory } from "./types";

export interface ValidationResult<T> {
  valid: boolean;
  errors: string[];
  data?: T;
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FOLDER_PATH_REGEX = /^\/[a-zA-Z0-9/_-]*$/;

export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/**
 * Strictly validates a Strapi v5 Media Library folder path (`plugin::upload.folder.path`),
 * rejecting directory traversal (`..`) or backslashes.
 */
export function validateMediaFolderPath(rawPath: unknown): ValidationResult<string> {
  if (typeof rawPath !== "string" || !rawPath.trim()) {
    return { valid: false, errors: ["Media folder path is required"] };
  }
  const trimmed = rawPath.trim();
  if (trimmed.includes("..") || trimmed.includes("\\")) {
    return {
      valid: false,
      errors: ["Media folder path must not contain traversal sequences"],
    };
  }
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (!FOLDER_PATH_REGEX.test(normalized)) {
    return {
      valid: false,
      errors: ["Media folder path contains invalid characters"],
    };
  }
  return { valid: true, errors: [], data: normalized };
}

function asTrimmed(val: unknown): string {
  return typeof val === "string" ? val.trim() : "";
}

function asSlicedOptString(val: unknown, maxLen: number): string | undefined {
  return typeof val === "string" ? val.trim().slice(0, maxLen) : undefined;
}

function resolveSlug(rawSlug: unknown, fallbackSource: string): string {
  const custom = asTrimmed(rawSlug).toLowerCase();
  return custom || toSlug(fallbackSource);
}

function pickCategory<T extends string>(rawVal: unknown, allowed: readonly T[], fallback: T): T {
  const candidate = asTrimmed(rawVal) as T;
  return allowed.includes(candidate) ? candidate : fallback;
}

function checkOptionalFolderPath(rawPath: unknown, errors: string[]): string | undefined {
  const trimmed = asTrimmed(rawPath);
  if (!trimmed) return undefined;
  const folderCheck = validateMediaFolderPath(trimmed);
  if (!folderCheck.valid) {
    errors.push(...folderCheck.errors);
    return undefined;
  }
  return folderCheck.data;
}

function checkOptionalExternalUrl(rawUrl: unknown, errors: string[]): string | undefined {
  const trimmedUrl = asTrimmed(rawUrl);
  if (!trimmedUrl) return undefined;
  if (trimmedUrl.startsWith("/") && !trimmedUrl.startsWith("//")) {
    return trimmedUrl;
  }
  try {
    const parsed = new URL(trimmedUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      errors.push("externalDownloadUrl must use http or https");
      return undefined;
    }
    return parsed.toString();
  } catch {
    errors.push("externalDownloadUrl is not a valid URL");
    return undefined;
  }
}

function normalizeOptionalMediaId(
  key: string,
  val: unknown
): Record<string, number | string | null> {
  if (val === undefined) return {};
  return {
    [key]: typeof val === "number" || typeof val === "string" ? val : null,
  };
}

function parsePositiveInt(val: unknown): number | undefined {
  const num = Number(val);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : undefined;
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

function collectPublicationErrors(title: string, slug: string, summary: string): string[] {
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
  const slug = resolveSlug(raw.slug, title);
  const summary = asTrimmed(raw.summary);
  const errors = collectPublicationErrors(title, slug, summary);

  const mediaFolderPath = checkOptionalFolderPath(raw.mediaFolderPath, errors);
  const externalDownloadUrl = checkOptionalExternalUrl(raw.externalDownloadUrl, errors);

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
      category: pickCategory(raw.category, ALLOWED_PUBLICATION_CATEGORIES, "guide"),
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
      ...normalizeOptionalMediaId("file", raw.file ?? raw.fileId),
      ...normalizeOptionalMediaId("coverImage", raw.coverImage ?? raw.coverImageId),
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

function collectAlbumErrors(title: string, slug: string, description: string): string[] {
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
  rawPhotos: unknown
): { photos: Array<number | string> } | Record<string, never> {
  if (!Array.isArray(rawPhotos)) return {};
  return {
    photos: rawPhotos.filter(
      (id): id is number | string => typeof id === "number" || typeof id === "string"
    ),
  };
}

function parseFiniteInt(val: unknown, fallback = 0): number {
  const num = Number(val);
  return Number.isFinite(num) ? Math.round(num) : fallback;
}

export function validateGalleryAlbumInput(
  input: unknown
): ValidationResult<ValidatedGalleryAlbumInput> {
  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Gallery album payload must be an object"] };
  }
  const raw = input as Record<string, unknown>;
  const title = asTrimmed(raw.title);
  const slug = resolveSlug(raw.slug, title);
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
      category: pickCategory(raw.category, ALLOWED_GALLERY_CATEGORIES, "community"),
      eventDate: asSlicedOptString(raw.eventDate, 32),
      secondaryDateOverride: asSlicedOptString(raw.secondaryDateOverride, 80),
      mediaFolderId: parsePositiveInt(raw.mediaFolderId) ?? null,
      mediaFolderPath,
      photographerCredit: asSlicedOptString(raw.photographerCredit, 140),
      framingNotes: asSlicedOptString(raw.framingNotes, 500),
      featured: Boolean(raw.featured),
      sortOrder: parseFiniteInt(raw.sortOrder, 0),
      ...normalizeOptionalMediaId("coverPhoto", raw.coverPhoto ?? raw.coverPhotoId),
      ...normalizePhotoIdList(raw.photos ?? raw.photoIds),
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

function collectGlossaryErrors(term: string, slug: string, definition: string): string[] {
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
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim().slice(0, 80));
}

export function validateGlossaryTermInput(
  input: unknown
): ValidationResult<ValidatedGlossaryTermInput> {
  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Glossary term payload must be an object"] };
  }
  const raw = input as Record<string, unknown>;
  const term = asTrimmed(raw.term);
  const slug = resolveSlug(raw.slug, term);
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
      category: pickCategory(raw.category, ALLOWED_GLOSSARY_CATEGORIES, "general"),
      letterGroup: computeLetterGroup(term),
      relatedTerms: parseRelatedTerms(raw.relatedTerms),
      featured: Boolean(raw.featured),
      ...normalizeOptionalMediaId(
        "pronunciationAudio",
        raw.pronunciationAudio ?? raw.pronunciationAudioId
      ),
    },
  };
}
