import type { Core } from '@strapi/strapi';
import {
  CONTENT_TYPE_UIDS,
  PLUGIN_ID,
  validateGalleryAlbumInput,
  validateGlossaryTermInput,
  validatePublicationInput,
  type DownloadTicketResult,
  type GalleryAlbumRecord,
  type GlossaryTermRecord,
  type PublicationRecord,
  type ResourcesPluginSettings,
} from '../../../shared';
import {
  assertPublicationDownloadable,
  buildDownloadTicket,
  buildGalleryAlbumUpdateData,
  findExistingDocumentOrThrow,
  mergeRecordPayload,
  normalizeGalleryAlbumRow,
  normalizeGlossaryTermRow,
  normalizePublicationRow,
  resolvePublicationDownloadUrl,
} from './catalogNormalizers';
import {
  DEFAULT_SEED_GALLERY_ALBUMS,
  DEFAULT_SEED_GLOSSARY_TERMS,
  DEFAULT_SEED_PUBLICATIONS,
} from './seedData';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettings = async (): Promise<ResourcesPluginSettings> => {
    const svc = strapi.plugin(PLUGIN_ID).service('settings') as {
      getSettings: () => Promise<ResourcesPluginSettings>;
    };
    return svc.getSettings();
  };

  return {
    async listPublications(params?: {
      locale?: string;
      category?: string;
      featured?: boolean;
      q?: string;
    }): Promise<PublicationRecord[]> {
      const settings = await getSettings();
      const filters: Record<string, unknown> = {};
      if (params?.category) filters.category = params.category;
      if (typeof params?.featured === 'boolean') filters.featured = params.featured;

      const rows = (await strapi
        .documents(CONTENT_TYPE_UIDS.publication)
        .findMany({
          ...(params?.locale ? { locale: params.locale } : {}),
          filters: filters as never,
          populate: ['file', 'coverImage'],
          sort: { featured: 'desc', publishedAtDate: 'desc' },
        })) as Record<string, unknown>[];

      let normalized = (rows || []).map((row) =>
        normalizePublicationRow(row, settings)
      );
      if (params?.q && params.q.trim()) {
        const needle = params.q.trim().toLowerCase();
        normalized = normalized.filter(
          (item) =>
            item.title.toLowerCase().includes(needle) ||
            item.summary.toLowerCase().includes(needle) ||
            (item.authorName && item.authorName.toLowerCase().includes(needle))
        );
      }
      return normalized;
    },

    async getPublicationBySlug(
      slug: string,
      locale?: string
    ): Promise<PublicationRecord | null> {
      const list = await this.listPublications({ locale });
      return list.find((item) => item.slug === slug) || null;
    },

    async createPublication(
      payload: unknown,
      locale?: string
    ): Promise<PublicationRecord> {
      const validation = validatePublicationInput(payload);
      if (!validation.valid || !validation.data) {
        throw new Error(validation.errors.join('; '));
      }
      const settings = await getSettings();
      const created = (await strapi
        .documents(CONTENT_TYPE_UIDS.publication)
        .create({
          ...(locale ? { locale } : {}),
          data: {
            ...validation.data,
            downloadCount: 0,
          } as never,
          populate: ['file', 'coverImage'],
        })) as Record<string, unknown>;
      return normalizePublicationRow(created, settings);
    },

    async updatePublication(
      documentId: string,
      payload: unknown,
      locale?: string
    ): Promise<PublicationRecord> {
      if (!documentId) {
        throw new Error('Publication documentId is required');
      }
      const docs = strapi.documents(CONTENT_TYPE_UIDS.publication);
      const existing = (await docs.findOne({
        documentId,
        ...(locale ? { locale } : {}),
        populate: ['file', 'coverImage'],
      })) as Record<string, unknown> | null;
      if (!existing) {
        throw new Error(`Publication "${documentId}" not found`);
      }

      const merged = {
        ...existing,
        ...(payload && typeof payload === 'object' ? payload : {}),
      };
      const validation = validatePublicationInput(merged);
      if (!validation.valid || !validation.data) {
        throw new Error(validation.errors.join('; '));
      }

      const settings = await getSettings();
      const updated = (await docs.update({
        documentId,
        ...(locale ? { locale } : {}),
        data: validation.data as never,
        populate: ['file', 'coverImage'],
      })) as Record<string, unknown>;
      return normalizePublicationRow(updated || merged, settings);
    },

    async deletePublication(documentId: string): Promise<{ deleted: boolean }> {
      if (!documentId) {
        throw new Error('Publication documentId is required');
      }
      const docs = strapi.documents(CONTENT_TYPE_UIDS.publication) as unknown as {
        delete?: (opts: { documentId: string }) => Promise<unknown>;
      };
      if (typeof docs.delete === 'function') {
        await docs.delete({ documentId });
      }
      return { deleted: true };
    },

    async recordPublicationDownload(
      slug: string,
      locale?: string
    ): Promise<DownloadTicketResult> {
      const settings = await getSettings();
      const rows = (await strapi
        .documents(CONTENT_TYPE_UIDS.publication)
        .findMany({
          ...(locale ? { locale } : {}),
          filters: { slug },
          populate: ['file', 'coverImage'],
        })) as Record<string, unknown>[];

      const row = rows?.[0];
      if (!row) {
        throw new Error(`Publication "${slug}" not found`);
      }

      const record = normalizePublicationRow(row, settings);
      assertPublicationDownloadable(record, slug, settings);

      const downloadUrl = resolvePublicationDownloadUrl(record, slug);
      const nextCount = (record.downloadCount || 0) + 1;
      if (record.documentId) {
        await strapi.documents(CONTENT_TYPE_UIDS.publication).update({
          documentId: record.documentId,
          ...(locale ? { locale } : {}),
          data: { downloadCount: nextCount } as never,
        });
      }

      return buildDownloadTicket(record, downloadUrl, nextCount);
    },

    async listGalleryAlbums(params?: {
      locale?: string;
      category?: string;
      featured?: boolean;
    }): Promise<GalleryAlbumRecord[]> {
      const settings = await getSettings();
      const filters: Record<string, unknown> = {};
      if (params?.category) filters.category = params.category;
      if (typeof params?.featured === 'boolean') filters.featured = params.featured;

      const rows = (await strapi
        .documents(CONTENT_TYPE_UIDS.galleryAlbum)
        .findMany({
          ...(params?.locale ? { locale: params.locale } : {}),
          filters: filters as never,
          populate: ['coverPhoto', 'photos'],
          sort: { sortOrder: 'asc', eventDate: 'desc' },
        })) as Record<string, unknown>[];

      return (rows || []).map((row) => normalizeGalleryAlbumRow(row, settings));
    },

    async getGalleryAlbumBySlug(
      slug: string,
      locale?: string
    ): Promise<GalleryAlbumRecord | null> {
      const list = await this.listGalleryAlbums({ locale });
      return list.find((item) => item.slug === slug) || null;
    },

    async createGalleryAlbum(
      payload: unknown,
      locale?: string
    ): Promise<GalleryAlbumRecord> {
      const validation = validateGalleryAlbumInput(payload);
      if (!validation.valid || !validation.data) {
        throw new Error(validation.errors.join('; '));
      }
      const settings = await getSettings();
      const photoIds = validation.data.photos || [];
      const created = (await strapi
        .documents(CONTENT_TYPE_UIDS.galleryAlbum)
        .create({
          ...(locale ? { locale } : {}),
          data: {
            ...validation.data,
            ...(photoIds.length > 0 && !validation.data.coverPhoto
              ? { coverPhoto: photoIds[0] }
              : {}),
            photoCount: photoIds.length,
          } as never,
          populate: ['coverPhoto', 'photos'],
        })) as Record<string, unknown>;
      return normalizeGalleryAlbumRow(created, settings);
    },

    async updateGalleryAlbum(
      documentId: string,
      payload: unknown,
      locale?: string
    ): Promise<GalleryAlbumRecord> {
      if (!documentId) {
        throw new Error('Gallery album documentId is required');
      }
      const docs = strapi.documents(CONTENT_TYPE_UIDS.galleryAlbum);
      const existing = await findExistingDocumentOrThrow(
        docs,
        documentId,
        locale,
        ['coverPhoto', 'photos'],
        'Gallery album'
      );

      const merged = mergeRecordPayload(existing, payload);
      const validation = validateGalleryAlbumInput(merged);
      if (!validation.valid || !validation.data) {
        throw new Error(validation.errors.join('; '));
      }

      const settings = await getSettings();
      const updated = (await docs.update({
        documentId,
        ...(locale ? { locale } : {}),
        data: buildGalleryAlbumUpdateData(validation.data, existing) as never,
        populate: ['coverPhoto', 'photos'],
      })) as Record<string, unknown>;
      return normalizeGalleryAlbumRow(updated || merged, settings);
    },

    async deleteGalleryAlbum(documentId: string): Promise<{ deleted: boolean }> {
      if (!documentId) {
        throw new Error('Gallery album documentId is required');
      }
      const docs = strapi.documents(CONTENT_TYPE_UIDS.galleryAlbum) as unknown as {
        delete?: (opts: { documentId: string }) => Promise<unknown>;
      };
      if (typeof docs.delete === 'function') {
        await docs.delete({ documentId });
      }
      return { deleted: true };
    },

    async listGlossaryTerms(params?: {
      locale?: string;
      category?: string;
      letterGroup?: string;
      q?: string;
    }): Promise<GlossaryTermRecord[]> {
      const settings = await getSettings();
      const filters: Record<string, unknown> = {};
      if (params?.category) filters.category = params.category;
      if (params?.letterGroup) {
        filters.letterGroup = params.letterGroup.toUpperCase();
      }

      const rows = (await strapi
        .documents(CONTENT_TYPE_UIDS.glossaryTerm)
        .findMany({
          ...(params?.locale ? { locale: params.locale } : {}),
          filters: filters as never,
          populate: ['pronunciationAudio'],
          sort: { letterGroup: 'asc', term: 'asc' },
        })) as Record<string, unknown>[];

      let normalized = (rows || []).map((row) =>
        normalizeGlossaryTermRow(row, settings)
      );
      if (params?.q && params.q.trim()) {
        const needle = params.q.trim().toLowerCase();
        normalized = normalized.filter(
          (item) =>
            item.term.toLowerCase().includes(needle) ||
            item.definition.toLowerCase().includes(needle) ||
            (item.transliteration &&
              item.transliteration.toLowerCase().includes(needle))
        );
      }
      return normalized;
    },

    async createGlossaryTerm(
      payload: unknown,
      locale?: string
    ): Promise<GlossaryTermRecord> {
      const validation = validateGlossaryTermInput(payload);
      if (!validation.valid || !validation.data) {
        throw new Error(validation.errors.join('; '));
      }
      const settings = await getSettings();
      const created = (await strapi
        .documents(CONTENT_TYPE_UIDS.glossaryTerm)
        .create({
          ...(locale ? { locale } : {}),
          data: validation.data as never,
          populate: ['pronunciationAudio'],
        })) as Record<string, unknown>;
      return normalizeGlossaryTermRow(created, settings);
    },

    async updateGlossaryTerm(
      documentId: string,
      payload: unknown,
      locale?: string
    ): Promise<GlossaryTermRecord> {
      if (!documentId) {
        throw new Error('Glossary term documentId is required');
      }
      const docs = strapi.documents(CONTENT_TYPE_UIDS.glossaryTerm);
      const existing = (await docs.findOne({
        documentId,
        ...(locale ? { locale } : {}),
        populate: ['pronunciationAudio'],
      })) as Record<string, unknown> | null;
      if (!existing) {
        throw new Error(`Glossary term "${documentId}" not found`);
      }

      const merged = {
        ...existing,
        ...(payload && typeof payload === 'object' ? payload : {}),
      };
      const validation = validateGlossaryTermInput(merged);
      if (!validation.valid || !validation.data) {
        throw new Error(validation.errors.join('; '));
      }

      const settings = await getSettings();
      const updated = (await docs.update({
        documentId,
        ...(locale ? { locale } : {}),
        data: validation.data as never,
        populate: ['pronunciationAudio'],
      })) as Record<string, unknown>;
      return normalizeGlossaryTermRow(updated || merged, settings);
    },

    async deleteGlossaryTerm(documentId: string): Promise<{ deleted: boolean }> {
      if (!documentId) {
        throw new Error('Glossary term documentId is required');
      }
      const docs = strapi.documents(CONTENT_TYPE_UIDS.glossaryTerm) as unknown as {
        delete?: (opts: { documentId: string }) => Promise<unknown>;
      };
      if (typeof docs.delete === 'function') {
        await docs.delete({ documentId });
      }
      return { deleted: true };
    },

    async seedDefaultResources(): Promise<void> {
      const pubDocs = strapi.documents(CONTENT_TYPE_UIDS.publication);
      const existingPubs = await pubDocs.findMany({ locale: 'es' });
      if (!existingPubs || existingPubs.length === 0) {
        for (const item of DEFAULT_SEED_PUBLICATIONS) {
          const { locale, ...data } = item;
          await pubDocs.create({
            locale,
            data: { ...data, downloadCount: 0 } as never,
          });
        }
      }

      const albumDocs = strapi.documents(CONTENT_TYPE_UIDS.galleryAlbum);
      const existingAlbums = await albumDocs.findMany({ locale: 'es' });
      if (!existingAlbums || existingAlbums.length === 0) {
        for (const item of DEFAULT_SEED_GALLERY_ALBUMS) {
          const { locale, ...data } = item;
          await albumDocs.create({
            locale,
            data: { ...data, photoCount: 0 } as never,
          });
        }
      }

      const glossaryDocs = strapi.documents(CONTENT_TYPE_UIDS.glossaryTerm);
      const existingTerms = await glossaryDocs.findMany({ locale: 'es' });
      if (!existingTerms || existingTerms.length === 0) {
        for (const item of DEFAULT_SEED_GLOSSARY_TERMS) {
          const { locale, ...data } = item;
          await glossaryDocs.create({
            locale,
            data: data as never,
          });
        }
      }
    },
  };
};
