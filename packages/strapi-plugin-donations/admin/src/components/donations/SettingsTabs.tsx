import {
  Badge,
  Box,
  Checkbox,
  Field,
  Flex,
  MultiSelect,
  MultiSelectOption,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from "@strapi/design-system";
import { LOCALE_OPTIONS } from "@vicacha-devs/plugin-shared";
import React from "react";

import {
  ISO_4217_CURRENCIES,
  formatCurrencyOptionLabel,
  type DonationsSettings,
} from "../../../../shared";
import { CurrencySelectField } from "../CurrencyCountryInput";
import type { InputChangeEvent, TranslateFn } from "./donationsHelpers";

const subCardStyle: React.CSSProperties = {
  border: "1px solid rgba(128, 128, 128, 0.22)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

function isPluginAvailable(settings: DonationsSettings, uid: string): boolean {
  if (!Array.isArray(settings.availableRichTextCustomFields)) return true;
  return settings.availableRichTextCustomFields.includes(uid);
}

function resolveSelectedRichTextValue(settings: DonationsSettings): string {
  const current = settings.richTextCustomField;
  if (!current) return "__default__";
  return isPluginAvailable(settings, current) ? current : "__default__";
}

const RichTextPluginSelector: React.FC<{
  settings: DonationsSettings;
  setSettings: (next: DonationsSettings) => void;
  t: TranslateFn;
}> = ({ settings, setSettings, t }) => {
  const showTiptap = isPluginAvailable(
    settings,
    "plugin::tiptap-editor.RichText"
  );
  const showCkeditor = isPluginAvailable(
    settings,
    "plugin::ckeditor5.CKEditor"
  );

  return (
    <Field.Root
      name="richTextCustomField"
      hint={t(
        "hint.richtext_plugin_adapter",
        "Shows Rich Text custom field plugins installed in this Strapi instance."
      )}
    >
      <Field.Label>
        {t(
          "field.richtext_plugin_adapter",
          "Rich Text Editor Plugin (Campaign Description & Body)"
        )}
      </Field.Label>
      <SingleSelect
        placeholder={t(
          "settings.richtext.default_option",
          "Default Strapi Rich Text (Standard Markdown)"
        )}
        value={resolveSelectedRichTextValue(settings)}
        onChange={(val: string | number) =>
          setSettings({
            ...settings,
            richTextCustomField:
              String(val) === "__default__" ? "" : String(val),
          })
        }
      >
        <SingleSelectOption value="__default__">
          {t(
            "settings.richtext.default_option",
            "Default Strapi Rich Text (Standard Markdown)"
          )}
        </SingleSelectOption>
        {showTiptap && (
          <SingleSelectOption value="plugin::tiptap-editor.RichText">
            {t(
              "settings.richtext.tiptap_option",
              "Tiptap Rich Text Editor (plugin::tiptap-editor.RichText)"
            )}
          </SingleSelectOption>
        )}
        {showCkeditor && (
          <SingleSelectOption value="plugin::ckeditor5.CKEditor">
            {t(
              "settings.richtext.ckeditor_option",
              "CKEditor 5 (plugin::ckeditor5.CKEditor)"
            )}
          </SingleSelectOption>
        )}
      </SingleSelect>
      <Field.Hint />
    </Field.Root>
  );
};

export const SettingsCurrencyTab: React.FC<{
  settings: DonationsSettings;
  setSettings: (next: DonationsSettings) => void;
  t: TranslateFn;
}> = ({ settings, setSettings, t }) => {
  const supportedCurrencies = settings.supportedCurrencies || [
    "COP",
    "USD",
    "EUR",
  ];
  const supportedLocales = settings.supportedLocales || [
    "es",
    "en",
    "ar",
    "tr",
  ];

  return (
    <Box
      padding={6}
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
    >
      <Typography variant="beta" tag="h2">
        {t("settings.section1.title", "Currency, Multi-Language & Rich Text")}
      </Typography>
      <Typography variant="pi" textColor="neutral600">
        {t(
          "settings.section1.subtitle",
          "Configure base accounting currency, accepted donor currencies, supported languages, and Rich Text editor plugin."
        )}
      </Typography>

      <Box
        paddingTop={4}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 20,
        }}
      >
        <Field.Root
          name="defaultLocale"
          hint={t(
            "hint.default_locale",
            "Default language for campaign descriptions and donor receipts."
          )}
        >
          <Field.Label>
            {t("field.default_locale", "Default Locale")}
          </Field.Label>
          <SingleSelect
            placeholder={t(
              "placeholder.select_default_locale",
              "Select default locale"
            )}
            value={settings.defaultLocale || "es"}
            onChange={(val: string | number) =>
              setSettings({ ...settings, defaultLocale: String(val) })
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
            "hint.supported_locales",
            "ISO language codes enabled for localized donation campaigns."
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
            value={supportedLocales}
            onChange={(nextValues: string[]) =>
              setSettings({
                ...settings,
                supportedLocales: nextValues.length > 0 ? nextValues : ["es"],
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

        <CurrencySelectField
          name="baseCurrency"
          label={t(
            "field.base_accounting_currency_iso_4217",
            "Base Accounting Currency (ISO 4217)"
          )}
          hint={t(
            "hint.base_currency",
            "Primary ledger currency for campaign goals and utility bills."
          )}
          value={settings.baseCurrency || "COP"}
          supportedCurrencies={settings.supportedCurrencies}
          onChange={(nextCode) =>
            setSettings({ ...settings, baseCurrency: nextCode })
          }
        />

        <Field.Root
          name="supportedCurrencies"
          hint={t(
            "hint.supported_currencies",
            "Currencies accepted in pledge forms and assessment calculators."
          )}
        >
          <Field.Label>
            {t(
              "field.supported_donor_currencies",
              "Supported Donor Currencies (ISO 4217)"
            )}
          </Field.Label>
          <MultiSelect
            name="supportedCurrencies"
            withTags
            placeholder={t(
              "placeholder.add_currency_iso",
              "Select ISO 4217 currencies..."
            )}
            value={supportedCurrencies}
            onChange={(nextValues: string[]) =>
              setSettings({
                ...settings,
                supportedCurrencies:
                  nextValues.length > 0 ? nextValues : ["COP"],
              })
            }
            onClear={() =>
              setSettings({
                ...settings,
                supportedCurrencies: [settings.baseCurrency || "COP"],
              })
            }
          >
            {ISO_4217_CURRENCIES.map((item) => (
              <MultiSelectOption key={item.code} value={item.code}>
                {formatCurrencyOptionLabel(item.code)}
              </MultiSelectOption>
            ))}
          </MultiSelect>
          <Field.Hint />
        </Field.Root>

        <RichTextPluginSelector
          settings={settings}
          setSettings={setSettings}
          t={t}
        />
      </Box>
    </Box>
  );
};

export const SettingsCertificatesTab: React.FC<{
  settings: DonationsSettings;
  setSettings: (next: DonationsSettings) => void;
  t: TranslateFn;
}> = ({ settings, setSettings, t }) => {
  const bridgeBadgeLabel = settings.enableCertificatesBridge
    ? t("common.enabled", "Enabled")
    : t("common.disabled", "Disabled");
  const autoBadgeLabel = settings.autoIssueCertificateOnVerify
    ? t("common.auto", "Auto")
    : t("common.manual", "Manual");

  return (
    <Box
      padding={6}
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
    >
      <Typography variant="beta" tag="h2">
        {t(
          "settings.section2.title",
          "Cryptographic Tax Certificate Bridge & Verification Automation"
        )}
      </Typography>
      <Typography variant="pi" textColor="neutral600">
        {t(
          "settings.section2.subtitle",
          "Connect verified donor pledges with @vicacha-devs/strapi-plugin-certificates for Ed25519-signed tax deduction certificates."
        )}
      </Typography>

      <Box paddingTop={4} style={{ maxWidth: 420 }}>
        <Field.Root
          name="taxCertificateTemplateSlug"
          hint={t(
            "hint.tax_certificate_template_slug",
            "Template slug in @vicacha-devs/strapi-plugin-certificates used when issuing fiscal donation receipts."
          )}
        >
          <Field.Label>
            {t(
              "field.tax_certificate_template_slug",
              "Tax Certificate Template Slug"
            )}
          </Field.Label>
          <TextInput
            name="taxCertificateTemplateSlug"
            placeholder={t(
              "placeholder.e_g_certificado_donacion_fiscal",
              "e.g., tax-donation-certificate"
            )}
            value={settings.taxCertificateTemplateSlug || ""}
            onChange={(e: InputChangeEvent) =>
              setSettings({
                ...settings,
                taxCertificateTemplateSlug: e.target.value,
              })
            }
          />
          <Field.Hint />
        </Field.Root>
      </Box>

      <Box
        paddingTop={4}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 16,
        }}
      >
        <Box padding={4} background="neutral100" hasRadius style={subCardStyle}>
          <Box>
            <Flex
              justifyContent="space-between"
              alignItems="center"
              paddingBottom={2}
            >
              <Typography fontWeight="bold">
                {t(
                  "settings.bridge.card_title",
                  "Certificates Authority Bridge"
                )}
              </Typography>
              <Badge>{bridgeBadgeLabel}</Badge>
            </Flex>
            <Typography variant="pi" textColor="neutral600">
              {t(
                "settings.bridge.card_desc",
                "Allows issuing Ed25519-signed fiscal donation certificates via @vicacha-devs/strapi-plugin-certificates."
              )}
            </Typography>
          </Box>
          <Box paddingTop={3}>
            <Checkbox
              checked={Boolean(settings.enableCertificatesBridge)}
              onCheckedChange={(val: boolean) =>
                setSettings({
                  ...settings,
                  enableCertificatesBridge: Boolean(val),
                })
              }
            >
              {t(
                "checkbox.enable_cryptographic_tax_certificate_bridge",
                "Enable Cryptographic Tax Certificate Bridge"
              )}
            </Checkbox>
          </Box>
        </Box>

        <Box padding={4} background="neutral100" hasRadius style={subCardStyle}>
          <Box>
            <Flex
              justifyContent="space-between"
              alignItems="center"
              paddingBottom={2}
            >
              <Typography fontWeight="bold">
                {t(
                  "settings.auto_issue.card_title",
                  "Auto-Issue on Pledge Verification"
                )}
              </Typography>
              <Badge>{autoBadgeLabel}</Badge>
            </Flex>
            <Typography variant="pi" textColor="neutral600">
              {t(
                "settings.auto_issue.card_desc",
                "Automatically generates and attaches a verifiable tax certificate serial number as soon as staff marks a pledge as verified."
              )}
            </Typography>
          </Box>
          <Box paddingTop={3}>
            <Checkbox
              checked={Boolean(settings.autoIssueCertificateOnVerify)}
              onCheckedChange={(val: boolean) =>
                setSettings({
                  ...settings,
                  autoIssueCertificateOnVerify: Boolean(val),
                })
              }
            >
              {t(
                "checkbox.auto_issue_tax_certificate_when_pledge_is_verifi",
                "Auto-Issue Tax Certificate When Pledge is Verified"
              )}
            </Checkbox>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
