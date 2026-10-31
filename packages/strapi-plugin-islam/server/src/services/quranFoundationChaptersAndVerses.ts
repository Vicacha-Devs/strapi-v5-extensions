import {
  CURATED_AYAT,
  SURAH_DIRECTORY,
  sanitizeLocale,
  sanitizePlainText,
  sanitizePositiveInt,
  sanitizeQuranScript,
  sanitizeSurahNumber,
  sanitizeVerseKey,
  type CuratedAyahItem,
  type IslamPluginSettings,
  type QuranFoundationConfig,
  type SupportedLocale,
  type SurahMetadata,
} from "../../../shared";
import { fetchQuranFoundationV4Json, getCached, setCached } from "./upstreamCacheAndHttp";

const VERSE_FIELDS =
  "text_uthmani,text_uthmani_tajweed,text_uthmani_simple,text_imlaei,text_indopak_nastaleeq,chapter_id,verse_number,verse_key,juz_number,hizb_number,rub_el_hizb_number,page_number,sajdah_number";

const WORD_FIELDS = "text_uthmani,text_indopak,verse_key,location,audio_url";

export function buildTranslationPolicy(qf: QuranFoundationConfig) {
  return {
    disableBrowserAutoTranslate: Boolean(qf?.disableBrowserAutoTranslate ?? true),
    htmlAttributes: { translate: "no", className: "notranslate" },
  };
}

export function mapSurahToV4Chapter(s: SurahMetadata, locale: SupportedLocale) {
  return {
    id: s.number,
    revelation_place: s.revelationType === "Meccan" ? "makkah" : "madinah",
    name_simple: s.transliteration,
    name_arabic: s.nameAr,
    verses_count: s.ayahCount,
    translated_name: {
      language_name: locale,
      name: s.names[locale] || s.names.es,
    },
  };
}

export function mapCuratedAyahToV4Verse(
  a: CuratedAyahItem,
  locale: SupportedLocale,
  verseKeyOverride?: string
) {
  return {
    id: a.ayahNumber,
    chapter_id: a.surahNumber,
    verse_number: a.ayahNumber,
    verse_key: verseKeyOverride || a.referenceKey,
    text_uthmani: a.arabicUthmani,
    translations: [
      {
        resource_id: locale === "es" ? 83 : 20,
        language_name: locale,
        text: a.translations[locale] || a.translations.es,
      },
      {
        resource_id: 57,
        language_name: "transliteration",
        text: a.transliteration,
      },
    ],
    audio: { url: a.audioUrl },
  };
}

export function parseBoolParam(raw: boolean | string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  const s = String(raw);
  return s === "true" || s === "1";
}

function resolveTranslationsCsv(
  rawTranslations: string | undefined,
  qf: QuranFoundationConfig,
  locale: SupportedLocale
): string {
  const cleaned = sanitizePlainText(rawTranslations, 80).replace(/[^0-9,]/g, "");
  if (cleaned) return cleaned;
  const baseIds = qf.defaultTranslationIdsByLocale?.[locale] || [83];
  const ids = qf.includeTransliterationByDefault ? [...baseIds, 57] : baseIds;
  return Array.from(new Set(ids)).join(",");
}

function resolveTafsirsCsv(
  rawTafsirs: string | undefined,
  qf: QuranFoundationConfig,
  locale: SupportedLocale,
  useDefaultWhenEmpty: boolean
): string {
  const cleaned = sanitizePlainText(rawTafsirs, 80).replace(/[^0-9,]/g, "");
  if (cleaned || !useDefaultWhenEmpty) return cleaned;
  const defaultTafsirIds = qf.defaultTafsirIdsByLocale?.[locale] || [169];
  return defaultTafsirIds.join(",");
}

export function findLocalSurah(chapterNumber: number): SurahMetadata {
  return SURAH_DIRECTORY.find((s) => s.number === chapterNumber) || SURAH_DIRECTORY[0];
}

export async function fetchQuranChaptersOperation(
  settings: IslamPluginSettings,
  params?: { locale?: string }
) {
  const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
  const qf = settings.quranFoundation;
  const cacheKey = `qf:chapters:${locale}`;
  const cached = getCached<Record<string, unknown>>(cacheKey);
  if (cached) return cached;

  const upstream = await fetchQuranFoundationV4Json(qf, "chapters", { language: locale });
  const rawChapters = upstream?.data?.chapters;
  const chapters = Array.isArray(rawChapters)
    ? rawChapters
    : SURAH_DIRECTORY.map((s) => mapSurahToV4Chapter(s, locale));

  const result = {
    locale,
    source: upstream?.source || "curated_corpus",
    chaptersCount: chapters.length,
    chapters,
    surahDirectory: SURAH_DIRECTORY,
    translationPolicy: buildTranslationPolicy(qf),
  };

  setCached(cacheKey, result, settings.cacheTtlSeconds || 3600);
  return result;
}

export async function fetchQuranChapterInfoOperation(
  settings: IslamPluginSettings,
  params: { chapterNumber: number | string; locale?: string }
) {
  const chapterNumber = sanitizeSurahNumber(params?.chapterNumber, 1);
  const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
  const qf = settings.quranFoundation;
  const cacheKey = `qf:chapter-info:${chapterNumber}:${locale}`;
  const cached = getCached<Record<string, unknown>>(cacheKey);
  if (cached) return cached;

  const [chapterRes, infoRes] = await Promise.all([
    fetchQuranFoundationV4Json(
      qf,
      `chapters/${chapterNumber}`,
      { language: locale },
      { targetSurah: chapterNumber }
    ),
    fetchQuranFoundationV4Json(
      qf,
      `chapters/${chapterNumber}/info`,
      { language: locale },
      { targetSurah: chapterNumber }
    ),
  ]);

  const localSurah = findLocalSurah(chapterNumber);
  const result = {
    chapterNumber,
    locale,
    source: chapterRes?.source || infoRes?.source || "curated_corpus",
    surah: localSurah,
    chapter: chapterRes?.data?.chapter || mapSurahToV4Chapter(localSurah, locale),
    chapterInfo: infoRes?.data?.chapter_info || null,
  };

  setCached(cacheKey, result, settings.cacheTtlSeconds || 3600);
  return result;
}

export interface ChapterVersesQueryParams {
  chapterNumber: number | string;
  locale?: string;
  page?: number | string;
  perPage?: number | string;
  script?: string;
  words?: boolean | string;
  reciterId?: number | string;
  translations?: string;
  tafsirs?: string;
}

function normalizeChapterVersesOptions(
  settings: IslamPluginSettings,
  params: ChapterVersesQueryParams
) {
  const qf = settings.quranFoundation;
  const chapterNumber = sanitizeSurahNumber(params?.chapterNumber, 1);
  const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
  const page = sanitizePositiveInt(params?.page, 1, 1, 300);
  const perPage = sanitizePositiveInt(params?.perPage, 20, 1, 50);
  const script = sanitizeQuranScript(params?.script, qf.defaultScript);
  const includeWords = parseBoolParam(params?.words, qf.includeWordByWordByDefault);
  const reciterId = sanitizePositiveInt(params?.reciterId, qf.defaultReciterId || 7, 1, 500);
  const translationsParam = resolveTranslationsCsv(params?.translations, qf, locale);
  const tafsirsParam = resolveTafsirsCsv(params?.tafsirs, qf, locale, false);
  return {
    chapterNumber,
    locale,
    page,
    perPage,
    script,
    includeWords,
    reciterId,
    translationsParam,
    tafsirsParam,
  };
}

export async function fetchQuranChapterVersesOperation(
  settings: IslamPluginSettings,
  params: ChapterVersesQueryParams
) {
  const qf = settings.quranFoundation;
  const opts = normalizeChapterVersesOptions(settings, params);
  const cacheKey = `qf:verses:${opts.chapterNumber}:${opts.locale}:${opts.page}:${opts.perPage}:${opts.script}:${opts.includeWords}:${opts.reciterId}:${opts.translationsParam}:${opts.tafsirsParam}`;
  const cached = getCached<Record<string, unknown>>(cacheKey);
  if (cached) return cached;

  const upstream = await fetchQuranFoundationV4Json(
    qf,
    `verses/by_chapter/${opts.chapterNumber}`,
    {
      language: opts.locale,
      words: opts.includeWords ? "true" : "false",
      translations: opts.translationsParam,
      audio: opts.reciterId,
      tafsirs: opts.tafsirsParam || undefined,
      fields: VERSE_FIELDS,
      word_fields: opts.includeWords ? WORD_FIELDS : undefined,
      translation_fields: "resource_name,language_name",
      page: opts.page,
      per_page: opts.perPage,
    },
    { targetSurah: opts.chapterNumber }
  );

  const localSurah = findLocalSurah(opts.chapterNumber);
  const rawVerses = upstream?.data?.verses;
  const verses = Array.isArray(rawVerses)
    ? rawVerses
    : CURATED_AYAT.filter((a) => a.surahNumber === opts.chapterNumber).map((a) =>
        mapCuratedAyahToV4Verse(a, opts.locale)
      );

  const pagination = upstream?.data?.pagination || {
    per_page: opts.perPage,
    current_page: opts.page,
    next_page: null,
    total_pages: 1,
    total_records: verses.length,
  };

  const result = {
    chapterNumber: opts.chapterNumber,
    surah: localSurah,
    locale: opts.locale,
    script: opts.script,
    reciterId: opts.reciterId,
    translationsRequested: opts.translationsParam,
    source: upstream?.source || "curated_corpus",
    verses,
    pagination,
    translationPolicy: buildTranslationPolicy(qf),
  };

  setCached(cacheKey, result, settings.cacheTtlSeconds || 3600);
  return result;
}

export interface VerseByKeyQueryParams {
  verseKey: string;
  locale?: string;
  words?: boolean | string;
  reciterId?: number | string;
  translations?: string;
  tafsirs?: string;
}

function findCuratedAyahForVerseKey(verseKey: string, surahNum: number): CuratedAyahItem {
  return (
    CURATED_AYAT.find(
      (a) =>
        a.referenceKey === verseKey ||
        (a.surahNumber === surahNum && a.referenceKey.startsWith(`${surahNum}:`))
    ) || CURATED_AYAT[0]
  );
}

export async function fetchQuranVerseByKeyOperation(
  settings: IslamPluginSettings,
  params: VerseByKeyQueryParams
) {
  const qf = settings.quranFoundation;
  const verseKey = sanitizeVerseKey(params?.verseKey, "1:1");
  const [surahNum] = verseKey.split(":").map(Number);
  const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
  const includeWords = parseBoolParam(params?.words, true);
  const reciterId = sanitizePositiveInt(params?.reciterId, qf.defaultReciterId || 7, 1, 500);
  const translationsParam = resolveTranslationsCsv(params?.translations, qf, locale);
  const tafsirsParam = resolveTafsirsCsv(params?.tafsirs, qf, locale, true);

  const cacheKey = `qf:verse:${verseKey}:${locale}:${includeWords}:${reciterId}:${translationsParam}:${tafsirsParam}`;
  const cached = getCached<Record<string, unknown>>(cacheKey);
  if (cached) return cached;

  const upstream = await fetchQuranFoundationV4Json(
    qf,
    `verses/by_key/${verseKey}`,
    {
      language: locale,
      words: includeWords ? "true" : "false",
      translations: translationsParam,
      audio: reciterId,
      tafsirs: tafsirsParam,
      fields: VERSE_FIELDS,
      word_fields: includeWords ? WORD_FIELDS : undefined,
      translation_fields: "resource_name,language_name",
    },
    { targetSurah: surahNum }
  );

  const localSurah = findLocalSurah(surahNum);
  const curatedMatch = findCuratedAyahForVerseKey(verseKey, surahNum);
  const verse = upstream?.data?.verse || mapCuratedAyahToV4Verse(curatedMatch, locale, verseKey);

  const result = {
    verseKey,
    surah: localSurah,
    locale,
    source: upstream?.source || "curated_corpus",
    verse,
    curatedReflection: curatedMatch.referenceKey === verseKey ? curatedMatch.reflections : null,
    translationPolicy: buildTranslationPolicy(qf),
  };

  setCached(cacheKey, result, settings.cacheTtlSeconds || 3600);
  return result;
}
