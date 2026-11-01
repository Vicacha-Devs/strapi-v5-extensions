import {
  Box,
  Button,
  Divider,
  Field,
  Flex,
  Main,
  MultiSelect,
  MultiSelectOption,
  SingleSelect,
  SingleSelectOption,
  Tabs,
  TextInput,
  Typography,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import * as React from "react";
import { useIntl } from "react-intl";

import { PLUGIN_ID, type ResourcesPluginSettings } from "../../../shared";
import {
  INLINE_CODE_STYLE,
  ResourcesOptimizationTab,
  ResourcesSecurityTab,
} from "../components/resources/ResourcesSettingsTabs";

const LOCALE_OPTIONS = [
  { value: "es", label: "es — Español" },
  { value: "en", label: "en — English" },
  { value: "ar", label: "ar — العربية (Arabic)" },
  { value: "tr", label: "tr — Türkçe (Turkish)" },
  { value: "fr", label: "fr — Français (French)" },
  { value: "de", label: "de — Deutsch (German)" },
  { value: "pt", label: "pt — Português (Portuguese)" },
  { value: "it", label: "it — Italiano (Italian)" },
  { value: "nl", label: "nl — Nederlands (Dutch)" },
  { value: "pl", label: "pl — Polski (Polish)" },
  { value: "id", label: "id — Bahasa Indonesia" },
  { value: "ur", label: "ur — اردو (Urdu)" },
  { value: "zh", label: "zh — 中文 (Chinese)" },
];

const SECONDARY_CALENDAR_OPTIONS = [
  { value: "islamic-umalqura", label: "islamic-umalqura (Hijri Umm al-Qura)" },
  { value: "islamic-civil", label: "islamic-civil (Tabular Islamic Civil)" },
  { value: "islamic-tbla", label: "islamic-tbla (Tabular Astronomical)" },
  { value: "hebrew", label: "hebrew (Hebrew)" },
  { value: "persian", label: "persian (Solar Hijri)" },
  { value: "none", label: "none (Gregorian Only)" },
];

export const SettingsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });
  const { get, put } = useFetchClient();
  const [settings, setSettings] =
    React.useState<ResourcesPluginSettings | null>(null);
  const [savedNotice, setSavedNotice] = React.useState<string>("");

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await get(`/${PLUGIN_ID}/settings`);
        if (res?.data?.data) {
          setSettings(res.data.data);
        }
      } catch {
        // Ignore in unmounted mode
      }
    };
    void fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    try {
      const res = await put(`/${PLUGIN_ID}/settings`, settings);
      if (res?.data?.data) {
        setSettings(res.data.data);
        setSavedNotice(
          t(
            "settings.ui.saved_notice",
            "Resources & Media Library settings saved."
          )
        );
      }
    } catch (err) {
      setSavedNotice(`Error saving settings: ${(err as Error).message}`);
    }
  };

  if (!settings) {
    return (
      <Main>
        <Box padding={8}>
          <Typography>
            {t(
              "settings.ui.loading_resources_media_library_settings",
              "Loading Resources & Media Library settings..."
            )}
          </Typography>
        </Box>
      </Main>
    );
  }

  return (
    <Main>
      <Box padding={8} background="neutral100">
        <Flex
          justifyContent="space-between"
          alignItems="center"
          paddingBottom={4}
          wrap="wrap"
          gap={4}
        >
          <Box>
            <Typography variant="alpha" tag="h1">
              {t(
                "settings.ui.resources_media_library_settings",
                "Resources & Media Library Settings"
              )}
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              {t(
                "settings.ui.configure_strapi_v5_media_library_folder_default",
                "Configure Strapi v5 Media Library folder defaults, localization, CDN transforms, and download security."
              )}
            </Typography>
          </Box>
          <Button onClick={handleSave}>
            {t("settings.ui.save_settings", "Save Settings")}
          </Button>
        </Flex>

        {savedNotice && (
          <Box padding={3} marginBottom={4} background="success100" hasRadius>
            <Typography fontWeight="bold" textColor="success700">
              {savedNotice}
            </Typography>
          </Box>
        )}

        <Divider />

        <Box paddingTop={6}>
          <Tabs.Root defaultValue="folders" variant="simple">
            <Tabs.List
              aria-label={t(
                "settings.ui.resources_media_library_settings",
                "Resources Settings"
              )}
            >
              <Tabs.Trigger value="folders">
                {t(
                  "settings.tab.folders",
                  "Media Library Folders & Organization"
                )}
              </Tabs.Trigger>
              <Tabs.Trigger value="optimization">
                {t(
                  "settings.tab.optimization",
                  "CDN Optimization & Folder Sync"
                )}
              </Tabs.Trigger>
              <Tabs.Trigger value="security">
                {t("settings.tab.security", "Download Security & Allow-Lists")}
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="folders">
              <Box paddingTop={4}>
                <Box
                  padding={6}
                  background="neutral0"
                  hasRadius
                  shadow="filterShadow"
                >
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
                      (
                      <code style={INLINE_CODE_STYLE}>
                        plugin::upload.folder
                      </code>
                      ), secondary calendar dates, and catalog locales.
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
                          "e.g., /resources/publications"
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
                          "e.g., /resources/galleries"
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
                        {t(
                          "field.supported_locales",
                          "Supported Catalog Locales"
                        )}
                      </Field.Label>
                      <MultiSelect
                        name="supportedLocales"
                        withTags
                        placeholder={t(
                          "placeholder.select_supported_locales",
                          "Select supported locales..."
                        )}
                        value={
                          settings.supportedLocales || ["es", "en", "ar", "tr"]
                        }
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

            <ResourcesOptimizationTab
              settings={settings}
              setSettings={setSettings}
              t={t}
            />
            <ResourcesSecurityTab
              settings={settings}
              setSettings={setSettings}
              t={t}
            />
          </Tabs.Root>
        </Box>
      </Box>
    </Main>
  );
};

export default SettingsPage;
