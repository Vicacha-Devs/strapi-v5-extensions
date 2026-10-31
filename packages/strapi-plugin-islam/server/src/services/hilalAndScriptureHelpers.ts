import type { Core } from "@strapi/strapi";

import {
  ASMA_UL_HUSNA,
  CURATED_AYAT,
  CURATED_DUAS,
  CURATED_HADITHS,
  FIVE_PILLARS_REFERENCE,
  PLUGIN_ID,
  SHAHADA_REFERENCE,
  SURAH_DIRECTORY,
  TASBIH_PRESETS,
  getDailyInspirationBundle,
  gregorianToHijri,
  sanitizeHijriShift,
  sanitizeIsoDateYmd,
  sanitizeLocale,
  sanitizePlainText,
  type CuratedAyahItem,
  type CuratedDuaItem,
  type CuratedHadithItem,
  type IslamPluginSettings,
  type SupportedLocale,
} from "../../../shared";

type DuaCategorySlug = CuratedDuaItem["category"];
type RamadanConfig = IslamPluginSettings["ramadan"];
type EidConfig = IslamPluginSettings["eid"];

export interface ConfirmHilalSightingInput {
  occasion: "ramadan" | "eid_al_fitr" | "dhul_hijjah_eid_al_adha" | "monthly_hilal";
  hijriYear?: number;
  hijriMonth?: number;
  confirmedGregorianDate: string;
  shifting?: string;
  approvedByImam?: string;
  notes?: Record<string, string>;
  activateBanner?: boolean;
  dispatchBroadcast?: boolean;
}

const EMPTY_LOCALE_TEXT: Record<SupportedLocale, string> = {
  es: "",
  en: "",
  ar: "",
  tr: "",
};

const VALID_DUA_CATEGORIES: ReadonlySet<DuaCategorySlug> = new Set([
  "morning_evening",
  "post_salah",
  "ramadan_iftar",
  "forgiveness",
  "protection_distress",
  "parents_family",
  "travel_daily",
  "adhan",
]);

function normalizeLocaleRecord(raw: unknown, fallbackText = ""): Record<SupportedLocale, string> {
  const defaultMap: Record<SupportedLocale, string> = fallbackText
    ? { es: fallbackText, en: fallbackText, ar: fallbackText, tr: fallbackText }
    : { ...EMPTY_LOCALE_TEXT };

  if (!raw || typeof raw !== "object") {
    return defaultMap;
  }
  const obj = raw as Record<string, unknown>;
  return {
    es: typeof obj.es === "string" ? obj.es : defaultMap.es,
    en: typeof obj.en === "string" ? obj.en : defaultMap.en,
    ar: typeof obj.ar === "string" ? obj.ar : defaultMap.ar,
    tr: typeof obj.tr === "string" ? obj.tr : defaultMap.tr,
  };
}

function normalizeTopicTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => String(item));
}

function normalizeEntryId(e: Record<string, unknown>): string {
  const slug = typeof e.slug === "string" && e.slug ? e.slug : "";
  return slug || String(e.documentId || "");
}

function normalizeRefKey(e: Record<string, unknown>, fallback: string): string {
  return typeof e.referenceKey === "string" && e.referenceKey ? e.referenceKey : fallback;
}

function mapCustomAyahEntry(e: Record<string, unknown>): CuratedAyahItem {
  const refKey = normalizeRefKey(e, "1:1");
  const [surahPart, ayahPart] = refKey.split(":");
  return {
    id: normalizeEntryId(e),
    surahNumber: Number(surahPart) || 1,
    ayahNumber: Number(ayahPart) || 1,
    referenceKey: refKey,
    surahNameAr: "",
    surahNameTranslit: refKey,
    arabicUthmani: typeof e.arabicText === "string" ? e.arabicText : "",
    transliteration: typeof e.transliteration === "string" ? e.transliteration : "",
    translations: normalizeLocaleRecord(e.translations),
    reflections: normalizeLocaleRecord(e.reflections),
    topicTags: normalizeTopicTags(e.topicTags),
    audioUrl: typeof e.audioUrl === "string" ? e.audioUrl : "",
  };
}

function mapCustomHadithEntry(e: Record<string, unknown>): CuratedHadithItem {
  const refKey = normalizeRefKey(e, "Hadith");
  return {
    id: normalizeEntryId(e),
    collectionSlug: "nawawi40",
    collectionNames: {
      es: refKey,
      en: refKey,
      ar: typeof e.referenceKey === "string" && e.referenceKey ? e.referenceKey : "حديث",
      tr: typeof e.referenceKey === "string" && e.referenceKey ? e.referenceKey : "Hadis",
    },
    hadithNumber: normalizeRefKey(e, "1"),
    grading: e.gradingOrCategory === "Hasan" ? "Hasan" : "Sahih",
    narrator: { ...EMPTY_LOCALE_TEXT },
    arabicText: typeof e.arabicText === "string" ? e.arabicText : "",
    transliteration: typeof e.transliteration === "string" ? e.transliteration : "",
    translations: normalizeLocaleRecord(e.translations),
    keyTakeaways: normalizeLocaleRecord(e.reflections),
    topicTags: normalizeTopicTags(e.topicTags),
  };
}

function normalizeDuaCategory(raw: unknown): DuaCategorySlug {
  if (typeof raw === "string" && VALID_DUA_CATEGORIES.has(raw as DuaCategorySlug)) {
    return raw as DuaCategorySlug;
  }
  return "travel_daily";
}

function mapCustomDuaEntry(e: Record<string, unknown>): CuratedDuaItem {
  const refKey = normalizeRefKey(e, "Dua");
  return {
    id: normalizeEntryId(e),
    category: normalizeDuaCategory(e.gradingOrCategory),
    categoryLabels: {
      es: "Súplica Comunitaria",
      en: "Community Supplication",
      ar: "دعاء مختار",
      tr: "Seçilmiş Dua",
    },
    titles: normalizeLocaleRecord(e.reflections, refKey),
    arabicText: typeof e.arabicText === "string" ? e.arabicText : "",
    transliteration: typeof e.transliteration === "string" ? e.transliteration : "",
    translations: normalizeLocaleRecord(e.translations),
    virtueAndSource: normalizeLocaleRecord(null, normalizeRefKey(e, "")),
    recommendedRepetitions: Number(e.recommendedRepetitions) || 1,
    topicTags: normalizeTopicTags(e.topicTags),
  };
}

function applyOccasionUpdates(
  occasion: ConfirmHilalSightingInput["occasion"],
  confirmedDate: string,
  hijriYear: number,
  activateBanner: boolean | undefined,
  currentRamadan: RamadanConfig,
  currentEid: EidConfig
): { nextRamadan: RamadanConfig; nextEid: EidConfig } {
  const nextRamadan: RamadanConfig = { ...currentRamadan };
  const nextEid: EidConfig = { ...currentEid };

  if (occasion === "ramadan") {
    nextRamadan.confirmedStartGregorian = confirmedDate;
    nextRamadan.hijriYear = hijriYear;
    nextRamadan.bannerActive = activateBanner !== undefined ? Boolean(activateBanner) : true;
  } else if (occasion === "eid_al_fitr") {
    nextEid.eidAlFitrDateGregorian = confirmedDate;
    nextEid.eidAlFitrActive = true;
    nextRamadan.bannerActive = false;
  } else if (occasion === "dhul_hijjah_eid_al_adha") {
    nextEid.eidAlAdhaDateGregorian = confirmedDate;
    nextEid.eidAlAdhaActive = true;
  }

  return { nextRamadan, nextEid };
}

function buildHilalInboxAlertTitle(
  occasion: ConfirmHilalSightingInput["occasion"],
  hijriYear: number,
  confirmedDate: string
): string {
  if (occasion === "ramadan") {
    return `🌙 ¡Ramadán Mubarak ${hijriYear} AH! Inicio confirmado: ${confirmedDate}`;
  }
  if (occasion === "eid_al_fitr") {
    return `🎉 ¡Eid al-Fitr Mubarak ${hijriYear} AH! Oración de Eid: ${confirmedDate}`;
  }
  return `🕌 Anuncio Oficial de Hilal (${confirmedDate})`;
}

async function publishHilalInboxAlertIfEnabled(
  strapi: Core.Strapi,
  input: ConfirmHilalSightingInput,
  updatedSettings: IslamPluginSettings,
  hijriYear: number,
  confirmedDate: string
): Promise<void> {
  if (!input.activateBanner || !updatedSettings.enableInboxAlertBridge) return;
  if (!strapi.contentTypes?.["plugin::inbox.alert-banner"]) return;
  try {
    await strapi.documents("plugin::inbox.alert-banner").create({
      data: {
        title: buildHilalInboxAlertTitle(input.occasion, hijriYear, confirmedDate),
        severity: "announcement",
        active: true,
      },
    });
  } catch {
    // Non-fatal bridge
  }
}

export async function confirmHilalSightingOperation(
  strapi: Core.Strapi,
  settingsService: {
    getSettings(): Promise<IslamPluginSettings>;
    updateSettings(patch: Partial<IslamPluginSettings>): Promise<IslamPluginSettings>;
  },
  input: ConfirmHilalSightingInput
) {
  const current = await settingsService.getSettings();
  const confirmedDate = sanitizeIsoDateYmd(input.confirmedGregorianDate);
  const shifting = sanitizeHijriShift(input.shifting ?? current.shifting, current.shifting);
  const hijriDetails = gregorianToHijri(confirmedDate, Number(shifting), "es");

  const hijriYear = Number(input.hijriYear) || hijriDetails.year;
  const hijriMonth = Number(input.hijriMonth) || hijriDetails.monthNumber;
  const approvedByImam =
    sanitizePlainText(input.approvedByImam, 120) || "Sheikh Principal de la Mezquita";

  const { nextRamadan, nextEid } = applyOccasionUpdates(
    input.occasion,
    confirmedDate,
    hijriYear,
    input.activateBanner,
    current.ramadan,
    current.eid
  );

  const updatedSettings = await settingsService.updateSettings({
    shifting,
    ramadan: nextRamadan,
    eid: nextEid,
  });

  let announcementDoc: Record<string, unknown> | null;
  try {
    announcementDoc = await strapi.documents(`plugin::${PLUGIN_ID}.hilal-announcement`).create({
      data: {
        occasion: input.occasion,
        hijriYear,
        hijriMonth,
        confirmedGregorianDate: confirmedDate,
        shiftingApplied: shifting,
        approvedByImam,
        notes: input.notes || {},
        broadcastDispatched: Boolean(input.dispatchBroadcast),
      },
    });
  } catch {
    announcementDoc = null;
  }

  await publishHilalInboxAlertIfEnabled(strapi, input, updatedSettings, hijriYear, confirmedDate);

  return {
    settings: updatedSettings,
    announcement: announcementDoc,
  };
}

function matchesTopicFilter(tags: string[], topicFilter: string): boolean {
  return tags.some((t) => t.toLowerCase().includes(topicFilter));
}

export async function getScriptureHubOperation(
  strapi: Core.Strapi,
  settings: IslamPluginSettings,
  params?: {
    date?: string;
    locale?: string;
    category?: string;
    topic?: string;
    surahNumber?: number | string;
  }
) {
  const date = sanitizeIsoDateYmd(params?.date);
  const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
  const topicFilter = sanitizePlainText(params?.topic, 60).toLowerCase();
  const categoryFilter = sanitizePlainText(params?.category, 60).toLowerCase();

  let customEntries: Array<Record<string, unknown>>;
  try {
    customEntries = await strapi.documents(`plugin::${PLUGIN_ID}.scripture-entry`).findMany({
      filters: { active: true },
      limit: 100,
    });
  } catch {
    customEntries = [];
  }

  const customAyat = customEntries.filter((e) => e.entryKind === "ayah").map(mapCustomAyahEntry);
  const customHadiths = customEntries
    .filter((e) => e.entryKind === "hadith")
    .map(mapCustomHadithEntry);
  const customDuas = customEntries.filter((e) => e.entryKind === "dua").map(mapCustomDuaEntry);

  let ayat = [...CURATED_AYAT, ...customAyat];
  let hadiths = [...CURATED_HADITHS, ...customHadiths];
  let duas = [...CURATED_DUAS, ...customDuas];

  if (topicFilter) {
    ayat = ayat.filter((a) => matchesTopicFilter(a.topicTags, topicFilter));
    hadiths = hadiths.filter((h) => matchesTopicFilter(h.topicTags, topicFilter));
    duas = duas.filter((d) => matchesTopicFilter(d.topicTags, topicFilter));
  }

  if (categoryFilter) {
    duas = duas.filter((d) => d.category.toLowerCase() === categoryFilter);
  }

  const dailyInspiration = getDailyInspirationBundle(date, locale, settings.dailyPins);
  const surahNum = Number(params?.surahNumber);
  const selectedSurah =
    surahNum >= 1 && surahNum <= 114
      ? SURAH_DIRECTORY.find((s) => s.number === surahNum) || null
      : null;

  return {
    locale,
    date,
    dailyInspiration,
    surahCount: SURAH_DIRECTORY.length,
    selectedSurah,
    surahs: SURAH_DIRECTORY,
    ayat,
    hadiths,
    duas,
    asmaUlHusna: ASMA_UL_HUSNA,
    tasbihPresets: TASBIH_PRESETS,
    shahada: SHAHADA_REFERENCE,
    fivePillars: FIVE_PILLARS_REFERENCE,
  };
}
