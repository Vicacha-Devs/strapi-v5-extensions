import type { Core } from "@strapi/strapi";

import {
  ALLOWED_CURRENCIES,
  DEFAULT_ISLAM_SETTINGS,
  PLUGIN_ID,
  isPlainRecord,
  isValidIsoDateYmd,
  sanitizeAsrSchool,
  sanitizeCalendarMethod,
  sanitizeCoordinates,
  sanitizeCurrency,
  sanitizeElevationMeters,
  sanitizeHighLatitudeRule,
  sanitizeHijriShift,
  sanitizeHijriYear,
  sanitizeImsakOffsetMinutes,
  sanitizeLocale,
  sanitizeMethodId,
  sanitizeMinuteAdjustments,
  sanitizeNisabStandard,
  sanitizePlainText,
  sanitizePositiveInt,
  sanitizeQuranScript,
  sanitizeTimezone,
  sanitizeUpstreamBaseUrl,
  stripDangerousKeysDeep,
  type EidOperationConfig,
  type FiqhRatesConfig,
  type IslamPluginSettings,
  type QuranFoundationConfig,
  type RamadanOperationConfig,
  type SupportedCurrency,
  type SupportedLocale,
} from "../../../shared";
import {
  hydrateFromHostPrayerSetting,
  sanitizeFaithPageMapping,
  sanitizePrayerSettingMapping,
  syncHijriOffsetToCalendarBridge,
  syncNisabToDonationsBridge,
  syncToHostPrayerSetting,
} from "./settingsBridgesAndMappings";
import {
  mergeLocaleResourceIdMap,
  sanitizeAdhanProfiles,
  sanitizeDailyPins,
  sanitizeEidShifts,
  sanitizeIqamahRules,
  sanitizeJumuahShifts,
  sanitizeSupportedLocales,
  sanitizeTimeText,
} from "./settingsNestedSanitizers";

function getPluginStore(strapi: Core.Strapi) {
  return strapi.store({ type: "plugin", name: PLUGIN_ID });
}

function sanitizePositiveRate(raw: unknown, fallback: number): number {
  const num = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

function mergePositiveCurrencyMap(
  defaultMap: Record<SupportedCurrency, number>,
  base: Record<SupportedCurrency, number>,
  first?: Partial<Record<SupportedCurrency, number>>,
  second?: Partial<Record<SupportedCurrency, number>>
): Record<SupportedCurrency, number> {
  const f = isPlainRecord(first) ? first : {};
  const s = isPlainRecord(second) ? second : {};
  const result = {} as Record<SupportedCurrency, number>;
  for (const currency of ALLOWED_CURRENCIES) {
    const candidate = s[currency] ?? f[currency] ?? base?.[currency];
    result[currency] = sanitizePositiveRate(candidate, defaultMap[currency]);
  }
  return result;
}

function mergeLocaleNotes(
  base: Record<SupportedLocale, string>,
  first?: Partial<Record<SupportedLocale, string>>,
  second?: Partial<Record<SupportedLocale, string>>
): Record<SupportedLocale, string> {
  const merged = {
    ...base,
    ...(isPlainRecord(first) ? first : {}),
    ...(isPlainRecord(second) ? second : {}),
  };
  return {
    es: typeof merged.es === "string" ? merged.es : base.es,
    en: typeof merged.en === "string" ? merged.en : base.en,
    ar: typeof merged.ar === "string" ? merged.ar : base.ar,
    tr: typeof merged.tr === "string" ? merged.tr : base.tr,
  };
}

function mergeFiqhRates(
  base: FiqhRatesConfig,
  first?: Partial<FiqhRatesConfig>,
  second?: Partial<FiqhRatesConfig>
): FiqhRatesConfig {
  const defaults = DEFAULT_ISLAM_SETTINGS.fiqhRates;
  const f = isPlainRecord(first) ? (first as Partial<FiqhRatesConfig>) : {};
  const s = isPlainRecord(second) ? (second as Partial<FiqhRatesConfig>) : {};
  return {
    defaultCurrency: sanitizeCurrency(
      s.defaultCurrency ?? f.defaultCurrency ?? base.defaultCurrency,
      defaults.defaultCurrency
    ),
    defaultStandard: sanitizeNisabStandard(
      s.defaultStandard ?? f.defaultStandard ?? base.defaultStandard,
      defaults.defaultStandard
    ),
    goldPricePerGramByCurrency: mergePositiveCurrencyMap(
      defaults.goldPricePerGramByCurrency,
      base.goldPricePerGramByCurrency,
      f.goldPricePerGramByCurrency,
      s.goldPricePerGramByCurrency
    ),
    silverPricePerGramByCurrency: mergePositiveCurrencyMap(
      defaults.silverPricePerGramByCurrency,
      base.silverPricePerGramByCurrency,
      f.silverPricePerGramByCurrency,
      s.silverPricePerGramByCurrency
    ),
    zakatAlFitrPerPersonByCurrency: mergePositiveCurrencyMap(
      defaults.zakatAlFitrPerPersonByCurrency,
      base.zakatAlFitrPerPersonByCurrency,
      f.zakatAlFitrPerPersonByCurrency,
      s.zakatAlFitrPerPersonByCurrency
    ),
    fidyahPerDayByCurrency: mergePositiveCurrencyMap(
      defaults.fidyahPerDayByCurrency,
      base.fidyahPerDayByCurrency,
      f.fidyahPerDayByCurrency,
      s.fidyahPerDayByCurrency
    ),
    kaffarahFastByCurrency: mergePositiveCurrencyMap(
      defaults.kaffarahFastByCurrency,
      base.kaffarahFastByCurrency,
      f.kaffarahFastByCurrency,
      s.kaffarahFastByCurrency
    ),
    kaffarahOathByCurrency: mergePositiveCurrencyMap(
      defaults.kaffarahOathByCurrency,
      base.kaffarahOathByCurrency,
      f.kaffarahOathByCurrency,
      s.kaffarahOathByCurrency
    ),
    stapleFoodWeightKg: sanitizePositiveRate(
      s.stapleFoodWeightKg ?? f.stapleFoodWeightKg ?? base.stapleFoodWeightKg,
      defaults.stapleFoodWeightKg
    ),
  };
}

function mergeQuranFoundationConfig(
  base: QuranFoundationConfig,
  first?: Partial<QuranFoundationConfig>,
  second?: Partial<QuranFoundationConfig>
): QuranFoundationConfig {
  const defaults = DEFAULT_ISLAM_SETTINGS.quranFoundation;
  const f = isPlainRecord(first)
    ? (first as Partial<QuranFoundationConfig>)
    : {};
  const s = isPlainRecord(second)
    ? (second as Partial<QuranFoundationConfig>)
    : {};
  const rawMerged = { ...base, ...f, ...s };
  return {
    enabled: Boolean(rawMerged.enabled),
    environment: rawMerged.environment === "prelive" ? "prelive" : "production",
    oauth2BaseUrlPrelive: sanitizeUpstreamBaseUrl(
      rawMerged.oauth2BaseUrlPrelive,
      defaults.oauth2BaseUrlPrelive,
      "quran"
    ),
    apiBaseUrlPrelive: sanitizeUpstreamBaseUrl(
      rawMerged.apiBaseUrlPrelive,
      defaults.apiBaseUrlPrelive,
      "quran"
    ),
    oauth2BaseUrlProduction: sanitizeUpstreamBaseUrl(
      rawMerged.oauth2BaseUrlProduction,
      defaults.oauth2BaseUrlProduction,
      "quran"
    ),
    apiBaseUrlProduction: sanitizeUpstreamBaseUrl(
      rawMerged.apiBaseUrlProduction,
      defaults.apiBaseUrlProduction,
      "quran"
    ),
    publicFallbackBaseUrl: sanitizeUpstreamBaseUrl(
      rawMerged.publicFallbackBaseUrl,
      defaults.publicFallbackBaseUrl,
      "quran"
    ),
    defaultScript: sanitizeQuranScript(
      rawMerged.defaultScript,
      defaults.defaultScript
    ),
    defaultReciterId: sanitizePositiveInt(
      rawMerged.defaultReciterId,
      defaults.defaultReciterId,
      1,
      500
    ),
    defaultChapterReciterId: sanitizePositiveInt(
      rawMerged.defaultChapterReciterId,
      defaults.defaultChapterReciterId,
      1,
      500
    ),
    defaultTranslationIdsByLocale: mergeLocaleResourceIdMap(
      defaults.defaultTranslationIdsByLocale,
      base.defaultTranslationIdsByLocale,
      f.defaultTranslationIdsByLocale,
      s.defaultTranslationIdsByLocale
    ),
    defaultTafsirIdsByLocale: mergeLocaleResourceIdMap(
      defaults.defaultTafsirIdsByLocale,
      base.defaultTafsirIdsByLocale,
      f.defaultTafsirIdsByLocale,
      s.defaultTafsirIdsByLocale
    ),
    includeTransliterationByDefault: Boolean(
      rawMerged.includeTransliterationByDefault
    ),
    includeWordByWordByDefault: Boolean(rawMerged.includeWordByWordByDefault),
    disableBrowserAutoTranslate: Boolean(rawMerged.disableBrowserAutoTranslate),
  };
}

function sanitizeOptionalIsoDate(raw: unknown): string | undefined {
  return isValidIsoDateYmd(raw) ? raw.trim() : undefined;
}

function mergeRamadanConfig(
  base: RamadanOperationConfig,
  first?: Partial<RamadanOperationConfig>,
  second?: Partial<RamadanOperationConfig>
): RamadanOperationConfig {
  const defaults = DEFAULT_ISLAM_SETTINGS.ramadan;
  const f = isPlainRecord(first)
    ? (first as Partial<RamadanOperationConfig>)
    : {};
  const s = isPlainRecord(second)
    ? (second as Partial<RamadanOperationConfig>)
    : {};
  const raw = { ...base, ...f, ...s };
  return {
    bannerActive: Boolean(raw.bannerActive),
    hijriYear: sanitizeHijriYear(raw.hijriYear, defaults.hijriYear),
    confirmedStartGregorian: sanitizeOptionalIsoDate(
      raw.confirmedStartGregorian
    ),
    imsakOffsetMinutes: sanitizeImsakOffsetMinutes(
      raw.imsakOffsetMinutes,
      defaults.imsakOffsetMinutes
    ),
    taraweehTime: sanitizeTimeText(raw.taraweehTime, defaults.taraweehTime),
    taraweehRakaat: sanitizePositiveInt(
      raw.taraweehRakaat,
      defaults.taraweehRakaat,
      2,
      40
    ),
    qiyamLastTenTime: sanitizeTimeText(
      raw.qiyamLastTenTime,
      defaults.qiyamLastTenTime
    ),
    communityIftarEnabled: Boolean(raw.communityIftarEnabled),
    notes: mergeLocaleNotes(base.notes, f.notes, s.notes),
  };
}

function mergeEidConfig(
  base: EidOperationConfig,
  first?: Partial<EidOperationConfig>,
  second?: Partial<EidOperationConfig>
): EidOperationConfig {
  const defaults = DEFAULT_ISLAM_SETTINGS.eid;
  const f = isPlainRecord(first) ? (first as Partial<EidOperationConfig>) : {};
  const s = isPlainRecord(second)
    ? (second as Partial<EidOperationConfig>)
    : {};
  const raw = { ...base, ...f, ...s };
  return {
    eidAlFitrActive: Boolean(raw.eidAlFitrActive),
    eidAlFitrDateGregorian: sanitizeOptionalIsoDate(raw.eidAlFitrDateGregorian),
    eidAlFitrShifts: sanitizeEidShifts(
      s.eidAlFitrShifts,
      sanitizeEidShifts(f.eidAlFitrShifts, base.eidAlFitrShifts)
    ),
    eidAlAdhaActive: Boolean(raw.eidAlAdhaActive),
    eidAlAdhaDateGregorian: sanitizeOptionalIsoDate(raw.eidAlAdhaDateGregorian),
    eidAlAdhaShifts: sanitizeEidShifts(
      s.eidAlAdhaShifts,
      sanitizeEidShifts(f.eidAlAdhaShifts, base.eidAlAdhaShifts)
    ),
    qurbaniEnabled: Boolean(raw.qurbaniEnabled),
    qurbaniSharePriceByCurrency: mergePositiveCurrencyMap(
      defaults.qurbaniSharePriceByCurrency,
      base.qurbaniSharePriceByCurrency,
      f.qurbaniSharePriceByCurrency,
      s.qurbaniSharePriceByCurrency
    ),
    notes: mergeLocaleNotes(base.notes, f.notes, s.notes),
  };
}

function mergeSettingsLayers(
  base: IslamPluginSettings,
  first: Partial<IslamPluginSettings>,
  second?: Partial<IslamPluginSettings>
): IslamPluginSettings {
  const defaults = DEFAULT_ISLAM_SETTINGS;
  const raw = { ...base, ...first, ...second };
  const coords = sanitizeCoordinates(
    raw.defaultLat,
    raw.defaultLon,
    base.defaultLat,
    base.defaultLon
  );
  const mergedAdj = {
    ...base.minuteAdjustments,
    ...(isPlainRecord(first.minuteAdjustments) ? first.minuteAdjustments : {}),
    ...(isPlainRecord(second?.minuteAdjustments)
      ? second.minuteAdjustments
      : {}),
  };

  return {
    mosqueName:
      sanitizePlainText(raw.mosqueName, 200) ||
      base.mosqueName ||
      defaults.mosqueName,
    city: sanitizePlainText(raw.city, 100) || base.city || defaults.city,
    country:
      sanitizePlainText(raw.country, 100) || base.country || defaults.country,
    timezone: sanitizeTimezone(raw.timezone, base.timezone || "UTC"),
    defaultLocale: sanitizeLocale(raw.defaultLocale, base.defaultLocale),
    supportedLocales: sanitizeSupportedLocales(
      second?.supportedLocales,
      sanitizeSupportedLocales(first.supportedLocales, base.supportedLocales)
    ),
    defaultLat: coords.lat,
    defaultLon: coords.lon,
    elevationMeters: sanitizeElevationMeters(
      raw.elevationMeters,
      base.elevationMeters
    ),
    method: sanitizeMethodId(raw.method, base.method),
    school: sanitizeAsrSchool(raw.school, base.school),
    calender: sanitizeCalendarMethod(raw.calender, base.calender),
    shifting: sanitizeHijriShift(raw.shifting, base.shifting),
    highLatitudeRule: sanitizeHighLatitudeRule(
      raw.highLatitudeRule,
      base.highLatitudeRule
    ),
    minuteAdjustments: sanitizeMinuteAdjustments(
      mergedAdj,
      base.minuteAdjustments
    ),
    iqamahRules: sanitizeIqamahRules(
      second?.iqamahRules,
      sanitizeIqamahRules(first.iqamahRules, base.iqamahRules)
    ),
    jumuahShifts: sanitizeJumuahShifts(
      second?.jumuahShifts,
      sanitizeJumuahShifts(first.jumuahShifts, base.jumuahShifts)
    ),
    adhanProfiles: sanitizeAdhanProfiles(
      second?.adhanProfiles,
      sanitizeAdhanProfiles(first.adhanProfiles, base.adhanProfiles)
    ),
    externalApiEnabled: Boolean(raw.externalApiEnabled),
    externalApiBaseUrl: sanitizeUpstreamBaseUrl(
      raw.externalApiBaseUrl,
      defaults.externalApiBaseUrl,
      "islamic_api"
    ),
    cacheTtlSeconds: sanitizePositiveInt(
      raw.cacheTtlSeconds,
      base.cacheTtlSeconds || 3600,
      60,
      86400
    ),
    ramadan: mergeRamadanConfig(base.ramadan, first.ramadan, second?.ramadan),
    eid: mergeEidConfig(base.eid, first.eid, second?.eid),
    fiqhRates: mergeFiqhRates(
      base.fiqhRates,
      first.fiqhRates,
      second?.fiqhRates
    ),
    dailyPins: sanitizeDailyPins(
      base.dailyPins,
      first.dailyPins,
      second?.dailyPins
    ),
    quranFoundation: mergeQuranFoundationConfig(
      base.quranFoundation,
      first.quranFoundation,
      second?.quranFoundation
    ),
    enableDonationsBridge: Boolean(raw.enableDonationsBridge),
    enableCalendarBridge: Boolean(raw.enableCalendarBridge),
    enableBroadcastsBridge: Boolean(raw.enableBroadcastsBridge),
    enableInboxAlertBridge: Boolean(raw.enableInboxAlertBridge),
    prayerSettingMapping: sanitizePrayerSettingMapping(
      second?.prayerSettingMapping ??
        first.prayerSettingMapping ??
        base.prayerSettingMapping,
      base.prayerSettingMapping
    ),
    faithPageMapping: sanitizeFaithPageMapping(
      second?.faithPageMapping ??
        first.faithPageMapping ??
        base.faithPageMapping,
      base.faithPageMapping
    ),
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  let updateMutex: Promise<void> = Promise.resolve();

  return {
    async getSettings(): Promise<IslamPluginSettings> {
      const rawFileConfig = strapi.config.get<unknown>(
        `plugin::${PLUGIN_ID}`,
        {}
      );
      const fileConfig = isPlainRecord(rawFileConfig)
        ? (stripDangerousKeysDeep(
            rawFileConfig
          ) as Partial<IslamPluginSettings>)
        : {};
      const store = getPluginStore(strapi);
      const rawStored = await store.get({ key: "settings" });
      const stored = isPlainRecord(rawStored)
        ? (stripDangerousKeysDeep(rawStored) as Partial<IslamPluginSettings>)
        : {};

      const merged = mergeSettingsLayers(
        DEFAULT_ISLAM_SETTINGS,
        fileConfig,
        stored
      );
      await hydrateFromHostPrayerSetting(strapi, merged);
      return merged;
    },

    async updateSettings(
      patch: Partial<IslamPluginSettings>
    ): Promise<IslamPluginSettings> {
      if (!isPlainRecord(patch)) {
        const err = new Error(
          "Settings patch must be a plain object"
        ) as Error & { status?: number };
        err.status = 400;
        throw err;
      }
      const cleanPatch = stripDangerousKeysDeep(patch);

      const executeUpdate = async (): Promise<IslamPluginSettings> => {
        const current = await this.getSettings();
        const next = mergeSettingsLayers(current, cleanPatch);

        const store = getPluginStore(strapi);
        await store.set({ key: "settings", value: next });

        await syncToHostPrayerSetting(strapi, next);
        await syncHijriOffsetToCalendarBridge(strapi, next);
        await syncNisabToDonationsBridge(strapi, next);

        return next;
      };

      const queued = updateMutex.then(executeUpdate, executeUpdate);
      updateMutex = queued.then(
        () => undefined,
        () => undefined
      );
      return queued;
    },
  };
};
