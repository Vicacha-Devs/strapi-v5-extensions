import {
  Badge,
  Box,
  Button,
  Flex,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system";
import * as React from "react";

import {
  CONTENT_TYPE_UIDS,
  type GalleryAlbumCategory,
  type GalleryAlbumRecord,
  type MediaLibraryAsset,
} from "../../../../shared";
import { CARD_BORDER_STYLE, getContentManagerUrl, useResourcesTranslation } from "./uploadHelper";

function truncateText(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export interface GalleryMediaPickerProps {
  selectedAssets: MediaLibraryAsset[];
  imageAssets: MediaLibraryAsset[];
  selectedPhotoIds: Array<number | string>;
  showLibraryPicker: boolean;
  onTogglePhotoSelection: (id?: number | string) => void;
}

export const GalleryMediaPicker: React.FC<GalleryMediaPickerProps> = ({
  selectedAssets,
  imageAssets,
  selectedPhotoIds,
  showLibraryPicker,
  onTogglePhotoSelection,
}) => {
  const { t } = useResourcesTranslation();

  return (
    <>
      {selectedAssets.length > 0 && (
        <Box paddingTop={4}>
          <Typography variant="pi" textColor="neutral600">
            {t("gallery.selected_photos", "Selected Album Photos")} ({selectedAssets.length}):
          </Typography>
          <Flex gap={2} paddingTop={2} wrap="wrap">
            {selectedAssets.map((img) => (
              <Box
                key={String(img.id)}
                onClick={() => onTogglePhotoSelection(img.id)}
                padding={2}
                hasRadius
                style={{
                  cursor: "pointer",
                  border: "2px solid #7b79ff",
                  background: "rgba(123, 121, 255, 0.14)",
                }}
              >
                <Flex gap={2} alignItems="center">
                  {img.thumbnailUrl && (
                    <img
                      src={img.thumbnailUrl}
                      alt={img.name}
                      style={{
                        width: 28,
                        height: 28,
                        objectFit: "cover",
                        borderRadius: 4,
                      }}
                    />
                  )}
                  <Typography variant="pi">{truncateText(img.name, 22)} ×</Typography>
                </Flex>
              </Box>
            ))}
          </Flex>
        </Box>
      )}

      {showLibraryPicker && imageAssets.length > 0 && (
        <Box padding={4} marginTop={4} background="neutral100" hasRadius style={CARD_BORDER_STYLE}>
          <Typography variant="pi" textColor="neutral600">
            {t(
              "gallery.picker_hint",
              "Click any Media Library image below to include or exclude it from this album:"
            )}
          </Typography>
          <Flex gap={2} paddingTop={2} wrap="wrap">
            {imageAssets.slice(0, 24).map((img) => {
              const isSelected = selectedPhotoIds.some((id) => String(id) === String(img.id));
              return (
                <Box
                  key={String(img.id)}
                  onClick={() => onTogglePhotoSelection(img.id)}
                  padding={2}
                  background="neutral0"
                  hasRadius
                  style={{
                    cursor: "pointer",
                    border: isSelected ? "2px solid #7b79ff" : "1px solid rgba(128,128,128,0.28)",
                  }}
                >
                  <Flex gap={2} alignItems="center">
                    {img.thumbnailUrl && (
                      <img
                        src={img.thumbnailUrl}
                        alt={img.name}
                        style={{
                          width: 32,
                          height: 32,
                          objectFit: "cover",
                          borderRadius: 4,
                        }}
                      />
                    )}
                    <Typography variant="pi">{truncateText(img.name, 22)}</Typography>
                  </Flex>
                </Box>
              );
            })}
          </Flex>
        </Box>
      )}
    </>
  );
};

export interface PhotoGalleriesTableProps {
  galleries: GalleryAlbumRecord[];
  getCategoryLabel: (cat: GalleryAlbumCategory) => string;
  onAddPhotosToAlbum: (album: GalleryAlbumRecord) => void;
  onDeleteAlbum: (album: GalleryAlbumRecord) => void;
}

export const PhotoGalleriesTable: React.FC<PhotoGalleriesTableProps> = ({
  galleries,
  getCategoryLabel,
  onAddPhotosToAlbum,
  onDeleteAlbum,
}) => {
  const { t } = useResourcesTranslation();

  return (
    <Table colCount={4} rowCount={galleries.length + 1}>
      <Thead>
        <Tr>
          <Th>
            <Typography variant="sigma">{t("page.ui.album", "Album")}</Typography>
          </Th>
          <Th>
            <Typography variant="sigma">{t("page.ui.category", "Category")}</Typography>
          </Th>
          <Th>
            <Typography variant="sigma">{t("page.ui.photos", "Photos")}</Typography>
          </Th>
          <Th>
            <Typography variant="sigma">{t("common.actions", "Actions")}</Typography>
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {galleries.map((album) => (
          <Tr key={album.documentId || album.slug}>
            <Td>
              <Box paddingTop={2} paddingBottom={2}>
                <Flex gap={3} alignItems="center">
                  {album.coverPhoto?.thumbnailUrl ? (
                    <img
                      src={album.coverPhoto.thumbnailUrl}
                      alt={album.title}
                      style={{
                        width: 44,
                        height: 44,
                        objectFit: "cover",
                        borderRadius: 6,
                      }}
                    />
                  ) : null}
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography fontWeight="bold">{album.title}</Typography>
                    {album.description && (
                      <Typography variant="pi" textColor="neutral600">
                        {truncateText(album.description, 85)}
                      </Typography>
                    )}
                  </Flex>
                </Flex>
              </Box>
            </Td>
            <Td>
              <Badge>{getCategoryLabel(album.category)}</Badge>
            </Td>
            <Td>
              <Flex gap={2} alignItems="center" wrap="wrap">
                <Badge active={album.photoCount > 0}>
                  {album.photoCount} {t("page.ui.photos", "Photos").toLowerCase()}
                </Badge>
                {(album.photos || []).slice(0, 4).map((p) => (
                  <img
                    key={String(p.id || p.url)}
                    src={p.thumbnailUrl || p.url}
                    alt={p.name}
                    title={p.name}
                    style={{
                      width: 28,
                      height: 28,
                      objectFit: "cover",
                      borderRadius: 4,
                    }}
                  />
                ))}
                <Button size="S" variant="secondary" onClick={() => onAddPhotosToAlbum(album)}>
                  {t("gallery.btn.add_photos", "+ Add Photos")}
                </Button>
              </Flex>
            </Td>
            <Td>
              <Flex gap={2} wrap="wrap">
                <Button
                  size="S"
                  variant="tertiary"
                  onClick={() => {
                    window.location.href = getContentManagerUrl(
                      CONTENT_TYPE_UIDS.galleryAlbum,
                      album.documentId,
                      album.locale
                    );
                  }}
                >
                  {t("common.edit", "Edit")}
                </Button>
                <Button size="S" variant="danger-light" onClick={() => onDeleteAlbum(album)}>
                  {t("common.delete", "Delete")}
                </Button>
              </Flex>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};
