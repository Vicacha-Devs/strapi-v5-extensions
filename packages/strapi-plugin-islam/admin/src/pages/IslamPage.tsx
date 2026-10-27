import { useIntl } from 'react-intl';
import React, { useEffect, useState } from 'react';
import {
  Main,
  Box,
  Field,
  Flex,
  Typography,
  Button,
  Badge,
  TextInput,
  Checkbox,
  SingleSelect,
  SingleSelectOption,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import {
  PLUGIN_ID,
  type CuratedAyahItem,
  type CuratedDuaItem,
  type CuratedHadithItem,
  type DailyFivePrayerId,
  type DailyInspirationBundle,
  type DailyPrayerTimetable,
  type IslamicObservanceItem,
  type IslamPluginSettings,
  type NisabThresholdResult,
} from '../../../shared';

type CockpitTab = 'salah' | 'hilal' | 'scripture' | 'fiqh';

const ORDERED_PRAYERS: DailyFivePrayerId[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const IslamPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });
  const { get, post } = useFetchClient();
  const [activeTab, setActiveTab] = useState<CockpitTab>('salah');
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<IslamPluginSettings | null>(null);
  const [timetable, setTimetable] = useState<DailyPrayerTimetable | null>(null);
  const [observances, setObservances] = useState<IslamicObservanceItem[]>([]);
  const [dailyInspiration, setDailyInspiration] = useState<DailyInspirationBundle | null>(
    null
  );
  const [ayat, setAyat] = useState<CuratedAyahItem[]>([]);
  const [hadiths, setHadiths] = useState<CuratedHadithItem[]>([]);
  const [duas, setDuas] = useState<CuratedDuaItem[]>([]);
  const [nisabCop, setNisabCop] = useState<NisabThresholdResult | null>(null);
  const [nisabUsd, setNisabUsd] = useState<NisabThresholdResult | null>(null);

  // Hilal confirmation form state
  const [hilalOccasion, setHilalOccasion] = useState<
    'ramadan' | 'eid_al_fitr' | 'dhul_hijjah_eid_al_adha'
  >('ramadan');
  const [hilalGregorianDate, setHilalGregorianDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [hilalShifting, setHilalShifting] = useState('0');
  const [hilalImamName, setHilalImamName] = useState('Sheikh Principal de la Mezquita');
  const [hilalActivateBanner, setHilalActivateBanner] = useState(true);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await get(`/${PLUGIN_ID}/overview`);
      const payload = res?.data?.data || {};
      if (payload.settings) {
        setSettings(payload.settings);
        setHilalShifting(payload.settings.shifting || '0');
      }
      if (payload.todayTimetable) setTimetable(payload.todayTimetable);
      if (Array.isArray(payload.observances?.upcomingObservances)) {
        setObservances(payload.observances.upcomingObservances);
      }
      if (payload.dailyInspiration) setDailyInspiration(payload.dailyInspiration);
      if (Array.isArray(payload.ayat)) setAyat(payload.ayat);
      if (Array.isArray(payload.hadiths)) setHadiths(payload.hadiths);
      if (Array.isArray(payload.duas)) setDuas(payload.duas);
      if (payload.nisab?.COP) setNisabCop(payload.nisab.COP);
      if (payload.nisab?.USD) setNisabUsd(payload.nisab.USD);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const handleConfirmHilal = async () => {
    setSavingAction(true);
    setStatusMessage(null);
    try {
      await post(`/${PLUGIN_ID}/hilal/confirm`, {
        occasion: hilalOccasion,
        confirmedGregorianDate: hilalGregorianDate,
        shifting: hilalShifting,
        approvedByImam: hilalImamName,
        activateBanner: hilalActivateBanner,
      });
      setStatusMessage('Official Hilal sighting and Hijri offset updated successfully.');
      await loadOverview();
    } finally {
      setSavingAction(false);
    }
  };

  const handlePinInspiration = async (patch: {
    pinnedAyahId?: string | null;
    pinnedHadithId?: string | null;
    pinnedDuaId?: string | null;
  }) => {
    setSavingAction(true);
    setStatusMessage(null);
    try {
      const currentPins = settings?.dailyPins || {};
      await post(`/${PLUGIN_ID}/scripture/pins`, {
        ...currentPins,
        ...patch,
      });
      setStatusMessage('Daily Inspiration pin updated.');
      await loadOverview();
    } finally {
      setSavingAction(false);
    }
  };

  return (
    <Main>
      <Box padding={8}>
        <Flex
          justifyContent="space-between"
          alignItems="flex-start"
          marginBottom={6}
          wrap="wrap"
          gap={4}
        >
          <Flex direction="column" alignItems="flex-start" gap={1}>
            <Typography variant="alpha" tag="h1">{t('page.ui.islam_liturgical_scriptural_fiqh_cockpit', 'Islam Liturgical, Scriptural & Fiqh Cockpit')}</Typography>
            <Typography variant="epsilon" textColor="neutral600">
              {settings?.mosqueName || 'Mosque Control Center'} •{' '}
              {timetable?.hijri?.formatted || 'Hijri Calendar'} • Qibla{' '}
              {timetable?.qibla?.direction?.degrees ?? 65.24}° (
              {timetable?.qibla?.direction?.cardinal ?? 'ENE'})
            </Typography>
          </Flex>
          <Flex gap={2} wrap="wrap">
            <Button
              variant={activeTab === 'salah' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('salah')}
            >
              {t('page.ui.1_salah_adhan_iqamah', 'Salah, Adhan & Iqamah')}
            </Button>
            <Button
              variant={activeTab === 'hilal' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('hilal')}
            >
              {t('page.ui.2_hilal_ramadan_eid', 'Hilal, Ramadan & Eid')}
            </Button>
            <Button
              variant={activeTab === 'scripture' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('scripture')}
            >
              {t('page.ui.3_quran_hadith_dua', 'Quran, Hadith & Dua')}
            </Button>
            <Button
              variant={activeTab === 'fiqh' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('fiqh')}
            >
              {t('page.ui.4_zakat_nisab_qibla', 'Zakat, Nisab & Qibla')}
            </Button>
            <Button variant="secondary" onClick={() => void loadOverview()} loading={loading}>
              {t('page.ui.refresh', 'Refresh')}
            </Button>
          </Flex>
        </Flex>

        {statusMessage && (
          <Box
            marginBottom={4}
            padding={4}
            background="success100"
            hasRadius
          >
            <Typography textColor="success700" fontWeight="bold">
              {statusMessage}
            </Typography>
          </Box>
        )}

        {activeTab === 'salah' && timetable && (
          <Box>
            <Box
              marginBottom={6}
              background="neutral0"
              padding={5}
              hasRadius
              shadow="filterShadow"
            >
              <Flex justifyContent="space-between" alignItems="center" marginBottom={4} style={{ marginBottom: 16 }}>
                <Flex direction="column" alignItems="flex-start" gap={1}>
                  <Typography variant="delta" tag="h2">
                    Today’s Salah, Adhan & Iqamah Schedule ({timetable.dateGregorian})
                  </Typography>
                  <Typography variant="pi" textColor="neutral600">
                    Method: {timetable.calculation.methodName} • Asr:{' '}
                    {timetable.calculation.schoolName} • Sunrise:{' '}
                    {timetable.times.sunrise} • Imsak: {timetable.times.imsak}
                  </Typography>
                </Flex>
                <Flex gap={2}>
                  <Badge active={!timetable.prohibitedTimes.isCurrentlyProhibited}>
                    Active: {(timetable.activePrayer || 'None').toUpperCase()}
                  </Badge>
                  <Badge>
                    Next: {timetable.nextPrayer.toUpperCase()} (in{' '}
                    {timetable.minutesUntilNextAdhan} min)
                  </Badge>
                </Flex>
              </Flex>

              <Table colCount={5} rowCount={ORDERED_PRAYERS.length}>
                <Thead>
                  <Tr>
                    <Th>
                      <Typography variant="sigma">{t('page.ui.prayer_salah', 'Prayer (Salah)')}</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">{t('page.ui.adhan_time', 'Adhan Time')}</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">{t('page.ui.congregation_iqamah', 'Congregation (Iqamah)')}</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">{t('page.ui.window_status', 'Window Status')}</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">{t('page.ui.notes', 'Notes')}</Typography>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {ORDERED_PRAYERS.map((pKey) => {
                    const p = timetable.prayers[pKey];
                    const rule = settings?.iqamahRules?.find((r) => r.prayerName === pKey);
                    return (
                      <Tr key={pKey}>
                        <Td>
                          <Typography fontWeight="bold">{p.label}</Typography>
                        </Td>
                        <Td>
                          <Typography>{p.adhan}</Typography>
                        </Td>
                        <Td>
                          <Typography fontWeight="bold">{p.iqamah}</Typography>
                        </Td>
                        <Td>
                          {p.isActive ? (
                            <Badge active>{t('page.ui.current_window', 'CURRENT WINDOW')}</Badge>
                          ) : p.isNext ? (
                            <Badge>{t('page.ui.next_prayer', 'NEXT PRAYER')}</Badge>
                          ) : (
                            <Typography variant="pi" textColor="neutral500">{t('page.ui.scheduled', 'Scheduled')}</Typography>
                          )}
                        </Td>
                        <Td>
                          <Typography variant="pi" textColor="neutral600">
                            {rule?.notes || `+${rule?.offsetMinutes ?? 15} min`}
                          </Typography>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>

            <Box
              background="neutral0"
              padding={5}
              hasRadius
              shadow="filterShadow"
            >
              <Box marginBottom={4} style={{ marginBottom: 16 }}>
                <Typography variant="delta" tag="h2">{t('page.ui.jumu_ah_congregation_prohibited_makruh_windows', 'Jumu’ah Congregation & Prohibited (Makruh) Windows')}</Typography>
              </Box>
              <Flex gap={4} wrap="wrap" alignItems="stretch">
                <Flex direction="column" alignItems="flex-start" gap={1} padding={3} background="neutral100" hasRadius style={{ flex: 1, minWidth: 200 }}>
                  <Typography fontWeight="bold">{t('page.ui.jumu_ah_khutbah_salah', 'Jumu’ah Khutbah & Salah')}</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    Khutbah: {timetable.jumuah.primaryKhutbahTime} • Salah:{' '}
                    {timetable.jumuah.primaryPrayerTime}
                  </Typography>
                </Flex>
                <Flex direction="column" alignItems="flex-start" gap={1} padding={3} background="neutral100" hasRadius style={{ flex: 1, minWidth: 200 }}>
                  <Typography fontWeight="bold">{t('page.ui.sunrise_window_ishraq', 'Sunrise Window (Ishraq)')}</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {timetable.prohibitedTimes.sunrise.start} –{' '}
                    {timetable.prohibitedTimes.sunrise.end}
                  </Typography>
                </Flex>
                <Flex direction="column" alignItems="flex-start" gap={1} padding={3} background="neutral100" hasRadius style={{ flex: 1, minWidth: 200 }}>
                  <Typography fontWeight="bold">{t('page.ui.zawal_solar_zenith', 'Zawal (Solar Zenith)')}</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {timetable.prohibitedTimes.zawal.start} –{' '}
                    {timetable.prohibitedTimes.zawal.end}
                  </Typography>
                </Flex>
                <Flex direction="column" alignItems="flex-start" gap={1} padding={3} background="neutral100" hasRadius style={{ flex: 1, minWidth: 200 }}>
                  <Typography fontWeight="bold">{t('page.ui.sunset_window_ghurub', 'Sunset Window (Ghurub)')}</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {timetable.prohibitedTimes.sunset.start} –{' '}
                    {timetable.prohibitedTimes.sunset.end}
                  </Typography>
                </Flex>
                <Flex direction="column" alignItems="flex-start" gap={1} padding={3} background="neutral100" hasRadius style={{ flex: 1, minWidth: 200 }}>
                  <Typography fontWeight="bold">{t('page.ui.last_third_of_the_night_tahajjud', 'Last Third of the Night (Tahajjud)')}</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    Starts at {timetable.times.lastThird} (Midnight: {timetable.times.midnight})
                  </Typography>
                </Flex>
              </Flex>
            </Box>
          </Box>
        )}

        {activeTab === 'hilal' && (
          <Box>
            <Box
              marginBottom={6}
              background="neutral0"
              padding={5}
              hasRadius
              shadow="filterShadow"
              style={{ border: '1px solid rgba(128, 128, 128, 0.22)' }}
            >
              <Flex direction="column" alignItems="stretch" gap={4}>
                <Box style={{ marginBottom: 4 }}>
                  <Typography variant="delta" tag="h2">{t('page.ui.imam_hilal_moon_sighting_confirmation_ecosystem_', 'Imam Hilal Moon-Sighting Confirmation & Ecosystem Bridge')}</Typography>
                </Box>
                <Flex gap={4} wrap="wrap" alignItems="flex-start">
                  <Box style={{ flex: 1, minWidth: 220 }}>
                    <Field.Root hint={t('page.ui.select_the_crescent_sighting_announcement_type', 'Select the crescent sighting announcement type.')}>
                      <Field.Label>{t('field.liturgical_occasion', 'Liturgical Occasion')}</Field.Label>
                      <SingleSelect
                        placeholder={t('placeholder.select_occasion', 'Select occasion')}
                        value={hilalOccasion}
                        onChange={(val: string | number) => setHilalOccasion(String(val))}
                      >
                        <SingleSelectOption value="ramadan">{t('page.ui.ramadan_start_of_ramadan_1st', 'ramadan (Start of Ramadan 1st)')}</SingleSelectOption>
                        <SingleSelectOption value="eid_al_fitr">{t('page.ui.eid_al_fitr_eid_al_fitr_1_shawwal', 'eid_al_fitr (Eid al-Fitr — 1 Shawwal)')}</SingleSelectOption>
                        <SingleSelectOption value="dhul_hijjah_eid_al_adha">{t('page.ui.dhul_hijjah_eid_al_adha_dhul_hijjah_eid_al_adha', 'dhul_hijjah_eid_al_adha (Dhul Hijjah & Eid al-Adha)')}</SingleSelectOption>
                      </SingleSelect>
                      <Field.Hint />
                    </Field.Root>
                  </Box>
                  <Box style={{ flex: 1, minWidth: 220 }}>
                    <Field.Root hint={t('page.ui.official_gregorian_date_corresponding_to_the_1st', 'Official Gregorian date corresponding to the 1st of the Hijri month.')}>
                      <Field.Label>{t('field.confirmed_gregorian_date_yyyy_mm_dd', 'Confirmed Gregorian Date (YYYY-MM-DD)')}</Field.Label>
                      <TextInput
                        name="hilalGregorianDate"
                        placeholder={t('placeholder.e_g_2026_02_18', 'e.g., 2026-02-18')}
                        value={hilalGregorianDate}
                        onChange={(e: any) => setHilalGregorianDate(e.target.value)}
                      />
                      <Field.Hint />
                    </Field.Root>
                  </Box>
                  <Box style={{ flex: 1, minWidth: 220 }}>
                    <Field.Root hint={t('page.ui.propagated_to_the_calendar_eventhub_plugins_if_e', 'Propagated to the Calendar & EventHub plugins if enabled below.')}>
                      <Field.Label>{t('field.hijri_moon_sighting_offset_2_to_2_days', 'Hijri Moon-Sighting Offset (-2 to +2 days)')}</Field.Label>
                      <SingleSelect
                        placeholder={t('placeholder.select_day_offset', 'Select day offset')}
                        value={String(hilalShifting)}
                        onChange={(val: string | number) => setHilalShifting(String(val))}
                      >
                        <SingleSelectOption value="-2">{t('page.ui.2_days', '-2 days')}</SingleSelectOption>
                        <SingleSelectOption value="-1">{t('page.ui.1_day', '-1 day')}</SingleSelectOption>
                        <SingleSelectOption value="0">{t('page.ui.0_days_astronomical_umm_al_qura', '0 days (Astronomical / Umm al-Qura)')}</SingleSelectOption>
                        <SingleSelectOption value="1">{t('page.ui.1_day', '+1 day')}</SingleSelectOption>
                        <SingleSelectOption value="2">{t('page.ui.2_days', '+2 days')}</SingleSelectOption>
                      </SingleSelect>
                      <Field.Hint />
                    </Field.Root>
                  </Box>
                  <Box style={{ flex: 1, minWidth: 220 }}>
                    <Field.Root hint={t('page.ui.signatory_recorded_on_the_public_hilal_announcem', 'Signatory recorded on the public Hilal announcement banner.')}>
                      <Field.Label>{t('field.approved_by_imam_religious_authority', 'Approved By (Imam / Religious Authority)')}</Field.Label>
                      <TextInput
                        name="hilalImamName"
                        placeholder={t('placeholder.e_g_sheikh_principal_de_la_mezquita', 'e.g., Head Imam of the Mosque')}
                        value={hilalImamName}
                        onChange={(e: any) => setHilalImamName(e.target.value)}
                      />
                      <Field.Hint />
                    </Field.Root>
                  </Box>
                </Flex>
                <Flex justifyContent="space-between" alignItems="center">
                  <Checkbox
                    checked={hilalActivateBanner}
                    onCheckedChange={(val: boolean) =>
                      setHilalActivateBanner(Boolean(val))
                    }
                  >
                    {t(
                      'checkbox.activate_ramadan_eid_banner',
                      'Activate Ramadan / Eid Banner & Sync Calendar Hijri Offset'
                    )}
                  </Checkbox>
                  <Button onClick={() => void handleConfirmHilal()} loading={savingAction}>
                    Confirm Hilal Sighting
                  </Button>
                </Flex>
              </Flex>
            </Box>

            <Box
              background="neutral0"
              padding={5}
              hasRadius
              shadow="filterShadow"
              style={{ border: '1px solid rgba(128, 128, 128, 0.22)' }}
            >
              <Box marginBottom={4} style={{ marginBottom: 16 }}>
                <Typography variant="delta" tag="h2">
                  Upcoming Islamic Observances, Ramadan & Eid Dates ({observances.length})
                </Typography>
              </Box>
              <Table colCount={5} rowCount={observances.length}>
                <Thead>
                  <Tr>
                    <Th>
                      <Typography variant="sigma">{t('page.ui.observance', 'Observance')}</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">{t('page.ui.hijri_date', 'Hijri Date')}</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">{t('page.ui.est_gregorian_date', 'Est. Gregorian Date')}</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">{t('page.ui.countdown', 'Countdown')}</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">{t('page.ui.fasting_ruling', 'Fasting Ruling')}</Typography>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {observances.map((obs) => (
                    <Tr key={obs.id}>
                      <Td>
                        <Typography fontWeight="bold">
                          {obs.titles.es || obs.titles.en}
                        </Typography>
                      </Td>
                      <Td>
                        <Typography>{obs.hijriFormatted}</Typography>
                      </Td>
                      <Td>
                        <Typography fontWeight="bold">{obs.estimatedGregorianDate}</Typography>
                      </Td>
                      <Td>
                        <Badge active={obs.daysUntil <= 30}>{obs.daysUntil} days</Badge>
                      </Td>
                      <Td>
                        <Badge>{obs.fastingRecommendedOrObligatory.toUpperCase()}</Badge>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </Box>
        )}

        {activeTab === 'scripture' && (
          <Box>
            {dailyInspiration && (
              <Box
                marginBottom={6}
                background="neutral0"
                padding={5}
                hasRadius
                shadow="filterShadow"
              >
                <Flex justifyContent="space-between" alignItems="center" marginBottom={4} style={{ marginBottom: 16 }}>
                  <Typography variant="delta" tag="h2">
                    Today’s Featured Inspiration ({dailyInspiration.date})
                  </Typography>
                  <Button
                    variant="tertiary"
                    onClick={() =>
                      void handlePinInspiration({
                        pinnedAyahId: null,
                        pinnedHadithId: null,
                        pinnedDuaId: null,
                      })
                    }
                  >
                    Reset All Pins to Automatic Daily Rotation
                  </Button>
                </Flex>
                <Flex gap={4} direction="column" alignItems="stretch">
                  <Box padding={3} background="neutral100" hasRadius>
                    <Box marginBottom={1}>
                      <Typography fontWeight="bold">
                        Ayah of the Day ({dailyInspiration.ayahOfTheDay.referenceKey}){' '}
                        {dailyInspiration.isPinnedOverride.ayah ? '[PINNED]' : ''}
                      </Typography>
                    </Box>
                    <Box style={{ whiteSpace: 'normal', lineHeight: 1.7 }}>
                      <Typography>{dailyInspiration.ayahOfTheDay.arabicUthmani}</Typography>
                    </Box>
                    {dailyInspiration.ayahOfTheDay.transliteration && (
                      <Box paddingTop={1} style={{ whiteSpace: 'normal' }}>
                        <Typography variant="pi" textColor="neutral500" style={{ fontStyle: 'italic' }}>
                          {dailyInspiration.ayahOfTheDay.transliteration}
                        </Typography>
                      </Box>
                    )}
                    <Box paddingTop={1} style={{ whiteSpace: 'normal' }}>
                      <Typography variant="pi" textColor="neutral600">
                        {dailyInspiration.ayahOfTheDay.translations.es}
                      </Typography>
                    </Box>
                  </Box>
                  <Box padding={3} background="neutral100" hasRadius>
                    <Box marginBottom={1}>
                      <Typography fontWeight="bold">
                        Hadith of the Day ({dailyInspiration.hadithOfTheDay.collectionNames.es}){' '}
                        {dailyInspiration.isPinnedOverride.hadith ? '[PINNED]' : ''}
                      </Typography>
                    </Box>
                    <Box style={{ whiteSpace: 'normal', lineHeight: 1.7 }}>
                      <Typography>{dailyInspiration.hadithOfTheDay.arabicText}</Typography>
                    </Box>
                    {dailyInspiration.hadithOfTheDay.transliteration && (
                      <Box paddingTop={1} style={{ whiteSpace: 'normal' }}>
                        <Typography variant="pi" textColor="neutral500" style={{ fontStyle: 'italic' }}>
                          {dailyInspiration.hadithOfTheDay.transliteration}
                        </Typography>
                      </Box>
                    )}
                    <Box paddingTop={1} style={{ whiteSpace: 'normal' }}>
                      <Typography variant="pi" textColor="neutral600">
                        {dailyInspiration.hadithOfTheDay.translations.es}
                      </Typography>
                    </Box>
                  </Box>
                  <Box padding={3} background="neutral100" hasRadius>
                    <Box marginBottom={1}>
                      <Typography fontWeight="bold">
                        Dua of the Day ({dailyInspiration.duaOfTheDay.titles.es}){' '}
                        {dailyInspiration.isPinnedOverride.dua ? '[PINNED]' : ''}
                      </Typography>
                    </Box>
                    <Box style={{ whiteSpace: 'normal', lineHeight: 1.7 }}>
                      <Typography>{dailyInspiration.duaOfTheDay.arabicText}</Typography>
                    </Box>
                    {dailyInspiration.duaOfTheDay.transliteration && (
                      <Box paddingTop={1} style={{ whiteSpace: 'normal' }}>
                        <Typography variant="pi" textColor="neutral500" style={{ fontStyle: 'italic' }}>
                          {dailyInspiration.duaOfTheDay.transliteration}
                        </Typography>
                      </Box>
                    )}
                    <Box paddingTop={1} style={{ whiteSpace: 'normal' }}>
                      <Typography variant="pi" textColor="neutral600">
                        {dailyInspiration.duaOfTheDay.translations.es}
                      </Typography>
                    </Box>
                  </Box>
                </Flex>
              </Box>
            )}

            <Box
              marginBottom={6}
              background="neutral0"
              padding={5}
              hasRadius
              shadow="filterShadow"
            >
              <Box marginBottom={4} style={{ marginBottom: 16 }}>
                <Typography variant="delta" tag="h2">
                  Curated Quranic Ayat ({ayat.length}) • 114 Surahs Indexed
                </Typography>
              </Box>
              <Table colCount={4} rowCount={ayat.length}>
                <Thead>
                  <Tr>
                    <Th>
                      <Typography variant="sigma">{t('page.ui.ref', 'Ref')}</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">{t('page.ui.arabic_translation', 'Arabic & Translation')}</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">{t('page.ui.topics', 'Topics')}</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">{t('page.ui.action', 'Action')}</Typography>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {ayat.map((item) => (
                    <Tr key={item.id}>
                      <Td>
                        <Typography fontWeight="bold">
                          {item.surahNameTranslit} ({item.referenceKey})
                        </Typography>
                      </Td>
                      <Td style={{ whiteSpace: 'normal', maxWidth: 680 }}>
                        <Box style={{ whiteSpace: 'normal', lineHeight: 1.7 }}>
                          <Typography>{item.arabicUthmani}</Typography>
                        </Box>
                        {item.transliteration && (
                          <Box paddingTop={1} style={{ whiteSpace: 'normal' }}>
                            <Typography variant="pi" textColor="neutral500" style={{ fontStyle: 'italic' }}>
                              {item.transliteration}
                            </Typography>
                          </Box>
                        )}
                        <Box paddingTop={1} style={{ whiteSpace: 'normal' }}>
                          <Typography variant="pi" textColor="neutral600">
                            {item.translations.es}
                          </Typography>
                        </Box>
                      </Td>
                      <Td>
                        <Typography variant="pi">{item.topicTags.join(', ')}</Typography>
                      </Td>
                      <Td>
                        <Button
                          size="S"
                          variant="secondary"
                          onClick={() => void handlePinInspiration({ pinnedAyahId: item.id })}
                        >
                          Pin as Ayah of the Day
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>

            <Box
              marginBottom={6}
              background="neutral0"
              padding={5}
              hasRadius
              shadow="filterShadow"
            >
              <Box marginBottom={4} style={{ marginBottom: 16 }}>
                <Typography variant="delta" tag="h2">
                  Prophetic Hadiths ({hadiths.length}) & Hisnul Muslim Duas ({duas.length})
                </Typography>
              </Box>
              <Table colCount={4} rowCount={duas.length}>
                <Thead>
                  <Tr>
                    <Th>
                      <Typography variant="sigma">{t('page.ui.dua_supplication', 'Dua / Supplication')}</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">{t('page.ui.arabic_meaning', 'Arabic & Meaning')}</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">{t('page.ui.repetitions', 'Repetitions')}</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">{t('page.ui.action', 'Action')}</Typography>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {duas.map((dua) => (
                    <Tr key={dua.id}>
                      <Td style={{ whiteSpace: 'normal', maxWidth: 240 }}>
                        <Box style={{ whiteSpace: 'normal' }}>
                          <Typography fontWeight="bold">{dua.titles.es}</Typography>
                        </Box>
                        <Box paddingTop={1} style={{ whiteSpace: 'normal' }}>
                          <Typography variant="pi" textColor="neutral600">
                            {dua.categoryLabels.es}
                          </Typography>
                        </Box>
                      </Td>
                      <Td style={{ whiteSpace: 'normal', maxWidth: 680 }}>
                        <Box style={{ whiteSpace: 'normal', lineHeight: 1.7 }}>
                          <Typography>{dua.arabicText}</Typography>
                        </Box>
                        {dua.transliteration && (
                          <Box paddingTop={1} style={{ whiteSpace: 'normal' }}>
                            <Typography variant="pi" textColor="neutral500" style={{ fontStyle: 'italic' }}>
                              {dua.transliteration}
                            </Typography>
                          </Box>
                        )}
                        <Box paddingTop={1} style={{ whiteSpace: 'normal' }}>
                          <Typography variant="pi" textColor="neutral600">
                            {dua.translations.es}
                          </Typography>
                        </Box>
                      </Td>
                      <Td>
                        <Badge>{dua.recommendedRepetitions}x</Badge>
                      </Td>
                      <Td>
                        <Button
                          size="S"
                          variant="secondary"
                          onClick={() => void handlePinInspiration({ pinnedDuaId: dua.id })}
                        >
                          Pin as Dua of the Day
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </Box>
        )}

        {activeTab === 'fiqh' && (
          <Box>
            <Box
              marginBottom={6}
              background="neutral0"
              padding={5}
              hasRadius
              shadow="filterShadow"
            >
              <Box marginBottom={4} style={{ marginBottom: 16 }}>
                <Typography variant="delta" tag="h2">{t('page.ui.zakat_al_mal_nisab_thresholds_gold_carat_purity_', 'Zakat al-Mal Nisab Thresholds & Gold Carat Purity Rates')}</Typography>
              </Box>
              <Flex gap={6} wrap="wrap" alignItems="stretch">
                {nisabCop && (
                  <Flex direction="column" alignItems="flex-start" gap={1} padding={4} background="neutral100" hasRadius style={{ flex: 1, minWidth: 280 }}>
                    <Typography fontWeight="bold">
                      Colombian Peso (COP) — {nisabCop.standard.toUpperCase()} Standard
                    </Typography>
                    <Typography>
                      Gold Nisab ({nisabCop.gold.weightGrams}g):{' '}
                      {nisabCop.gold.nisabAmount.toLocaleString()} COP
                    </Typography>
                    <Typography>
                      Silver Nisab ({nisabCop.silver.weightGrams}g):{' '}
                      {nisabCop.silver.nisabAmount.toLocaleString()} COP
                    </Typography>
                    <Typography variant="pi" textColor="neutral600">
                      24K: {nisabCop.gold.caratPricesPerGram['24K']?.toLocaleString()} COP/g •
                      22K: {nisabCop.gold.caratPricesPerGram['22K']?.toLocaleString()} COP/g •
                      18K: {nisabCop.gold.caratPricesPerGram['18K']?.toLocaleString()} COP/g
                    </Typography>
                  </Flex>
                )}
                {nisabUsd && (
                  <Flex direction="column" alignItems="flex-start" gap={1} padding={4} background="neutral100" hasRadius style={{ flex: 1, minWidth: 280 }}>
                    <Typography fontWeight="bold">
                      US Dollar (USD) — {nisabUsd.standard.toUpperCase()} Standard
                    </Typography>
                    <Typography>
                      Gold Nisab ({nisabUsd.gold.weightGrams}g): $
                      {nisabUsd.gold.nisabAmount.toLocaleString()} USD
                    </Typography>
                    <Typography>
                      Silver Nisab ({nisabUsd.silver.weightGrams}g): $
                      {nisabUsd.silver.nisabAmount.toLocaleString()} USD
                    </Typography>
                    <Typography variant="pi" textColor="neutral600">
                      24K: ${nisabUsd.gold.caratPricesPerGram['24K']} USD/g • 22K: $
                      {nisabUsd.gold.caratPricesPerGram['22K']} USD/g • 18K: $
                      {nisabUsd.gold.caratPricesPerGram['18K']} USD/g
                    </Typography>
                  </Flex>
                )}
              </Flex>
            </Box>

            <Box
              background="neutral0"
              padding={5}
              hasRadius
              shadow="filterShadow"
            >
              <Box marginBottom={4} style={{ marginBottom: 16 }}>
                <Typography variant="delta" tag="h2">{t('page.ui.zakat_al_fitr_fitrana_fidyah_kaffarah_qibla_geod', 'Zakat al-Fitr (Fitrana), Fidyah, Kaffarah & Qibla Geodesic Summary')}</Typography>
              </Box>
              <Flex gap={4} wrap="wrap" alignItems="stretch">
                <Flex direction="column" alignItems="flex-start" gap={1} padding={4} background="neutral100" hasRadius style={{ flex: 1, minWidth: 220 }}>
                  <Typography fontWeight="bold">{t('page.ui.zakat_al_fitr_per_person', 'Zakat al-Fitr (Per Person)')}</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {settings?.fiqhRates.zakatAlFitrPerPersonByCurrency.COP.toLocaleString()}{' '}
                    COP / ${settings?.fiqhRates.zakatAlFitrPerPersonByCurrency.USD} USD (≈{' '}
                    {settings?.fiqhRates.stapleFoodWeightKg} kg staple food)
                  </Typography>
                </Flex>
                <Flex direction="column" alignItems="flex-start" gap={1} padding={4} background="neutral100" hasRadius style={{ flex: 1, minWidth: 220 }}>
                  <Typography fontWeight="bold">{t('page.ui.fidyah_per_missed_fast_day', 'Fidyah (Per Missed Fast Day)')}</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {settings?.fiqhRates.fidyahPerDayByCurrency.COP.toLocaleString()} COP / $
                    {settings?.fiqhRates.fidyahPerDayByCurrency.USD} USD
                  </Typography>
                </Flex>
                <Flex direction="column" alignItems="flex-start" gap={1} padding={4} background="neutral100" hasRadius style={{ flex: 1, minWidth: 220 }}>
                  <Typography fontWeight="bold">{t('page.ui.qibla_bearing_distance_to_makkah', 'Qibla Bearing & Distance to Makkah')}</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {timetable?.qibla.direction.degrees}° clockwise from True North (
                    {timetable?.qibla.direction.cardinal}) •{' '}
                    {timetable?.qibla.distance.kilometers.toLocaleString()} km (
                    {timetable?.qibla.distance.miles.toLocaleString()} mi)
                  </Typography>
                </Flex>
              </Flex>
            </Box>
          </Box>
        )}
      </Box>
    </Main>
  );
};

export default IslamPage;
