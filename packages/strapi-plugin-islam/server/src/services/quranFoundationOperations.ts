import {
  CURATED_HADITHS,
  sanitizeLocale,
  sanitizePositiveInt,
  sanitizeSurahNumber,
  sanitizeVerseKey,
  type IslamPluginSettings,
} from "../../../shared";
import {
  fetchQuranChapterInfoOperation,
  fetchQuranChapterVersesOperation,
  fetchQuranChaptersOperation,
  fetchQuranVerseByKeyOperation,
  parseBoolParam,
  type ChapterVersesQueryParams,
  type VerseByKeyQueryParams,
} from "./quranFoundationChaptersAndVerses";
import { fetchQuranFoundationV4Json, getCached, setCached } from "./upstreamCacheAndHttp";

export {
  fetchQuranChapterInfoOperation,
  fetchQuranChapterVersesOperation,
  fetchQuranChaptersOperation,
  fetchQuranVerseByKeyOperation,
  type ChapterVersesQueryParams,
  type VerseByKeyQueryParams,
};

function extractAnswersArray(data: Record<string, unknown> | undefined): unknown[] {
  if (!data) return [];
  if (Array.isArray(data.answers)) return data.answers;
  if (Array.isArray(data)) return data;
  return [];
}

export async function fetchQuranAyahHadithsOperation(
  settings: IslamPluginSettings,
  params: {
    verseKey: string;
    locale?: string;
    page?: number | string;
    limit?: number | string;
  }
) {
  const qf = settings.quranFoundation;
  const verseKey = sanitizeVerseKey(params?.verseKey, "1:1");
  const [surahNum] = verseKey.split(":").map(Number);
  const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
  const qfHadithLanguage = locale === "ar" ? "ar" : "en";
  const page = sanitizePositiveInt(params?.page, 1, 1, 50);
  const limit = sanitizePositiveInt(params?.limit, 4, 1, 20);

  const cacheKey = `qf:ayah-hadiths:${verseKey}:${qfHadithLanguage}:${page}:${limit}`;
  const cached = getCached<Record<string, unknown>>(cacheKey);
  if (cached) return cached;

  const [hadithsRes, answersRes] = await Promise.all([
    fetchQuranFoundationV4Json(
      qf,
      `hadith_references/by_ayah/${verseKey}/hadiths`,
      { language: qfHadithLanguage, page, limit },
      { targetSurah: surahNum }
    ),
    fetchQuranFoundationV4Json(
      qf,
      `answers/by_ayah/${verseKey}`,
      { language: qfHadithLanguage },
      { targetSurah: surahNum }
    ),
  ]);

  const rawHadiths = hadithsRes?.data?.hadiths;
  const hadiths = Array.isArray(rawHadiths) ? rawHadiths : [];
  const answers = extractAnswersArray(answersRes?.data);

  const result = {
    verseKey,
    locale,
    qfHadithLanguage,
    source: hadithsRes?.source || answersRes?.source || "curated_corpus",
    hadiths,
    answers,
    curatedHadithsFallback: CURATED_HADITHS.slice(0, limit),
    pagination: {
      page,
      limit,
      hasMore: Boolean(hadithsRes?.data?.has_more),
      total: Number(hadithsRes?.data?.total) || hadiths.length,
    },
  };

  setCached(cacheKey, result, settings.cacheTtlSeconds || 3600);
  return result;
}

export async function fetchQuranChapterAudioOperation(
  settings: IslamPluginSettings,
  params: {
    chapterNumber: number | string;
    reciterId?: number | string;
    segments?: boolean | string;
  }
) {
  const qf = settings.quranFoundation;
  const chapterNumber = sanitizeSurahNumber(params?.chapterNumber, 1);
  const reciterId = sanitizePositiveInt(params?.reciterId, qf.defaultChapterReciterId || 7, 1, 500);
  const segments = parseBoolParam(params?.segments, true);

  const cacheKey = `qf:chapter-audio:${reciterId}:${chapterNumber}:${segments}`;
  const cached = getCached<Record<string, unknown>>(cacheKey);
  if (cached) return cached;

  const upstream = await fetchQuranFoundationV4Json(
    qf,
    `chapter_recitations/${reciterId}/${chapterNumber}`,
    { segments: segments ? "true" : "false" },
    { targetSurah: chapterNumber }
  );

  const paddedChapter = String(chapterNumber).padStart(3, "0");
  const audioFile = upstream?.data?.audio_file || {
    id: chapterNumber,
    chapter_id: chapterNumber,
    format: "mp3",
    audio_url: `https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal/${chapterNumber}.mp3`,
    fallback_cdn_url: `https://server8.mp3quran.net/afs/${paddedChapter}.mp3`,
    timestamps: [],
  };

  const result = {
    chapterNumber,
    reciterId,
    segmentsIncluded: segments,
    source: upstream?.source || "curated_audio_cdn",
    audioFile,
  };

  setCached(cacheKey, result, settings.cacheTtlSeconds || 3600);
  return result;
}

const DEFAULT_QF_TRANSLATIONS = [
  { id: 83, name: "Sheikh Isa Garcia", language_name: "spanish" },
  { id: 140, name: "Montada Islamic Foundation", language_name: "spanish" },
  { id: 20, name: "Saheeh International", language_name: "english" },
  { id: 85, name: "M.A.S. Abdel Haleem", language_name: "english" },
  { id: 77, name: "Diyanet İşleri", language_name: "turkish" },
  { id: 57, name: "Transliteration", language_name: "english" },
];

const DEFAULT_QF_RECITATIONS = [
  { id: 7, reciter_name: "Mishari Rashid al-`Afasy", style: "Murattal", isDefault: true },
  { id: 2, reciter_name: "AbdulBaset AbdulSamad", style: "Murattal", isDefault: false },
  { id: 1, reciter_name: "AbdulBaset AbdulSamad", style: "Mujawwad", isDefault: false },
  { id: 3, reciter_name: "Abdur-Rahman as-Sudais", style: "Murattal", isDefault: false },
  { id: 4, reciter_name: "Abu Bakr al-Shatri", style: "Murattal", isDefault: false },
  { id: 5, reciter_name: "Hani ar-Rifai", style: "Murattal", isDefault: false },
  { id: 6, reciter_name: "Mahmoud Khalil Al-Husary", style: "Murattal", isDefault: false },
  { id: 12, reciter_name: "Mahmoud Khalil Al-Husary", style: "Muallim", isDefault: false },
  { id: 9, reciter_name: "Mohamed Siddiq al-Minshawi", style: "Murattal", isDefault: false },
  { id: 8, reciter_name: "Mohamed Siddiq al-Minshawi", style: "Mujawwad", isDefault: false },
  { id: 10, reciter_name: "Sa`ud ash-Shuraym", style: "Murattal", isDefault: false },
  { id: 11, reciter_name: "Mohamed al-Tablawi", style: "Murattal", isDefault: false },
];

const DEFAULT_QF_TAFSIRS = [
  { id: 169, name: "Ibn Kathir (Abridged)", language_name: "english" },
  { id: 16, name: "Tafsir Muyassar", language_name: "arabic" },
  { id: 14, name: "Tafsir Ibn Kathir", language_name: "arabic" },
];

function prioritizeDefaultReciter<T extends { id?: number }>(
  items: T[],
  defaultReciterId: number
): Array<T & { isDefault: boolean }> {
  return [...items]
    .map((item) => ({
      ...item,
      isDefault: Number(item.id) === defaultReciterId,
    }))
    .sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return 0;
    });
}

export async function fetchQuranResourcesOperation(
  settings: IslamPluginSettings,
  params?: { locale?: string }
) {
  const qf = settings.quranFoundation;
  const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
  const defaultReciterId = qf.defaultReciterId || 7;
  const defaultChapterReciterId = qf.defaultChapterReciterId || defaultReciterId;
  const cacheKey = `qf:resources:${locale}:${defaultReciterId}`;
  const cached = getCached<Record<string, unknown>>(cacheKey);
  if (cached) return cached;

  const [translationsRes, recitationsRes, chapterRecitersRes, tafsirsRes] = await Promise.all([
    fetchQuranFoundationV4Json(qf, "resources/translations", { language: locale }),
    fetchQuranFoundationV4Json(qf, "resources/recitations", { language: locale }),
    fetchQuranFoundationV4Json(qf, "resources/chapter_reciters", { language: locale }),
    fetchQuranFoundationV4Json(qf, "resources/tafsirs", { language: locale }),
  ]);

  const rawRecitations = Array.isArray(recitationsRes?.data?.recitations)
    ? (recitationsRes.data.recitations as Array<{ id?: number }>)
    : DEFAULT_QF_RECITATIONS;
  const rawChapterReciters = Array.isArray(chapterRecitersRes?.data?.reciters)
    ? (chapterRecitersRes.data.reciters as Array<{ id?: number }>)
    : DEFAULT_QF_RECITATIONS;

  const result = {
    locale,
    source: translationsRes?.source || recitationsRes?.source || "curated_defaults",
    defaultReciterId,
    defaultChapterReciterId,
    defaultReciterName: "Mishari Rashid al-`Afasy",
    translations: translationsRes?.data?.translations || DEFAULT_QF_TRANSLATIONS,
    recitations: prioritizeDefaultReciter(rawRecitations, defaultReciterId),
    chapterReciters: prioritizeDefaultReciter(rawChapterReciters, defaultChapterReciterId),
    tafsirs: tafsirsRes?.data?.tafsirs || DEFAULT_QF_TAFSIRS,
  };

  setCached(cacheKey, result, Math.max(settings.cacheTtlSeconds || 3600, 43200));
  return result;
}
