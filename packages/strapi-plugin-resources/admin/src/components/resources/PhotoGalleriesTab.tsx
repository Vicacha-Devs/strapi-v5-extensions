import {
  Badge,
  Box,
  Button,
  Divider,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from "@strapi/design-system";
import * as React from "react";

import {
  PLUGIN_ID,
  type GalleryAlbumCategory,
  type GalleryAlbumRecord,
  type MediaLibraryAsset,
} from "../../../../shared";
import { GalleryMediaPicker, PhotoGalleriesTable } from "./PhotoGalleriesTable";
import {
  CARD_BORDER_STYLE,
  uploadFilesToStrapiMediaLibrary,
  useResourcesTranslation,
} from "./uploadHelper";

const GALLERY_CATEGORY_LABELS: Record<GalleryAlbumCategory, string> = {
  architecture: "Architecture & Calligraphy",
  ramadan_eid: "Ramadan & Eid Gatherings",
  community: "Community & Education",
  events: "Special Events",
  heritage: "History & Heritage",
  press: "Press & Media",
};

function extractDefinedIds(items: Array<{ id?: number | string }> = []): Array<number | string> {
  return items.map((u) => u.id).filter((id): id is number | string => id !== undefined);
}

export interface PhotoGalleriesTabProps {
  galleries: GalleryAlbumRecord[];
  mediaFiles: MediaLibraryAsset[];
  post: (url: string, data?: unknown) => Promise<{ data?: unknown }>;
  put: (url: string, data?: unknown) => Promise<{ data?: unknown }>;
  del: (url: string) => Promise<{ data?: unknown }>;
  onStatusMessage: (msg: string) => void;
  onReload: () => Promise<void>;
}

export const PhotoGalleriesTab: React.FC<PhotoGalleriesTabProps> = ({
  galleries,
  mediaFiles,
  post,
  put,
  del,
  onStatusMessage,
  onReload,
}) => {
  const { t } = useResourcesTranslation();
  const [editingDocId, setEditingDocId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<GalleryAlbumCategory>("architecture");
  const [description, setDescription] = React.useState("");
  const [selectedPhotoIds, setSelectedPhotoIds] = React.useState<Array<number | string>>([]);
  const [showLibraryPicker, setShowLibraryPicker] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const formPhotosInputRef = React.useRef<HTMLInputElement | null>(null);
  const rowPhotosInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploadingAlbum, setUploadingAlbum] = React.useState<GalleryAlbumRecord | null>(null);

  const getCategoryLabel = (cat: GalleryAlbumCategory) =>
    t(`gallery.category.${cat}`, GALLERY_CATEGORY_LABELS[cat] || cat);

  const imageAssets = React.useMemo(
    () => mediaFiles.filter((f) => f.mime.startsWith("image/")),
    [mediaFiles]
  );

  const selectedAssets = React.useMemo(
    () => imageAssets.filter((img) => selectedPhotoIds.some((id) => String(id) === String(img.id))),
    [imageAssets, selectedPhotoIds]
  );

  const resetForm = () => {
    setEditingDocId(null);
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

  const handleUploadForForm = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await uploadFilesToStrapiMediaLibrary(files, post);
      const newIds = extractDefinedIds(uploaded);
      setSelectedPhotoIds((prev) => [...prev, ...newIds]);
      onStatusMessage(`Uploaded ${newIds.length} photo(s) to Media Library and selected them.`);
      await onReload();
    } catch (err) {
      onStatusMessage(`Photo upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleUploadForAlbumRow = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const album = uploadingAlbum;
    if (!files || !files.length || !album?.documentId) return;
    setUploading(true);
    try {
      const uploaded = await uploadFilesToStrapiMediaLibrary(files, post);
      const newIds = extractDefinedIds(uploaded);
      const existingIds = extractDefinedIds(album.photos);
      const mergedIds = [...existingIds, ...newIds];

      await put(`/${PLUGIN_ID}/galleries/${encodeURIComponent(album.documentId)}`, {
        photoIds: mergedIds,
        coverPhotoId: album.coverPhoto?.id ?? mergedIds[0] ?? null,
      });
      onStatusMessage(
        `Added ${newIds.length} photo(s) to "${album.title}" (${mergedIds.length} total).`
      );
      await onReload();
    } catch (err) {
      onStatusMessage(`Failed to add photos: ${(err as Error).message}`);
    } finally {
      setUploading(false);
      setUploadingAlbum(null);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      onStatusMessage(t("gallery.msg.title_required", "Please enter an Album Title."));
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
      if (editingDocId) {
        await put(`/${PLUGIN_ID}/galleries/${encodeURIComponent(editingDocId)}`, payload);
        onStatusMessage(`Updated gallery album "${title.trim()}".`);
      } else {
        await post(`/${PLUGIN_ID}/galleries`, payload);
        onStatusMessage(`Created gallery album "${title.trim()}".`);
      }
      resetForm();
      await onReload();
    } catch (err) {
      onStatusMessage(`Failed to save album: ${(err as Error).message}`);
    }
  };

  const handleDelete = async (album: GalleryAlbumRecord) => {
    if (!album.documentId) return;
    try {
      await del(`/${PLUGIN_ID}/galleries/${encodeURIComponent(album.documentId)}`);
      onStatusMessage(`Removed gallery album "${album.title}".`);
      if (editingDocId === album.documentId) resetForm();
      await onReload();
    } catch (err) {
      onStatusMessage(`Delete failed: ${(err as Error).message}`);
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
        onChange={handleUploadForForm}
      />
      <input
        ref={rowPhotosInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleUploadForAlbumRow}
      />

      <Box
        padding={6}
        marginBottom={6}
        background="neutral0"
        hasRadius
        shadow="filterShadow"
        style={CARD_BORDER_STYLE}
      >
        <Flex
          justifyContent="space-between"
          alignItems="flex-start"
          paddingBottom={4}
          wrap="wrap"
          gap={3}
        >
          <Flex direction="column" alignItems="flex-start" gap={1}>
            <Typography variant="delta" tag="h2" fontWeight="bold">
              {t("gallery.form.title", "Create Photo Gallery Album")}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              {t(
                "gallery.form.subtitle",
                "Upload one or multiple photos from your computer, or pick existing images from the Media Library."
              )}
            </Typography>
          </Flex>
          {editingDocId && (
            <Button variant="tertiary" size="S" onClick={resetForm}>
              {t("common.cancel_edit", "Cancel Edit")}
            </Button>
          )}
        </Flex>

        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
            alignItems: "start",
          }}
        >
          <Box style={{ minWidth: 0 }}>
            <Field.Root
              required
              hint={t(
                "page.ui.public_album_title_displayed_in_the_gallery_grid",
                "Album title shown on the public gallery"
              )}
            >
              <Field.Label>{t("field.album_title", "Album Title")}</Field.Label>
              <TextInput
                placeholder={t(
                  "placeholder.e_g_arquitectura_y_caligraf_a_de_la_mezquita",
                  "e.g., Mosque Architecture & Calligraphy"
                )}
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              />
              <Field.Hint />
            </Field.Root>
          </Box>

          <Box style={{ minWidth: 0 }}>
            <Field.Root
              hint={t(
                "page.ui.thematic_classification_for_the_gallery_album",
                "Thematic category for the photo album"
              )}
            >
              <Field.Label>{t("page.ui.category", "Category")}</Field.Label>
              <SingleSelect
                value={category}
                onChange={(val: string | number) =>
                  setCategory(String(val) as GalleryAlbumCategory)
                }
              >
                {(Object.keys(GALLERY_CATEGORY_LABELS) as GalleryAlbumCategory[]).map((val) => (
                  <SingleSelectOption key={val} value={val}>
                    {getCategoryLabel(val)}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
              <Field.Hint />
            </Field.Root>
          </Box>

          <Box style={{ minWidth: 0 }}>
            <Field.Root
              hint={t(
                "page.ui.caption_summary_shown_beneath_the_album_header",
                "Optional caption shown under the album title"
              )}
            >
              <Field.Label>{t("field.album_description", "Description (Optional)")}</Field.Label>
              <TextInput
                placeholder={t(
                  "placeholder.e_g_recorrido_fotogr_fico_por_el_sal_n_de_oraci_",
                  "e.g., Main prayer hall, mihrab, and central dome..."
                )}
                value={description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDescription(e.target.value)
                }
              />
              <Field.Hint />
            </Field.Root>
          </Box>
        </Box>

        <GalleryMediaPicker
          selectedAssets={selectedAssets}
          imageAssets={imageAssets}
          selectedPhotoIds={selectedPhotoIds}
          showLibraryPicker={showLibraryPicker}
          onTogglePhotoSelection={togglePhotoSelection}
        />

        <Box paddingTop={4}>
          <Divider />
        </Box>

        <Flex paddingTop={4} justifyContent="space-between" alignItems="center" wrap="wrap" gap={3}>
          <Flex gap={3} alignItems="center" wrap="wrap">
            <Button
              variant="secondary"
              disabled={uploading}
              onClick={() => formPhotosInputRef.current?.click()}
            >
              {uploading
                ? t("common.uploading", "Uploading…")
                : t("gallery.btn.upload_photos_computer", "+ Upload Photos from Computer")}
            </Button>
            {imageAssets.length > 0 && (
              <Button variant="tertiary" onClick={() => setShowLibraryPicker((prev) => !prev)}>
                {showLibraryPicker
                  ? t("gallery.btn.hide_media_library", "Hide Media Library Picker")
                  : `${t("gallery.btn.choose_media_library", "Choose from Media Library")} (${imageAssets.length})`}
              </Button>
            )}
            {selectedPhotoIds.length > 0 && (
              <Badge active>
                {selectedPhotoIds.length} {t("page.ui.photos", "Photos").toLowerCase()}
              </Badge>
            )}
          </Flex>
          <Button onClick={handleSave}>{t("page.ui.create_album", "Create Album")}</Button>
        </Flex>
      </Box>

      <PhotoGalleriesTable
        galleries={galleries}
        getCategoryLabel={getCategoryLabel}
        onAddPhotosToAlbum={(album) => {
          setUploadingAlbum(album);
          rowPhotosInputRef.current?.click();
        }}
        onDeleteAlbum={handleDelete}
      />
    </Box>
  );
};
