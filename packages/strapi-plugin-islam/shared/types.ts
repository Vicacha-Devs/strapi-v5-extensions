export type SupportedLocale = "es" | "en" | "ar" | "tr";
export type SupportedCurrency = "COP" | "USD" | "EUR" | "TRY";
export type AsrSchoolId = "1" | "2";
export type CalendarMethodId = "MATHEMATICAL" | "UAQ" | "HJCoSA" | "DIYANET";
export type HijriShiftId = "-2" | "-1" | "0" | "1" | "2";
export type NisabStandardId = "common" | "classical";
export type PrayerNameId =
  | "fajr"
  | "dhuhr"
  | "asr"
  | "maghrib"
  | "isha"
  | "jumuah";
export type DailyFivePrayerId = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export type LocalizedStringMap = Record<SupportedLocale, string> &
  Record<string, string>;

export interface IqamahRule {
  prayerName: PrayerNameId;
  mode: "offset_minutes" | "fixed_time";
  offsetMinutes: number;
  fixedTime?: string;
  notes?: string;
}

export interface JumuahShift {
  id: string;
  label: LocalizedStringMap;
  khutbahTime: string;
  prayerTime: string;
  khatibName?: string;
  languages: SupportedLocale[];
  isPrimary?: boolean;
}

export interface AdhanAudioProfile {
  id: string;
  name: string;
  muezzin: string;
  origin: string;
  standardAudioUrl: string;
  fajrAudioUrl: string;
  isDefault?: boolean;
}

export interface RamadanOperationConfig {
  bannerActive: boolean;
  hijriYear: number;
  confirmedStartGregorian?: string;
  imsakOffsetMinutes: number;
  taraweehTime: string;
  taraweehRakaat: number;
  qiyamLastTenTime: string;
  communityIftarEnabled: boolean;
  notes: LocalizedStringMap;
}

export interface EidPrayerShift {
  shiftNumber: number;
  takbiratTime: string;
  prayerTime: string;
  khutbahLanguage: SupportedLocale;
  imamName?: string;
  locationNote?: string;
}

export interface EidOperationConfig {
  eidAlFitrActive: boolean;
  eidAlFitrDateGregorian?: string;
  eidAlFitrShifts: EidPrayerShift[];
  eidAlAdhaActive: boolean;
  eidAlAdhaDateGregorian?: string;
  eidAlAdhaShifts: EidPrayerShift[];
  qurbaniEnabled: boolean;
  qurbaniSharePriceByCurrency: Record<SupportedCurrency, number>;
  notes: LocalizedStringMap;
}

export interface FiqhRatesConfig {
  defaultCurrency: SupportedCurrency;
  defaultStandard: NisabStandardId;
  goldPricePerGramByCurrency: Record<SupportedCurrency, number>;
  silverPricePerGramByCurrency: Record<SupportedCurrency, number>;
  zakatAlFitrPerPersonByCurrency: Record<SupportedCurrency, number>;
  fidyahPerDayByCurrency: Record<SupportedCurrency, number>;
  kaffarahFastByCurrency: Record<SupportedCurrency, number>;
  kaffarahOathByCurrency: Record<SupportedCurrency, number>;
  stapleFoodWeightKg: number;
}

export interface DailyInspirationPins {
  pinnedAyahId?: string | null;
  pinnedHadithId?: string | null;
  pinnedDuaId?: string | null;
  pinnedAsmaNumber?: number | null;
}

export type QuranFoundationEnvironment = "prelive" | "production";
export type QuranScriptType =
  | "uthmani"
  | "uthmani_tajweed"
  | "uthmani_simple"
  | "imlaei"
  | "indopak_nastaleeq";

export interface QuranFoundationConfig {
  enabled: boolean;
  environment: QuranFoundationEnvironment;
  oauth2BaseUrlPrelive: string;
  apiBaseUrlPrelive: string;
  oauth2BaseUrlProduction: string;
  apiBaseUrlProduction: string;
  publicFallbackBaseUrl: string;
  defaultScript: QuranScriptType;
  defaultReciterId: number;
  defaultChapterReciterId: number;
  defaultTranslationIdsByLocale: Record<SupportedLocale, number[]>;
  defaultTafsirIdsByLocale: Record<SupportedLocale, number[]>;
  includeTransliterationByDefault: boolean;
  includeWordByWordByDefault: boolean;
  disableBrowserAutoTranslate: boolean;
}

export interface PrayerSettingFieldMapping {
  enabled: boolean;
  uid: string;
  fields: {
    method: string;
    school: string;
    calender: string;
    shifting: string;
    defaultLat: string;
    defaultLon: string;
    iqamahRules: string;
    jumuahKhutbahTime: string;
    jumuahPrayerTime: string;
    ramadanBannerActive: string;
    ramadanNotes: string;
  };
}

export interface FaithPageFieldMapping {
  enabled: boolean;
  uid: string;
  fields: {
    heroTitle: string;
    heroSubtitle: string;
    introText: string;
    shahadaArabic: string;
    shahadaTransliteration: string;
    shahadaTranslation: string;
    fivePillars: string;
    newMuslimGuidePdf: string;
  };
}

export interface IslamPluginSettings {
  mosqueName: string;
  city: string;
  country: string;
  timezone: string;
  defaultLocale: SupportedLocale;
  supportedLocales: SupportedLocale[];
  defaultLat: number;
  defaultLon: number;
  elevationMeters: number;
  method: string;
  school: AsrSchoolId;
  calender: CalendarMethodId;
  shifting: HijriShiftId;
  highLatitudeRule: "AngleBased" | "MiddleOfTheNight" | "OneSeventh";
  minuteAdjustments: {
    fajr: number;
    sunrise: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
  };
  iqamahRules: IqamahRule[];
  jumuahShifts: JumuahShift[];
  adhanProfiles: AdhanAudioProfile[];
  externalApiEnabled: boolean;
  externalApiBaseUrl: string;
  cacheTtlSeconds: number;
  quranFoundation: QuranFoundationConfig;
  ramadan: RamadanOperationConfig;
  eid: EidOperationConfig;
  fiqhRates: FiqhRatesConfig;
  dailyPins: DailyInspirationPins;
  enableDonationsBridge: boolean;
  enableCalendarBridge: boolean;
  enableBroadcastsBridge: boolean;
  enableInboxAlertBridge: boolean;
  prayerSettingMapping?: PrayerSettingFieldMapping;
  faithPageMapping?: FaithPageFieldMapping;
}

export interface PrayerWithIqamah {
  name: DailyFivePrayerId;
  label: string;
  adhan: string;
  iqamah: string;
  adhanMinutes: number;
  iqamahMinutes: number;
  isActive: boolean;
  isNext: boolean;
}

export interface ProhibitedTimesWindow {
  sunrise: { start: string; end: string };
  zawal: { start: string; end: string };
  sunset: { start: string; end: string };
  isCurrentlyProhibited: boolean;
  activeProhibitedReason: "sunrise" | "zawal" | "sunset" | null;
}

export interface QiblaCompassResult {
  origin: {
    lat: number;
    lon: number;
    city?: string;
    country?: string;
  };
  kaaba: {
    lat: number;
    lon: number;
  };
  direction: {
    degrees: number;
    from: "True North";
    clockwise: true;
    cardinal: string;
  };
  distance: {
    kilometers: number;
    miles: number;
  };
}

export interface HijriDateDetails {
  date: string;
  day: number;
  monthNumber: number;
  monthNameAr: string;
  monthNameEn: string;
  monthNameEs: string;
  monthNameTr: string;
  monthNameLocalized: string;
  year: number;
  formatted: string;
  shiftingApplied: number;
  isAyyamAlBeed: boolean;
  isRamadan: boolean;
  holidays: string[];
}

export interface DailyPrayerTimetable {
  dateGregorian: string;
  hijri: HijriDateDetails;
  location: {
    city: string;
    country: string;
    lat: number;
    lon: number;
    timezone: string;
  };
  calculation: {
    methodId: string;
    methodName: string;
    schoolId: AsrSchoolId;
    schoolName: string;
    calendarMethod: CalendarMethodId;
    shifting: HijriShiftId;
    source: "astronomical_engine" | "external_api";
  };
  times: {
    imsak: string;
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    sunset: string;
    maghrib: string;
    isha: string;
    midnight: string;
    lastThird: string;
  };
  prayers: Record<DailyFivePrayerId, PrayerWithIqamah>;
  jumuah: {
    primaryKhutbahTime: string;
    primaryPrayerTime: string;
    shifts: JumuahShift[];
  };
  prohibitedTimes: ProhibitedTimesWindow;
  activePrayer: DailyFivePrayerId | null;
  nextPrayer: DailyFivePrayerId;
  minutesUntilNextAdhan: number;
  qibla: QiblaCompassResult;
  ramadan: {
    bannerActive: boolean;
    suhoorEndsAt: string;
    iftarAt: string;
    taraweehTime: string;
    notes: string;
  };
}

export interface IslamicObservanceItem {
  id: string;
  slug: string;
  hijriMonth: number;
  hijriDay: number;
  hijriYear: number;
  hijriFormatted: string;
  estimatedGregorianDate: string;
  daysUntil: number;
  category:
    | "eid"
    | "ramadan"
    | "fasting"
    | "sacred_night"
    | "hajj"
    | "commemoration";
  isPublicHolidayInIslam: boolean;
  fastingRecommendedOrObligatory:
    | "obligatory"
    | "sunnah"
    | "forbidden"
    | "none";
  titles: LocalizedStringMap;
  descriptions: LocalizedStringMap;
}

export interface SurahMetadata {
  number: number;
  nameAr: string;
  transliteration: string;
  names: LocalizedStringMap;
  revelationType: "Meccan" | "Medinan";
  ayahCount: number;
  juzStart: number;
}

export interface CuratedAyahItem {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  referenceKey: string;
  surahNameAr: string;
  surahNameTranslit: string;
  arabicUthmani: string;
  transliteration: string;
  translations: LocalizedStringMap;
  reflections: LocalizedStringMap;
  topicTags: string[];
  audioUrl: string;
}

export interface CuratedHadithItem {
  id: string;
  collectionSlug:
    | "bukhari"
    | "muslim"
    | "nawawi40"
    | "riyad_assalihin"
    | "tirmidhi";
  collectionNames: LocalizedStringMap;
  hadithNumber: string;
  grading: "Sahih" | "Hasan";
  narrator: LocalizedStringMap;
  arabicText: string;
  transliteration: string;
  translations: LocalizedStringMap;
  keyTakeaways: LocalizedStringMap;
  topicTags: string[];
}

export interface CuratedDuaItem {
  id: string;
  category:
    | "morning_evening"
    | "post_salah"
    | "ramadan_iftar"
    | "forgiveness"
    | "protection_distress"
    | "parents_family"
    | "travel_daily"
    | "adhan";
  categoryLabels: LocalizedStringMap;
  titles: LocalizedStringMap;
  arabicText: string;
  transliteration: string;
  translations: LocalizedStringMap;
  virtueAndSource: LocalizedStringMap;
  recommendedRepetitions: number;
  topicTags: string[];
}

export interface AsmaUlHusnaItem {
  number: number;
  arabic: string;
  transliteration: string;
  meanings: LocalizedStringMap;
  reflections: LocalizedStringMap;
  quranReference: string;
}

export interface TasbihPresetItem {
  id: string;
  arabic: string;
  transliteration: string;
  translations: LocalizedStringMap;
  targetCount: number;
  virtue: LocalizedStringMap;
}

export interface DailyInspirationBundle {
  date: string;
  locale: SupportedLocale;
  ayahOfTheDay: CuratedAyahItem;
  hadithOfTheDay: CuratedHadithItem;
  duaOfTheDay: CuratedDuaItem;
  nameOfAllahOfTheDay: AsmaUlHusnaItem;
  isPinnedOverride: {
    ayah: boolean;
    hadith: boolean;
    dua: boolean;
    asma: boolean;
  };
}

export * from "./fiqhTypes";
