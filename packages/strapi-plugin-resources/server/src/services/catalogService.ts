import type { Core } from '@strapi/strapi';
import {
  buildAttachmentHeaders,
  CONTENT_TYPE_UIDS,
  formatSecondaryCalendarDate,
  isAllowedDownloadAsset,
  normalizeUploadFile,
  PLUGIN_ID,
  sanitizeFilename,
  validateGalleryAlbumInput,
  validateGlossaryTermInput,
  validatePublicationInput,
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
import {
  DEFAULT_SEED_GALLERY_ALBUMS,
  DEFAULT_SEED_GLOSSARY_TERMS,
  DEFAULT_SEED_PUBLICATIONS,
} from './seedData';

function normalizePublicationRow(
  row: Record<string, unknown>,
  settings: ResourcesPluginSettings
): PublicationRecord {
  const locale =
    typeof row.locale === 'string' && row.locale ? row.locale : settings.defaultLocale;
  const publishedAtDate =
    typeof row.publishedAtDate === 'string' ? row.publishedAtDate : undefined;
  const secondaryDateOverride =
    typeof row.secondaryDateOverride === 'string' && row.secondaryDateOverride.trim()
      ? row.secondaryDateOverride.trim()
      : undefined;

  return {
    documentId:
      typeof row.documentId === 'string' ? row.documentId : String(row.id ?? ''),
    title: typeof row.title === 'string' ? row.title : '',
    slug: typeof row.slug === 'string' ? row.slug : '',
    summary: typeof row.summary === 'string' ? row.summary : '',
    category: (row.category as PublicationCategory) || 'guide',
    authorName:
      typeof row.authorName === 'string' ? row.authorName : undefined,
    isbnOrReference:
      typeof row.isbnOrReference === 'string' ? row.isbnOrReference : undefined,
    pageCount: typeof row.pageCount === 'number' ? row.pageCount : undefined,
    languageCode:
      typeof row.languageCode === 'string' ? row.languageCode : locale,
    publishedAtDate,
    secondaryDateOverride,
    secondaryDateFormatted:
      secondaryDateOverride ||
      formatSecondaryCalendarDate(
        publishedAtDate,
        settings.secondaryCalendar as SecondaryCalendarId,
        locale
      ),
    mediaFolderPath:
      typeof row.mediaFolderPath === 'string' ? row.mediaFolderPath : undefined,
    downloadCount:
      typeof row.downloadCount === 'number' ? row.downloadCount : 0,
    featured: Boolean(row.featured),
    allowPublicDownload: row.allowPublicDownload !== false,
    externalDownloadUrl:
      typeof row.externalDownloadUrl === 'string'
        ? row.externalDownloadUrl
        : undefined,
    file: normalizeUploadFile(row.file, settings.enableCloudinaryOptimization),
    coverImage: normalizeUploadFile(
      row.coverImage,
      settings.enableCloudinaryOptimization
    ),
    locale,
  };
}

function normalizeGalleryAlbumRow(
  row: Record<string, unknown>,
  settings: ResourcesPluginSettings
): GalleryAlbumRecord {
  const locale =
    typeof row.locale === 'string' && row.locale ? row.locale : settings.defaultLocale;
  const eventDate =
    typeof row.eventDate === 'string' ? row.eventDate : undefined;
  const secondaryDateOverride =
    typeof row.secondaryDateOverride === 'string' && row.secondaryDateOverride.trim()
      ? row.secondaryDateOverride.trim()
      : undefined;

  const rawPhotos = Array.isArray(row.photos) ? row.photos : [];
  const photos = rawPhotos
    .map((item) =>
      normalizeUploadFile(item, settings.enableCloudinaryOptimization)
    )
    .filter((item): item is MediaLibraryAsset => item !== null);

  const coverPhoto =
    normalizeUploadFile(
      row.coverPhoto,
      settings.enableCloudinaryOptimization
    ) ||
    photos[0] ||
    null;

  const storedPhotoCount =
    typeof row.photoCount === 'number' && row.photoCount >= 0
      ? row.photoCount
      : 0;

  return {
    documentId:
      typeof row.documentId === 'string' ? row.documentId : String(row.id ?? ''),
    title: typeof row.title === 'string' ? row.title : '',
    slug: typeof row.slug === 'string' ? row.slug : '',
    description: typeof row.description === 'string' ? row.description : '',
    category: (row.category as GalleryAlbumCategory) || 'community',
    eventDate,
    secondaryDateOverride,
    secondaryDateFormatted:
      secondaryDateOverride ||
      formatSecondaryCalendarDate(
        eventDate,
        settings.secondaryCalendar as SecondaryCalendarId,
        locale
      ),
    mediaFolderId:
      typeof row.mediaFolderId === 'number' ? row.mediaFolderId : null,
    mediaFolderPath:
      typeof row.mediaFolderPath === 'string' ? row.mediaFolderPath : undefined,
    photographerCredit:
      typeof row.photographerCredit === 'string'
        ? row.photographerCredit
        : undefined,
    framingNotes:
      typeof row.framingNotes === 'string' ? row.framingNotes : undefined,
    featured: Boolean(row.featured),
    sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : 0,
    photoCount: photos.length > 0 ? photos.length : storedPhotoCount,
    coverPhoto,
    photos,
    locale,
  };
}

function normalizeGlossaryTermRow(
  row: Record<string, unknown>,
  settings: ResourcesPluginSettings
): GlossaryTermRecord {
  const locale =
    typeof row.locale === 'string' && row.locale ? row.locale : settings.defaultLocale;
  return {
    documentId:
      typeof row.documentId === 'string' ? row.documentId : String(row.id ?? ''),
    term: typeof row.term === 'string' ? row.term : '',
    slug: typeof row.slug === 'string' ? row.slug : '',
    nativeScript:
      typeof row.nativeScript === 'string' ? row.nativeScript : undefined,
    transliteration:
      typeof row.transliteration === 'string' ? row.transliteration : undefined,
    definition: typeof row.definition === 'string' ? row.definition : '',
    category: (row.category as GlossaryCategory) || 'general',
    letterGroup:
      typeof row.letterGroup === 'string' && row.letterGroup
        ? row.letterGroup
        : 'A',
    relatedTerms: Array.isArray(row.relatedTerms)
      ? row.relatedTerms.filter((t): t is string => typeof t === 'string')
      : [],
    featured: Boolean(row.featured),
    pronunciationAudio: normalizeUploadFile(
      row.pronunciationAudio,
      settings.enableCloudinaryOptimization
    ),
    locale,
  };
}

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
          filters,
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
      if (!record.allowPublicDownload) {
        throw new Error(`Public download is disabled for "${slug}"`);
      }

      if (record.file) {
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

      const downloadUrl =
        record.file?.url || record.externalDownloadUrl || '';
      if (!downloadUrl) {
        throw new Error(`Publication "${slug}" has no downloadable file attached`);
      }

      const nextCount = (record.downloadCount || 0) + 1;
      if (record.documentId) {
        await strapi.documents(CONTENT_TYPE_UIDS.publication).update({
          documentId: record.documentId,
          ...(locale ? { locale } : {}),
          data: { downloadCount: nextCount } as never,
        });
      }

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
          filters,
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
      const created = (await strapi
        .documents(CONTENT_TYPE_UIDS.galleryAlbum)
        .create({
          ...(locale ? { locale } : {}),
          data: {
            ...validation.data,
            photoCount: 0,
          } as never,
          populate: ['coverPhoto', 'photos'],
        })) as Record<string, unknown>;
      return normalizeGalleryAlbumRow(created, settings);
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
          filters,
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
