import {
  Badge,
  Box,
  Field,
  Flex,
  MultiSelect,
  MultiSelectOption,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from "@strapi/design-system";
import {
  LOCALE_OPTIONS,
  mergeSelectOptions,
} from "@vicacha-devs/plugin-shared";
import * as React from "react";

import type {
  BroadcastChannel,
  BroadcastSettings,
} from "../../../shared/types";

export const BROADCAST_TOPIC_OPTIONS: Array<{ value: string; label: string }> =
  [
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
      value: "urgent_janazah",
      label: "urgent_janazah — Urgent Janazah & Funeral Alerts",
    },
    {
      value: "newsletter",
      label: "newsletter — Weekly Jumu'ah & Community Newsletter",
    },
    { value: "khutbahs", label: "khutbahs — Friday Khutbah Summaries & Audio" },
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

export const BROADCAST_CHANNEL_OPTIONS: Array<{
  value: BroadcastChannel;
  label: string;
}> = [
  { value: "email", label: "email — Email Newsletter & Bulletins" },
  { value: "telegram", label: "telegram — Telegram Bot & Forum Topics" },
  { value: "whatsapp", label: "whatsapp — WhatsApp Cloud API / Gateway" },
];

const orgEmailCardBorderStyle: React.CSSProperties = {
  border: "1px solid rgba(128, 128, 128, 0.22)",
  borderTopLeftRadius: 0,
  borderTopRightRadius: 0,
};

export interface OrganizationEmailTabProps {
  settings: BroadcastSettings;
  setSettings: (
    next: BroadcastSettings | ((prev: BroadcastSettings) => BroadcastSettings)
  ) => void;
  t: (id: string, defaultMessage: string) => string;
}

export const OrganizationEmailTab: React.FC<OrganizationEmailTabProps> = ({
  settings,
  setSettings,
  t,
}) => {
  const localeOpts = mergeSelectOptions(
    LOCALE_OPTIONS,
    settings.supportedLocales
  );
  const topicOpts = mergeSelectOptions(
    BROADCAST_TOPIC_OPTIONS,
    settings.availableTopics
  );

  return (
    <Box
      padding={6}
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      style={orgEmailCardBorderStyle}
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
              "settings.ui.1_organization_multi_language_email_hijri_calend",
              "Organization, Multi-Language & Email"
            )}
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {t(
              "settings.ui.configure_organization_identity_sender_reply_to_",
              "Configure organization identity, sender/reply-to email addresses, supported locales, and broadcast topic segments."
            )}
          </Typography>
        </Box>
        <Badge>
          {(settings.supportedLocales || []).length}{" "}
          {t("settings.ui.active_locales_label", "Active Locales")}
        </Badge>
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
          name="organizationName"
          hint={t(
            "settings.ui.organization_name_hint",
            "Injected into broadcast templates via the {{organizationName}} variable."
          )}
        >
          <Field.Label>
            {t("field.organization_name", "Organization Name")}
          </Field.Label>
          <TextInput
            name="organizationName"
            placeholder={t(
              "placeholder.e_g_mezquita_central_abu_bakr_as_siddiq_bogot",
              "e.g., Abu Bakr As-Siddiq Central Mosque — Bogotá"
            )}
            value={settings.organizationName || ""}
            onChange={(e: { target: { value: string } }) =>
              setSettings({ ...settings, organizationName: e.target.value })
            }
          />
          <Field.Hint />
        </Field.Root>

        <Field.Root
          name="siteBaseUrl"
          hint={t(
            "settings.ui.site_base_url_hint",
            "Base URL used for CTA links, 1-click unsubscribe links, and {{siteBaseUrl}} placeholders."
          )}
        >
          <Field.Label>
            {t("field.public_site_base_url", "Public Site Base URL")}
          </Field.Label>
          <TextInput
            name="siteBaseUrl"
            placeholder={t(
              "placeholder.e_g_https_mezquitabogota_org",
              "e.g., https://mezquitabogota.org"
            )}
            value={settings.siteBaseUrl || ""}
            onChange={(e: { target: { value: string } }) =>
              setSettings({ ...settings, siteBaseUrl: e.target.value })
            }
          />
          <Field.Hint />
        </Field.Root>

        <Field.Root
          name="emailFromAddress"
          hint={t(
            "settings.ui.verified_sender_address_used_when_dispatching_em",
            "Verified sender address used when dispatching email newsletters and bulletins."
          )}
        >
          <Field.Label>
            {t(
              "field.email_sender_from_address",
              "Email Sender (From Address)"
            )}
          </Field.Label>
          <TextInput
            name="emailFromAddress"
            placeholder={t(
              "placeholder.e_g_no_reply_mezquitabogota_org",
              "e.g., no-reply@mezquitabogota.org"
            )}
            value={settings.emailFromAddress || ""}
            onChange={(e: { target: { value: string } }) =>
              setSettings({ ...settings, emailFromAddress: e.target.value })
            }
          />
          <Field.Hint />
        </Field.Root>

        <Field.Root
          name="emailReplyToAddress"
          hint={t(
            "settings.ui.reply_to_inbox_where_community_members_can_respo",
            "Reply-to inbox where community members can respond to email broadcasts."
          )}
        >
          <Field.Label>
            {t("field.email_reply_to_address", "Email Reply-To Address")}
          </Field.Label>
          <TextInput
            name="emailReplyToAddress"
            placeholder={t(
              "placeholder.e_g_info_mezquitabogota_org",
              "e.g., info@mezquitabogota.org"
            )}
            value={settings.emailReplyToAddress || ""}
            onChange={(e: { target: { value: string } }) =>
              setSettings({ ...settings, emailReplyToAddress: e.target.value })
            }
          />
          <Field.Hint />
        </Field.Root>

        <Field.Root
          name="defaultLocale"
          hint={t(
            "settings.ui.fallback_language_when_a_recipient_does_not_have",
            "Fallback language when a recipient does not have a preferred locale on file."
          )}
        >
          <Field.Label>
            {t("field.default_broadcast_locale", "Default Broadcast Locale")}
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
            "settings.ui.languages_enabled_for_localized_campaign_subject",
            "Languages enabled for localized campaign subject/body templates."
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

        <Box style={{ gridColumn: "span 2" }}>
          <Field.Root
            name="availableTopics"
            hint={t(
              "settings.ui.topic_segments_used_to_target_confirmed_subscrib",
              "Topic segments used to target confirmed subscribers and Telegram forum threads."
            )}
          >
            <Field.Label>
              {t("field.broadcast_topic_segments", "Broadcast Topic Segments")}
            </Field.Label>
            <MultiSelect
              name="availableTopics"
              withTags
              placeholder={t(
                "placeholder.select_broadcast_topic_segments",
                "Select broadcast topic segments..."
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

        <Field.Root
          name="defaultEmailTemplateRef"
          hint={t(
            "settings.ui.default_email_template_ref_hint",
            "Optional default Email Designer 5 template ID or base name used when a campaign does not specify its own template."
          )}
        >
          <Field.Label>
            {t(
              "field.default_email_template_ref",
              "Default Email Designer Template Ref (optional)"
            )}
          </Field.Label>
          <TextInput
            name="defaultEmailTemplateRef"
            placeholder={t(
              "placeholder.e_g_401_or_broadcastnewsletter",
              "e.g., 401 or broadcastNewsletter"
            )}
            value={settings.defaultEmailTemplateRef || ""}
            onChange={(e: { target: { value: string } }) =>
              setSettings({
                ...settings,
                defaultEmailTemplateRef: e.target.value,
              })
            }
          />
          <Field.Hint />
        </Field.Root>
      </Box>
    </Box>
  );
};
