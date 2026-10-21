import type { Core } from '@strapi/strapi';
import {
  CONTENT_TYPE_UIDS,
  normalizeUploadFile,
  PLUGIN_ID,
  validateMediaFolderPath,
  type MediaLibraryAsset,
  type MediaLibraryFolderSummary,
} from '../../../shared';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Lists folders from Strapi v5's native Media Library (`plugin::upload.folder`).
   */
  async listMediaFolders(): Promise<MediaLibraryFolderSummary[]> {
    try {
      const folderQuery = (strapi as unknown as {
        db?: {
          query?: (uid: string) => {
            findMany: (opts?: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
          };
        };
      }).db?.query?.('plugin::upload.folder');

      if (!folderQuery) {
        return [];
      }

      const rawFolders = await folderQuery.findMany({
        orderBy: { name: 'asc' },
      });

      return (rawFolders || []).map((folder) => ({
        id: (folder.id as number | string) ?? 0,
        documentId:
          typeof folder.documentId === 'string' ? folder.documentId : undefined,
        name: typeof folder.name === 'string' ? folder.name : 'Folder',
        path: typeof folder.path === 'string' ? folder.path : '/',
        pathId: typeof folder.pathId === 'number' ? folder.pathId : undefined,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Queries `plugin::upload.file` assets inside a specific Strapi v5 Media Library folder.
   */
  async listFilesInFolder(params: {
    folderPath?: string;
    folderId?: number | null;
    mimePrefix?: string;
    limit?: number;
  }): Promise<MediaLibraryAsset[]> {
    const settingsService = strapi
      .plugin(PLUGIN_ID)
      .service('settings') as {
      getSettings: () => Promise<{
        enableCloudinaryOptimization: boolean;
        maxPhotosPerAlbum: number;
      }>;
    };
    const settings = await settingsService.getSettings();

    let safeFolderPath: string | undefined;
    if (params.folderPath) {
      const check = validateMediaFolderPath(params.folderPath);
      if (!check.valid) {
        throw new Error(check.errors.join('; '));
      }
      safeFolderPath = check.data;
    }

    try {
      const fileQuery = (strapi as unknown as {
        db?: {
          query?: (uid: string) => {
            findMany: (opts?: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
          };
        };
      }).db?.query?.('plugin::upload.file');

      if (!fileQuery) {
        return [];
      }

      const where: Record<string, unknown> = {};
      if (safeFolderPath) {
        where.folderPath = safeFolderPath;
      } else if (typeof params.folderId === 'number' && params.folderId > 0) {
        where.folder = params.folderId;
      }

      const maxLimit = Math.min(
        params.limit || settings.maxPhotosPerAlbum || 120,
        500
      );

      const rawFiles = await fileQuery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        limit: maxLimit,
      });

      const mimePrefix = params.mimePrefix?.toLowerCase();

      return (rawFiles || [])
        .map((raw) =>
          normalizeUploadFile(raw, settings.enableCloudinaryOptimization)
        )
        .filter((asset): asset is MediaLibraryAsset => {
          if (!asset) return false;
          if (mimePrefix && !asset.mime.toLowerCase().startsWith(mimePrefix)) {
            return false;
          }
          return true;
        });
    } catch {
      return [];
    }
  },

  /**
   * Synchronizes a `plugin::resources.gallery-album` record with all image assets
   * currently inside its linked Strapi v5 Media Library folder (`plugin::upload.folder`).
   */
  async syncAlbumFromMediaFolder(
    albumDocumentId: string,
    locale?: string
  ): Promise<{
    documentId: string;
    slug: string;
    photoCount: number;
    photos: MediaLibraryAsset[];
  }> {
    if (!albumDocumentId || typeof albumDocumentId !== 'string') {
      throw new Error('albumDocumentId is required');
    }

    const docService = strapi.documents(CONTENT_TYPE_UIDS.galleryAlbum);
    const existing = (await docService.findOne({
      documentId: albumDocumentId,
      ...(locale ? { locale } : {}),
      populate: ['coverPhoto', 'photos'],
    })) as Record<string, unknown> | null;

    if (!existing) {
      throw new Error(`Gallery album "${albumDocumentId}" not found`);
    }

    const folderPath =
      typeof existing.mediaFolderPath === 'string' && existing.mediaFolderPath.trim()
        ? existing.mediaFolderPath.trim()
        : undefined;
    const folderId =
      typeof existing.mediaFolderId === 'number' && existing.mediaFolderId > 0
        ? existing.mediaFolderId
        : null;

    if (!folderPath && !folderId) {
      throw new Error(
        'Album does not have a mediaFolderPath or mediaFolderId configured'
      );
    }

    const syncedPhotos = await this.listFilesInFolder({
      folderPath,
      folderId,
      mimePrefix: 'image/',
    });

    const photoIds = syncedPhotos
      .map((item) => item.id)
      .filter((id): id is number | string => id !== undefined);

    const updateData: Record<string, unknown> = {
      photoCount: syncedPhotos.length,
    };

    if (photoIds.length > 0) {
      updateData.photos = photoIds;
      if (!existing.coverPhoto && photoIds[0] !== undefined) {
        updateData.coverPhoto = photoIds[0];
      }
    }

    await docService.update({
      documentId: albumDocumentId,
      ...(locale ? { locale } : {}),
      data: updateData as never,
    });

    return {
      documentId: albumDocumentId,
      slug: typeof existing.slug === 'string' ? existing.slug : albumDocumentId,
      photoCount: syncedPhotos.length,
      photos: syncedPhotos,
    };
  },
});
