import React, { useEffect, useState } from 'react';
import {
  Main,
  Box,
  Flex,
  Typography,
  Button,
  Badge,
  TextInput,
  Checkbox,
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
        <Flex justifyContent="space-between" alignItems="center" marginBottom={6}>
          <Box>
            <Typography variant="alpha" as="h1">
              Islam Liturgical, Scriptural & Fiqh Cockpit
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              {settings?.mosqueName || 'Mosque Control Center'} •{' '}
              {timetable?.hijri?.formatted || 'Hijri Calendar'} • Qibla{' '}
              {timetable?.qibla?.direction?.degrees ?? 65.24}° (
              {timetable?.qibla?.direction?.cardinal ?? 'ENE'})
            </Typography>
          </Box>
          <Flex gap={2}>
            <Button
              variant={activeTab === 'salah' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('salah')}
            >
              1. Salah, Adhan & Iqamah
            </Button>
            <Button
              variant={activeTab === 'hilal' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('hilal')}
            >
              2. Hilal, Ramadan & Eid
            </Button>
            <Button
              variant={activeTab === 'scripture' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('scripture')}
            >
              3. Quran, Hadith & Dua
            </Button>
            <Button
              variant={activeTab === 'fiqh' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('fiqh')}
            >
              4. Zakat, Nisab & Qibla
            </Button>
            <Button variant="secondary" onClick={() => void loadOverview()} loading={loading}>
              Refresh
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
              <Flex justifyContent="space-between" alignItems="center" marginBottom={4}>
                <Box>
                  <Typography variant="delta" as="h2">
                    Today’s Salah, Adhan & Iqamah Schedule ({timetable.dateGregorian})
                  </Typography>
                  <Typography variant="pi" textColor="neutral600">
                    Method: {timetable.calculation.methodName} • Asr:{' '}
                    {timetable.calculation.schoolName} •Sunrise:{' '}
                    {timetable.times.sunrise} • Imsak: {timetable.times.imsak}
                  </Typography>
                </Box>
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
                      <Typography variant="sigma">Prayer (Salah)</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Adhan Time</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Congregation (Iqamah)</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Window Status</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Notes</Typography>
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
                            <Badge active>CURRENT WINDOW</Badge>
                          ) : p.isNext ? (
                            <Badge>NEXT PRAYER</Badge>
                          ) : (
                            <Typography variant="pi" textColor="neutral500">
                              Scheduled
                            </Typography>
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
              <Typography variant="delta" as="h2" marginBottom={3}>
                Jumu’ah Congregation & Prohibited (Makruh) Windows
              </Typography>
              <Flex gap={6} wrap="wrap">
                <Box>
                  <Typography fontWeight="bold">Jumu’ah Khutbah & Salah</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    Khutbah: {timetable.jumuah.primaryKhutbahTime} • Salah:{' '}
                    {timetable.jumuah.primaryPrayerTime}
                  </Typography>
                </Box>
                <Box>
                  <Typography fontWeight="bold">Sunrise Window (Ishraq)</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {timetable.prohibitedTimes.sunrise.start} –{' '}
                    {timetable.prohibitedTimes.sunrise.end}
                  </Typography>
                </Box>
                <Box>
                  <Typography fontWeight="bold">Zawal (Solar Zenith)</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {timetable.prohibitedTimes.zawal.start} –{' '}
                    {timetable.prohibitedTimes.zawal.end}
                  </Typography>
                </Box>
                <Box>
                  <Typography fontWeight="bold">Sunset Window (Ghurub)</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {timetable.prohibitedTimes.sunset.start} –{' '}
                    {timetable.prohibitedTimes.sunset.end}
                  </Typography>
                </Box>
                <Box>
                  <Typography fontWeight="bold">Last Third of the Night (Tahajjud)</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    Starts at {timetable.times.lastThird} (Midnight: {timetable.times.midnight})
                  </Typography>
                </Box>
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
            >
              <Typography variant="delta" as="h2" marginBottom={4}>
                Imam Hilal Moon-Sighting Confirmation & Ecosystem Bridge
              </Typography>
              <Flex gap={4} wrap="wrap" alignItems="flex-end" marginBottom={4}>
                <Box>
                  <Typography variant="pi" fontWeight="bold">
                    Occasion (ramadan | eid_al_fitr | dhul_hijjah_eid_al_adha)
                  </Typography>
                  <TextInput
                    name="hilalOccasion"
                    value={hilalOccasion}
                    onChange={(e: any) => setHilalOccasion(e.target.value)}
                  />
                </Box>
                <Box>
                  <Typography variant="pi" fontWeight="bold">
                    Confirmed Gregorian Date (YYYY-MM-DD)
                  </Typography>
                  <TextInput
                    name="hilalGregorianDate"
                    value={hilalGregorianDate}
                    onChange={(e: any) => setHilalGregorianDate(e.target.value)}
                  />
                </Box>
                <Box>
                  <Typography variant="pi" fontWeight="bold">
                    Hijri Moon-Sighting Offset (-2 to +2 days)
                  </Typography>
                  <TextInput
                    name="hilalShifting"
                    value={hilalShifting}
                    onChange={(e: any) => setHilalShifting(e.target.value)}
                  />
                </Box>
                <Box>
                  <Typography variant="pi" fontWeight="bold">
                    Approved By (Imam / Religious Authority)
                  </Typography>
                  <TextInput
                    name="hilalImamName"
                    value={hilalImamName}
                    onChange={(e: any) => setHilalImamName(e.target.value)}
                  />
                </Box>
              </Flex>
              <Flex justifyContent="space-between" alignItems="center">
                <Checkbox
                  checked={hilalActivateBanner}
                  onCheckedChange={(val: boolean) => setHilalActivateBanner(Boolean(val))}
                >
                  Activate Ramadan / Eid Banner & Sync Calendar Hijri Offset
                </Checkbox>
                <Button onClick={() => void handleConfirmHilal()} loading={savingAction}>
                  Confirm Hilal Sighting
                </Button>
              </Flex>
            </Box>

            <Box
              background="neutral0"
              padding={5}
              hasRadius
              shadow="filterShadow"
            >
              <Typography variant="delta" as="h2" marginBottom={4}>
                Upcoming Islamic Observances, Ramadan & Eid Dates ({observances.length})
              </Typography>
              <Table colCount={5} rowCount={observances.length}>
                <Thead>
                  <Tr>
                    <Th>
                      <Typography variant="sigma">Observance</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Hijri Date</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Est. Gregorian Date</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Countdown</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Fasting Ruling</Typography>
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
                <Flex justifyContent="space-between" alignItems="center" marginBottom={3}>
                  <Typography variant="delta" as="h2">
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
                <Flex gap={4} direction="column">
                  <Box padding={3} background="neutral100" hasRadius>
                    <Typography fontWeight="bold">
                      Ayah of the Day ({dailyInspiration.ayahOfTheDay.referenceKey}){' '}
                      {dailyInspiration.isPinnedOverride.ayah ? '[PINNED]' : ''}
                    </Typography>
                    <Typography>{dailyInspiration.ayahOfTheDay.arabicUthmani}</Typography>
                    <Typography variant="pi" textColor="neutral600">
                      {dailyInspiration.ayahOfTheDay.translations.es}
                    </Typography>
                  </Box>
                  <Box padding={3} background="neutral100" hasRadius>
                    <Typography fontWeight="bold">
                      Hadith of the Day ({dailyInspiration.hadithOfTheDay.collectionNames.es}){' '}
                      {dailyInspiration.isPinnedOverride.hadith ? '[PINNED]' : ''}
                    </Typography>
                    <Typography>{dailyInspiration.hadithOfTheDay.arabicText}</Typography>
                    <Typography variant="pi" textColor="neutral600">
                      {dailyInspiration.hadithOfTheDay.translations.es}
                    </Typography>
                  </Box>
                  <Box padding={3} background="neutral100" hasRadius>
                    <Typography fontWeight="bold">
                      Dua of the Day ({dailyInspiration.duaOfTheDay.titles.es}){' '}
                      {dailyInspiration.isPinnedOverride.dua ? '[PINNED]' : ''}
                    </Typography>
                    <Typography>{dailyInspiration.duaOfTheDay.arabicText}</Typography>
                    <Typography variant="pi" textColor="neutral600">
                      {dailyInspiration.duaOfTheDay.translations.es}
                    </Typography>
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
              <Typography variant="delta" as="h2" marginBottom={4}>
                Curated Quranic Ayat ({ayat.length}) • 114 Surahs Indexed
              </Typography>
              <Table colCount={4} rowCount={ayat.length}>
                <Thead>
                  <Tr>
                    <Th>
                      <Typography variant="sigma">Ref</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Arabic & Translation</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Topics</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Action</Typography>
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
                      <Td>
                        <Typography>{item.arabicUthmani}</Typography>
                        <Typography variant="pi" textColor="neutral600">
                          {item.translations.es}
                        </Typography>
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
              <Typography variant="delta" as="h2" marginBottom={4}>
                Prophetic Hadiths ({hadiths.length}) & Hisnul Muslim Duas ({duas.length})
              </Typography>
              <Table colCount={4} rowCount={duas.length}>
                <Thead>
                  <Tr>
                    <Th>
                      <Typography variant="sigma">Dua / Supplication</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Arabic & Meaning</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Repetitions</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Action</Typography>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {duas.map((dua) => (
                    <Tr key={dua.id}>
                      <Td>
                        <Typography fontWeight="bold">{dua.titles.es}</Typography>
                        <Typography variant="pi" textColor="neutral600">
                          {dua.categoryLabels.es}
                        </Typography>
                      </Td>
                      <Td>
                        <Typography>{dua.arabicText}</Typography>
                        <Typography variant="pi" textColor="neutral600">
                          {dua.translations.es}
                        </Typography>
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
              <Typography variant="delta" as="h2" marginBottom={4}>
                Zakat al-Mal Nisab Thresholds & Gold Carat Purity Rates
              </Typography>
              <Flex gap={6} wrap="wrap">
                {nisabCop && (
                  <Box padding={4} background="neutral100" hasRadius>
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
                  </Box>
                )}
                {nisabUsd && (
                  <Box padding={4} background="neutral100" hasRadius>
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
                  </Box>
                )}
              </Flex>
            </Box>

            <Box
              background="neutral0"
              padding={5}
              hasRadius
              shadow="filterShadow"
            >
              <Typography variant="delta" as="h2" marginBottom={4}>
                Zakat al-Fitr (Fitrana), Fidyah, Kaffarah & Qibla Geodesic Summary
              </Typography>
              <Flex gap={6} wrap="wrap">
                <Box>
                  <Typography fontWeight="bold">Zakat al-Fitr (Per Person)</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {settings?.fiqhRates.zakatAlFitrPerPersonByCurrency.COP.toLocaleString()}{' '}
                    COP / ${settings?.fiqhRates.zakatAlFitrPerPersonByCurrency.USD} USD (≈{' '}
                    {settings?.fiqhRates.stapleFoodWeightKg} kg staple food)
                  </Typography>
                </Box>
                <Box>
                  <Typography fontWeight="bold">Fidyah (Per Missed Fast Day)</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {settings?.fiqhRates.fidyahPerDayByCurrency.COP.toLocaleString()} COP / $
                    {settings?.fiqhRates.fidyahPerDayByCurrency.USD} USD
                  </Typography>
                </Box>
                <Box>
                  <Typography fontWeight="bold">Qibla Bearing & Distance to Makkah</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {timetable?.qibla.direction.degrees}° clockwise from True North (
                    {timetable?.qibla.direction.cardinal}) •{' '}
                    {timetable?.qibla.distance.kilometers.toLocaleString()} km (
                    {timetable?.qibla.distance.miles.toLocaleString()} mi)
                  </Typography>
                </Box>
              </Flex>
            </Box>
          </Box>
        )}
      </Box>
    </Main>
  );
};

export default IslamPage;
