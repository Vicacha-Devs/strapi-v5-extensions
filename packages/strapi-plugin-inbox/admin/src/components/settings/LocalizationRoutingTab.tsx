import {
  Badge,
  Box,
  Field,
  Flex,
  MultiSelect,
  MultiSelectOption,
  SingleSelect,
  SingleSelectOption,
  Tabs,
  Typography,
} from "@strapi/design-system";
import * as React from "react";

import type { InboxSettings } from "../../../../shared";

export const LOCALE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "es", label: "es — Español (Spanish)" },
  { value: "en", label: "en — English" },
  { value: "ar", label: "ar — العربية (Arabic)" },
  { value: "tr", label: "tr — Türkçe (Turkish)" },
  { value: "fr", label: "fr — Français (French)" },
  { value: "de", label: "de — Deutsch (German)" },
  { value: "pt", label: "pt — Português (Portuguese)" },
  { value: "it", label: "it — Italiano (Italian)" },
  { value: "ru", label: "ru — Русский (Russian)" },
  { value: "id", label: "id — Bahasa Indonesia" },
  { value: "ur", label: "ur — اردو (Urdu)" },
  { value: "zh", label: "zh — 中文 (Chinese)" },
];

export const DEPARTMENT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "general", label: "general — General Inquiries & Info" },
  { value: "imamate", label: "imamate — Imamate & Religious Guidance (Fatwa)" },
  {
    value: "nikah_family",
    label: "nikah_family — Nikah, Marriage & Family Counseling",
  },
  {
    value: "new_muslims",
    label: "new_muslims — New Muslims (Shahada & Revert Care)",
  },
  {
    value: "halal_certification",
    label: "halal_certification — Halal Certification & Audits",
  },
  {
    value: "janazah_urgent",
    label: "janazah_urgent — Urgent Janazah & Funeral Services",
  },
  {
    value: "education",
    label: "education — Islamic Education, Madrasah & Courses",
  },
  {
    value: "zakat_charity",
    label: "zakat_charity — Zakat, Sadaqah & Social Welfare",
  },
  {
    value: "administration",
    label: "administration — Mosque Administration & Board",
  },
  { value: "services", label: "services — Community & Facility Services" },
  { value: "social_aid", label: "social_aid — Humanitarian & Social Aid" },
  {
    value: "visits_tours",
    label: "visits_tours — Guided Mosque Visits & School Tours",
  },
];

export const TOPIC_OPTIONS: Array<{ value: string; label: string }> = [
  {
    value: "announcements",
    label: "announcements — General Mosque Announcements",
  },
  { value: "events", label: "events — Community Events & Conferences" },
  {
    value: "courses",
    label: "courses — Arabic, Quran & Islamic Studies Courses",
  },
  {
    value: "ramadan_eid",
    label: "ramadan_eid — Ramadan, Suhoor/Iftar & Eid Bulletins",
  },
  {
    value: "newsletter",
    label: "newsletter — Weekly Jumu'ah & Community Newsletter",
  },
  { value: "khutbahs", label: "khutbahs — Friday Khutbah Summaries & Audio" },
  {
    value: "urgent_janazah",
    label: "urgent_janazah — Urgent Janazah & Funeral Alerts",
  },
  {
    value: "charity_campaigns",
    label: "charity_campaigns — Zakat & Relief Campaigns",
  },
  {
    value: "youth_programs",
    label: "youth_programs — Youth, Sisters & Family Programs",
  },
  {
    value: "new_muslims",
    label: "new_muslims — New Muslim Circle & Mentorship",
  },
];

export function mergeSelectOptions(
  predefined: Array<{ value: string; label: string }>,
  currentValues: string[] = []
): Array<{ value: string; label: string }> {
  const known = new Set(predefined.map((opt) => opt.value));
  const extras = currentValues
    .filter((val) => val && !known.has(val))
    .map((val) => ({ value: val, label: val }));
  return [...predefined, ...extras];
}

export function parseCsvList(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export interface LocalizationRoutingTabProps {
  t: (id: string, defaultMessage: string) => string;
  settings: InboxSettings;
  setSettings: (next: InboxSettings) => void;
}

export const LocalizationRoutingTab: React.FC<LocalizationRoutingTabProps> = ({
  t,
  settings,
  setSettings,
}) => {
  const localeOpts = mergeSelectOptions(
    LOCALE_OPTIONS,
    settings.supportedLocales
  );
  const departmentOpts = mergeSelectOptions(
    DEPARTMENT_OPTIONS,
    settings.availableDepartments
  );
  const topicOpts = mergeSelectOptions(TOPIC_OPTIONS, settings.availableTopics);

  return (
    <Tabs.Content value="routing">
      <Box
        padding={6}
        background="neutral0"
        hasRadius
        shadow="filterShadow"
        style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
      >
        <Flex
          justifyContent="space-between"
          alignItems="center"
          paddingBottom={2}
          wrap="wrap"
          gap={2}
        >
          <Box>
            <Typography variant="beta" tag="h2">
              {t(
                "settings.ui.1_localization_routing_multi_calendar_configurat",
                "Localization & Service-Desk Routing"
              )}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              {t(
                "settings.ui.define_default_supported_locales_primary_and_sec",
                "Define default/supported locales, service-desk routing departments, and subscriber interest topics."
              )}
            </Typography>
          </Box>
          <Badge>
            {(settings.supportedLocales || []).length}{" "}
            {t("settings.ui.active_locales", "Active Locales")}
          </Badge>
        </Flex>

        <Box
          paddingTop={4}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 20,
          }}
        >
          <Field.Root
            name="defaultLocale"
            hint={t(
              "settings.ui.fallback_language_when_a_public_form_request_or_",
              "Fallback language when a public form request or alert query omits a locale parameter."
            )}
          >
            <Field.Label>
              {t("field.default_locale", "Default Locale")}
            </Field.Label>
            <SingleSelect
              placeholder={t(
                "placeholder.select_default_locale_e_g_es",
                "Select default locale (e.g., es)"
              )}
              value={settings.defaultLocale || "es"}
              onChange={(val: string | number) =>
                setSettings({ ...settings, defaultLocale: String(val) })
              }
            >
              {localeOpts.map((opt) => (
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
              "settings.ui.iso_language_codes_enabled_for_localized_form_la",
              "ISO language codes enabled for localized form labels, validation errors, and alert banners."
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
              value={settings.supportedLocales || ["es", "en", "ar", "tr"]}
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
              {localeOpts.map((opt) => (
                <MultiSelectOption key={opt.value} value={opt.value}>
                  {opt.label}
                </MultiSelectOption>
              ))}
            </MultiSelect>
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="availableDepartments"
            hint={t(
              "settings.ui.departments_available_for_routing_incoming_inqui",
              "Departments available for routing incoming inquiries and religious/community service applications."
            )}
          >
            <Field.Label>
              {t("field.service_desk_departments", "Service-Desk Departments")}
            </Field.Label>
            <MultiSelect
              name="availableDepartments"
              withTags
              placeholder={t(
                "placeholder.select_service_desk_departments",
                "Select service-desk departments..."
              )}
              value={settings.availableDepartments || ["general"]}
              onChange={(nextValues: string[]) =>
                setSettings({
                  ...settings,
                  availableDepartments:
                    nextValues.length > 0 ? nextValues : ["general"],
                })
              }
              onClear={() =>
                setSettings({
                  ...settings,
                  availableDepartments: ["general"],
                })
              }
            >
              {departmentOpts.map((opt) => (
                <MultiSelectOption key={opt.value} value={opt.value}>
                  {opt.label}
                </MultiSelectOption>
              ))}
            </MultiSelect>
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="availableTopics"
            hint={t(
              "settings.ui.topics_community_members_can_choose_when_subscri",
              "Topics community members can choose when subscribing to announcements and newsletters."
            )}
          >
            <Field.Label>
              {t(
                "field.subscriber_interest_topics",
                "Subscriber Interest Topics"
              )}
            </Field.Label>
            <MultiSelect
              name="availableTopics"
              withTags
              placeholder={t(
                "placeholder.select_subscriber_interest_topics",
                "Select subscriber interest topics..."
              )}
              value={settings.availableTopics || ["announcements"]}
              onChange={(nextValues: string[]) =>
                setSettings({
                  ...settings,
                  availableTopics:
                    nextValues.length > 0 ? nextValues : ["announcements"],
                })
              }
              onClear={() =>
                setSettings({
                  ...settings,
                  availableTopics: ["announcements"],
                })
              }
            >
              {topicOpts.map((opt) => (
                <MultiSelectOption key={opt.value} value={opt.value}>
                  {opt.label}
                </MultiSelectOption>
              ))}
            </MultiSelect>
            <Field.Hint />
          </Field.Root>
        </Box>
      </Box>
    </Tabs.Content>
  );
};
