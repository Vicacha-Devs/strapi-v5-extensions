import {
  ALLOWED_GALLERY_CATEGORIES,
  ALLOWED_GLOSSARY_CATEGORIES,
  ALLOWED_PUBLICATION_CATEGORIES,
} from './constants';
import { computeLetterGroup } from './mediaUtils';
import type {
  GalleryAlbumCategory,
  GlossaryCategory,
  PublicationCategory,
} from './types';

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
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

/**
 * Strictly validates a Strapi v5 Media Library folder path (`plugin::upload.folder.path`),
 * rejecting directory traversal (`..`) or backslashes.
 */
export function validateMediaFolderPath(rawPath: unknown): ValidationResult<string> {
  if (typeof rawPath !== 'string' || !rawPath.trim()) {
    return { valid: false, errors: ['Media folder path is required'] };
  }
  const trimmed = rawPath.trim();
  if (trimmed.includes('..') || trimmed.includes('\\')) {
    return {
      valid: false,
      errors: ['Media folder path must not contain traversal sequences'],
    };
  }
  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (!FOLDER_PATH_REGEX.test(normalized)) {
    return {
      valid: false,
      errors: ['Media folder path contains invalid characters'],
    };
  }
  return { valid: true, errors: [], data: normalized };
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
}

export function validatePublicationInput(
  input: unknown
): ValidationResult<ValidatedPublicationInput> {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Publication payload must be an object'] };
  }
  const raw = input as Record<string, unknown>;
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (title.length < 2 || title.length > 200) {
    errors.push('Title must be between 2 and 200 characters');
  }

  const slug =
    typeof raw.slug === 'string' && raw.slug.trim()
      ? raw.slug.trim().toLowerCase()
      : toSlug(title);
  if (!slug || !SLUG_REGEX.test(slug)) {
    errors.push('Slug must be lowercase alphanumeric with hyphens');
  }

  const summary = typeof raw.summary === 'string' ? raw.summary.trim() : '';
  if (summary.length < 5 || summary.length > 2000) {
    errors.push('Summary must be between 5 and 2000 characters');
  }

  const rawCategory =
    typeof raw.category === 'string'
      ? (raw.category.trim() as PublicationCategory)
      : 'guide';
  const category: PublicationCategory = ALLOWED_PUBLICATION_CATEGORIES.includes(
    rawCategory
  )
    ? rawCategory
    : 'guide';

  const languageCode =
    typeof raw.languageCode === 'string' && raw.languageCode.trim()
      ? raw.languageCode.trim().slice(0, 10)
      : 'es';

  let mediaFolderPath: string | undefined;
  if (typeof raw.mediaFolderPath === 'string' && raw.mediaFolderPath.trim()) {
    const folderCheck = validateMediaFolderPath(raw.mediaFolderPath);
    if (!folderCheck.valid) {
      errors.push(...folderCheck.errors);
    } else {
      mediaFolderPath = folderCheck.data;
    }
  }

  let externalDownloadUrl: string | undefined;
  if (
    typeof raw.externalDownloadUrl === 'string' &&
    raw.externalDownloadUrl.trim()
  ) {
    const trimmedUrl = raw.externalDownloadUrl.trim();
    if (trimmedUrl.startsWith('/') && !trimmedUrl.startsWith('//')) {
      externalDownloadUrl = trimmedUrl;
    } else {
      try {
        const parsed = new URL(trimmedUrl);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          errors.push('externalDownloadUrl must use http or https');
        } else {
          externalDownloadUrl = parsed.toString();
        }
      } catch {
        errors.push('externalDownloadUrl is not a valid URL');
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const pageCountNum = Number(raw.pageCount);

  return {
    valid: true,
    errors: [],
    data: {
      title,
      slug,
      summary,
      category,
      authorName:
        typeof raw.authorName === 'string' ? raw.authorName.trim().slice(0, 140) : undefined,
      isbnOrReference:
        typeof raw.isbnOrReference === 'string'
          ? raw.isbnOrReference.trim().slice(0, 80)
          : undefined,
      pageCount:
        Number.isFinite(pageCountNum) && pageCountNum > 0
          ? Math.round(pageCountNum)
          : undefined,
      languageCode,
      publishedAtDate:
        typeof raw.publishedAtDate === 'string'
          ? raw.publishedAtDate.trim().slice(0, 32)
          : undefined,
      secondaryDateOverride:
        typeof raw.secondaryDateOverride === 'string'
          ? raw.secondaryDateOverride.trim().slice(0, 80)
          : undefined,
      mediaFolderPath,
      featured: Boolean(raw.featured),
      allowPublicDownload: raw.allowPublicDownload !== false,
      externalDownloadUrl,
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
}

export function validateGalleryAlbumInput(
  input: unknown
): ValidationResult<ValidatedGalleryAlbumInput> {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Gallery album payload must be an object'] };
  }
  const raw = input as Record<string, unknown>;
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (title.length < 2 || title.length > 200) {
    errors.push('Album title must be between 2 and 200 characters');
  }

  const slug =
    typeof raw.slug === 'string' && raw.slug.trim()
      ? raw.slug.trim().toLowerCase()
      : toSlug(title);
  if (!slug || !SLUG_REGEX.test(slug)) {
    errors.push('Album slug must be lowercase alphanumeric with hyphens');
  }

  const description =
    typeof raw.description === 'string' ? raw.description.trim() : '';
  if (description.length < 5 || description.length > 2000) {
    errors.push('Album description must be between 5 and 2000 characters');
  }

  const rawCategory =
    typeof raw.category === 'string'
      ? (raw.category.trim() as GalleryAlbumCategory)
      : 'community';
  const category: GalleryAlbumCategory = ALLOWED_GALLERY_CATEGORIES.includes(
    rawCategory
  )
    ? rawCategory
    : 'community';

  let mediaFolderPath: string | undefined;
  if (typeof raw.mediaFolderPath === 'string' && raw.mediaFolderPath.trim()) {
    const folderCheck = validateMediaFolderPath(raw.mediaFolderPath);
    if (!folderCheck.valid) {
      errors.push(...folderCheck.errors);
    } else {
      mediaFolderPath = folderCheck.data;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const folderIdNum = Number(raw.mediaFolderId);
  const sortOrderNum = Number(raw.sortOrder ?? 0);

  return {
    valid: true,
    errors: [],
    data: {
      title,
      slug,
      description,
      category,
      eventDate:
        typeof raw.eventDate === 'string' ? raw.eventDate.trim().slice(0, 32) : undefined,
      secondaryDateOverride:
        typeof raw.secondaryDateOverride === 'string'
          ? raw.secondaryDateOverride.trim().slice(0, 80)
          : undefined,
      mediaFolderId:
        Number.isFinite(folderIdNum) && folderIdNum > 0
          ? Math.round(folderIdNum)
          : null,
      mediaFolderPath,
      photographerCredit:
        typeof raw.photographerCredit === 'string'
          ? raw.photographerCredit.trim().slice(0, 140)
          : undefined,
      framingNotes:
        typeof raw.framingNotes === 'string'
          ? raw.framingNotes.trim().slice(0, 500)
          : undefined,
      featured: Boolean(raw.featured),
      sortOrder: Number.isFinite(sortOrderNum) ? Math.round(sortOrderNum) : 0,
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
}

export function validateGlossaryTermInput(
  input: unknown
): ValidationResult<ValidatedGlossaryTermInput> {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Glossary term payload must be an object'] };
  }
  const raw = input as Record<string, unknown>;
  const term = typeof raw.term === 'string' ? raw.term.trim() : '';
  if (term.length < 2 || term.length > 120) {
    errors.push('Term must be between 2 and 120 characters');
  }

  const slug =
    typeof raw.slug === 'string' && raw.slug.trim()
      ? raw.slug.trim().toLowerCase()
      : toSlug(term);
  if (!slug || !SLUG_REGEX.test(slug)) {
    errors.push('Glossary slug must be lowercase alphanumeric with hyphens');
  }

  const definition =
    typeof raw.definition === 'string' ? raw.definition.trim() : '';
  if (definition.length < 5 || definition.length > 4000) {
    errors.push('Definition must be between 5 and 4000 characters');
  }

  const rawCategory =
    typeof raw.category === 'string'
      ? (raw.category.trim() as GlossaryCategory)
      : 'general';
  const category: GlossaryCategory = ALLOWED_GLOSSARY_CATEGORIES.includes(
    rawCategory
  )
    ? rawCategory
    : 'general';

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const relatedTerms = Array.isArray(raw.relatedTerms)
    ? raw.relatedTerms
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim().slice(0, 80))
    : [];

  return {
    valid: true,
    errors: [],
    data: {
      term,
      slug,
      nativeScript:
        typeof raw.nativeScript === 'string'
          ? raw.nativeScript.trim().slice(0, 200)
          : undefined,
      transliteration:
        typeof raw.transliteration === 'string'
          ? raw.transliteration.trim().slice(0, 200)
          : undefined,
      definition,
      category,
      letterGroup: computeLetterGroup(term),
      relatedTerms,
      featured: Boolean(raw.featured),
    },
  };
}
