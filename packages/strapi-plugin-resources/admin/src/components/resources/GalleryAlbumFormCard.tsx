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

import type {
  GalleryAlbumCategory,
  MediaLibraryAsset,
} from "../../../../shared";
import { GalleryMediaPicker } from "./PhotoGalleriesTable";
import { CARD_BORDER_STYLE, useResourcesTranslation } from "./uploadHelper";

export const GALLERY_CATEGORY_LABELS: Record<GalleryAlbumCategory, string> = {
  architecture: "Architecture & Calligraphy",
  ramadan_eid: "Ramadan & Eid Gatherings",
  community: "Community & Education",
  events: "Special Events",
  heritage: "History & Heritage",
  press: "Press & Media",
};

export interface GalleryAlbumFormCardProps {
  title: string;
  category: GalleryAlbumCategory;
  description: string;
  selectedAssets: MediaLibraryAsset[];
  imageAssets: MediaLibraryAsset[];
  selectedPhotoIds: Array<number | string>;
  showLibraryPicker: boolean;
  uploading: boolean;
  getCategoryLabel: (cat: GalleryAlbumCategory) => string;
  onTitleChange: (val: string) => void;
  onCategoryChange: (val: GalleryAlbumCategory) => void;
  onDescriptionChange: (val: string) => void;
  onTogglePhotoSelection: (id?: number | string) => void;
  onToggleLibraryPicker: () => void;
  onUploadClick: () => void;
  onSave: () => void;
}

export const GalleryAlbumFormCard: React.FC<GalleryAlbumFormCardProps> = ({
  title,
  category,
  description,
  selectedAssets,
  imageAssets,
  selectedPhotoIds,
  showLibraryPicker,
  uploading,
  getCategoryLabel,
  onTitleChange,
  onCategoryChange,
  onDescriptionChange,
  onTogglePhotoSelection,
  onToggleLibraryPicker,
  onUploadClick,
  onSave,
}) => {
  const { t } = useResourcesTranslation();

  return (
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onTitleChange(e.target.value)
              }
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
                onCategoryChange(String(val) as GalleryAlbumCategory)
              }
            >
              {(
                Object.keys(GALLERY_CATEGORY_LABELS) as GalleryAlbumCategory[]
              ).map((val) => (
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
            <Field.Label>
              {t("field.album_description", "Description (Optional)")}
            </Field.Label>
            <TextInput
              placeholder={t(
                "placeholder.e_g_recorrido_fotogr_fico_por_el_sal_n_de_oraci_",
                "e.g., Main prayer hall, mihrab, and central dome..."
              )}
              value={description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onDescriptionChange(e.target.value)
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
        onTogglePhotoSelection={onTogglePhotoSelection}
      />

      <Box paddingTop={4}>
        <Divider />
      </Box>

      <Flex
        paddingTop={4}
        justifyContent="space-between"
        alignItems="center"
        wrap="wrap"
        gap={3}
      >
        <Flex gap={3} alignItems="center" wrap="wrap">
          <Button
            variant="secondary"
            disabled={uploading}
            onClick={onUploadClick}
          >
            {uploading
              ? t("common.uploading", "Uploading…")
              : t(
                  "gallery.btn.upload_photos_computer",
                  "+ Upload Photos from Computer"
                )}
          </Button>
          {imageAssets.length > 0 && (
            <Button variant="tertiary" onClick={onToggleLibraryPicker}>
              {showLibraryPicker
                ? t(
                    "gallery.btn.hide_media_library",
                    "Hide Media Library Picker"
                  )
                : `${t("gallery.btn.choose_media_library", "Choose from Media Library")} (${imageAssets.length})`}
            </Button>
          )}
          {selectedPhotoIds.length > 0 && (
            <Badge active>
              {selectedPhotoIds.length}{" "}
              {t("page.ui.photos", "Photos").toLowerCase()}
            </Badge>
          )}
        </Flex>
        <Button onClick={onSave}>
          {t("page.ui.create_album", "Create Album")}
        </Button>
      </Flex>
    </Box>
  );
};
