import { useIntl } from 'react-intl';
import React, { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Field,
  Flex,
  Main,
  SingleSelect,
  SingleSelectOption,
  Tabs,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import { PLUGIN_ID, type IslamPluginSettings } from '../../../shared';

const subCardStyle: React.CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.22)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

const CALCULATION_METHODS: Array<{ value: string; label: string }> = [
  { value: '3', label: '3 — Muslim World League (MWL — Standard Bogotá)' },
  { value: '2', label: '2 — Islamic Society of North America (ISNA)' },
  { value: '4', label: '4 — Umm al-Qura University, Makkah' },
  { value: '5', label: '5 — Egyptian General Authority of Survey' },
  { value: '1', label: '1 — University of Islamic Sciences, Karachi' },
  { value: '13', label: '13 — Diyanet İşleri Başkanlığı, Turkey' },
];

export const SettingsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });
  const { get, put } = useFetchClient();
  const [settings, setSettings] = useState<IslamPluginSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await get(`/${PLUGIN_ID}/settings`);
      if (res?.data?.data) {
        setSettings(res.data.data);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSavedBanner(false);
    try {
      const res = await put(`/${PLUGIN_ID}/settings`, settings);
      if (res?.data?.data) {
        setSettings(res.data.data);
        setSavedBanner(true);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <Main>
        <Box padding={8}>
          <Typography>{t('settings.ui.loading_islam_suite_settings', 'Loading Islam Suite settings...')}</Typography>
        </Box>
      </Main>
    );
  }

  return (
    <Main>
      <Box padding={8}>
        <Flex justifyContent="space-between" alignItems="flex-start" paddingBottom={4} wrap="wrap" gap={4}>
          <Flex direction="column" alignItems="flex-start" gap={1}>
            <Typography variant="alpha" tag="h1">{t('settings.ui.islam_suite_calculation_nisab_ecosystem_bridges', 'Islam Suite — Calculation, Nisab & Ecosystem Bridges')}</Typography>
            <Typography variant="epsilon" textColor="neutral600">{t('settings.ui.configure_astronomical_prayer_calculation_parame', 'Configure astronomical prayer calculation parameters, mosque coordinates, Gold/Silver Nisab rates, Quran Foundation API v4, and cross-plugin bridges.')}</Typography>
            <Flex gap={2} paddingTop={2} wrap="wrap">
              <Badge>Coords: {settings.defaultLat}, {settings.defaultLon}</Badge>
              <Badge>Method: #{settings.method} (School: {settings.school === '2' ? 'Hanafi' : 'Shafi’i'})</Badge>
              <Badge>Hijri Offset: {settings.shifting}d</Badge>
              <Badge>Quran API: {settings.quranFoundation?.environment || 'production'}</Badge>
            </Flex>
          </Flex>
          <Button onClick={() => void handleSave()} loading={saving}>
            Save Settings
          </Button>
        </Flex>

        {savedBanner && (
          <Box marginBottom={4} padding={3} background="success100" hasRadius>
            <Typography textColor="success700" fontWeight="bold">{t('settings.ui.settings_saved_and_synchronized_with_mapped_coll', 'Settings saved and synchronized with mapped collections.')}</Typography>
          </Box>
        )}

        <Divider />

        <Box paddingTop={6}>
          <Tabs.Root defaultValue="calculation">
            <Tabs.List aria-label={t('settings.ui.islam_suite_calculation_nisab_ecosystem_bridges', 'Islam Suite Settings')}>
              <Tabs.Trigger value="calculation">
                {t('settings.tab.calculation', 'Mosque & Astronomical Calculation')}
              </Tabs.Trigger>
              <Tabs.Trigger value="fiqh">
                {t('settings.tab.fiqh', 'Fiqh & Nisab Benchmarks (COP)')}
              </Tabs.Trigger>
              <Tabs.Trigger value="quran">
                {t('settings.tab.quran', 'Quran Foundation API v4')}
              </Tabs.Trigger>
              <Tabs.Trigger value="bridges">
                {t('settings.tab.bridges', 'Ecosystem Bridges')}
              </Tabs.Trigger>
            </Tabs.List>

            {/* Tab 1: Mosque Coordinates & Astronomical Calculation Parameters */}
            <Tabs.Content value="calculation">
              <Box
                background="neutral0"
                padding={6}
                hasRadius
                shadow="filterShadow"
                style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
              >
                <Flex direction="column" alignItems="flex-start" gap={1}>
                  <Typography variant="beta" tag="h2">{t('settings.ui.1_mosque_coordinates_astronomical_calculation_pa', 'Mosque Coordinates & Astronomical Calculation Parameters')}</Typography>
                  <Typography variant="pi" textColor="neutral600">{t('settings.ui.used_for_daily_5_prayer_schedules_qibla_bearing_', 'Used for daily 5-prayer schedules, Qibla bearing & great-circle distance to Makkah, and local Hilal moonsighting adjustments.')}</Typography>
                </Flex>

                <Box
                  paddingTop={4}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 20,
                  }}
                >
                  <Field.Root name="mosqueName">
                    <Field.Label>{t('field.mosque_official_name', 'Mosque Official Name')}</Field.Label>
                    <TextInput
                      name="mosqueName"
                      placeholder={t('placeholder.e_g_mezquita_central_abu_bakr_as_siddiq_bogot', 'e.g., Abu Bakr As-Siddiq Central Mosque — Bogotá')}
                      value={settings.mosqueName || ''}
                      onChange={(e: any) =>
                        setSettings({ ...settings, mosqueName: e.target.value })
                      }
                    />
                    <Field.Hint>{t('settings.ui.displayed_on_printable_monthly_prayer_timetables', 'Displayed on printable monthly prayer timetables and Ramadan calendars.')}</Field.Hint>
                  </Field.Root>

                  <Field.Root name="defaultLat">
                    <Field.Label>{t('field.latitude_decimal_degrees', 'Latitude (Decimal Degrees)')}</Field.Label>
                    <TextInput
                      name="defaultLat"
                      placeholder={t('placeholder.e_g_4_6782', 'e.g., 4.6782')}
                      value={String(settings.defaultLat ?? '')}
                      onChange={(e: any) =>
                        setSettings({
                          ...settings,
                          defaultLat: Number(e.target.value) || 0,
                        })
                      }
                    />
                    <Field.Hint>{t('settings.ui.geographic_latitude_of_the_mosque_bogot_4_6782', 'Geographic latitude of the mosque (Bogotá: 4.6782).')}</Field.Hint>
                  </Field.Root>

                  <Field.Root name="defaultLon">
                    <Field.Label>{t('field.longitude_decimal_degrees', 'Longitude (Decimal Degrees)')}</Field.Label>
                    <TextInput
                      name="defaultLon"
                      placeholder={t('placeholder.e_g_74_084', 'e.g., -74.084')}
                      value={String(settings.defaultLon ?? '')}
                      onChange={(e: any) =>
                        setSettings({
                          ...settings,
                          defaultLon: Number(e.target.value) || 0,
                        })
                      }
                    />
                    <Field.Hint>{t('settings.ui.geographic_longitude_of_the_mosque_bogot_74_084', 'Geographic longitude of the mosque (Bogotá: -74.084).')}</Field.Hint>
                  </Field.Root>

                  <Field.Root name="method">
                    <Field.Label>{t('field.astronomical_calculation_method', 'Astronomical Calculation Method')}</Field.Label>
                    <SingleSelect
                      placeholder={t('placeholder.select_calculation_method', 'Select calculation method')}
                      value={String(settings.method || '3')}
                      onChange={(val: string | number) =>
                        setSettings({ ...settings, method: String(val) })
                      }
                    >
                      {CALCULATION_METHODS.map((m) => (
                        <SingleSelectOption key={m.value} value={m.value}>
                          {m.label}
                        </SingleSelectOption>
                      ))}
                    </SingleSelect>
                    <Field.Hint>{t('settings.ui.fajr_and_isha_twilight_angle_convention', 'Fajr and Isha twilight angle convention.')}</Field.Hint>
                  </Field.Root>

                  <Field.Root name="school">
                    <Field.Label>{t('field.asr_juristic_school', 'Asr Juristic School')}</Field.Label>
                    <SingleSelect
                      placeholder={t('placeholder.select_juristic_school', 'Select juristic school')}
                      value={String(settings.school || '1')}
                      onChange={(val: string | number) =>
                        setSettings({
                          ...settings,
                          school: String(val) === '2' ? '2' : '1',
                        })
                      }
                    >
                      <SingleSelectOption value="1">{t('settings.ui.1_standard_shafi_i_maliki_hanbali_shadow_1x', '1 — Standard (Shafi’i, Maliki, Hanbali — Shadow = 1x)')}</SingleSelectOption>
                      <SingleSelectOption value="2">{t('settings.ui.2_hanafi_shadow_2x', '2 — Hanafi (Shadow = 2x)')}</SingleSelectOption>
                    </SingleSelect>
                    <Field.Hint>{t('settings.ui.determines_the_afternoon_asr_prayer_entry_time', 'Determines the afternoon Asr prayer entry time.')}</Field.Hint>
                  </Field.Root>

                  <Field.Root name="shifting">
                    <Field.Label>{t('field.hijri_moon_sighting_offset_days', 'Hijri Moon-Sighting Offset (Days)')}</Field.Label>
                    <SingleSelect
                      placeholder={t('placeholder.select_moonsighting_day_offset', 'Select moonsighting day offset')}
                      value={String(settings.shifting || '0')}
                      onChange={(val: string | number) =>
                        setSettings({
                          ...settings,
                          shifting: String(val) as any,
                        })
                      }
                    >
                      <SingleSelectOption value="-2">{t('settings.ui.2_days', '-2 Days')}</SingleSelectOption>
                      <SingleSelectOption value="-1">{t('settings.ui.1_day', '-1 Day')}</SingleSelectOption>
                      <SingleSelectOption value="0">{t('settings.ui.0_days_umm_al_qura_standard', '0 Days (Umm al-Qura Standard)')}</SingleSelectOption>
                      <SingleSelectOption value="1">{t('settings.ui.1_day', '+1 Day')}</SingleSelectOption>
                      <SingleSelectOption value="2">{t('settings.ui.2_days', '+2 Days')}</SingleSelectOption>
                    </SingleSelect>
                    <Field.Hint>{t('settings.ui.adjusts_the_hijri_date_after_local_crescent_sigh', 'Adjusts the Hijri date after local crescent sighting confirmation.')}</Field.Hint>
                  </Field.Root>
                </Box>
              </Box>
            </Tabs.Content>

            {/* Tab 2: Fiqh Financial Rates */}
            <Tabs.Content value="fiqh">
              <Box
                background="neutral0"
                padding={6}
                hasRadius
                shadow="filterShadow"
                style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
              >
                <Flex direction="column" alignItems="flex-start" gap={1}>
                  <Typography variant="beta" tag="h2">{t('settings.ui.2_fiqh_financial_benchmarks_gold_silver_nisab_za', 'Fiqh Financial Benchmarks (Gold/Silver Nisab, Zakat al-Fitr & Fidyah in COP)')}</Typography>
                  <Typography variant="pi" textColor="neutral600">{t('settings.ui.reference_benchmarks_used_by_the_zakat_al_mal_ca', 'Reference benchmarks used by the Zakat al-Mal calculator (85g Gold / 595g Silver) and Ramadan obligations.')}</Typography>
                </Flex>

                <Box
                  paddingTop={4}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 20,
                  }}
                >
                  <Field.Root name="goldCop">
                    <Field.Label>{t('field.24k_gold_price_per_gram_cop', '24K Gold Price per Gram (COP)')}</Field.Label>
                    <TextInput
                      name="goldCop"
                      placeholder={t('placeholder.e_g_365000', 'e.g., 365000')}
                      value={String(settings.fiqhRates.goldPricePerGramByCurrency.COP)}
                      onChange={(e: any) =>
                        setSettings({
                          ...settings,
                          fiqhRates: {
                            ...settings.fiqhRates,
                            goldPricePerGramByCurrency: {
                              ...settings.fiqhRates.goldPricePerGramByCurrency,
                              COP: Number(e.target.value) || 0,
                            },
                          },
                        })
                      }
                    />
                    <Field.Hint>{t('settings.ui.gold_nisab_threshold_85_grams_price_per_gram', 'Gold Nisab threshold = 85 grams × price per gram.')}</Field.Hint>
                  </Field.Root>

                  <Field.Root name="silverCop">
                    <Field.Label>{t('field.pure_silver_price_per_gram_cop', 'Pure Silver Price per Gram (COP)')}</Field.Label>
                    <TextInput
                      name="silverCop"
                      placeholder={t('placeholder.e_g_4200', 'e.g., 4200')}
                      value={String(settings.fiqhRates.silverPricePerGramByCurrency.COP)}
                      onChange={(e: any) =>
                        setSettings({
                          ...settings,
                          fiqhRates: {
                            ...settings.fiqhRates,
                            silverPricePerGramByCurrency: {
                              ...settings.fiqhRates.silverPricePerGramByCurrency,
                              COP: Number(e.target.value) || 0,
                            },
                          },
                        })
                      }
                    />
                    <Field.Hint>{t('settings.ui.silver_nisab_threshold_595_grams_price_per_gram', 'Silver Nisab threshold = 595 grams × price per gram.')}</Field.Hint>
                  </Field.Root>

                  <Field.Root name="fitranaCop">
                    <Field.Label>{t('field.zakat_al_fitr_per_person_cop', 'Zakat al-Fitr per Person (COP)')}</Field.Label>
                    <TextInput
                      name="fitranaCop"
                      placeholder={t('placeholder.e_g_35000', 'e.g., 35000')}
                      value={String(settings.fiqhRates.zakatAlFitrPerPersonByCurrency.COP)}
                      onChange={(e: any) =>
                        setSettings({
                          ...settings,
                          fiqhRates: {
                            ...settings.fiqhRates,
                            zakatAlFitrPerPersonByCurrency: {
                              ...settings.fiqhRates.zakatAlFitrPerPersonByCurrency,
                              COP: Number(e.target.value) || 0,
                            },
                          },
                        })
                      }
                    />
                    <Field.Hint>{t('settings.ui.mandatory_per_person_ramadan_charity_before_eid_', 'Mandatory per-person Ramadan charity before Eid al-Fitr prayer.')}</Field.Hint>
                  </Field.Root>

                  <Field.Root name="fidyahCop">
                    <Field.Label>{t('field.fidyah_per_missed_fast_day_cop', 'Fidyah per Missed Fast Day (COP)')}</Field.Label>
                    <TextInput
                      name="fidyahCop"
                      placeholder={t('placeholder.e_g_25000', 'e.g., 25000')}
                      value={String(settings.fiqhRates.fidyahPerDayByCurrency.COP)}
                      onChange={(e: any) =>
                        setSettings({
                          ...settings,
                          fiqhRates: {
                            ...settings.fiqhRates,
                            fidyahPerDayByCurrency: {
                              ...settings.fiqhRates.fidyahPerDayByCurrency,
                              COP: Number(e.target.value) || 0,
                            },
                          },
                        })
                      }
                    />
                    <Field.Hint>{t('settings.ui.daily_meal_compensation_for_those_permanently_un', 'Daily meal compensation for those permanently unable to fast.')}</Field.Hint>
                  </Field.Root>
                </Box>
              </Box>
            </Tabs.Content>

            {/* Tab 3: Quran Foundation Content API v4.0.0 */}
            <Tabs.Content value="quran">
              <Box
                background="neutral0"
                padding={6}
                hasRadius
                shadow="filterShadow"
                style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
              >
                <Flex direction="column" alignItems="flex-start" gap={1}>
                  <Typography variant="beta" tag="h2">{t('settings.ui.3_quran_foundation_content_api_v4_0_0_oauth2_scr', 'Quran Foundation Content API v4.0.0 (OAuth2 & Script Settings)')}</Typography>
                  <Typography variant="pi" textColor="neutral600">{t('settings.ui.configure_quranic_script_rendering_default_audio', 'Configure Quranic script rendering, default audio reciter, and anti-auto-translate protection.')}</Typography>
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
                    <Field.Label>{t('field.api_environment', 'API Environment')}</Field.Label>
                    <SingleSelect
                      placeholder={t('placeholder.select_environment', 'Select environment')}
                      value={settings.quranFoundation?.environment || 'production'}
                      onChange={(val: string | number) =>
                        setSettings({
                          ...settings,
                          quranFoundation: {
                            ...settings.quranFoundation,
                            environment: String(val) === 'prelive' ? 'prelive' : 'production',
                          },
                        })
                      }
                    >
                      <SingleSelectOption value="production">{t('settings.ui.production_live_quran_foundation_api', 'production — Live Quran.Foundation API')}</SingleSelectOption>
                      <SingleSelectOption value="prelive">{t('settings.ui.prelive_staging_sandbox_api', 'prelive — Staging / Sandbox API')}</SingleSelectOption>
                    </SingleSelect>
                    <Field.Hint>{t('settings.ui.target_oauth2_content_v4_endpoint_environment', 'Target OAuth2 & Content v4 endpoint environment.')}</Field.Hint>
                  </Field.Root>

                  <Field.Root name="qfScript">
                    <Field.Label>{t('field.default_arabic_mushaf_script', 'Default Arabic Mushaf Script')}</Field.Label>
                    <SingleSelect
                      placeholder={t('placeholder.select_arabic_script', 'Select Arabic script')}
                      value={settings.quranFoundation?.defaultScript || 'uthmani'}
                      onChange={(val: string | number) =>
                        setSettings({
                          ...settings,
                          quranFoundation: {
                            ...settings.quranFoundation,
                            defaultScript: String(val) as any,
                          },
                        })
                      }
                    >
                      <SingleSelectOption value="uthmani">{t('settings.ui.uthmani_madinah_mushaf_uthmani', 'uthmani — Madinah Mushaf Uthmani')}</SingleSelectOption>
                      <SingleSelectOption value="uthmani_tajweed">{t('settings.ui.uthmani_tajweed_color_coded_tajweed', 'uthmani_tajweed — Color-Coded Tajweed')}</SingleSelectOption>
                      <SingleSelectOption value="imlaei">{t('settings.ui.imlaei_standard_imlaei_script', 'imlaei — Standard Imlaei Script')}</SingleSelectOption>
                      <SingleSelectOption value="indopak_nastaleeq">{t('settings.ui.indopak_nastaleeq_indopak_nastaleeq', 'indopak_nastaleeq — IndoPak Nastaleeq')}</SingleSelectOption>
                    </SingleSelect>
                    <Field.Hint>{t('settings.ui.primary_arabic_script_returned_for_quranic_verse', 'Primary Arabic script returned for Quranic verses.')}</Field.Hint>
                  </Field.Root>

                  <Field.Root name="qfReciter">
                    <Field.Label>{t('field.default_audio_reciter_id', 'Default Audio Reciter ID')}</Field.Label>
                    <TextInput
                      name="qfReciter"
                      placeholder={t('placeholder.e_g_7_mishary_rashid_alafasy', 'e.g., 7 (Mishary Rashid Alafasy)')}
                      value={String(settings.quranFoundation?.defaultReciterId ?? 7)}
                      onChange={(e: any) =>
                        setSettings({
                          ...settings,
                          quranFoundation: {
                            ...settings.quranFoundation,
                            defaultReciterId: Number(e.target.value) || 7,
                          },
                        })
                      }
                    />
                    <Field.Hint>{t('settings.ui.reciter_id_for_verse_by_verse_audio_7_mishary_ra', 'Reciter ID for verse-by-verse audio (7 = Mishary Rashid Alafasy).')}</Field.Hint>
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
                  >{t('checkbox.enable_quran_foundation_content_api_v4_0_0_gatew', 'Enable Quran Foundation Content API v4.0.0 Gateway')}</Checkbox>
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
                    Enforce Translation Integrity Policy (
                    <code
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.88em',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'rgba(128, 128, 128, 0.16)',
                        border: '1px solid rgba(128, 128, 128, 0.25)',
                      }}
                    >
                      translate=&quot;no&quot;
                    </code>{' '}
                    /{' '}
                    <code
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.88em',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'rgba(128, 128, 128, 0.16)',
                        border: '1px solid rgba(128, 128, 128, 0.25)',
                      }}
                    >
                      class=&quot;notranslate&quot;
                    </code>
                    )
                  </Checkbox>
                </Flex>
              </Box>
            </Tabs.Content>

            {/* Tab 4: Cross-Plugin Ecosystem Bridges */}
            <Tabs.Content value="bridges">
              <Box
                background="neutral0"
                padding={6}
                hasRadius
                shadow="filterShadow"
                style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
              >
                <Flex direction="column" alignItems="flex-start" gap={1}>
                  <Typography variant="beta" tag="h2">{t('settings.ui.4_cross_plugin_ecosystem_bridges', 'Cross-Plugin Ecosystem Bridges')}</Typography>
                  <Typography variant="pi" textColor="neutral600">{t('settings.ui.synchronize_moonsighting_offsets_gold_silver_nis', 'Synchronize moonsighting offsets, Gold/Silver Nisab rates, and Hilal announcements with companion plugins.')}</Typography>
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
                      <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
                        <Typography fontWeight="bold">{t('settings.ui.calendar_hijri_offset_bridge', 'Calendar Hijri Offset Bridge')}</Typography>
                        <Badge>{settings.enableCalendarBridge ? 'Enabled' : 'Disabled'}</Badge>
                      </Flex>
                      <Typography variant="pi" textColor="neutral600">
                        Propagates local Hijri moonsighting offset changes to{' '}
                        <code
                          style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '0.88em',
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'rgba(128, 128, 128, 0.16)',
                            border: '1px solid rgba(128, 128, 128, 0.25)',
                          }}
                        >
                          @vicacha-devs/strapi-plugin-calendar
                        </code>
                        .
                      </Typography>
                    </Box>
                    <Box paddingTop={3}>
                      <Checkbox
                        checked={Boolean(settings.enableCalendarBridge)}
                        onCheckedChange={(val: boolean) =>
                          setSettings({ ...settings, enableCalendarBridge: Boolean(val) })
                        }
                      >{t('checkbox.sync_hijri_offset_with_calendar_plugin', 'Sync Hijri offset with Calendar plugin')}</Checkbox>
                    </Box>
                  </Box>

                  <Box padding={4} background="neutral100" hasRadius style={subCardStyle}>
                    <Box>
                      <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
                        <Typography fontWeight="bold">{t('settings.ui.donations_nisab_bridge', 'Donations Nisab Bridge')}</Typography>
                        <Badge>{settings.enableDonationsBridge ? 'Enabled' : 'Disabled'}</Badge>
                      </Flex>
                      <Typography variant="pi" textColor="neutral600">
                        Synchronizes Gold &amp; Silver Nisab gram prices with{' '}
                        <code
                          style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '0.88em',
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'rgba(128, 128, 128, 0.16)',
                            border: '1px solid rgba(128, 128, 128, 0.25)',
                          }}
                        >
                          @vicacha-devs/strapi-plugin-donations
                        </code>{' '}
                        Zakat calculator.
                      </Typography>
                    </Box>
                    <Box paddingTop={3}>
                      <Checkbox
                        checked={Boolean(settings.enableDonationsBridge)}
                        onCheckedChange={(val: boolean) =>
                          setSettings({ ...settings, enableDonationsBridge: Boolean(val) })
                        }
                      >{t('checkbox.sync_gold_amp_silver_nisab_with_donations_plugin', 'Sync Gold & Silver Nisab with Donations plugin')}</Checkbox>
                    </Box>
                  </Box>

                  <Box padding={4} background="neutral100" hasRadius style={subCardStyle}>
                    <Box>
                      <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
                        <Typography fontWeight="bold">{t('settings.ui.inbox_hilal_alert_bridge', 'Inbox Hilal Alert Bridge')}</Typography>
                        <Badge>{settings.enableInboxAlertBridge ? 'Enabled' : 'Disabled'}</Badge>
                      </Flex>
                      <Typography variant="pi" textColor="neutral600">
                        Automatically publishes Ramadan &amp; Eid moonsighting announcements to{' '}
                        <code
                          style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '0.88em',
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'rgba(128, 128, 128, 0.16)',
                            border: '1px solid rgba(128, 128, 128, 0.25)',
                          }}
                        >
                          @vicacha-devs/strapi-plugin-inbox
                        </code>{' '}
                        Alert Banners.
                      </Typography>
                    </Box>
                    <Box paddingTop={3}>
                      <Checkbox
                        checked={Boolean(settings.enableInboxAlertBridge)}
                        onCheckedChange={(val: boolean) =>
                          setSettings({ ...settings, enableInboxAlertBridge: Boolean(val) })
                        }
                      >{t('checkbox.auto_publish_hilal_alerts_to_inbox_banners', 'Auto-publish Hilal alerts to Inbox Banners')}</Checkbox>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Tabs.Content>
          </Tabs.Root>
        </Box>
      </Box>
    </Main>
  );
};

export default SettingsPage;
