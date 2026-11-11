import type { Core } from "@strapi/strapi";

import {
  ALLOWED_GALLERY_CATEGORIES,
  ALLOWED_GLOSSARY_CATEGORIES,
  CONTENT_TYPE_UIDS,
  validateGalleryAlbumInput,
  validateGlossaryTermInput,
  type GalleryAlbumCategory,
  type GalleryAlbumRecord,
  type GlossaryCategory,
  type GlossaryTermRecord,
  type ResourcesPluginSettings,
} from "../../../shared";
import {
  clampListWindow,
  MAX_SCAN_WINDOW,
  resolveDocumentTargetStatus,
} from "./catalogHelpers";
import {
  buildGalleryAlbumUpdateData,
  findExistingDocumentOrThrow,
  mergeRecordPayload,
  normalizeGalleryAlbumRow,
  normalizeGlossaryTermRow,
} from "./catalogNormalizers";
import { ResourceValidationError } from "./errors";

export function safeScalarString(
  val: unknown,
  maxLen = 120
): string | undefined {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim();
  return trimmed ? trimmed.slice(0, maxLen) : undefined;
}

export function createGalleryAndGlossaryOps(
  strapi: Core.Strapi,
  getSettings: () => Promise<ResourcesPluginSettings>
) {
  return {
    async listGalleryAlbums(params?: {
      locale?: string;
      category?: string;
      featured?: boolean;
      page?: number;
      pageSize?: number;
      limit?: number;
      publishedOnly?: boolean;
    }): Promise<GalleryAlbumRecord[]> {
      const settings = await getSettings();
      const publishedOnly = params?.publishedOnly !== false;
      const locale = safeScalarString(params?.locale, 35);
      const category = safeScalarString(params?.category, 40);
      const { offset, pageSize, fetchLimit } = clampListWindow(params);

      const filters: Record<string, unknown> = {};
      if (category) {
        if (
          !ALLOWED_GALLERY_CATEGORIES.includes(category as GalleryAlbumCategory)
        ) {
          return [];
        }
        filters.category = category;
      }
      if (typeof params?.featured === "boolean") {
        filters.featured = params.featured;
      }

      const rows = (await strapi
        .documents(CONTENT_TYPE_UIDS.galleryAlbum)
        .findMany({
          ...(locale ? { locale } : {}),
          ...(publishedOnly ? { status: "published" } : {}),
          filters,
          limit: fetchLimit,
          populate: ["coverPhoto", "photos"],
          sort: { sortOrder: "asc", eventDate: "desc" },
        })) as Record<string, unknown>[];

      if (offset >= MAX_SCAN_WINDOW) {
        return [];
      }

      return (rows || [])
        .map((row) => normalizeGalleryAlbumRow(row, settings))
        .slice(offset, offset + pageSize);
    },

    async getGalleryAlbumBySlug(
      slug: string,
      locale?: string,
      options?: { publishedOnly?: boolean }
    ): Promise<GalleryAlbumRecord | null> {
      const safeSlug = safeScalarString(slug, 120);
      if (!safeSlug) return null;
      const safeLocale = safeScalarString(locale, 35);
      const publishedOnly = options?.publishedOnly !== false;
      const settings = await getSettings();

      const rows = (await strapi
        .documents(CONTENT_TYPE_UIDS.galleryAlbum)
        .findMany({
          ...(safeLocale ? { locale: safeLocale } : {}),
          ...(publishedOnly ? { status: "published" } : {}),
          filters: { slug: safeSlug },
          limit: 1,
          populate: ["coverPhoto", "photos"],
        })) as Record<string, unknown>[];

      const row = rows?.[0];
      return row ? normalizeGalleryAlbumRow(row, settings) : null;
    },

    async createGalleryAlbum(
      payload: unknown,
      locale?: string
    ): Promise<GalleryAlbumRecord> {
      const validation = validateGalleryAlbumInput(payload);
      if (!validation.valid || !validation.data) {
        throw new ResourceValidationError(validation.errors.join("; "));
      }
      const settings = await getSettings();
      const photoIds = validation.data.photos || [];
      const maxPhotos = settings.maxPhotosPerAlbum || 60;
      if (photoIds.length > maxPhotos) {
        throw new ResourceValidationError(
          `Album exceeds maxPhotosPerAlbum limit (${maxPhotos})`
        );
      }

      const safeLocale = safeScalarString(locale, 35);
      const created = (await strapi
        .documents(CONTENT_TYPE_UIDS.galleryAlbum)
        .create({
          ...(safeLocale ? { locale: safeLocale } : {}),
          status: "published",
          data: {
            ...validation.data,
            ...(photoIds.length > 0 && !validation.data.coverPhoto
              ? { coverPhoto: photoIds[0] }
              : {}),
            photoCount: photoIds.length,
          },
          populate: ["coverPhoto", "photos"],
        })) as Record<string, unknown>;
      return normalizeGalleryAlbumRow(created, settings);
    },

    async updateGalleryAlbum(
      documentId: string,
      payload: unknown,
      locale?: string
    ): Promise<GalleryAlbumRecord> {
      const safeDocId = safeScalarString(documentId, 120);
      if (!safeDocId) {
        throw new ResourceValidationError(
          "Gallery album documentId is required"
        );
      }
      const safeLocale = safeScalarString(locale, 35);
      const docs = strapi.documents(CONTENT_TYPE_UIDS.galleryAlbum);
      const existing = await findExistingDocumentOrThrow(
        docs,
        safeDocId,
        safeLocale,
        ["coverPhoto", "photos"],
        "Gallery album"
      );

      const merged = mergeRecordPayload(existing, payload);
      const validation = validateGalleryAlbumInput(merged);
      if (!validation.valid || !validation.data) {
        throw new ResourceValidationError(validation.errors.join("; "));
      }

      const settings = await getSettings();
      const maxPhotos = settings.maxPhotosPerAlbum || 60;
      if (
        Array.isArray(validation.data.photos) &&
        validation.data.photos.length > maxPhotos
      ) {
        throw new ResourceValidationError(
          `Album exceeds maxPhotosPerAlbum limit (${maxPhotos})`
        );
      }

      const targetStatus = await resolveDocumentTargetStatus(
        docs,
        safeDocId,
        safeLocale
      );
      const updated = (await docs.update({
        documentId: safeDocId,
        ...(safeLocale ? { locale: safeLocale } : {}),
        status: targetStatus,
        data: buildGalleryAlbumUpdateData(validation.data, existing),
        populate: ["coverPhoto", "photos"],
      })) as Record<string, unknown>;
      return normalizeGalleryAlbumRow(updated || merged, settings);
    },

    async deleteGalleryAlbum(
      documentId: string
    ): Promise<{ deleted: boolean }> {
      const safeDocId = safeScalarString(documentId, 120);
      if (!safeDocId) {
        throw new ResourceValidationError(
          "Gallery album documentId is required"
        );
      }
      const docs = strapi.documents(CONTENT_TYPE_UIDS.galleryAlbum);
      await findExistingDocumentOrThrow(
        docs,
        safeDocId,
        undefined,
        [],
        "Gallery album"
      );
      if (typeof docs.delete === "function") {
        await docs.delete({ documentId: safeDocId });
      }
      return { deleted: true };
    },

    async listGlossaryTerms(params?: {
      locale?: string;
      category?: string;
      letterGroup?: string;
      q?: string;
      page?: number;
      pageSize?: number;
      limit?: number;
      publishedOnly?: boolean;
    }): Promise<GlossaryTermRecord[]> {
      const settings = await getSettings();
      const publishedOnly = params?.publishedOnly !== false;
      const locale = safeScalarString(params?.locale, 35);
      const category = safeScalarString(params?.category, 40);
      const letterGroup = safeScalarString(params?.letterGroup, 4);
      const q = safeScalarString(params?.q, 120);
      const { offset, pageSize, fetchLimit } = clampListWindow(params);

      const filters: Record<string, unknown> = {};
      if (category) {
        if (
          !ALLOWED_GLOSSARY_CATEGORIES.includes(category as GlossaryCategory)
        ) {
          return [];
        }
        filters.category = category;
      }
      if (letterGroup) {
        filters.letterGroup = letterGroup.toUpperCase();
      }

      const rows = (await strapi
        .documents(CONTENT_TYPE_UIDS.glossaryTerm)
        .findMany({
          ...(locale ? { locale } : {}),
          ...(publishedOnly ? { status: "published" } : {}),
          filters,
          limit: q ? MAX_SCAN_WINDOW : fetchLimit,
          populate: ["pronunciationAudio"],
          sort: { letterGroup: "asc", term: "asc" },
        })) as Record<string, unknown>[];

      if (offset >= MAX_SCAN_WINDOW) {
        return [];
      }

      let normalized = (rows || []).map((row) =>
        normalizeGlossaryTermRow(row, settings)
      );
      if (q) {
        const needle = q.toLowerCase();
        normalized = normalized.filter(
          (item) =>
            item.term.toLowerCase().includes(needle) ||
            item.definition.toLowerCase().includes(needle) ||
            (item.transliteration &&
              item.transliteration.toLowerCase().includes(needle))
        );
      }
      return normalized.slice(offset, offset + pageSize);
    },

    async createGlossaryTerm(
      payload: unknown,
      locale?: string
    ): Promise<GlossaryTermRecord> {
      const validation = validateGlossaryTermInput(payload);
      if (!validation.valid || !validation.data) {
        throw new ResourceValidationError(validation.errors.join("; "));
      }
      const safeLocale = safeScalarString(locale, 35);
      const settings = await getSettings();
      const created = (await strapi
        .documents(CONTENT_TYPE_UIDS.glossaryTerm)
        .create({
          ...(safeLocale ? { locale: safeLocale } : {}),
          status: "published",
          data: { ...validation.data },
          populate: ["pronunciationAudio"],
        })) as Record<string, unknown>;
      return normalizeGlossaryTermRow(created, settings);
    },

    async updateGlossaryTerm(
      documentId: string,
      payload: unknown,
      locale?: string
    ): Promise<GlossaryTermRecord> {
      const safeDocId = safeScalarString(documentId, 120);
      if (!safeDocId) {
        throw new ResourceValidationError(
          "Glossary term documentId is required"
        );
      }
      const safeLocale = safeScalarString(locale, 35);
      const docs = strapi.documents(CONTENT_TYPE_UIDS.glossaryTerm);
      const existing = await findExistingDocumentOrThrow(
        docs,
        safeDocId,
        safeLocale,
        ["pronunciationAudio"],
        "Glossary term"
      );

      const merged = mergeRecordPayload(existing, payload);
      const validation = validateGlossaryTermInput(merged);
      if (!validation.valid || !validation.data) {
        throw new ResourceValidationError(validation.errors.join("; "));
      }

      const targetStatus = await resolveDocumentTargetStatus(
        docs,
        safeDocId,
        safeLocale
      );
      const settings = await getSettings();
      const updated = (await docs.update({
        documentId: safeDocId,
        ...(safeLocale ? { locale: safeLocale } : {}),
        status: targetStatus,
        data: { ...validation.data },
        populate: ["pronunciationAudio"],
      })) as Record<string, unknown>;
      return normalizeGlossaryTermRow(updated || merged, settings);
    },

    async deleteGlossaryTerm(
      documentId: string
    ): Promise<{ deleted: boolean }> {
      const safeDocId = safeScalarString(documentId, 120);
      if (!safeDocId) {
        throw new ResourceValidationError(
          "Glossary term documentId is required"
        );
      }
      const docs = strapi.documents(CONTENT_TYPE_UIDS.glossaryTerm);
      await findExistingDocumentOrThrow(
        docs,
        safeDocId,
        undefined,
        [],
        "Glossary term"
      );
      if (typeof docs.delete === "function") {
        await docs.delete({ documentId: safeDocId });
      }
      return { deleted: true };
    },
  };
}
