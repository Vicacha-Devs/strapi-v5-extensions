import React from 'react';
import {
  Badge,
  Box,
  Checkbox,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Tabs,
  TextInput,
  Typography,
} from '@strapi/design-system';
import type { IslamPluginSettings } from '../../../shared';
import {
  CalculationSettingsTab,
  FiqhRatesSettingsTab,
  type InputChangeEvent,
  type SettingsTabProps,
  type TranslateFn,
} from './SettingsCalculationAndFiqhTabs';

export {
  CalculationSettingsTab,
  FiqhRatesSettingsTab,
  type SettingsTabProps,
  type TranslateFn,
};

const subCardStyle: React.CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.22)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

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
            'settings.ui.3_quran_foundation_content_api_v4_0_0_oauth2_scr',
            'Quran Foundation Content API v4.0.0 (OAuth2 & Script Settings)'
          )}
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          {t(
            'settings.ui.configure_quranic_script_rendering_default_audio',
            'Configure Quranic script rendering, default audio reciter, and anti-auto-translate protection.'
          )}
        </Typography>
      </Flex>

      <Box
        paddingTop={4}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 20,
        }}
      >
        <Field.Root name="qfEnvironment">
          <Field.Label>
            {t('field.api_environment', 'API Environment')}
          </Field.Label>
          <SingleSelect
            placeholder={t(
              'placeholder.select_environment',
              'Select environment'
            )}
            value={settings.quranFoundation?.environment || 'production'}
            onChange={(val: string | number) =>
              setSettings({
                ...settings,
                quranFoundation: {
                  ...settings.quranFoundation,
                  environment:
                    String(val) === 'prelive' ? 'prelive' : 'production',
                },
              })
            }
          >
            <SingleSelectOption value="production">
              {t(
                'settings.ui.production_live_quran_foundation_api',
                'production — Live Quran.Foundation API'
              )}
            </SingleSelectOption>
            <SingleSelectOption value="prelive">
              {t(
                'settings.ui.prelive_staging_sandbox_api',
                'prelive — Staging / Sandbox API'
              )}
            </SingleSelectOption>
          </SingleSelect>
          <Field.Hint>
            {t(
              'settings.ui.target_oauth2_content_v4_endpoint_environment',
              'Target OAuth2 & Content v4 endpoint environment.'
            )}
          </Field.Hint>
        </Field.Root>

        <Field.Root name="qfScript">
          <Field.Label>
            {t(
              'field.default_arabic_mushaf_script',
              'Default Arabic Mushaf Script'
            )}
          </Field.Label>
          <SingleSelect
            placeholder={t(
              'placeholder.select_arabic_script',
              'Select Arabic script'
            )}
            value={settings.quranFoundation?.defaultScript || 'uthmani'}
            onChange={(val: string | number) =>
              setSettings({
                ...settings,
                quranFoundation: {
                  ...settings.quranFoundation,
                  defaultScript: String(
                    val
                  ) as IslamPluginSettings['quranFoundation']['defaultScript'],
                },
              })
            }
          >
            <SingleSelectOption value="uthmani">
              {t(
                'settings.ui.uthmani_madinah_mushaf_uthmani',
                'uthmani — Madinah Mushaf Uthmani'
              )}
            </SingleSelectOption>
            <SingleSelectOption value="uthmani_tajweed">
              {t(
                'settings.ui.uthmani_tajweed_color_coded_tajweed',
                'uthmani_tajweed — Color-Coded Tajweed'
              )}
            </SingleSelectOption>
            <SingleSelectOption value="imlaei">
              {t(
                'settings.ui.imlaei_standard_imlaei_script',
                'imlaei — Standard Imlaei Script'
              )}
            </SingleSelectOption>
            <SingleSelectOption value="indopak_nastaleeq">
              {t(
                'settings.ui.indopak_nastaleeq_indopak_nastaleeq',
                'indopak_nastaleeq — IndoPak Nastaleeq'
              )}
            </SingleSelectOption>
          </SingleSelect>
          <Field.Hint>
            {t(
              'settings.ui.primary_arabic_script_returned_for_quranic_verse',
              'Primary Arabic script returned for Quranic verses.'
            )}
          </Field.Hint>
        </Field.Root>

        <Field.Root name="qfReciter">
          <Field.Label>
            {t('field.default_audio_reciter_id', 'Default Audio Reciter ID')}
          </Field.Label>
          <TextInput
            name="qfReciter"
            placeholder={t(
              'placeholder.e_g_7_mishary_rashid_alafasy',
              'e.g., 7 (Mishary Rashid Alafasy)'
            )}
            value={String(settings.quranFoundation?.defaultReciterId ?? 7)}
            onChange={(e: InputChangeEvent) =>
              setSettings({
                ...settings,
                quranFoundation: {
                  ...settings.quranFoundation,
                  defaultReciterId: Number(e.target.value) || 7,
                },
              })
            }
          />
          <Field.Hint>
            {t(
              'settings.ui.reciter_id_for_verse_by_verse_audio_7_mishary_ra',
              'Reciter ID for verse-by-verse audio (7 = Mishary Rashid Alafasy).'
            )}
          </Field.Hint>
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
            'checkbox.enable_quran_foundation_content_api_v4_0_0_gatew',
            'Enable Quran Foundation Content API v4.0.0 Gateway'
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
            'checkbox.enforce_translation_integrity_policy',
            'Enforce Translation Integrity Policy (translate="no" / class="notranslate")'
          )}
        </Checkbox>
      </Flex>
    </Box>
  </Tabs.Content>
);

export const EcosystemBridgesSettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  setSettings,
  t,
}) => {
  const statusLabel = (enabled: boolean) =>
    enabled
      ? t('settings.ui.status_enabled', 'Enabled')
      : t('settings.ui.status_disabled', 'Disabled');

  return (
    <Tabs.Content value="bridges">
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
              'settings.ui.4_cross_plugin_ecosystem_bridges',
              'Cross-Plugin Ecosystem Bridges'
            )}
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {t(
              'settings.ui.synchronize_moonsighting_offsets_gold_silver_nis',
              'Synchronize moonsighting offsets, Gold/Silver Nisab rates, and Hilal announcements with companion plugins.'
            )}
          </Typography>
        </Flex>

        <Box
          paddingTop={4}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
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
                    'settings.ui.calendar_hijri_offset_bridge',
                    'Calendar Hijri Offset Bridge'
                  )}
                </Typography>
                <Badge>{statusLabel(Boolean(settings.enableCalendarBridge))}</Badge>
              </Flex>
              <Typography variant="pi" textColor="neutral600">
                {t(
                  'settings.ui.calendar_bridge_desc',
                  'Propagates local Hijri moonsighting offset changes to @vicacha-devs/strapi-plugin-calendar.'
                )}
              </Typography>
            </Box>
            <Box paddingTop={3}>
              <Checkbox
                checked={Boolean(settings.enableCalendarBridge)}
                onCheckedChange={(val: boolean) =>
                  setSettings({
                    ...settings,
                    enableCalendarBridge: Boolean(val),
                  })
                }
              >
                {t(
                  'checkbox.sync_hijri_offset_with_calendar_plugin',
                  'Sync Hijri offset with Calendar plugin'
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
                    'settings.ui.donations_nisab_bridge',
                    'Donations Nisab Bridge'
                  )}
                </Typography>
                <Badge>{statusLabel(Boolean(settings.enableDonationsBridge))}</Badge>
              </Flex>
              <Typography variant="pi" textColor="neutral600">
                {t(
                  'settings.ui.donations_bridge_desc',
                  'Synchronizes Gold & Silver Nisab gram prices with @vicacha-devs/strapi-plugin-donations Zakat calculator.'
                )}
              </Typography>
            </Box>
            <Box paddingTop={3}>
              <Checkbox
                checked={Boolean(settings.enableDonationsBridge)}
                onCheckedChange={(val: boolean) =>
                  setSettings({
                    ...settings,
                    enableDonationsBridge: Boolean(val),
                  })
                }
              >
                {t(
                  'checkbox.sync_gold_amp_silver_nisab_with_donations_plugin',
                  'Sync Gold & Silver Nisab with Donations plugin'
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
                    'settings.ui.inbox_hilal_alert_bridge',
                    'Inbox Hilal Alert Bridge'
                  )}
                </Typography>
                <Badge>{statusLabel(Boolean(settings.enableInboxAlertBridge))}</Badge>
              </Flex>
              <Typography variant="pi" textColor="neutral600">
                {t(
                  'settings.ui.inbox_bridge_desc',
                  'Automatically publishes Ramadan & Eid moonsighting announcements to @vicacha-devs/strapi-plugin-inbox Alert Banners.'
                )}
              </Typography>
            </Box>
            <Box paddingTop={3}>
              <Checkbox
                checked={Boolean(settings.enableInboxAlertBridge)}
                onCheckedChange={(val: boolean) =>
                  setSettings({
                    ...settings,
                    enableInboxAlertBridge: Boolean(val),
                  })
                }
              >
                {t(
                  'checkbox.auto_publish_hilal_alerts_to_inbox_banners',
                  'Auto-publish Hilal alerts to Inbox Banners'
                )}
              </Checkbox>
            </Box>
          </Box>
        </Box>
      </Box>
    </Tabs.Content>
  );
};
