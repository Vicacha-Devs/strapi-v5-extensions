import {
  Box,
  Checkbox,
  Divider,
  Field,
  MultiSelect,
  MultiSelectOption,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from "@strapi/design-system";
import {
  LOCALE_OPTIONS,
  mergeSelectOptions,
} from "@vicacha-devs/plugin-shared";
import React, { useMemo } from "react";

import type { MediaFeedsSettings } from "../../../shared";

const SUB_CARD_BORDER_STYLE: React.CSSProperties = {
  border: "1px solid rgba(128, 128, 128, 0.18)",
};

const INLINE_CODE_STYLE: React.CSSProperties = {
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "0.88em",
  padding: "2px 6px",
  borderRadius: 4,
  background: "rgba(128, 128, 128, 0.16)",
  border: "1px solid rgba(128, 128, 128, 0.25)",
};

export interface LocalizationSettingsSectionProps {
  t: (id: string, defaultMessage: string) => string;
  settings: MediaFeedsSettings;
  onChangeSettings: React.Dispatch<React.SetStateAction<MediaFeedsSettings>>;
}

export const LocalizationSettingsSection: React.FC<
  LocalizationSettingsSectionProps
> = ({ t, settings, onChangeSettings }) => {
  const localeOptions = useMemo(
    () =>
      mergeSelectOptions(LOCALE_OPTIONS, [
        settings.defaultLocale,
        ...(settings.supportedLocales ?? []),
      ]),
    [settings.defaultLocale, settings.supportedLocales]
  );

  const fallbackLocale = settings.defaultLocale || "en";

  return (
    <Box
      background="neutral0"
      padding={6}
      shadow="filterShadow"
      hasRadius
      style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
    >
      <Typography variant="beta" tag="h2">
        {t(
          "settings.ui.1_multi_language_localization_3_languages",
          "Multi-Language & Localization (3+ Languages)"
        )}
      </Typography>
      <Divider marginTop={2} marginBottom={4} />
      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 20,
        }}
      >
        <Field.Root
          name="defaultLocale"
          hint={t(
            "settings.ui.primary_language_code_e_g_es_used_when_no_locale",
            "Primary language code (e.g., es) used when no ?locale= query is supplied."
          )}
        >
          <Field.Label>
            {t("field.default_locale", "Default Locale")}
          </Field.Label>
          <SingleSelect
            placeholder={t("placeholder.e_g_es", "Select default locale")}
            value={fallbackLocale}
            onChange={(val: string | number) =>
              onChangeSettings((prev) => ({
                ...prev,
                defaultLocale: String(val),
              }))
            }
          >
            {localeOptions.map((opt) => (
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
            "settings.ui.active_locales_exposed_in_localized_news_blog_an",
            "Active locales exposed in localized News, Blog, and Podcast RSS feeds."
          )}
        >
          <Field.Label>
            {t("field.supported_locales", "Supported Locales")}
          </Field.Label>
          <MultiSelect
            name="supportedLocales"
            withTags
            placeholder={t(
              "placeholder.select_supported_locales",
              "Select supported locales..."
            )}
            value={
              settings.supportedLocales?.length
                ? settings.supportedLocales
                : [fallbackLocale]
            }
            onChange={(nextValues: string[]) =>
              onChangeSettings((prev) => ({
                ...prev,
                supportedLocales:
                  nextValues.length > 0
                    ? nextValues
                    : [prev.defaultLocale || "en"],
              }))
            }
            onClear={() =>
              onChangeSettings((prev) => ({
                ...prev,
                supportedLocales: [prev.defaultLocale || "en"],
              }))
            }
          >
            {localeOptions.map((opt) => (
              <MultiSelectOption key={opt.value} value={opt.value}>
                {opt.label}
              </MultiSelectOption>
            ))}
          </MultiSelect>
          <Field.Hint />
        </Field.Root>
      </Box>

      <Box
        marginTop={4}
        padding={4}
        background="neutral100"
        hasRadius
        style={SUB_CARD_BORDER_STYLE}
      >
        <Checkbox
          checked={settings.fallbackToDefaultLocale}
          onCheckedChange={(checked: boolean) =>
            onChangeSettings((prev) => ({
              ...prev,
              fallbackToDefaultLocale: Boolean(checked),
            }))
          }
        >
          {t(
            "settings.ui.automatically_fall_back_to_default_locale_when_a",
            "Automatically fall back to Default Locale when a translation is not yet published"
          )}{" "}
          (<code style={INLINE_CODE_STYLE}>{fallbackLocale}</code>)
        </Checkbox>
      </Box>
    </Box>
  );
};
