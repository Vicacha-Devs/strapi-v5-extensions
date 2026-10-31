import React from 'react';
import { Box, Flex, Typography } from '@strapi/design-system';
import type {
  DailyPrayerTimetable,
  IslamPluginSettings,
  NisabThresholdResult,
} from '../../../shared';
import {
  ScriptureCockpitTab,
  type InspirationPinPatch,
} from './ScriptureTab';
import type { TranslateFn } from './SettingsTabs';

export { ScriptureCockpitTab, type InspirationPinPatch };

const NisabCurrencyCard: React.FC<{
  title: string;
  nisab: NisabThresholdResult;
  currencyCode: 'COP' | 'USD';
  t: TranslateFn;
}> = ({ title, nisab, currencyCode, t }) => {
  const prefix = currencyCode === 'USD' ? '$' : '';
  const g24 = nisab.gold.caratPricesPerGram['24K']?.toLocaleString() || '0';
  const g22 = nisab.gold.caratPricesPerGram['22K']?.toLocaleString() || '0';
  const g18 = nisab.gold.caratPricesPerGram['18K']?.toLocaleString() || '0';

  return (
    <Flex
      direction="column"
      alignItems="flex-start"
      gap={1}
      padding={4}
      background="neutral100"
      hasRadius
      style={{ flex: 1, minWidth: 280 }}
    >
      <Typography fontWeight="bold">{title}</Typography>
      <Typography>
        {t(
          'page.ui.gold_nisab_line',
          'Gold Nisab ({grams}g): {prefix}{amount} {currency}',
          {
            grams: nisab.gold.weightGrams,
            prefix,
            amount: nisab.gold.nisabAmount.toLocaleString(),
            currency: currencyCode,
          }
        )}
      </Typography>
      <Typography>
        {t(
          'page.ui.silver_nisab_line',
          'Silver Nisab ({grams}g): {prefix}{amount} {currency}',
          {
            grams: nisab.silver.weightGrams,
            prefix,
            amount: nisab.silver.nisabAmount.toLocaleString(),
            currency: currencyCode,
          }
        )}
      </Typography>
      <Typography variant="pi" textColor="neutral600">
        {t(
          'page.ui.carat_purity_line',
          '24K: {prefix}{g24} {currency}/g • 22K: {prefix}{g22} {currency}/g • 18K: {prefix}{g18} {currency}/g',
          { prefix, g24, g22, g18, currency: currencyCode }
        )}
      </Typography>
    </Flex>
  );
};

function resolveFiqhRatesDisplay(settings: IslamPluginSettings | null) {
  const rates = settings?.fiqhRates;
  return {
    fitrCop: rates?.zakatAlFitrPerPersonByCurrency.COP.toLocaleString() || '0',
    fitrUsd: rates?.zakatAlFitrPerPersonByCurrency.USD ?? 0,
    foodKg: rates?.stapleFoodWeightKg ?? 2.5,
    fidyahCop: rates?.fidyahPerDayByCurrency.COP.toLocaleString() || '0',
    fidyahUsd: rates?.fidyahPerDayByCurrency.USD ?? 0,
  };
}

function resolveQiblaDisplay(timetable: DailyPrayerTimetable | null) {
  const qibla = timetable?.qibla;
  return {
    qiblaDeg: qibla?.direction.degrees ?? 65.24,
    qiblaCard: qibla?.direction.cardinal ?? 'ENE',
    qiblaKm: qibla?.distance.kilometers.toLocaleString() || '12,240',
    qiblaMi: qibla?.distance.miles.toLocaleString() || '7,605',
  };
}

export const FiqhCockpitTab: React.FC<{
  nisabCop: NisabThresholdResult | null;
  nisabUsd: NisabThresholdResult | null;
  settings: IslamPluginSettings | null;
  timetable: DailyPrayerTimetable | null;
  t: TranslateFn;
}> = ({ nisabCop, nisabUsd, settings, timetable, t }) => {
  const ratesDisplay = resolveFiqhRatesDisplay(settings);
  const qiblaDisplay = resolveQiblaDisplay(timetable);

  return (
    <Box>
      <Box
        marginBottom={6}
        background="neutral0"
        padding={5}
        hasRadius
        shadow="filterShadow"
      >
        <Box marginBottom={4} style={{ marginBottom: 16 }}>
          <Typography variant="delta" tag="h2">
            {t(
              'page.ui.zakat_al_mal_nisab_thresholds_gold_carat_purity_',
              'Zakat al-Mal Nisab Thresholds & Gold Carat Purity Rates'
            )}
          </Typography>
        </Box>
        <Flex gap={6} wrap="wrap" alignItems="stretch">
          {nisabCop && (
            <NisabCurrencyCard
              title={t(
                'page.ui.cop_standard_title',
                'Colombian Peso (COP) — {standard} Standard',
                { standard: nisabCop.standard.toUpperCase() }
              )}
              nisab={nisabCop}
              currencyCode="COP"
              t={t}
            />
          )}
          {nisabUsd && (
            <NisabCurrencyCard
              title={t(
                'page.ui.usd_standard_title',
                'US Dollar (USD) — {standard} Standard',
                { standard: nisabUsd.standard.toUpperCase() }
              )}
              nisab={nisabUsd}
              currencyCode="USD"
              t={t}
            />
          )}
        </Flex>
      </Box>

      <Box background="neutral0" padding={5} hasRadius shadow="filterShadow">
        <Box marginBottom={4} style={{ marginBottom: 16 }}>
          <Typography variant="delta" tag="h2">
            {t(
              'page.ui.zakat_al_fitr_fitrana_fidyah_kaffarah_qibla_geod',
              'Zakat al-Fitr (Fitrana), Fidyah, Kaffarah & Qibla Geodesic Summary'
            )}
          </Typography>
        </Box>
        <Flex gap={4} wrap="wrap" alignItems="stretch">
          <Flex
            direction="column"
            alignItems="flex-start"
            gap={1}
            padding={4}
            background="neutral100"
            hasRadius
            style={{ flex: 1, minWidth: 220 }}
          >
            <Typography fontWeight="bold">
              {t('page.ui.zakat_al_fitr_per_person', 'Zakat al-Fitr (Per Person)')}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              {t(
                'page.ui.fitrana_summary_line',
                '{cop} COP / ${usd} USD (≈ {kg} kg staple food)',
                {
                  cop: ratesDisplay.fitrCop,
                  usd: ratesDisplay.fitrUsd,
                  kg: ratesDisplay.foodKg,
                }
              )}
            </Typography>
          </Flex>
          <Flex
            direction="column"
            alignItems="flex-start"
            gap={1}
            padding={4}
            background="neutral100"
            hasRadius
            style={{ flex: 1, minWidth: 220 }}
          >
            <Typography fontWeight="bold">
              {t(
                'page.ui.fidyah_per_missed_fast_day',
                'Fidyah (Per Missed Fast Day)'
              )}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              {t('page.ui.fidyah_summary_line', '{cop} COP / ${usd} USD', {
                cop: ratesDisplay.fidyahCop,
                usd: ratesDisplay.fidyahUsd,
              })}
            </Typography>
          </Flex>
          <Flex
            direction="column"
            alignItems="flex-start"
            gap={1}
            padding={4}
            background="neutral100"
            hasRadius
            style={{ flex: 1, minWidth: 220 }}
          >
            <Typography fontWeight="bold">
              {t(
                'page.ui.qibla_bearing_distance_to_makkah',
                'Qibla Bearing & Distance to Makkah'
              )}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              {t(
                'page.ui.qibla_summary_line',
                '{degrees}° clockwise from True North ({cardinal}) • {km} km ({mi} mi)',
                {
                  degrees: qiblaDisplay.qiblaDeg,
                  cardinal: qiblaDisplay.qiblaCard,
                  km: qiblaDisplay.qiblaKm,
                  mi: qiblaDisplay.qiblaMi,
                }
              )}
            </Typography>
          </Flex>
        </Flex>
      </Box>
    </Box>
  );
};
