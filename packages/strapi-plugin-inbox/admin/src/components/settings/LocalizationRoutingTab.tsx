import * as React from 'react';
import {
  Badge,
  Box,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Tabs,
  TextInput,
  Typography,
} from '@strapi/design-system';
import type { InboxSettings } from '../../../../shared';

const LOCALE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'es', label: 'es — Español (Spanish)' },
  { value: 'en', label: 'en — English' },
  { value: 'ar', label: 'ar — العربية (Arabic)' },
  { value: 'tr', label: 'tr — Türkçe (Turkish)' },
  { value: 'fr', label: 'fr — Français (French)' },
  { value: 'pt', label: 'pt — Português (Portuguese)' },
];

export function parseCsvList(raw: string): string[] {
  return raw
    .split(',')
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
                'settings.ui.1_localization_routing_multi_calendar_configurat',
                'Localization & Service-Desk Routing'
              )}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              {t(
                'settings.ui.define_default_supported_locales_primary_and_sec',
                'Define default/supported locales, service-desk routing departments, and subscriber interest topics.'
              )}
            </Typography>
          </Box>
          <Badge>
            {(settings.supportedLocales || []).length}{' '}
            {t('settings.ui.active_locales', 'Active Locales')}
          </Badge>
        </Flex>

        <Box
          paddingTop={4}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 20,
          }}
        >
          <Field.Root
            name="defaultLocale"
            hint={t(
              'settings.ui.fallback_language_when_a_public_form_request_or_',
              'Fallback language when a public form request or alert query omits a locale parameter.'
            )}
          >
            <Field.Label>{t('field.default_locale', 'Default Locale')}</Field.Label>
            <SingleSelect
              placeholder={t(
                'placeholder.select_default_locale_e_g_es',
                'Select default locale (e.g., es)'
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
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="supportedLocales"
            hint={t(
              'settings.ui.iso_language_codes_enabled_for_localized_form_la',
              'ISO language codes enabled for localized form labels, validation errors, and alert banners.'
            )}
          >
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
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="availableDepartments"
            hint={t(
              'settings.ui.departments_available_for_routing_incoming_inqui',
              'Departments available for routing incoming inquiries and religious/community service applications.'
            )}
          >
            <Field.Label>
              {t(
                'field.service_desk_departments_comma_separated',
                'Service-Desk Departments (comma-separated)'
              )}
            </Field.Label>
            <TextInput
              name="availableDepartments"
              placeholder={t(
                'placeholder.e_g_general_imamate_nikah_family_new_muslims_hal',
                'e.g., general, imamate, nikah_family, new_muslims, halal_certification'
              )}
              value={(settings.availableDepartments || []).join(', ')}
              onChange={(e: { target: { value: string } }) =>
                setSettings({
                  ...settings,
                  availableDepartments: parseCsvList(e.target.value),
                })
              }
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="availableTopics"
            hint={t(
              'settings.ui.topics_community_members_can_choose_when_subscri',
              'Topics community members can choose when subscribing to announcements and newsletters.'
            )}
          >
            <Field.Label>
              {t(
                'field.subscriber_interest_topics_comma_separated',
                'Subscriber Interest Topics (comma-separated)'
              )}
            </Field.Label>
            <TextInput
              name="availableTopics"
              placeholder={t(
                'placeholder.e_g_announcements_events_courses_ramadan_eid_new',
                'e.g., announcements, events, courses, ramadan_eid, newsletter'
              )}
              value={(settings.availableTopics || []).join(', ')}
              onChange={(e: { target: { value: string } }) =>
                setSettings({
                  ...settings,
                  availableTopics: parseCsvList(e.target.value),
                })
              }
            />
            <Field.Hint />
          </Field.Root>
        </Box>
      </Box>
    </Tabs.Content>
  );
};
