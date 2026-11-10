import {
  isAllowedDownloadAsset,
  isAllowedExternalDownloadUrl,
  isBlockedAssetType,
  toSafeOpenableHref,
  type GalleryAlbumRecord,
  type GlossaryTermRecord,
  type MediaLibraryAsset,
  type PublicationRecord,
} from "../../../shared";

function sanitizePublicAsset(
  asset: MediaLibraryAsset | null | undefined,
  redactUrls = false
): MediaLibraryAsset | null {
  if (!asset) return null;
  const { folderPath: _folderPath, ...rest } = asset;
  const blocked =
    isBlockedAssetType(asset.ext, asset.mime) || !toSafeOpenableHref(asset.url);
  if (!redactUrls && !blocked) {
    return rest;
  }
  return {
    ...rest,
    url: "",
    optimizedUrl: "",
    thumbnailUrl: "",
    formats: undefined,
  };
}

export function sanitizePublicPublication(
  pub: PublicationRecord,
  options?: {
    allowedExtensions?: string[];
    allowedMimeTypes?: string[];
  }
): PublicationRecord {
  const {
    mediaFolderPath: _mediaFolderPath,
    externalDownloadUrl,
    file,
    coverImage,
    ...rest
  } = pub;

  const fileDisallowed = Boolean(
    file &&
    (isBlockedAssetType(file.ext, file.mime) ||
      !toSafeOpenableHref(file.url) ||
      (options?.allowedExtensions &&
        options?.allowedMimeTypes &&
        !isAllowedDownloadAsset(
          file.ext,
          file.mime,
          options.allowedExtensions,
          options.allowedMimeTypes
        )))
  );
  const redactFile = !pub.allowPublicDownload || fileDisallowed;

  const safeOpenableExtUrl =
    pub.allowPublicDownload &&
    externalDownloadUrl &&
    isAllowedExternalDownloadUrl(
      externalDownloadUrl,
      options?.allowedExtensions
    )
      ? (toSafeOpenableHref(externalDownloadUrl) ?? undefined)
      : undefined;

  return {
    ...rest,
    ...(safeOpenableExtUrl ? { externalDownloadUrl: safeOpenableExtUrl } : {}),
    file: sanitizePublicAsset(file, redactFile),
    coverImage: sanitizePublicAsset(coverImage, false),
  };
}

export function sanitizePublicGalleryAlbum(
  album: GalleryAlbumRecord
): GalleryAlbumRecord {
  const {
    framingNotes: _framingNotes,
    mediaFolderId: _mediaFolderId,
    mediaFolderPath: _mediaFolderPath,
    coverPhoto,
    photos,
    ...rest
  } = album;
  return {
    ...rest,
    coverPhoto: sanitizePublicAsset(coverPhoto, false),
    photos: (photos || [])
      .map((photo) => sanitizePublicAsset(photo, false))
      .filter((photo): photo is MediaLibraryAsset => photo !== null),
  };
}

export function sanitizePublicGlossaryTerm(
  term: GlossaryTermRecord
): GlossaryTermRecord {
  return {
    ...term,
    pronunciationAudio: sanitizePublicAsset(term.pronunciationAudio, false),
  };
}
