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
  sanitizeIsoDateYmd,
  sanitizeIsoYearMonth,
  sanitizeLocale,
  sanitizeNisabStandard,
  sanitizePlainText,
  type DailyPrayerTimetable,
  type FitranaFidyahKaffarahInput,
  type IslamPluginSettings,
  type NisabStandardId,
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
  getCached,
  resolveQuranFoundationCredentials,
  setCached,
  tryFetchUpstreamJson,
} from "./upstreamCacheAndHttp";

export { clearQuranFoundationCaches };

function resolveLocationWithDefaults(
  settings: IslamPluginSettings,
  params?: {
    lat?: number | string;
    lon?: number | string;
    city?: string;
    country?: string;
  }
) {
  const { lat, lon } = sanitizeCoordinates(
    params?.lat ?? settings.defaultLat,
    params?.lon ?? settings.defaultLon,
    settings.defaultLat,
    settings.defaultLon
  );
  const city = sanitizePlainText(params?.city || settings.city, 80) || settings.city;
  const country = sanitizePlainText(params?.country || settings.country, 80) || settings.country;
  return { lat, lon, city, country };
}

function extractUpstreamPrayerTimes(
  upstream: Record<string, unknown> | null
): Record<string, string> | undefined {
  const dataObj = upstream?.data;
  if (!dataObj || typeof dataObj !== "object") return undefined;
  const times = (dataObj as Record<string, unknown>).times;
  if (!times || typeof times !== "object") return undefined;
  return times as Record<string, string>;
}

async function resolveExternalPrayerTimesOverride(
  settings: IslamPluginSettings,
  date: string,
  lat: number,
  lon: number
): Promise<Partial<Record<string, string>> | undefined> {
  if (!settings.externalApiEnabled || !process.env.ISLAMIC_API_KEY) {
    return undefined;
  }
  const cacheKey = `prayer:${date}:${lat}:${lon}:${settings.method}:${settings.school}:${settings.shifting}`;
  const cached = getCached<Record<string, string>>(cacheKey);
  if (cached) return cached;

  const upstream = await tryFetchUpstreamJson(settings.externalApiBaseUrl, "prayer-time/", {
    lat,
    lon,
    method: settings.method,
    school: settings.school,
    calender: settings.calender,
    shifting: settings.shifting,
    date,
  });

  const times = extractUpstreamPrayerTimes(upstream);
  if (times) {
    setCached(cacheKey, times, settings.cacheTtlSeconds || 3600);
  }
  return times;
}

function extractUpstreamNisabSpotPrices(
  upstream: Record<string, unknown> | null
): { goldUnit: number; silverUnit: number } | null {
  const dataObj = upstream?.data as Record<string, unknown> | undefined;
  const thresholds = dataObj?.nisab_thresholds as Record<string, unknown> | undefined;
  const goldObj = thresholds?.gold as Record<string, unknown> | undefined;
  const silverObj = thresholds?.silver as Record<string, unknown> | undefined;
  const gPrice = Number(goldObj?.unit_price);
  const sPrice = Number(silverObj?.unit_price);
  if (Number.isFinite(gPrice) && gPrice > 0 && Number.isFinite(sPrice) && sPrice > 0) {
    return { goldUnit: gPrice, silverUnit: sPrice };
  }
  return null;
}

async function resolveExternalNisabSpotPrices(
  settings: IslamPluginSettings,
  currency: SupportedCurrency,
  standard: NisabStandardId
): Promise<{ goldUnit: number; silverUnit: number } | null> {
  if (!settings.externalApiEnabled || !process.env.ISLAMIC_API_KEY) {
    return null;
  }
  const cacheKey = `nisab:${currency}:${standard}`;
  const cached = getCached<{ goldUnit: number; silverUnit: number }>(cacheKey);
  if (cached) return cached;

  const upstream = await tryFetchUpstreamJson(settings.externalApiBaseUrl, "zakat-nisab/", {
    standard,
    currency: currency.toLowerCase(),
    unit: "g",
  });

  const prices = extractUpstreamNisabSpotPrices(upstream);
  if (prices) {
    setCached(cacheKey, prices, settings.cacheTtlSeconds || 3600);
  }
  return prices;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsService = () =>
    strapi.plugin(PLUGIN_ID).service("settings") as {
      getSettings(): Promise<IslamPluginSettings>;
      updateSettings(patch: Partial<IslamPluginSettings>): Promise<IslamPluginSettings>;
    };

  return {
    async getDailyPrayerTimes(params?: {
      date?: string;
      lat?: number | string;
      lon?: number | string;
      city?: string;
      country?: string;
      locale?: string;
    }): Promise<DailyPrayerTimetable> {
      const settings = await getSettingsService().getSettings();
      const date = sanitizeIsoDateYmd(params?.date);
      const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
      const { lat, lon, city, country } = resolveLocationWithDefaults(settings, params);
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

    async getMonthlyPrayerTimes(params?: {
      yearMonth?: string;
      date?: string;
      lat?: number | string;
      lon?: number | string;
      city?: string;
      country?: string;
      locale?: string;
    }): Promise<{
      yearMonth: string;
      location: { city: string; country: string; lat: number; lon: number; timezone: string };
      qibla: ReturnType<typeof calculateQiblaCompass>;
      days: DailyPrayerTimetable[];
    }> {
      const settings = await getSettingsService().getSettings();
      const yearMonth = sanitizeIsoYearMonth(params?.yearMonth || params?.date);
      const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
      const { lat, lon, city, country } = resolveLocationWithDefaults(settings, params);

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
      const settings = await getSettingsService().getSettings();
      const monthly = await this.getMonthlyPrayerTimes(params);
      return generatePrayerCalendarIcs(monthly.days, settings.mosqueName);
    },

    async getQiblaCompass(params?: {
      lat?: number | string;
      lon?: number | string;
      city?: string;
      country?: string;
    }) {
      const settings = await getSettingsService().getSettings();
      const { lat, lon, city, country } = resolveLocationWithDefaults(settings, params);
      return calculateQiblaCompass(lat, lon, city, country);
    },

    async getHijriAndObservances(params?: { date?: string; locale?: string }) {
      const settings = await getSettingsService().getSettings();
      const date = sanitizeIsoDateYmd(params?.date);
      const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
      const shiftingNum = Number(settings.shifting || 0);

      const hijri = gregorianToHijri(date, shiftingNum, locale);
      const upcomingObservances = computeUpcomingObservances(date, shiftingNum, locale, {
        ramadanStartGregorian: settings.ramadan.confirmedStartGregorian,
        eidAlFitrDateGregorian: settings.eid.eidAlFitrDateGregorian,
        eidAlAdhaDateGregorian: settings.eid.eidAlAdhaDateGregorian,
      });

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
      const settings = await getSettingsService().getSettings();
      const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
      const shiftingNum = Number(settings.shifting || 0);

      if (params?.direction === "hijri_to_gregorian") {
        const y = Math.max(1300, Math.min(1600, Number(params.hijriYear) || 1448));
        const m = Math.max(1, Math.min(12, Number(params.hijriMonth) || 1));
        const d = Math.max(1, Math.min(30, Number(params.hijriDay) || 1));
        const gregorian = hijriToGregorian(y, m, d, shiftingNum);
        const hijri = gregorianToHijri(gregorian, shiftingNum, locale);
        return {
          direction: "hijri_to_gregorian",
          gregorianDate: gregorian,
          hijri,
        };
      }

      const gregorian = sanitizeIsoDateYmd(params?.date);
      const hijri = gregorianToHijri(gregorian, shiftingNum, locale);
      const hawl = calculateHawlMaturity(gregorian, shiftingNum);
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
      const settings = await getSettingsService().getSettings();
      return getScriptureHubOperation(strapi, settings, params);
    },

    async getQuranChapters(params?: { locale?: string }) {
      const settings = await getSettingsService().getSettings();
      return fetchQuranChaptersOperation(settings, params);
    },

    async getQuranChapterInfo(params: { chapterNumber: number | string; locale?: string }) {
      const settings = await getSettingsService().getSettings();
      return fetchQuranChapterInfoOperation(settings, params);
    },

    async getQuranChapterVerses(params: ChapterVersesQueryParams) {
      const settings = await getSettingsService().getSettings();
      return fetchQuranChapterVersesOperation(settings, params);
    },

    async getQuranVerseByKey(params: VerseByKeyQueryParams) {
      const settings = await getSettingsService().getSettings();
      return fetchQuranVerseByKeyOperation(settings, params);
    },

    async getQuranAyahHadiths(params: {
      verseKey: string;
      locale?: string;
      page?: number | string;
      limit?: number | string;
    }) {
      const settings = await getSettingsService().getSettings();
      return fetchQuranAyahHadithsOperation(settings, params);
    },

    async getQuranChapterAudio(params: {
      chapterNumber: number | string;
      reciterId?: number | string;
      segments?: boolean | string;
    }) {
      const settings = await getSettingsService().getSettings();
      return fetchQuranChapterAudioOperation(settings, params);
    },

    async getQuranResources(params?: { locale?: string }) {
      const settings = await getSettingsService().getSettings();
      return fetchQuranResourcesOperation(settings, params);
    },

    async getNisabThresholds(params?: {
      currency?: string;
      standard?: string;
      unit?: string;
    }): Promise<NisabThresholdResult> {
      const settings = await getSettingsService().getSettings();
      const currency = sanitizeCurrency(params?.currency, settings.fiqhRates.defaultCurrency);
      const standard = sanitizeNisabStandard(params?.standard, settings.fiqhRates.defaultStandard);
      const unit: "g" | "oz" = params?.unit === "oz" ? "oz" : "g";

      const externalSpot = await resolveExternalNisabSpotPrices(settings, currency, standard);

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
      const settings = await getSettingsService().getSettings();
      return calculateZakatAlMal(input, settings.fiqhRates);
    },

    async calculateFitranaFidyah(input: FitranaFidyahKaffarahInput) {
      const settings = await getSettingsService().getSettings();
      return calculateFitranaFidyahKaffarah(input, settings.fiqhRates);
    },

    async getAdminOverview(localeParam?: string) {
      const settings = await getSettingsService().getSettings();
      const locale: SupportedLocale = sanitizeLocale(localeParam, settings.defaultLocale);
      const todayTimetable = await this.getDailyPrayerTimes({ locale });
      const observances = await this.getHijriAndObservances({ locale });
      const scripture = await this.getScriptureHub({ locale });
      const nisabCop = await this.getNisabThresholds({
        currency: "COP",
        standard: settings.fiqhRates.defaultStandard,
      });
      const nisabUsd = await this.getNisabThresholds({
        currency: "USD",
        standard: settings.fiqhRates.defaultStandard,
      });

      const qfCreds = resolveQuranFoundationCredentials(settings.quranFoundation);

      return {
        settings,
        todayTimetable,
        observances,
        dailyInspiration: scripture.dailyInspiration,
        quranFoundationStatus: {
          enabled: settings.quranFoundation.enabled,
          environment: qfCreds.environment,
          oauth2Configured: Boolean(qfCreds.clientId && qfCreds.clientSecret),
          apiBaseUrl: qfCreds.apiBaseUrl,
          publicFallbackBaseUrl: settings.quranFoundation.publicFallbackBaseUrl,
          defaultReciterId: settings.quranFoundation.defaultReciterId,
          disableBrowserAutoTranslate: settings.quranFoundation.disableBrowserAutoTranslate,
        },
        corpusCounts: {
          surahs: scripture.surahCount,
          ayat: scripture.ayat.length,
          hadiths: scripture.hadiths.length,
          duas: scripture.duas.length,
          asmaUlHusna: scripture.asmaUlHusna.length,
        },
        ayat: scripture.ayat,
        hadiths: scripture.hadiths,
        duas: scripture.duas,
        nisab: {
          COP: nisabCop,
          USD: nisabUsd,
        },
      };
    },
  };
};
