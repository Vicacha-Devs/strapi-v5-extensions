import {
  Box,
  Checkbox,
  Field,
  MultiSelect,
  MultiSelectOption,
  NumberInput,
  Tabs,
  Typography,
} from "@strapi/design-system";
import * as React from "react";

import type { ResourcesPluginSettings } from "../../../../shared";

const SUB_CARD_BORDER_STYLE: React.CSSProperties = {
  border: "1px solid rgba(128, 128, 128, 0.18)",
};

export const INLINE_CODE_STYLE: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "0.88em",
  padding: "2px 6px",
  borderRadius: 4,
  background: "rgba(128, 128, 128, 0.16)",
  border: "1px solid rgba(128, 128, 128, 0.25)",
};

const EXTENSION_PRESETS = [
  ".pdf",
  ".epub",
  ".mobi",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".mp3",
  ".m4a",
  ".ogg",
  ".wav",
  ".mp4",
  ".zip",
  ".docx",
  ".xlsx",
  ".pptx",
];

const MIME_TYPE_PRESETS = [
  "application/pdf",
  "application/epub+zip",
  "application/x-mobipocket-ebook",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "video/mp4",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

interface TabProps {
  settings: ResourcesPluginSettings;
  setSettings: React.Dispatch<React.SetStateAction<ResourcesPluginSettings | null>>;
  t: (id: string, defaultMessage: string) => string;
}

export const ResourcesOptimizationTab: React.FC<TabProps> = ({ settings, setSettings, t }) => (
  <Tabs.Content value="optimization">
    <Box paddingTop={4}>
      <Box padding={6} background="neutral0" hasRadius shadow="filterShadow">
        <Box marginBottom={4}>
          <Typography variant="delta" tag="h2" fontWeight="bold">
            {t("settings.tab.optimization", "CDN Optimization & Folder Sync")}
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {t(
              "settings.ui.optimization_subtitle",
              "Responsive image transforms and Strapi v5 Media Library folder synchronization limits."
            )}
          </Typography>
        </Box>

        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 20,
            alignItems: "start",
          }}
        >
          <Box padding={4} background="neutral100" hasRadius style={SUB_CARD_BORDER_STYLE}>
            <Checkbox
              checked={settings.enableCloudinaryOptimization}
              onCheckedChange={(checked: boolean) =>
                setSettings({
                  ...settings,
                  enableCloudinaryOptimization: Boolean(checked),
                })
              }
            >
              {t("checkbox.enable_automatic_cloudinary_prefix", "Enable automatic Cloudinary")}{" "}
              <code style={INLINE_CODE_STYLE}>f_auto</code>,{" "}
              <code style={INLINE_CODE_STYLE}>q_auto</code>{" "}
              {t(
                "checkbox.optimization_for_media_library_urls",
                "optimization for Media Library URLs"
              )}
            </Checkbox>
            <Box paddingTop={2}>
              <Typography variant="pi" textColor="neutral600">
                {t(
                  "settings.ui.cloudinary_rewrite_hint",
                  "Automatically rewrites Cloudinary (f_auto, q_auto) and Strapi responsive image formats for gallery thumbnails."
                )}
              </Typography>
            </Box>
          </Box>

          <Box padding={4} background="neutral100" hasRadius style={SUB_CARD_BORDER_STYLE}>
            <Checkbox
              checked={settings.autoSyncMediaFolders}
              onCheckedChange={(checked: boolean) =>
                setSettings({
                  ...settings,
                  autoSyncMediaFolders: Boolean(checked),
                })
              }
            >
              {t("settings.ui.one_click_media_folder_sync", "One-Click Media Folder Sync")} (
              <code style={INLINE_CODE_STYLE}>plugin::upload.folder</code>)
            </Checkbox>
            <Box paddingTop={2}>
              <Typography variant="pi" textColor="neutral600">
                {t(
                  "settings.ui.allows_editors_to_synchronize_all_photos_inside_",
                  "Allows editors to synchronize all photos inside a Strapi v5 Media Library folder directly into an album."
                )}
              </Typography>
            </Box>
          </Box>

          <Field.Root
            name="maxPhotosPerAlbum"
            hint={t(
              "settings.ui.max_photos_per_album_hint",
              "Maximum number of photos (1–500) imported when syncing a Media Library folder into a gallery album."
            )}
          >
            <Field.Label>
              {t("field.max_photos_per_album", "Max Photos per Album (1–500)")}
            </Field.Label>
            <NumberInput
              name="maxPhotosPerAlbum"
              aria-label={t("field.max_photos_per_album", "Max Photos per Album (1–500)")}
              value={settings.maxPhotosPerAlbum ?? 60}
              onValueChange={(val: number | undefined) =>
                setSettings({
                  ...settings,
                  maxPhotosPerAlbum: typeof val === "number" && val >= 1 && val <= 500 ? val : 60,
                })
              }
            />
            <Field.Hint />
          </Field.Root>
        </Box>
      </Box>
    </Box>
  </Tabs.Content>
);

export const ResourcesSecurityTab: React.FC<TabProps> = ({ settings, setSettings, t }) => {
  const selectedExtensions = settings.allowedDownloadExtensions || [];
  const extensionOptions = Array.from(new Set([...EXTENSION_PRESETS, ...selectedExtensions]));

  const selectedMimes = settings.allowedDownloadMimeTypes || [];
  const mimeOptions = Array.from(new Set([...MIME_TYPE_PRESETS, ...selectedMimes]));

  return (
    <Tabs.Content value="security">
      <Box paddingTop={4}>
        <Box padding={6} background="neutral0" hasRadius shadow="filterShadow">
          <Box marginBottom={4}>
            <Typography variant="delta" tag="h2" fontWeight="bold">
              {t("settings.tab.security", "Download Security & Allow-Lists")}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              {t(
                "settings.ui.security_subtitle",
                "Strict file extension and MIME-type allow-lists enforced when issuing public publication download tickets."
              )}
            </Typography>
          </Box>

          <Box
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 20,
            }}
          >
            <Field.Root
              name="allowedDownloadExtensions"
              hint={t(
                "settings.ui.allowed_extensions_hint",
                "File extensions permitted by POST /api/resources/publications/:slug/download."
              )}
            >
              <Field.Label>
                {t("field.allowed_download_extensions", "Allowed Download File Extensions")}
              </Field.Label>
              <MultiSelect
                name="allowedDownloadExtensions"
                withTags
                placeholder={t(
                  "placeholder.select_allowed_extensions",
                  "Select allowed file extensions..."
                )}
                value={selectedExtensions}
                onChange={(nextValues: string[]) =>
                  setSettings({
                    ...settings,
                    allowedDownloadExtensions: nextValues,
                  })
                }
                onClear={() =>
                  setSettings({
                    ...settings,
                    allowedDownloadExtensions: [],
                  })
                }
              >
                {extensionOptions.map((ext) => (
                  <MultiSelectOption key={ext} value={ext}>
                    {ext}
                  </MultiSelectOption>
                ))}
              </MultiSelect>
              <Field.Hint />
            </Field.Root>

            <Field.Root
              name="allowedDownloadMimeTypes"
              hint={t(
                "settings.ui.allowed_mimes_hint",
                "MIME types permitted when generating Content-Disposition download tickets."
              )}
            >
              <Field.Label>
                {t("field.allowed_download_mime_types", "Allowed Download MIME Types")}
              </Field.Label>
              <MultiSelect
                name="allowedDownloadMimeTypes"
                withTags
                placeholder={t("placeholder.select_allowed_mimes", "Select allowed MIME types...")}
                value={selectedMimes}
                onChange={(nextValues: string[]) =>
                  setSettings({
                    ...settings,
                    allowedDownloadMimeTypes: nextValues,
                  })
                }
                onClear={() =>
                  setSettings({
                    ...settings,
                    allowedDownloadMimeTypes: [],
                  })
                }
              >
                {mimeOptions.map((mime) => (
                  <MultiSelectOption key={mime} value={mime}>
                    {mime}
                  </MultiSelectOption>
                ))}
              </MultiSelect>
              <Field.Hint />
            </Field.Root>
          </Box>
        </Box>
      </Box>
    </Tabs.Content>
  );
};
