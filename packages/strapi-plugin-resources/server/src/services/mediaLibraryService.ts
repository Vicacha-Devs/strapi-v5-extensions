import type { Core } from "@strapi/strapi";

import {
  CONTENT_TYPE_UIDS,
  extractMediaRelationId,
  normalizeUploadFile,
  PLUGIN_ID,
  UPLOAD_MODEL_UIDS,
  validateMediaFolderPath,
  type MediaLibraryAsset,
  type MediaLibraryFolderSummary,
} from "../../../shared";
import { resolveDocumentTargetStatus } from "./catalogHelpers";
import { ResourceNotFoundError, ResourceValidationError } from "./errors";

const MAX_MEDIA_FOLDERS_LIMIT = 1000;

interface UploadQueryAdapter {
  findMany: (
    opts?: Record<string, unknown>
  ) => Promise<Record<string, unknown>[]>;
  findOne?: (
    opts?: Record<string, unknown>
  ) => Promise<Record<string, unknown> | null>;
}

function getUploadQuery(
  strapi: Core.Strapi,
  uid: string
): UploadQueryAdapter | undefined {
  return (
    strapi as unknown as {
      db?: { query?: (targetUid: string) => UploadQueryAdapter };
    }
  ).db?.query?.(uid);
}

function resolveSafeFolderPath(folderPath?: string): string | undefined {
  if (!folderPath) return undefined;
  const check = validateMediaFolderPath(folderPath);
  if (!check.valid) {
    throw new ResourceValidationError(check.errors.join("; "));
  }
  return check.data;
}

async function resolveFolderPathById(
  strapi: Core.Strapi,
  folderId: number
): Promise<string | undefined> {
  const folderQuery = getUploadQuery(strapi, UPLOAD_MODEL_UIDS.folder);
  if (!folderQuery) return undefined;

  if (typeof folderQuery.findOne === "function") {
    const one = await folderQuery.findOne({ where: { id: folderId } });
    if (one && typeof one.path === "string" && one.path.trim()) {
      return resolveSafeFolderPath(one.path);
    }
  }

  const folders = await folderQuery.findMany({
    where: { id: folderId },
    limit: MAX_MEDIA_FOLDERS_LIMIT,
  });
  const matched = (folders || []).find((f) => Number(f.id) === folderId);
  if (matched && typeof matched.path === "string" && matched.path.trim()) {
    return resolveSafeFolderPath(matched.path);
  }
  return undefined;
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
    typeof existing.mediaFolderPath === "string" &&
    existing.mediaFolderPath.trim()
      ? existing.mediaFolderPath.trim()
      : undefined;
  const folderId =
    typeof existing.mediaFolderId === "number" &&
    Number.isFinite(existing.mediaFolderId) &&
    existing.mediaFolderId > 0
      ? Math.round(existing.mediaFolderId)
      : null;

  if (!folderPath && !folderId) {
    throw new ResourceValidationError(
      "Album does not have a mediaFolderPath or mediaFolderId configured"
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

  if (photoIds.length === 0) {
    return {
      photoCount: 0,
      photos: [],
      coverPhoto: null,
    };
  }

  const existingCoverId = extractMediaRelationId(existingCoverPhoto);
  const keepExistingCover =
    existingCoverId !== null &&
    existingCoverId !== undefined &&
    photoIds.some((id) => String(id) === String(existingCoverId));

  return {
    photoCount: photoIds.length,
    photos: photoIds,
    coverPhoto: keepExistingCover ? existingCoverId : photoIds[0],
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Lists folders from Strapi v5's native Media Library (`plugin::upload.folder`).
   */
  async listMediaFolders(): Promise<MediaLibraryFolderSummary[]> {
    const folderQuery = getUploadQuery(strapi, UPLOAD_MODEL_UIDS.folder);
    if (!folderQuery) return [];

    const rawFolders = await folderQuery.findMany({
      orderBy: { name: "asc" },
      limit: MAX_MEDIA_FOLDERS_LIMIT,
    });

    return (rawFolders || [])
      .slice(0, MAX_MEDIA_FOLDERS_LIMIT)
      .map((folder) => ({
        id: (folder.id as number | string) ?? 0,
        documentId:
          typeof folder.documentId === "string" ? folder.documentId : undefined,
        name: typeof folder.name === "string" ? folder.name : "Folder",
        path: typeof folder.path === "string" ? folder.path : "/",
        pathId:
          typeof folder.pathId === "number" && Number.isFinite(folder.pathId)
            ? folder.pathId
            : undefined,
      }));
  },

  /**
   * Queries `plugin::upload.file` assets inside a specific Strapi v5 Media
   * Library folder, resolving `folderId` via `plugin::upload.folder` before
   * falling back to `folderPath`.
   */
  async listFilesInFolder(params: {
    folderPath?: string;
    folderId?: number | null;
    mimePrefix?: string;
    limit?: number;
  }): Promise<MediaLibraryAsset[]> {
    const settingsService = strapi.plugin(PLUGIN_ID).service("settings") as {
      getSettings: () => Promise<{
        enableCloudinaryOptimization: boolean;
        maxPhotosPerAlbum: number;
      }>;
    };
    const settings = await settingsService.getSettings();
    const safeFolderPath = resolveSafeFolderPath(params.folderPath);

    const fileQuery = getUploadQuery(strapi, UPLOAD_MODEL_UIDS.file);
    if (!fileQuery) return [];

    const maxLimit = Math.max(
      1,
      Math.min(params.limit || settings.maxPhotosPerAlbum || 60, 500)
    );

    const hasValidFolderId =
      typeof params.folderId === "number" &&
      Number.isFinite(params.folderId) &&
      params.folderId > 0;

    let rawFiles: Record<string, unknown>[] = [];
    if (hasValidFolderId) {
      const folderId = Math.round(params.folderId as number);
      const resolvedPath = await resolveFolderPathById(strapi, folderId);
      if (resolvedPath) {
        rawFiles = await fileQuery.findMany({
          where: { folderPath: resolvedPath },
          orderBy: { createdAt: "desc" },
          limit: maxLimit,
        });
      }
      if (!rawFiles || rawFiles.length === 0) {
        const byRelation = await fileQuery.findMany({
          where: { folder: folderId },
          orderBy: { createdAt: "desc" },
          limit: maxLimit,
        });
        if (Array.isArray(byRelation) && byRelation.length > 0) {
          rawFiles = byRelation;
        }
      }
    } else {
      const where = safeFolderPath ? { folderPath: safeFolderPath } : {};
      rawFiles = await fileQuery.findMany({
        where,
        orderBy: { createdAt: "desc" },
        limit: maxLimit,
      });
    }

    return filterNormalizedAssets(
      rawFiles,
      settings.enableCloudinaryOptimization,
      params.mimePrefix
    );
  },

  /**
   * Lists recent assets from Strapi v5's native Media Library (`plugin::upload.file`).
   */
  async listMediaFiles(params?: {
    mimePrefix?: string;
    limit?: number;
  }): Promise<MediaLibraryAsset[]> {
    const clampedLimit = Math.max(1, Math.min(params?.limit || 100, 200));
    return this.listFilesInFolder({
      mimePrefix: params?.mimePrefix,
      limit: clampedLimit,
    });
  },

  /**
   * Synchronizes a `plugin::resources.gallery-album` record with all image
   * assets inside its linked Strapi v5 Media Library folder.
   */
  async syncAlbumFromMediaFolder(
    albumDocumentId: string,
    locale?: string,
    options?: { force?: boolean }
  ): Promise<{
    documentId: string;
    slug: string;
    photoCount: number;
    photos: MediaLibraryAsset[];
  }> {
    if (!albumDocumentId || typeof albumDocumentId !== "string") {
      throw new ResourceValidationError("albumDocumentId is required");
    }

    const settingsService = strapi.plugin(PLUGIN_ID).service("settings") as {
      getSettings: () => Promise<{
        autoSyncMediaFolders: boolean;
        maxPhotosPerAlbum: number;
      }>;
    };
    const settings = await settingsService.getSettings();
    if (!settings.autoSyncMediaFolders && !options?.force) {
      throw new ResourceValidationError(
        "Media folder synchronization is disabled in plugin settings"
      );
    }

    const docService = strapi.documents(CONTENT_TYPE_UIDS.galleryAlbum);
    const existing = (await docService.findOne({
      documentId: albumDocumentId,
      ...(locale ? { locale } : {}),
      populate: ["coverPhoto", "photos"],
    })) as Record<string, unknown> | null;

    if (!existing) {
      throw new ResourceNotFoundError(
        `Gallery album "${albumDocumentId}" not found`
      );
    }

    const { folderPath, folderId } = extractFolderCoordinates(existing);
    const syncedPhotos = await this.listFilesInFolder({
      folderPath,
      folderId,
      mimePrefix: "image/",
      limit: settings.maxPhotosPerAlbum,
    });

    const updateData = buildSyncedAlbumUpdateData(
      syncedPhotos,
      existing.coverPhoto
    );
    const targetStatus = await resolveDocumentTargetStatus(
      docService,
      albumDocumentId,
      locale
    );

    await docService.update({
      documentId: albumDocumentId,
      ...(locale ? { locale } : {}),
      status: targetStatus,
      data: updateData,
    });

    return {
      documentId: albumDocumentId,
      slug: typeof existing.slug === "string" ? existing.slug : albumDocumentId,
      photoCount: syncedPhotos.length,
      photos: syncedPhotos,
    };
  },
});
