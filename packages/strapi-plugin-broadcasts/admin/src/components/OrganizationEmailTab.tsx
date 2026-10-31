import * as React from 'react';
import {
  Badge,
  Box,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import type { BroadcastSettings } from '../../../shared/types';

const LOCALE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'es', label: 'es — Español (Spanish)' },
  { value: 'en', label: 'en — English' },
  { value: 'ar', label: 'ar — العربية (Arabic)' },
  { value: 'tr', label: 'tr — Türkçe (Turkish)' },
  { value: 'fr', label: 'fr — Français (French)' },
  { value: 'pt', label: 'pt — Português (Portuguese)' },
];

const cardBorderStyle: React.CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.22)',
};

function parseCsvList(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

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
  return (
    <Box
      padding={6}
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      style={cardBorderStyle}
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
              'settings.ui.1_organization_multi_language_email_hijri_calend',
              'Organization, Multi-Language & Email'
            )}
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {t(
              'settings.ui.configure_organization_identity_sender_reply_to_',
              'Configure organization identity, sender/reply-to email addresses, supported locales, and broadcast topic segments.'
            )}
          </Typography>
        </Box>
        <Badge>
          {(settings.supportedLocales || []).length}{' '}
          {t('settings.ui.active_locales_label', 'Active Locales')}
        </Badge>
      </Flex>

      <Box
        paddingTop={4}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 20,
        }}
      >
        <Field.Root name="organizationName">
          <Field.Label>
            {t('field.organization_name', 'Organization Name')}
          </Field.Label>
          <TextInput
            name="organizationName"
            placeholder={t(
              'placeholder.e_g_mezquita_central_abu_bakr_as_siddiq_bogot',
              'e.g., Abu Bakr As-Siddiq Central Mosque — Bogotá'
            )}
            value={settings.organizationName || ''}
            onChange={(e: { target: { value: string } }) =>
              setSettings({ ...settings, organizationName: e.target.value })
            }
          />
          <Field.Hint>
            {t(
              'settings.ui.organization_name_hint',
              'Injected into broadcast templates via the {{organizationName}} variable.'
            )}
          </Field.Hint>
        </Field.Root>

        <Field.Root name="siteBaseUrl">
          <Field.Label>
            {t('field.public_site_base_url', 'Public Site Base URL')}
          </Field.Label>
          <TextInput
            name="siteBaseUrl"
            placeholder={t(
              'placeholder.e_g_https_mezquitabogota_org',
              'e.g., https://mezquitabogota.org'
            )}
            value={settings.siteBaseUrl || ''}
            onChange={(e: { target: { value: string } }) =>
              setSettings({ ...settings, siteBaseUrl: e.target.value })
            }
          />
          <Field.Hint>
            {t(
              'settings.ui.site_base_url_hint',
              'Base URL used for CTA links, 1-click unsubscribe links, and {{siteBaseUrl}} placeholders.'
            )}
          </Field.Hint>
        </Field.Root>

        <Field.Root name="emailFromAddress">
          <Field.Label>
            {t(
              'field.email_sender_from_address',
              'Email Sender (From Address)'
            )}
          </Field.Label>
          <TextInput
            name="emailFromAddress"
            placeholder={t(
              'placeholder.e_g_no_reply_mezquitabogota_org',
              'e.g., no-reply@mezquitabogota.org'
            )}
            value={settings.emailFromAddress || ''}
            onChange={(e: { target: { value: string } }) =>
              setSettings({ ...settings, emailFromAddress: e.target.value })
            }
          />
          <Field.Hint>
            {t(
              'settings.ui.verified_sender_address_used_when_dispatching_em',
              'Verified sender address used when dispatching email newsletters and bulletins.'
            )}
          </Field.Hint>
        </Field.Root>

        <Field.Root name="emailReplyToAddress">
          <Field.Label>
            {t('field.email_reply_to_address', 'Email Reply-To Address')}
          </Field.Label>
          <TextInput
            name="emailReplyToAddress"
            placeholder={t(
              'placeholder.e_g_info_mezquitabogota_org',
              'e.g., info@mezquitabogota.org'
            )}
            value={settings.emailReplyToAddress || ''}
            onChange={(e: { target: { value: string } }) =>
              setSettings({ ...settings, emailReplyToAddress: e.target.value })
            }
          />
          <Field.Hint>
            {t(
              'settings.ui.reply_to_inbox_where_community_members_can_respo',
              'Reply-to inbox where community members can respond to email broadcasts.'
            )}
          </Field.Hint>
        </Field.Root>

        <Field.Root name="defaultLocale">
          <Field.Label>
            {t('field.default_broadcast_locale', 'Default Broadcast Locale')}
          </Field.Label>
          <SingleSelect
            placeholder={t(
              'placeholder.select_default_locale',
              'Select default locale'
            )}
            value={settings.defaultLocale || 'es'}
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
          <Field.Hint>
            {t(
              'settings.ui.fallback_language_when_a_recipient_does_not_have',
              'Fallback language when a recipient does not have a preferred locale on file.'
            )}
          </Field.Hint>
        </Field.Root>

        <Field.Root name="supportedLocales">
          <Field.Label>
            {t(
              'field.supported_locales_comma_separated',
              'Supported Locales (comma-separated)'
            )}
          </Field.Label>
          <TextInput
            name="supportedLocales"
            placeholder={t('placeholder.e_g_es_en_ar_tr', 'e.g., es, en, ar, tr')}
            value={(settings.supportedLocales || []).join(', ')}
            onChange={(e: { target: { value: string } }) =>
              setSettings({
                ...settings,
                supportedLocales: parseCsvList(e.target.value),
              })
            }
          />
          <Field.Hint>
            {t(
              'settings.ui.languages_enabled_for_localized_campaign_subject',
              'Languages enabled for localized campaign subject/body templates.'
            )}
          </Field.Hint>
        </Field.Root>

        <Field.Root name="availableTopics">
          <Field.Label>
            {t(
              'field.broadcast_topic_segments_comma_separated',
              'Broadcast Topic Segments (comma-separated)'
            )}
          </Field.Label>
          <TextInput
            name="availableTopics"
            placeholder={t(
              'placeholder.e_g_announcements_events_courses_ramadan_eid_urg',
              'e.g., announcements, events, courses, ramadan_eid, urgent_janazah'
            )}
            value={(settings.availableTopics || []).join(', ')}
            onChange={(e: { target: { value: string } }) =>
              setSettings({
                ...settings,
                availableTopics: parseCsvList(e.target.value),
              })
            }
          />
          <Field.Hint>
            {t(
              'settings.ui.topic_segments_used_to_target_confirmed_subscrib',
              'Topic segments used to target confirmed subscribers and Telegram forum threads.'
            )}
          </Field.Hint>
        </Field.Root>

        <Field.Root name="defaultEmailTemplateRef">
          <Field.Label>
            {t(
              'field.default_email_template_ref',
              'Default Email Designer Template Ref (optional)'
            )}
          </Field.Label>
          <TextInput
            name="defaultEmailTemplateRef"
            placeholder={t(
              'placeholder.e_g_401_or_broadcastnewsletter',
              'e.g., 401 or broadcastNewsletter'
            )}
            value={settings.defaultEmailTemplateRef || ''}
            onChange={(e: { target: { value: string } }) =>
              setSettings({
                ...settings,
                defaultEmailTemplateRef: e.target.value,
              })
            }
          />
          <Field.Hint>
            {t(
              'settings.ui.default_email_template_ref_hint',
              'Optional default Email Designer 5 template ID or base name used when a campaign does not specify its own template.'
            )}
          </Field.Hint>
        </Field.Root>
      </Box>
    </Box>
  );
};
