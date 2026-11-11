import {
  Box,
  Field,
  MultiSelect,
  MultiSelectOption,
  SingleSelect,
  SingleSelectOption,
  Tabs,
  TextInput,
  Typography,
} from "@strapi/design-system";
import {
  LOCALE_OPTIONS,
  SECONDARY_CALENDAR_OPTIONS,
} from "@vicacha-devs/plugin-shared";
import * as React from "react";

import type { ResourcesPluginSettings } from "../../../../shared";
import { INLINE_CODE_STYLE } from "./ResourcesSettingsTabs";

export interface ResourcesFoldersTabProps {
  settings: ResourcesPluginSettings;
  setSettings: React.Dispatch<
    React.SetStateAction<ResourcesPluginSettings | null>
  >;
  t: (id: string, defaultMessage: string) => string;
}

export const ResourcesFoldersTab: React.FC<ResourcesFoldersTabProps> = ({
  settings,
  setSettings,
  t,
}) => (
  <Tabs.Content value="folders">
    <Box paddingTop={4}>
      <Box padding={6} background="neutral0" hasRadius shadow="filterShadow">
        <Box marginBottom={4}>
          <Typography variant="delta" tag="h2" fontWeight="bold">
            {t(
              "settings.ui.1_media_library_folders_calendar_formatting",
              "Media Library Folders, Localization & Calendar Formatting"
            )}
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {t(
              "settings.ui.default_folder_hierarchy",
              "Default folder hierarchy in Strapi Media Library"
            )}{" "}
            (<code style={INLINE_CODE_STYLE}>plugin::upload.folder</code>)
          </Typography>
        </Box>

        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 20,
          }}
        >
          <Field.Root
            name="organizationName"
            hint={t(
              "settings.ui.displayed_on_downloadable_pdf_covers_press_kits_",
              "Displayed on downloadable PDF covers, press kits, and gallery metadata."
            )}
          >
            <Field.Label>
              {t("field.organization_name", "Organization Name")}
            </Field.Label>
            <TextInput
              name="organizationName"
              placeholder={t(
                "placeholder.e_g_mezquita_central_al_qurtubi_de_bogot",
                "e.g., Central Mosque of Bogotá"
              )}
              value={settings.organizationName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSettings({
                  ...settings,
                  organizationName: e.target.value,
                })
              }
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="defaultPublicationsFolderPath"
            hint={t(
              "settings.ui.default_strapi_media_library_folder_where_pdf_gu",
              "Default Strapi Media Library folder where PDF guides and eBooks are organized."
            )}
          >
            <Field.Label>
              {t(
                "field.default_publications_media_folder_path",
                "Default Publications Media Folder Path"
              )}
            </Field.Label>
            <TextInput
              name="defaultPublicationsFolderPath"
              placeholder={t(
                "placeholder.e_g_resources_publications",
                "e.g., /publications"
              )}
              value={settings.defaultPublicationsFolderPath}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSettings({
                  ...settings,
                  defaultPublicationsFolderPath: e.target.value,
                })
              }
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="defaultGalleriesFolderPath"
            hint={t(
              "settings.ui.root_strapi_media_library_folder_scanned_when_sy",
              "Root Strapi Media Library folder scanned when syncing photo gallery albums."
            )}
          >
            <Field.Label>
              {t(
                "field.default_galleries_media_folder_path",
                "Default Galleries Media Folder Path"
              )}
            </Field.Label>
            <TextInput
              name="defaultGalleriesFolderPath"
              placeholder={t(
                "placeholder.e_g_resources_galleries",
                "e.g., /galleries"
              )}
              value={settings.defaultGalleriesFolderPath}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSettings({
                  ...settings,
                  defaultGalleriesFolderPath: e.target.value,
                })
              }
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="secondaryCalendar"
            hint={t(
              "settings.ui.formats_publication_release_dates_with_dual_greg",
              "Formats publication release dates and gallery event dates with dual Gregorian + Hijri timestamps."
            )}
          >
            <Field.Label>
              {t(
                "field.secondary_liturgical_calendar",
                "Secondary Liturgical Calendar"
              )}
            </Field.Label>
            <SingleSelect
              placeholder={t(
                "placeholder.select_secondary_calendar",
                "Select secondary calendar"
              )}
              value={settings.secondaryCalendar || "islamic-umalqura"}
              onChange={(val: string | number) =>
                setSettings({
                  ...settings,
                  secondaryCalendar: String(val),
                })
              }
            >
              {SECONDARY_CALENDAR_OPTIONS.map((opt) => (
                <SingleSelectOption key={opt.value} value={opt.value}>
                  {opt.label}
                </SingleSelectOption>
              ))}
            </SingleSelect>
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="defaultLocale"
            hint={t(
              "settings.ui.default_locale_hint",
              "Fallback language code when a publication, album, or glossary query omits a locale."
            )}
          >
            <Field.Label>
              {t("field.default_locale", "Default Catalog Locale")}
            </Field.Label>
            <SingleSelect
              value={settings.defaultLocale || "es"}
              onChange={(val: string | number) =>
                setSettings({
                  ...settings,
                  defaultLocale: String(val),
                })
              }
            >
              {LOCALE_OPTIONS.map((opt) => (
                <SingleSelectOption key={opt.value} value={opt.value}>
                  {opt.label}
                </SingleSelectOption>
              ))}
            </SingleSelect>
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="supportedLocales"
            hint={t(
              "settings.ui.supported_locales_hint",
              "ISO language codes enabled for localized publications, photo galleries, and glossary terms."
            )}
          >
            <Field.Label>
              {t("field.supported_locales", "Supported Catalog Locales")}
            </Field.Label>
            <MultiSelect
              name="supportedLocales"
              withTags
              placeholder={t(
                "placeholder.select_supported_locales",
                "Select supported locales..."
              )}
              value={settings.supportedLocales || ["es", "en", "ar", "tr"]}
              onChange={(nextValues: string[]) =>
                setSettings({
                  ...settings,
                  supportedLocales: nextValues,
                })
              }
              onClear={() =>
                setSettings({
                  ...settings,
                  supportedLocales: ["es"],
                })
              }
            >
              {LOCALE_OPTIONS.map((opt) => (
                <MultiSelectOption key={opt.value} value={opt.value}>
                  {opt.label}
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
