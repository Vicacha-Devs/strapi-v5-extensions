import type { Core } from '@strapi/strapi';
import {
  CONTENT_TYPE_UIDS,
  normalizeUploadFile,
  PLUGIN_ID,
  validateMediaFolderPath,
  type MediaLibraryAsset,
  type MediaLibraryFolderSummary,
} from '../../../shared';

type UploadQueryFn = (uid: string) => {
  findMany: (
    opts?: Record<string, unknown>
  ) => Promise<Record<string, unknown>[]>;
};

function getUploadQuery(
  strapi: Core.Strapi,
  uid: string
): ReturnType<UploadQueryFn> | undefined {
  return (
    strapi as unknown as {
      db?: { query?: UploadQueryFn };
    }
  ).db?.query?.(uid);
}

function resolveSafeFolderPath(folderPath?: string): string | undefined {
  if (!folderPath) return undefined;
  const check = validateMediaFolderPath(folderPath);
  if (!check.valid) {
    throw new Error(check.errors.join('; '));
  }
  return check.data;
}

function buildFolderWhereFilter(
  safeFolderPath: string | undefined,
  folderId: number | null | undefined
): Record<string, unknown> {
  if (safeFolderPath) return { folderPath: safeFolderPath };
  if (typeof folderId === 'number' && folderId > 0) return { folder: folderId };
  return {};
}

function filterNormalizedAssets(
  rawFiles: Record<string, unknown>[] | undefined,
  enableCloudinaryOptimization: boolean,
  mimePrefix?: string
): MediaLibraryAsset[] {
  const lowerPrefix = mimePrefix?.toLowerCase();
  return (rawFiles || [])
    .map((raw) => normalizeUploadFile(raw, enableCloudinaryOptimization))
    .filter((asset): asset is MediaLibraryAsset => {
      if (!asset) return false;
      return !lowerPrefix || asset.mime.toLowerCase().startsWith(lowerPrefix);
    });
}

function extractFolderCoordinates(existing: Record<string, unknown>): {
  folderPath?: string;
  folderId: number | null;
} {
  const folderPath =
    typeof existing.mediaFolderPath === 'string' &&
    existing.mediaFolderPath.trim()
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
  return { folderPath, folderId };
}

function buildSyncedAlbumUpdateData(
  syncedPhotos: MediaLibraryAsset[],
  existingCoverPhoto: unknown
): Record<string, unknown> {
  const photoIds = syncedPhotos
    .map((item) => item.id)
    .filter((id): id is number | string => id !== undefined);

  const updateData: Record<string, unknown> = {
    photoCount: syncedPhotos.length,
  };

  if (photoIds.length > 0) {
    updateData.photos = photoIds;
    if (!existingCoverPhoto && photoIds[0] !== undefined) {
      updateData.coverPhoto = photoIds[0];
    }
  }
  return updateData;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Lists folders from Strapi v5's native Media Library (`plugin::upload.folder`).
   */
  async listMediaFolders(): Promise<MediaLibraryFolderSummary[]> {
    try {
      const folderQuery = getUploadQuery(strapi, 'plugin::upload.folder');
      if (!folderQuery) return [];

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
    const safeFolderPath = resolveSafeFolderPath(params.folderPath);

    try {
      const fileQuery = getUploadQuery(strapi, 'plugin::upload.file');
      if (!fileQuery) return [];

      const where = buildFolderWhereFilter(safeFolderPath, params.folderId);
      const maxLimit = Math.min(
        params.limit || settings.maxPhotosPerAlbum || 120,
        500
      );

      const rawFiles = await fileQuery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        limit: maxLimit,
      });

      return filterNormalizedAssets(
        rawFiles,
        settings.enableCloudinaryOptimization,
        params.mimePrefix
      );
    } catch {
      return [];
    }
  },

  /**
   * Lists recent assets from Strapi v5's native Media Library (`plugin::upload.file`).
   */
  async listMediaFiles(params?: {
    mimePrefix?: string;
    limit?: number;
  }): Promise<MediaLibraryAsset[]> {
    return this.listFilesInFolder({
      mimePrefix: params?.mimePrefix,
      limit: params?.limit || 200,
    });
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

    const { folderPath, folderId } = extractFolderCoordinates(existing);
    const syncedPhotos = await this.listFilesInFolder({
      folderPath,
      folderId,
      mimePrefix: 'image/',
    });

    const updateData = buildSyncedAlbumUpdateData(
      syncedPhotos,
      existing.coverPhoto
    );

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
