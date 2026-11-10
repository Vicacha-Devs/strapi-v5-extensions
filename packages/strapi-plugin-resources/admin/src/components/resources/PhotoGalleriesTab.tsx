import { Box } from "@strapi/design-system";
import * as React from "react";

import {
  PLUGIN_ID,
  type GalleryAlbumCategory,
  type GalleryAlbumRecord,
  type MediaLibraryAsset,
} from "../../../../shared";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import {
  GALLERY_CATEGORY_LABELS,
  GalleryAlbumFormCard,
} from "./GalleryAlbumFormCard";
import { PhotoGalleriesTable } from "./PhotoGalleriesTable";
import {
  uploadFilesToStrapiMediaLibrary,
  useResourcesTranslation,
} from "./uploadHelper";

function extractDefinedIds(
  items: Array<{ id?: number | string }> = []
): Array<number | string> {
  return items
    .map((u) => u.id)
    .filter((id): id is number | string => id !== undefined);
}

export interface PhotoGalleriesTabProps {
  galleries: GalleryAlbumRecord[];
  mediaFiles: MediaLibraryAsset[];
  autoSyncMediaFolders?: boolean;
  post: (url: string, data?: unknown) => Promise<{ data?: unknown }>;
  put: (url: string, data?: unknown) => Promise<{ data?: unknown }>;
  del: (url: string) => Promise<{ data?: unknown }>;
  onStatusMessage: (msg: string, isError?: boolean) => void;
  onReload: () => Promise<void>;
}

export const PhotoGalleriesTab: React.FC<PhotoGalleriesTabProps> = ({
  galleries,
  mediaFiles,
  autoSyncMediaFolders = true,
  post,
  put,
  del,
  onStatusMessage,
  onReload,
}) => {
  const { t } = useResourcesTranslation();
  const [title, setTitle] = React.useState("");
  const [category, setCategory] =
    React.useState<GalleryAlbumCategory>("architecture");
  const [description, setDescription] = React.useState("");
  const [selectedPhotoIds, setSelectedPhotoIds] = React.useState<
    Array<number | string>
  >([]);
  const [showLibraryPicker, setShowLibraryPicker] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [syncingDocId, setSyncingDocId] = React.useState<string | null>(null);
  const [pendingDelete, setPendingDelete] =
    React.useState<GalleryAlbumRecord | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const formPhotosInputRef = React.useRef<HTMLInputElement | null>(null);
  const rowPhotosInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploadingAlbum, setUploadingAlbum] =
    React.useState<GalleryAlbumRecord | null>(null);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getCategoryLabel = (cat: GalleryAlbumCategory) =>
    t(`gallery.category.${cat}`, GALLERY_CATEGORY_LABELS[cat] || cat);

  const imageAssets = React.useMemo(
    () => mediaFiles.filter((f) => f.mime.startsWith("image/")),
    [mediaFiles]
  );

  const selectedAssets = React.useMemo(
    () =>
      imageAssets.filter((img) =>
        selectedPhotoIds.some((id) => String(id) === String(img.id))
      ),
    [imageAssets, selectedPhotoIds]
  );

  const resetForm = () => {
    setTitle("");
    setCategory("architecture");
    setDescription("");
    setSelectedPhotoIds([]);
    setShowLibraryPicker(false);
  };

  const togglePhotoSelection = (id?: number | string) => {
    if (id === undefined) return;
    setSelectedPhotoIds((prev) =>
      prev.some((x) => String(x) === String(id))
        ? prev.filter((x) => String(x) !== String(id))
        : [...prev, id]
    );
  };

  const handleUploadForForm = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await uploadFilesToStrapiMediaLibrary(files, post);
      if (!isMountedRef.current) return;
      const newIds = extractDefinedIds(uploaded);
      setSelectedPhotoIds((prev) => [...prev, ...newIds]);
      onStatusMessage(
        `Uploaded ${newIds.length} photo(s) to Media Library and selected them.`
      );
      await onReload();
    } catch (err) {
      if (isMountedRef.current) {
        onStatusMessage(`Photo upload failed: ${(err as Error).message}`, true);
      }
    } finally {
      if (isMountedRef.current) {
        setUploading(false);
      }
      e.target.value = "";
    }
  };

  const handleUploadForAlbumRow = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    const album = uploadingAlbum;
    if (!files || !files.length || !album?.documentId) return;
    setUploading(true);
    try {
      const uploaded = await uploadFilesToStrapiMediaLibrary(files, post);
      if (!isMountedRef.current) return;
      const newIds = extractDefinedIds(uploaded);
      const existingIds = extractDefinedIds(album.photos);
      const mergedIds = [...existingIds, ...newIds];

      await put(
        `/${PLUGIN_ID}/galleries/${encodeURIComponent(album.documentId)}`,
        {
          photoIds: mergedIds,
          coverPhotoId: album.coverPhoto?.id ?? mergedIds[0] ?? null,
        }
      );
      onStatusMessage(
        `Added ${newIds.length} photo(s) to "${album.title}" (${mergedIds.length} total).`
      );
      await onReload();
    } catch (err) {
      if (isMountedRef.current) {
        onStatusMessage(
          `Failed to add photos: ${(err as Error).message}`,
          true
        );
      }
    } finally {
      if (isMountedRef.current) {
        setUploading(false);
        setUploadingAlbum(null);
      }
      e.target.value = "";
    }
  };

  const handleSyncFolder = async (album: GalleryAlbumRecord) => {
    if (!album.documentId || syncingDocId || !autoSyncMediaFolders) return;
    setSyncingDocId(album.documentId);
    try {
      const localeParam = album.locale
        ? `?locale=${encodeURIComponent(album.locale)}`
        : "";
      await post(
        `/${PLUGIN_ID}/galleries/${encodeURIComponent(album.documentId)}/sync-media-folder${localeParam}`,
        {}
      );
      if (!isMountedRef.current) return;
      onStatusMessage(`Synchronized folder for "${album.title}".`);
      await onReload();
    } catch (err) {
      if (isMountedRef.current) {
        onStatusMessage(`Folder sync failed: ${(err as Error).message}`, true);
      }
    } finally {
      if (isMountedRef.current) {
        setSyncingDocId(null);
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      onStatusMessage(
        t("gallery.msg.title_required", "Please enter an Album Title."),
        true
      );
      return;
    }
    try {
      const payload = {
        title: title.trim(),
        category,
        description: description.trim(),
        photoIds: selectedPhotoIds,
        coverPhotoId: selectedPhotoIds[0] ?? null,
        featured: true,
      };
      await post(`/${PLUGIN_ID}/galleries`, payload);
      onStatusMessage(`Created gallery album "${title.trim()}".`);
      if (!isMountedRef.current) return;
      resetForm();
      await onReload();
    } catch (err) {
      if (isMountedRef.current) {
        onStatusMessage(
          `Failed to save album: ${(err as Error).message}`,
          true
        );
      }
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete?.documentId || isDeleting) return;
    setIsDeleting(true);
    try {
      await del(
        `/${PLUGIN_ID}/galleries/${encodeURIComponent(pendingDelete.documentId)}`
      );
      if (!isMountedRef.current) return;
      onStatusMessage(`Removed gallery album "${pendingDelete.title}".`);
      setPendingDelete(null);
      await onReload();
    } catch (err) {
      if (isMountedRef.current) {
        onStatusMessage(`Delete failed: ${(err as Error).message}`, true);
      }
    } finally {
      if (isMountedRef.current) {
        setIsDeleting(false);
      }
    }
  };

  return (
    <Box paddingTop={6}>
      <input
        ref={formPhotosInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          void handleUploadForForm(e)
        }
      />
      <input
        ref={rowPhotosInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          void handleUploadForAlbumRow(e)
        }
      />

      <GalleryAlbumFormCard
        title={title}
        category={category}
        description={description}
        selectedAssets={selectedAssets}
        imageAssets={imageAssets}
        selectedPhotoIds={selectedPhotoIds}
        showLibraryPicker={showLibraryPicker}
        uploading={uploading}
        getCategoryLabel={getCategoryLabel}
        onTitleChange={setTitle}
        onCategoryChange={setCategory}
        onDescriptionChange={setDescription}
        onTogglePhotoSelection={togglePhotoSelection}
        onToggleLibraryPicker={() => setShowLibraryPicker((prev) => !prev)}
        onUploadClick={() => formPhotosInputRef.current?.click()}
        onSave={() => void handleSave()}
      />

      <PhotoGalleriesTable
        galleries={galleries}
        getCategoryLabel={getCategoryLabel}
        autoSyncMediaFolders={autoSyncMediaFolders}
        syncingDocId={syncingDocId}
        onAddPhotosToAlbum={(album) => {
          setUploadingAlbum(album);
          rowPhotosInputRef.current?.click();
        }}
        onSyncAlbumFolder={(album) => void handleSyncFolder(album)}
        onDeleteAlbum={(album) => setPendingDelete(album)}
      />

      <ConfirmDeleteDialog
        open={Boolean(pendingDelete)}
        itemLabel={pendingDelete?.title || ""}
        isDeleting={isDeleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </Box>
  );
};
