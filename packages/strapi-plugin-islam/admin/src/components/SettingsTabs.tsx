import {
  Box,
  Checkbox,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Tabs,
  Typography,
} from "@strapi/design-system";
import React from "react";

import type { IslamPluginSettings } from "../../../shared";
import { EcosystemBridgesSettingsTab } from "./SettingsBridgesTab";
import {
  CalculationSettingsTab,
  FiqhRatesSettingsTab,
  type SettingsTabProps,
  type TranslateFn,
} from "./SettingsCalculationAndFiqhTabs";

export {
  CalculationSettingsTab,
  EcosystemBridgesSettingsTab,
  FiqhRatesSettingsTab,
  type SettingsTabProps,
  type TranslateFn,
};

export const QURAN_RECITER_OPTIONS = [
  {
    value: "7",
    name: "Mishari Rashid al-`Afasy",
    label: "7 — Mishari Rashid al-`Afasy (Murattal — Default)",
  },
  {
    value: "2",
    name: "AbdulBaset AbdulSamad",
    label: "2 — AbdulBaset AbdulSamad (Murattal)",
  },
  {
    value: "1",
    name: "AbdulBaset AbdulSamad",
    label: "1 — AbdulBaset AbdulSamad (Mujawwad)",
  },
  {
    value: "3",
    name: "Abdur-Rahman as-Sudais",
    label: "3 — Abdur-Rahman as-Sudais",
  },
  { value: "4", name: "Abu Bakr al-Shatri", label: "4 — Abu Bakr al-Shatri" },
  { value: "5", name: "Hani ar-Rifai", label: "5 — Hani ar-Rifai" },
  {
    value: "6",
    name: "Mahmoud Khalil Al-Husary",
    label: "6 — Mahmoud Khalil Al-Husary",
  },
  {
    value: "12",
    name: "Mahmoud Khalil Al-Husary",
    label: "12 — Mahmoud Khalil Al-Husary (Muallim)",
  },
  {
    value: "9",
    name: "Mohamed Siddiq al-Minshawi",
    label: "9 — Mohamed Siddiq al-Minshawi (Murattal)",
  },
  {
    value: "8",
    name: "Mohamed Siddiq al-Minshawi",
    label: "8 — Mohamed Siddiq al-Minshawi (Mujawwad)",
  },
  { value: "10", name: "Sa`ud ash-Shuraym", label: "10 — Sa`ud ash-Shuraym" },
  { value: "11", name: "Mohamed al-Tablawi", label: "11 — Mohamed al-Tablawi" },
];

export const QuranFoundationSettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  setSettings,
  t,
}) => (
  <Tabs.Content value="quran">
    <Box
      background="neutral0"
      padding={6}
      hasRadius
      shadow="filterShadow"
      style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
    >
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography variant="beta" tag="h2">
          {t(
            "settings.ui.3_quran_foundation_content_api_v4_0_0_oauth2_scr",
            "Quran Foundation Content API v4.0.0 (OAuth2 & Script Settings)"
          )}
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          {t(
            "settings.ui.configure_quranic_script_rendering_default_audio",
            "Configure Quranic script rendering, default audio reciter, and anti-auto-translate protection."
          )}
        </Typography>
      </Flex>

      <Box
        paddingTop={4}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 20,
        }}
      >
        <Field.Root
          name="qfEnvironment"
          hint={t(
            "settings.ui.target_oauth2_content_v4_endpoint_environment",
            "Target OAuth2 & Content v4 endpoint environment."
          )}
        >
          <Field.Label>
            {t("field.api_environment", "API Environment")}
          </Field.Label>
          <SingleSelect
            placeholder={t(
              "placeholder.select_environment",
              "Select environment"
            )}
            value={settings.quranFoundation?.environment || "production"}
            onChange={(val: string | number) =>
              setSettings({
                ...settings,
                quranFoundation: {
                  ...settings.quranFoundation,
                  environment:
                    String(val) === "prelive" ? "prelive" : "production",
                },
              })
            }
          >
            <SingleSelectOption value="production">
              {t(
                "settings.ui.production_live_quran_foundation_api",
                "production — Live Quran.Foundation API"
              )}
            </SingleSelectOption>
            <SingleSelectOption value="prelive">
              {t(
                "settings.ui.prelive_staging_sandbox_api",
                "prelive — Staging / Sandbox API"
              )}
            </SingleSelectOption>
          </SingleSelect>
          <Field.Hint />
        </Field.Root>

        <Field.Root
          name="qfScript"
          hint={t(
            "settings.ui.primary_arabic_script_returned_for_quranic_verse",
            "Primary Arabic script returned for Quranic verses."
          )}
        >
          <Field.Label>
            {t(
              "field.default_arabic_mushaf_script",
              "Default Arabic Mushaf Script"
            )}
          </Field.Label>
          <SingleSelect
            placeholder={t(
              "placeholder.select_arabic_script",
              "Select Arabic script"
            )}
            value={settings.quranFoundation?.defaultScript || "uthmani"}
            onChange={(val: string | number) =>
              setSettings({
                ...settings,
                quranFoundation: {
                  ...settings.quranFoundation,
                  defaultScript: String(
                    val
                  ) as IslamPluginSettings["quranFoundation"]["defaultScript"],
                },
              })
            }
          >
            <SingleSelectOption value="uthmani">
              {t(
                "settings.ui.uthmani_madinah_mushaf_uthmani",
                "uthmani — Madinah Mushaf Uthmani"
              )}
            </SingleSelectOption>
            <SingleSelectOption value="uthmani_tajweed">
              {t(
                "settings.ui.uthmani_tajweed_color_coded_tajweed",
                "uthmani_tajweed — Color-Coded Tajweed"
              )}
            </SingleSelectOption>
            <SingleSelectOption value="uthmani_simple">
              {t(
                "settings.ui.uthmani_simple_script",
                "uthmani_simple — Simple Uthmani Script"
              )}
            </SingleSelectOption>
            <SingleSelectOption value="imlaei">
              {t(
                "settings.ui.imlaei_standard_imlaei_script",
                "imlaei — Standard Imlaei Script"
              )}
            </SingleSelectOption>
            <SingleSelectOption value="indopak_nastaleeq">
              {t(
                "settings.ui.indopak_nastaleeq_indopak_nastaleeq",
                "indopak_nastaleeq — IndoPak Nastaleeq"
              )}
            </SingleSelectOption>
          </SingleSelect>
          <Field.Hint />
        </Field.Root>

        <Field.Root
          name="qfReciter"
          hint={t(
            "settings.ui.reciter_id_for_verse_by_verse_audio_7_mishary_ra",
            "Default reciter for verse-by-verse and chapter audio (7 = Mishari Rashid al-`Afasy)."
          )}
        >
          <Field.Label>
            {t("field.default_audio_reciter_id", "Default Audio Reciter")}
          </Field.Label>
          <SingleSelect
            name="qfReciter"
            placeholder={t(
              "placeholder.e_g_7_mishary_rashid_alafasy",
              "7 — Mishari Rashid al-`Afasy"
            )}
            value={String(settings.quranFoundation?.defaultReciterId || 7)}
            onChange={(val: string | number) => {
              const nextReciterId = Number(val) || 7;
              setSettings({
                ...settings,
                quranFoundation: {
                  ...settings.quranFoundation,
                  defaultReciterId: nextReciterId,
                  defaultChapterReciterId: nextReciterId,
                },
              });
            }}
          >
            {QURAN_RECITER_OPTIONS.map((reciter) => (
              <SingleSelectOption key={reciter.value} value={reciter.value}>
                {reciter.label}
              </SingleSelectOption>
            ))}
          </SingleSelect>
          <Field.Hint />
        </Field.Root>
      </Box>

      <Flex direction="column" alignItems="flex-start" gap={3} paddingTop={4}>
        <Checkbox
          checked={Boolean(settings.quranFoundation?.enabled ?? true)}
          onCheckedChange={(val: boolean) =>
            setSettings({
              ...settings,
              quranFoundation: {
                ...settings.quranFoundation,
                enabled: Boolean(val),
              },
            })
          }
        >
          {t(
            "checkbox.enable_quran_foundation_content_api_v4_0_0_gatew",
            "Enable Quran Foundation Content API v4.0.0 Gateway"
          )}
        </Checkbox>
        <Checkbox
          checked={Boolean(
            settings.quranFoundation?.disableBrowserAutoTranslate ?? true
          )}
          onCheckedChange={(val: boolean) =>
            setSettings({
              ...settings,
              quranFoundation: {
                ...settings.quranFoundation,
                disableBrowserAutoTranslate: Boolean(val),
              },
            })
          }
        >
          {t(
            "checkbox.enforce_translation_integrity_policy",
            'Enforce Translation Integrity Policy (translate="no" / class="notranslate")'
          )}
        </Checkbox>
      </Flex>
    </Box>
  </Tabs.Content>
);
