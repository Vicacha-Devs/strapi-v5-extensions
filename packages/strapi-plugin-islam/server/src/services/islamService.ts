import type { Core } from "@strapi/strapi";

import {
  PLUGIN_ID,
  calculateFitranaFidyahKaffarah,
  calculateHawlMaturity,
  calculateNisabThresholds,
  calculateQiblaCompass,
  calculateZakatAlMal,
  computeDailyPrayerTimetable,
  computeMonthlyPrayerTimetable,
  computeUpcomingObservances,
  generatePrayerCalendarIcs,
  gregorianToHijri,
  hijriToGregorian,
  sanitizeCoordinates,
  sanitizeCurrency,
  sanitizeHijriMonth,
  sanitizeHijriYear,
  sanitizeIsoDateYmd,
  sanitizeIsoYearMonth,
  sanitizeLocale,
  sanitizeNisabStandard,
  sanitizePlainText,
  type DailyPrayerTimetable,
  type FitranaFidyahKaffarahInput,
  type IslamPluginSettings,
  type NisabThresholdResult,
  type SupportedCurrency,
  type SupportedLocale,
  type ZakatAlMalCalculationInput,
} from "../../../shared";
import {
  confirmHilalSightingOperation,
  getScriptureHubOperation,
  type ConfirmHilalSightingInput,
} from "./hilalAndScriptureHelpers";
import {
  fetchQuranAyahHadithsOperation,
  fetchQuranChapterAudioOperation,
  fetchQuranChapterInfoOperation,
  fetchQuranChapterVersesOperation,
  fetchQuranChaptersOperation,
  fetchQuranResourcesOperation,
  fetchQuranVerseByKeyOperation,
  type ChapterVersesQueryParams,
  type VerseByKeyQueryParams,
} from "./quranFoundationOperations";
import {
  clearQuranFoundationCaches,
  getUpstreamCacheSize,
  resolveExternalNisabSpotPrices,
  resolveExternalPrayerTimesOverride,
  resolveQuranFoundationCredentials,
} from "./upstreamCacheAndHttp";

export { clearQuranFoundationCaches, getUpstreamCacheSize };

export interface LocationQueryParams {
  lat?: number | string;
  lon?: number | string;
  city?: string;
  country?: string;
}

function resolveLocationWithDefaults(
  settings: IslamPluginSettings,
  params?: LocationQueryParams
) {
  const { lat, lon } = sanitizeCoordinates(
    params?.lat ?? settings.defaultLat,
    params?.lon ?? settings.defaultLon,
    settings.defaultLat,
    settings.defaultLon
  );
  const city =
    sanitizePlainText(params?.city || settings.city, 80) || settings.city;
  const country =
    sanitizePlainText(params?.country || settings.country, 80) ||
    settings.country;
  return { lat, lon, city, country };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsService = () =>
    strapi.plugin(PLUGIN_ID).service("settings") as {
      getSettings(): Promise<IslamPluginSettings>;
      updateSettings(
        patch: Partial<IslamPluginSettings>
      ): Promise<IslamPluginSettings>;
    };
  const getSettings = () => getSettingsService().getSettings();

  return {
    async getDailyPrayerTimes(
      params?: LocationQueryParams & { date?: string; locale?: string }
    ): Promise<DailyPrayerTimetable> {
      const settings = await getSettings();
      const date = sanitizeIsoDateYmd(params?.date);
      const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
      const { lat, lon, city, country } = resolveLocationWithDefaults(
        settings,
        params
      );
      const externalTimesOverride = await resolveExternalPrayerTimesOverride(
        settings,
        date,
        lat,
        lon
      );

      return computeDailyPrayerTimetable(date, settings, {
        lat,
        lon,
        city,
        country,
        locale,
        externalTimesOverride,
      });
    },

    async getMonthlyPrayerTimes(
      params?: LocationQueryParams & {
        yearMonth?: string;
        date?: string;
        locale?: string;
      }
    ) {
      const settings = await getSettings();
      const yearMonth = sanitizeIsoYearMonth(params?.yearMonth || params?.date);
      const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
      const { lat, lon, city, country } = resolveLocationWithDefaults(
        settings,
        params
      );

      const days = computeMonthlyPrayerTimetable(yearMonth, settings, {
        lat,
        lon,
        city,
        country,
        locale,
      });

      return {
        yearMonth,
        location: {
          city,
          country,
          lat,
          lon,
          timezone: settings.timezone,
        },
        qibla: calculateQiblaCompass(lat, lon, city, country),
        days,
      };
    },

    async getPrayerCalendarIcs(params?: {
      yearMonth?: string;
      lat?: number | string;
      lon?: number | string;
      locale?: string;
    }): Promise<string> {
      const settings = await getSettings();
      const monthly = await this.getMonthlyPrayerTimes(params);
      return generatePrayerCalendarIcs(monthly.days, settings.mosqueName);
    },

    async getQiblaCompass(params?: LocationQueryParams) {
      const settings = await getSettings();
      const { lat, lon, city, country } = resolveLocationWithDefaults(
        settings,
        params
      );
      return calculateQiblaCompass(lat, lon, city, country);
    },

    async getHijriAndObservances(params?: { date?: string; locale?: string }) {
      const settings = await getSettings();
      const date = sanitizeIsoDateYmd(params?.date);
      const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
      const shiftingNum = Number(settings.shifting || 0);

      const hijri = gregorianToHijri(
        date,
        shiftingNum,
        locale,
        settings.calender
      );
      const upcomingObservances = computeUpcomingObservances(
        date,
        shiftingNum,
        locale,
        {
          ramadanStartGregorian: settings.ramadan.confirmedStartGregorian,
          eidAlFitrDateGregorian: settings.eid.eidAlFitrDateGregorian,
          eidAlAdhaDateGregorian: settings.eid.eidAlAdhaDateGregorian,
        },
        settings.calender
      );

      let recentHilalAnnouncements: Array<Record<string, unknown>>;
      try {
        recentHilalAnnouncements = await strapi
          .documents(`plugin::${PLUGIN_ID}.hilal-announcement`)
          .findMany({ limit: 10, sort: "createdAt:desc" });
      } catch {
        recentHilalAnnouncements = [];
      }

      return {
        dateGregorian: date,
        hijri,
        shifting: settings.shifting,
        ramadan: settings.ramadan,
        eid: settings.eid,
        upcomingObservances,
        recentHilalAnnouncements,
      };
    },

    async convertDate(params: {
      direction?: "gregorian_to_hijri" | "hijri_to_gregorian";
      date?: string;
      hijriYear?: number | string;
      hijriMonth?: number | string;
      hijriDay?: number | string;
      locale?: string;
    }) {
      const settings = await getSettings();
      const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
      const shiftingNum = Number(settings.shifting || 0);

      if (params?.direction === "hijri_to_gregorian") {
        const y = sanitizeHijriYear(params.hijriYear, 1448);
        const m = sanitizeHijriMonth(params.hijriMonth, 1);
        const d = Math.max(
          1,
          Math.min(30, Math.trunc(Number(params.hijriDay)) || 1)
        );
        const gregorian = hijriToGregorian(
          y,
          m,
          d,
          shiftingNum,
          settings.calender
        );
        const hijri = gregorianToHijri(
          gregorian,
          shiftingNum,
          locale,
          settings.calender
        );
        return {
          direction: "hijri_to_gregorian",
          gregorianDate: gregorian,
          hijri,
        };
      }

      const gregorian = sanitizeIsoDateYmd(params?.date);
      const hijri = gregorianToHijri(
        gregorian,
        shiftingNum,
        locale,
        settings.calender
      );
      const hawl = calculateHawlMaturity(
        gregorian,
        shiftingNum,
        settings.calender
      );
      return {
        direction: "gregorian_to_hijri",
        gregorianDate: gregorian,
        hijri,
        hawlIfNisabReachedOnDate: hawl,
      };
    },

    async confirmHilalSighting(input: ConfirmHilalSightingInput) {
      return confirmHilalSightingOperation(strapi, getSettingsService(), input);
    },

    async getScriptureHub(params?: {
      date?: string;
      locale?: string;
      category?: string;
      topic?: string;
      surahNumber?: number | string;
    }) {
      return getScriptureHubOperation(strapi, await getSettings(), params);
    },

    async getQuranChapters(params?: { locale?: string }) {
      return fetchQuranChaptersOperation(await getSettings(), params);
    },

    async getQuranChapterInfo(params: {
      chapterNumber: number | string;
      locale?: string;
    }) {
      return fetchQuranChapterInfoOperation(await getSettings(), params);
    },

    async getQuranChapterVerses(params: ChapterVersesQueryParams) {
      return fetchQuranChapterVersesOperation(await getSettings(), params);
    },

    async getQuranVerseByKey(params: VerseByKeyQueryParams) {
      return fetchQuranVerseByKeyOperation(await getSettings(), params);
    },

    async getQuranAyahHadiths(params: {
      verseKey: string;
      locale?: string;
      page?: number | string;
      limit?: number | string;
    }) {
      return fetchQuranAyahHadithsOperation(await getSettings(), params);
    },

    async getQuranChapterAudio(params: {
      chapterNumber: number | string;
      reciterId?: number | string;
      segments?: boolean | string;
    }) {
      return fetchQuranChapterAudioOperation(await getSettings(), params);
    },

    async getQuranResources(params?: { locale?: string }) {
      return fetchQuranResourcesOperation(await getSettings(), params);
    },

    async getNisabThresholds(params?: {
      currency?: string;
      standard?: string;
      unit?: string;
    }): Promise<NisabThresholdResult> {
      const settings = await getSettings();
      const currency = sanitizeCurrency(
        params?.currency,
        settings.fiqhRates.defaultCurrency
      );
      const standard = sanitizeNisabStandard(
        params?.standard,
        settings.fiqhRates.defaultStandard
      );
      const unit: "g" | "oz" = params?.unit === "oz" ? "oz" : "g";

      const externalSpot = await resolveExternalNisabSpotPrices(
        settings,
        currency,
        standard
      );

      return calculateNisabThresholds(settings.fiqhRates, {
        currency,
        standard,
        unit,
        goldSpotOverridePerGram: externalSpot?.goldUnit,
        silverSpotOverridePerGram: externalSpot?.silverUnit,
        source: externalSpot ? "external_api" : "configured_or_live",
      });
    },

    async getAllCurrencyNisabEntries(params?: {
      standard?: string;
      unit?: string;
    }): Promise<NisabThresholdResult[]> {
      const currencies: SupportedCurrency[] = ["COP", "USD", "EUR", "TRY"];
      return Promise.all(
        currencies.map((currency) =>
          this.getNisabThresholds({
            currency,
            standard: params?.standard,
            unit: params?.unit,
          })
        )
      );
    },

    async calculateZakat(input: ZakatAlMalCalculationInput) {
      return calculateZakatAlMal(input, (await getSettings()).fiqhRates);
    },

    async calculateFitranaFidyah(input: FitranaFidyahKaffarahInput) {
      return calculateFitranaFidyahKaffarah(
        input,
        (await getSettings()).fiqhRates
      );
    },

    async getAdminOverview(localeParam?: string) {
      const settings = await getSettings();
      const locale: SupportedLocale = sanitizeLocale(
        localeParam,
        settings.defaultLocale
      );
      const standard = settings.fiqhRates.defaultStandard;
      const [todayTimetable, observances, scripture, COP, USD] =
        await Promise.all([
          this.getDailyPrayerTimes({ locale }),
          this.getHijriAndObservances({ locale }),
          this.getScriptureHub({ locale }),
          this.getNisabThresholds({ currency: "COP", standard }),
          this.getNisabThresholds({ currency: "USD", standard }),
        ]);

      const qf = settings.quranFoundation;
      const qfCreds = resolveQuranFoundationCredentials(qf);
      const { ayat, hadiths, duas, asmaUlHusna, surahCount, dailyInspiration } =
        scripture;

      return {
        settings,
        todayTimetable,
        observances,
        dailyInspiration,
        quranFoundationStatus: {
          enabled: qf.enabled,
          environment: qfCreds.environment,
          oauth2Configured: Boolean(qfCreds.clientId && qfCreds.clientSecret),
          apiBaseUrl: qfCreds.apiBaseUrl,
          publicFallbackBaseUrl: qf.publicFallbackBaseUrl,
          defaultReciterId: qf.defaultReciterId,
          disableBrowserAutoTranslate: qf.disableBrowserAutoTranslate,
        },
        corpusCounts: {
          surahs: surahCount,
          ayat: ayat.length,
          hadiths: hadiths.length,
          duas: duas.length,
          asmaUlHusna: asmaUlHusna.length,
        },
        ayat,
        hadiths,
        duas,
        nisab: { COP, USD },
      };
    },
  };
};
