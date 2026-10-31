import { useIntl } from 'react-intl';
import React, { useEffect, useState } from 'react';
import { Main, Box, Flex, Typography, Button } from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import {
  PLUGIN_ID,
  type CuratedAyahItem,
  type CuratedDuaItem,
  type CuratedHadithItem,
  type DailyInspirationBundle,
  type DailyPrayerTimetable,
  type IslamicObservanceItem,
  type IslamPluginSettings,
  type NisabThresholdResult,
} from '../../../shared';
import {
  HilalCockpitTab,
  SalahCockpitTab,
  type HilalOccasionKey,
} from '../components/SalahAndHilalTabs';
import {
  FiqhCockpitTab,
  ScriptureCockpitTab,
  type InspirationPinPatch,
} from '../components/ScriptureAndFiqhTabs';
import type { TranslateFn } from '../components/SettingsTabs';

type CockpitTab = 'salah' | 'hilal' | 'scripture' | 'fiqh';

interface OverviewResponsePayload {
  settings?: IslamPluginSettings;
  todayTimetable?: DailyPrayerTimetable;
  observances?: {
    upcomingObservances?: IslamicObservanceItem[];
  };
  dailyInspiration?: DailyInspirationBundle;
  ayat?: CuratedAyahItem[];
  hadiths?: CuratedHadithItem[];
  duas?: CuratedDuaItem[];
  nisab?: {
    COP?: NisabThresholdResult;
    USD?: NisabThresholdResult;
  };
}

interface OverviewApiResponse {
  data?: OverviewResponsePayload;
}

const CockpitHeaderBar: React.FC<{
  settings: IslamPluginSettings | null;
  timetable: DailyPrayerTimetable | null;
  activeTab: CockpitTab;
  setActiveTab: (tab: CockpitTab) => void;
  loading: boolean;
  onRefresh: () => void;
  t: TranslateFn;
}> = ({
  settings,
  timetable,
  activeTab,
  setActiveTab,
  loading,
  onRefresh,
  t,
}) => {
  const mosqueLabel =
    settings?.mosqueName ||
    t('page.ui.mosque_control_center', 'Mosque Control Center');
  const hijriLabel =
    timetable?.hijri?.formatted ||
    t('page.ui.hijri_calendar_label', 'Hijri Calendar');
  const qiblaDegrees = timetable?.qibla?.direction?.degrees ?? 65.24;
  const qiblaCardinal = timetable?.qibla?.direction?.cardinal ?? 'ENE';

  return (
    <Flex
      justifyContent="space-between"
      alignItems="flex-start"
      marginBottom={6}
      wrap="wrap"
      gap={4}
    >
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography variant="alpha" tag="h1">
          {t(
            'page.ui.islam_liturgical_scriptural_fiqh_cockpit',
            'Islam Liturgical, Scriptural & Fiqh Cockpit'
          )}
        </Typography>
        <Typography variant="epsilon" textColor="neutral600">
          {t(
            'page.ui.cockpit_header_subtitle',
            '{mosque} • {hijri} • Qibla {degrees}° ({cardinal})',
            {
              mosque: mosqueLabel,
              hijri: hijriLabel,
              degrees: qiblaDegrees,
              cardinal: qiblaCardinal,
            }
          )}
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
        <Button variant="secondary" onClick={onRefresh} loading={loading}>
          {t('page.ui.refresh', 'Refresh')}
        </Button>
      </Flex>
    </Flex>
  );
};

export const IslamPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t: TranslateFn = (id, defaultMessage, values) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage }, values);
  const { get, post } = useFetchClient();
  const [activeTab, setActiveTab] = useState<CockpitTab>('salah');
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<IslamPluginSettings | null>(null);
  const [timetable, setTimetable] = useState<DailyPrayerTimetable | null>(null);
  const [observances, setObservances] = useState<IslamicObservanceItem[]>([]);
  const [dailyInspiration, setDailyInspiration] =
    useState<DailyInspirationBundle | null>(null);
  const [ayat, setAyat] = useState<CuratedAyahItem[]>([]);
  const [hadiths, setHadiths] = useState<CuratedHadithItem[]>([]);
  const [duas, setDuas] = useState<CuratedDuaItem[]>([]);
  const [nisabCop, setNisabCop] = useState<NisabThresholdResult | null>(null);
  const [nisabUsd, setNisabUsd] = useState<NisabThresholdResult | null>(null);

  const [hilalOccasion, setHilalOccasion] = useState<HilalOccasionKey>('ramadan');
  const [hilalGregorianDate, setHilalGregorianDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [hilalShifting, setHilalShifting] = useState('0');
  const [hilalImamName, setHilalImamName] = useState(
    'Sheikh Principal de la Mezquita'
  );
  const [hilalActivateBanner, setHilalActivateBanner] = useState(true);

  const applyOverviewPayload = (payload: OverviewResponsePayload) => {
    if (payload.settings) {
      setSettings(payload.settings);
      setHilalShifting(payload.settings.shifting || '0');
    }
    if (payload.todayTimetable) setTimetable(payload.todayTimetable);
    if (Array.isArray(payload.observances?.upcomingObservances)) {
      setObservances(payload.observances.upcomingObservances);
    }
    if (payload.dailyInspiration) setDailyInspiration(payload.dailyInspiration);
  };

  const applyCorpusAndNisabPayload = (payload: OverviewResponsePayload) => {
    if (Array.isArray(payload.ayat)) setAyat(payload.ayat);
    if (Array.isArray(payload.hadiths)) setHadiths(payload.hadiths);
    if (Array.isArray(payload.duas)) setDuas(payload.duas);
    if (payload.nisab?.COP) setNisabCop(payload.nisab.COP);
    if (payload.nisab?.USD) setNisabUsd(payload.nisab.USD);
  };

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await get<OverviewApiResponse>(`/${PLUGIN_ID}/overview`);
      const payload = res?.data?.data || {};
      applyOverviewPayload(payload);
      applyCorpusAndNisabPayload(payload);
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
      setStatusMessage(
        t(
          'page.ui.hilal_confirmed_status',
          'Official Hilal sighting and Hijri offset updated successfully.'
        )
      );
      await loadOverview();
    } finally {
      setSavingAction(false);
    }
  };

  const handlePinInspiration = async (patch: InspirationPinPatch) => {
    setSavingAction(true);
    setStatusMessage(null);
    try {
      const currentPins = settings?.dailyPins || {};
      await post(`/${PLUGIN_ID}/scripture/pins`, {
        ...currentPins,
        ...patch,
      });
      setStatusMessage(
        t('page.ui.daily_pin_updated_status', 'Daily Inspiration pin updated.')
      );
      await loadOverview();
    } finally {
      setSavingAction(false);
    }
  };

  return (
    <Main>
      <Box padding={8}>
        <CockpitHeaderBar
          settings={settings}
          timetable={timetable}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          loading={loading}
          onRefresh={() => void loadOverview()}
          t={t}
        />

        {statusMessage && (
          <Box marginBottom={4} padding={4} background="success100" hasRadius>
            <Typography textColor="success700" fontWeight="bold">
              {statusMessage}
            </Typography>
          </Box>
        )}

        {activeTab === 'salah' && timetable && (
          <SalahCockpitTab
            timetable={timetable}
            settings={settings}
            t={t}
          />
        )}

        {activeTab === 'hilal' && (
          <HilalCockpitTab
            hilalOccasion={hilalOccasion}
            setHilalOccasion={setHilalOccasion}
            hilalGregorianDate={hilalGregorianDate}
            setHilalGregorianDate={setHilalGregorianDate}
            hilalShifting={hilalShifting}
            setHilalShifting={setHilalShifting}
            hilalImamName={hilalImamName}
            setHilalImamName={setHilalImamName}
            hilalActivateBanner={hilalActivateBanner}
            setHilalActivateBanner={setHilalActivateBanner}
            savingAction={savingAction}
            onConfirmHilal={() => void handleConfirmHilal()}
            observances={observances}
            t={t}
          />
        )}

        {activeTab === 'scripture' && (
          <ScriptureCockpitTab
            dailyInspiration={dailyInspiration}
            ayat={ayat}
            hadiths={hadiths}
            duas={duas}
            onPinInspiration={(patch) => void handlePinInspiration(patch)}
            t={t}
          />
        )}

        {activeTab === 'fiqh' && (
          <FiqhCockpitTab
            nisabCop={nisabCop}
            nisabUsd={nisabUsd}
            settings={settings}
            timetable={timetable}
            t={t}
          />
        )}
      </Box>
    </Main>
  );
};

export default IslamPage;
