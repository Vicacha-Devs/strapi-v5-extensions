import type { Core } from "@strapi/strapi";

import {
  ALLOWED_PUBLICATION_CATEGORIES,
  CONTENT_TYPE_UIDS,
  PLUGIN_ID,
  validatePublicationInput,
  type DownloadTicketResult,
  type PublicationCategory,
  type PublicationRecord,
  type ResourcesPluginSettings,
} from "../../../shared";
import {
  clampListWindow,
  incrementPublicationDownloadCount,
  MAX_SCAN_WINDOW,
  resolveDocumentTargetStatus,
  seedDefaultCatalogRecords,
  withDocumentLock,
} from "./catalogHelpers";
import {
  assertPublicationDownloadable,
  buildDownloadTicket,
  findExistingDocumentOrThrow,
  mergeRecordPayload,
  normalizePublicationRow,
  resolvePublicationDownloadUrl,
} from "./catalogNormalizers";
import {
  computeTicketExpiryMs,
  resolveDownloadSecret,
  signDownloadTicket,
} from "./downloadTicketSigner";
import { ResourceNotFoundError, ResourceValidationError } from "./errors";
import {
  createGalleryAndGlossaryOps,
  safeScalarString,
} from "./glossaryAlbumOps";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettings = async (): Promise<ResourcesPluginSettings> => {
    const svc = strapi.plugin(PLUGIN_ID).service("settings") as {
      getSettings: () => Promise<ResourcesPluginSettings>;
    };
    return svc.getSettings();
  };

  const galleryAndGlossaryOps = createGalleryAndGlossaryOps(
    strapi,
    getSettings
  );

  return {
    async listPublications(params?: {
      locale?: string;
      category?: string;
      featured?: boolean;
      q?: string;
      page?: number;
      pageSize?: number;
      limit?: number;
      publishedOnly?: boolean;
    }): Promise<PublicationRecord[]> {
      const settings = await getSettings();
      const publishedOnly = params?.publishedOnly !== false;
      const locale = safeScalarString(params?.locale, 35);
      const category = safeScalarString(params?.category, 40);
      const q = safeScalarString(params?.q, 120);
      const { offset, pageSize, fetchLimit } = clampListWindow(params);

      const filters: Record<string, unknown> = {};
      if (category) {
        if (
          !ALLOWED_PUBLICATION_CATEGORIES.includes(
            category as PublicationCategory
          )
        ) {
          return [];
        }
        filters.category = category;
      }
      if (typeof params?.featured === "boolean") {
        filters.featured = params.featured;
      }

      const rows = (await strapi
        .documents(CONTENT_TYPE_UIDS.publication)
        .findMany({
          ...(locale ? { locale } : {}),
          ...(publishedOnly ? { status: "published" } : {}),
          filters,
          limit: q ? MAX_SCAN_WINDOW : fetchLimit,
          populate: ["file", "coverImage"],
          sort: { featured: "desc", publishedAtDate: "desc" },
        })) as Record<string, unknown>[];

      if (offset >= MAX_SCAN_WINDOW) {
        return [];
      }

      let normalized = (rows || []).map((row) =>
        normalizePublicationRow(row, settings)
      );
      if (q) {
        const needle = q.toLowerCase();
        normalized = normalized.filter(
          (item) =>
            item.title.toLowerCase().includes(needle) ||
            item.summary.toLowerCase().includes(needle) ||
            (item.authorName && item.authorName.toLowerCase().includes(needle))
        );
      }
      return normalized.slice(offset, offset + pageSize);
    },

    async getPublicationBySlug(
      slug: string,
      locale?: string,
      options?: { publishedOnly?: boolean }
    ): Promise<PublicationRecord | null> {
      const safeSlug = safeScalarString(slug, 120);
      if (!safeSlug) return null;
      const safeLocale = safeScalarString(locale, 35);
      const publishedOnly = options?.publishedOnly !== false;
      const settings = await getSettings();

      const rows = (await strapi
        .documents(CONTENT_TYPE_UIDS.publication)
        .findMany({
          ...(safeLocale ? { locale: safeLocale } : {}),
          ...(publishedOnly ? { status: "published" } : {}),
          filters: { slug: safeSlug },
          limit: 1,
          populate: ["file", "coverImage"],
        })) as Record<string, unknown>[];

      const row = rows?.[0];
      return row ? normalizePublicationRow(row, settings) : null;
    },

    async createPublication(
      payload: unknown,
      locale?: string
    ): Promise<PublicationRecord> {
      const validation = validatePublicationInput(payload);
      if (!validation.valid || !validation.data) {
        throw new ResourceValidationError(validation.errors.join("; "));
      }
      const safeLocale = safeScalarString(locale, 35);
      const settings = await getSettings();
      const created = (await strapi
        .documents(CONTENT_TYPE_UIDS.publication)
        .create({
          ...(safeLocale ? { locale: safeLocale } : {}),
          status: "published",
          data: {
            ...validation.data,
            downloadCount: 0,
          },
          populate: ["file", "coverImage"],
        })) as Record<string, unknown>;
      return normalizePublicationRow(created, settings);
    },

    async updatePublication(
      documentId: string,
      payload: unknown,
      locale?: string
    ): Promise<PublicationRecord> {
      const safeDocId = safeScalarString(documentId, 120);
      if (!safeDocId) {
        throw new ResourceValidationError("Publication documentId is required");
      }
      const safeLocale = safeScalarString(locale, 35);
      const docs = strapi.documents(CONTENT_TYPE_UIDS.publication);
      const existing = await findExistingDocumentOrThrow(
        docs,
        safeDocId,
        safeLocale,
        ["file", "coverImage"],
        "Publication"
      );

      const merged = mergeRecordPayload(existing, payload);
      const validation = validatePublicationInput(merged);
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
        populate: ["file", "coverImage"],
      })) as Record<string, unknown>;
      return normalizePublicationRow(updated || merged, settings);
    },

    async deletePublication(documentId: string): Promise<{ deleted: boolean }> {
      const safeDocId = safeScalarString(documentId, 120);
      if (!safeDocId) {
        throw new ResourceValidationError("Publication documentId is required");
      }
      const docs = strapi.documents(CONTENT_TYPE_UIDS.publication);
      await findExistingDocumentOrThrow(
        docs,
        safeDocId,
        undefined,
        [],
        "Publication"
      );
      if (typeof docs.delete === "function") {
        await docs.delete({ documentId: safeDocId });
      }
      return { deleted: true };
    },

    async recordPublicationDownload(
      slug: string,
      locale?: string
    ): Promise<DownloadTicketResult> {
      const safeSlug = safeScalarString(slug, 120);
      if (!safeSlug) {
        throw new ResourceNotFoundError("Publication not found");
      }
      const safeLocale = safeScalarString(locale, 35);
      const lockKey = safeSlug.toLowerCase();

      return withDocumentLock(lockKey, async () => {
        const settings = await getSettings();
        const rows = (await strapi
          .documents(CONTENT_TYPE_UIDS.publication)
          .findMany({
            ...(safeLocale ? { locale: safeLocale } : {}),
            status: "published",
            filters: { slug: safeSlug },
            limit: 1,
            populate: ["file", "coverImage"],
          })) as Record<string, unknown>[];

        const row = rows?.[0];
        if (!row) {
          throw new ResourceNotFoundError(
            `Publication "${safeSlug}" not found`
          );
        }

        const record = normalizePublicationRow(row, settings);
        assertPublicationDownloadable(record, safeSlug, settings);
        const downloadUrl = resolvePublicationDownloadUrl(record, safeSlug);
        const secret = resolveDownloadSecret(strapi);

        const nextCount = await incrementPublicationDownloadCount(
          strapi,
          record.documentId,
          safeLocale,
          record.downloadCount
        );

        const expiresAt = computeTicketExpiryMs();
        const ticketDocId = record.documentId || record.slug;
        const signature = signDownloadTicket(
          {
            documentId: ticketDocId,
            slug: record.slug,
            downloadUrl,
            expiresAt,
          },
          secret
        );

        return buildDownloadTicket(
          record,
          downloadUrl,
          nextCount,
          expiresAt,
          signature
        );
      });
    },

    ...galleryAndGlossaryOps,

    async seedDefaultResources(): Promise<void> {
      await seedDefaultCatalogRecords(strapi);
    },
  };
};
