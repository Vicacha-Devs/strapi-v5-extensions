import type { Core } from '@strapi/strapi';
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
  calculateFitranaFidyahKaffarah,
  calculateHawlMaturity,
  calculateNisabThresholds,
  calculateQiblaCompass,
  calculateZakatAlMal,
  computeDailyPrayerTimetable,
  computeMonthlyPrayerTimetable,
  computeUpcomingObservances,
  generatePrayerCalendarIcs,
  getDailyInspirationBundle,
  gregorianToHijri,
  hijriToGregorian,
  sanitizeCoordinates,
  sanitizeCurrency,
  sanitizeHijriShift,
  sanitizeIsoDateYmd,
  sanitizeIsoYearMonth,
  sanitizeLocale,
  sanitizeNisabStandard,
  sanitizePlainText,
  sanitizePositiveInt,
  sanitizeQuranScript,
  sanitizeSurahNumber,
  sanitizeVerseKey,
  type CuratedAyahItem,
  type CuratedDuaItem,
  type CuratedHadithItem,
  type DailyPrayerTimetable,
  type FitranaFidyahKaffarahInput,
  type IslamPluginSettings,
  type NisabThresholdResult,
  type QuranFoundationConfig,
  type QuranFoundationEnvironment,
  type SupportedCurrency,
  type SupportedLocale,
  type ZakatAlMalCalculationInput,
} from '../../../shared';

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

interface QfTokenCache {
  accessToken: string;
  clientId: string;
  environment: QuranFoundationEnvironment;
  expiresAt: number;
}

const upstreamCache = new Map<string, CacheEntry<unknown>>();
let qfTokenCache: QfTokenCache | null = null;
let inFlightTokenPromise: Promise<{
  accessToken: string;
  clientId: string;
  apiBaseUrl: string;
  environment: QuranFoundationEnvironment;
} | null> | null = null;

export function clearQuranFoundationCaches(): void {
  qfTokenCache = null;
  inFlightTokenPromise = null;
  upstreamCache.clear();
}

function getCached<T>(key: string): T | null {
  const entry = upstreamCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    upstreamCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCached<T>(key: string, value: T, ttlSeconds: number): void {
  const safeTtlMs = Math.max(60, Math.min(86400, ttlSeconds)) * 1000;
  upstreamCache.set(key, {
    expiresAt: Date.now() + safeTtlMs,
    value,
  });
}

function resolveQuranFoundationCredentials(qfConfig: QuranFoundationConfig): {
  clientId: string;
  clientSecret: string;
  environment: QuranFoundationEnvironment;
  oauth2BaseUrl: string;
  apiBaseUrl: string;
} {
  const clientId = (
    process.env.QF_CLIENT_ID ||
    process.env.QURAN_FOUNDATION_CLIENT_ID ||
    ''
  ).trim();
  const clientSecret = (
    process.env.QF_CLIENT_SECRET ||
    process.env.QURAN_FOUNDATION_CLIENT_SECRET ||
    ''
  ).trim();
  const envRaw = (
    process.env.QF_ENV ||
    process.env.QURAN_FOUNDATION_ENV ||
    qfConfig.environment ||
    'production'
  )
    .trim()
    .toLowerCase();
  const environment: QuranFoundationEnvironment =
    envRaw === 'prelive' ? 'prelive' : 'production';

  const oauth2BaseUrl =
    environment === 'prelive'
      ? qfConfig.oauth2BaseUrlPrelive
      : qfConfig.oauth2BaseUrlProduction;
  const apiBaseUrl =
    environment === 'prelive'
      ? qfConfig.apiBaseUrlPrelive
      : qfConfig.apiBaseUrlProduction;

  return {
    clientId,
    clientSecret,
    environment,
    oauth2BaseUrl,
    apiBaseUrl,
  };
}

async function getQuranFoundationAccessToken(
  qfConfig: QuranFoundationConfig,
  forceRefresh = false
): Promise<{ accessToken: string; clientId: string; apiBaseUrl: string; environment: QuranFoundationEnvironment } | null> {
  const creds = resolveQuranFoundationCredentials(qfConfig);
  if (!creds.clientId || !creds.clientSecret) {
    return null;
  }

  if (forceRefresh) {
    qfTokenCache = null;
  }

  if (
    !forceRefresh &&
    qfTokenCache &&
    qfTokenCache.clientId === creds.clientId &&
    qfTokenCache.environment === creds.environment &&
    Date.now() < qfTokenCache.expiresAt
  ) {
    return {
      accessToken: qfTokenCache.accessToken,
      clientId: qfTokenCache.clientId,
      apiBaseUrl: creds.apiBaseUrl,
      environment: creds.environment,
    };
  }

  if (inFlightTokenPromise) {
    return inFlightTokenPromise;
  }

  inFlightTokenPromise = (async () => {
    try {
      const tokenEndpoint = `${creds.oauth2BaseUrl.replace(/\/+$/, '')}/oauth2/token`;
      const basicAuth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      try {
        const response = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: 'grant_type=client_credentials&scope=content',
          signal: controller.signal,
        });

        if (!response.ok) {
          qfTokenCache = null;
          return null;
        }

        const json = (await response.json()) as {
          access_token?: string;
          expires_in?: number;
        };
        if (!json?.access_token) {
          return null;
        }

        const expiresInSec = Number(json.expires_in) || 3600;
        const safeLifetimeMs = Math.max(60, expiresInSec - 60) * 1000;
        qfTokenCache = {
          accessToken: json.access_token,
          clientId: creds.clientId,
          environment: creds.environment,
          expiresAt: Date.now() + safeLifetimeMs,
        };

        return {
          accessToken: json.access_token,
          clientId: creds.clientId,
          apiBaseUrl: creds.apiBaseUrl,
          environment: creds.environment,
        };
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return null;
    } finally {
      inFlightTokenPromise = null;
    }
  })();

  return inFlightTokenPromise;
}

async function fetchQuranFoundationV4Json(
  qfConfig: QuranFoundationConfig,
  subPath: string,
  queryParams: Record<string, string | number | boolean | undefined>,
  options?: { targetSurah?: number }
): Promise<{ data: any; source: 'quran_foundation_oauth2' | 'quran_foundation_public_v4' } | null> {
  if (!qfConfig?.enabled) {
    return null;
  }

  const buildUrl = (base: string) => {
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    const url = new URL(subPath.replace(/^\/+/, ''), normalizedBase);
    for (const [k, v] of Object.entries(queryParams)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  };

  // Attempt 1: Authenticated Quran Foundation Content API v4.0.0 (OAuth2 Client Credentials)
  // Note: Per Quran Foundation docs, Prelive dataset only includes Surah 1 (Al-Fatihah) & Surah 2 (Al-Baqarah).
  const creds = resolveQuranFoundationCredentials(qfConfig);
  const preliveSurahSupported =
    creds.environment !== 'prelive' ||
    options?.targetSurah === undefined ||
    options.targetSurah <= 2;

  if (creds.clientId && creds.clientSecret && preliveSurahSupported) {
    let tokenBundle = await getQuranFoundationAccessToken(qfConfig, false);
    if (tokenBundle) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        try {
          const res = await fetch(buildUrl(tokenBundle.apiBaseUrl), {
            headers: {
              Accept: 'application/json',
              'x-auth-token': tokenBundle.accessToken,
              'x-client-id': tokenBundle.clientId,
            },
            signal: controller.signal,
          });
          if (res.status === 401 && attempt === 0) {
            // Single token refresh retry on 401 as mandated by Quran Foundation docs
            tokenBundle = await getQuranFoundationAccessToken(qfConfig, true);
            if (!tokenBundle) break;
            continue;
          }
          if (res.ok) {
            const payload = await res.json();
            return { data: payload, source: 'quran_foundation_oauth2' };
          }
          break;
        } catch {
          break;
        } finally {
          clearTimeout(timer);
        }
      }
    }
  }

  // Attempt 2: Public Quran.com v4 API fallback (identical v4 route & schema structure)
  if (qfConfig.publicFallbackBaseUrl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    try {
      const res = await fetch(buildUrl(qfConfig.publicFallbackBaseUrl), {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (res.ok) {
        const payload = await res.json();
        return { data: payload, source: 'quran_foundation_public_v4' };
      }
    } catch {
      // Fall through to offline curated corpus
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

async function tryFetchUpstreamJson(
  baseUrl: string,
  path: string,
  params: Record<string, string | number | undefined>
): Promise<any | null> {
  const apiKey = process.env.ISLAMIC_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }

  try {
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const url = new URL(path.replace(/^\/+/, ''), normalizedBase);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        url.searchParams.set(k, String(v));
      }
    }
    url.searchParams.set('api_key', apiKey.trim());

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    try {
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok) return null;
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsService = () =>
    strapi.plugin(PLUGIN_ID).service('settings') as {
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
      const { lat, lon } = sanitizeCoordinates(
        params?.lat ?? settings.defaultLat,
        params?.lon ?? settings.defaultLon,
        settings.defaultLat,
        settings.defaultLon
      );
      const city = sanitizePlainText(params?.city || settings.city, 80) || settings.city;
      const country =
        sanitizePlainText(params?.country || settings.country, 80) || settings.country;

      let externalTimesOverride: Partial<Record<string, string>> | undefined;

      if (settings.externalApiEnabled && process.env.ISLAMIC_API_KEY) {
        const cacheKey = `prayer:${date}:${lat}:${lon}:${settings.method}:${settings.school}:${settings.shifting}`;
        const cached = getCached<Record<string, string>>(cacheKey);
        if (cached) {
          externalTimesOverride = cached;
        } else {
          const upstream = await tryFetchUpstreamJson(
            settings.externalApiBaseUrl,
            'prayer-time/',
            {
              lat,
              lon,
              method: settings.method,
              school: settings.school,
              calender: settings.calender,
              shifting: settings.shifting,
              date,
            }
          );
          if (upstream?.data?.times && typeof upstream.data.times === 'object') {
            externalTimesOverride = upstream.data.times as Record<string, string>;
            setCached(cacheKey, externalTimesOverride, settings.cacheTtlSeconds || 3600);
          }
        }
      }

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
      const { lat, lon } = sanitizeCoordinates(
        params?.lat ?? settings.defaultLat,
        params?.lon ?? settings.defaultLon,
        settings.defaultLat,
        settings.defaultLon
      );
      const city = sanitizePlainText(params?.city || settings.city, 80) || settings.city;
      const country =
        sanitizePlainText(params?.country || settings.country, 80) || settings.country;

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
      const { lat, lon } = sanitizeCoordinates(
        params?.lat ?? settings.defaultLat,
        params?.lon ?? settings.defaultLon,
        settings.defaultLat,
        settings.defaultLon
      );
      const city = sanitizePlainText(params?.city || settings.city, 80) || settings.city;
      const country =
        sanitizePlainText(params?.country || settings.country, 80) || settings.country;
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

      let recentHilalAnnouncements: Array<Record<string, unknown>> = [];
      try {
        recentHilalAnnouncements = await strapi
          .documents(`plugin::${PLUGIN_ID}.hilal-announcement`)
          .findMany({ limit: 10, sort: 'createdAt:desc' });
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
      direction?: 'gregorian_to_hijri' | 'hijri_to_gregorian';
      date?: string;
      hijriYear?: number | string;
      hijriMonth?: number | string;
      hijriDay?: number | string;
      locale?: string;
    }) {
      const settings = await getSettingsService().getSettings();
      const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
      const shiftingNum = Number(settings.shifting || 0);

      if (params?.direction === 'hijri_to_gregorian') {
        const y = Math.max(1300, Math.min(1600, Number(params.hijriYear) || 1448));
        const m = Math.max(1, Math.min(12, Number(params.hijriMonth) || 1));
        const d = Math.max(1, Math.min(30, Number(params.hijriDay) || 1));
        const gregorian = hijriToGregorian(y, m, d, shiftingNum);
        const hijri = gregorianToHijri(gregorian, shiftingNum, locale);
        return {
          direction: 'hijri_to_gregorian',
          gregorianDate: gregorian,
          hijri,
        };
      }

      const gregorian = sanitizeIsoDateYmd(params?.date);
      const hijri = gregorianToHijri(gregorian, shiftingNum, locale);
      const hawl = calculateHawlMaturity(gregorian, shiftingNum);
      return {
        direction: 'gregorian_to_hijri',
        gregorianDate: gregorian,
        hijri,
        hawlIfNisabReachedOnDate: hawl,
      };
    },

    async confirmHilalSighting(input: {
      occasion: 'ramadan' | 'eid_al_fitr' | 'dhul_hijjah_eid_al_adha' | 'monthly_hilal';
      hijriYear?: number;
      hijriMonth?: number;
      confirmedGregorianDate: string;
      shifting?: string;
      approvedByImam?: string;
      notes?: Record<string, string>;
      activateBanner?: boolean;
      dispatchBroadcast?: boolean;
    }) {
      const settingsService = getSettingsService();
      const current = await settingsService.getSettings();

      const confirmedDate = sanitizeIsoDateYmd(input.confirmedGregorianDate);
      const shifting = sanitizeHijriShift(input.shifting ?? current.shifting, current.shifting);
      const hijriDetails = gregorianToHijri(confirmedDate, Number(shifting), 'es');

      const hijriYear = Number(input.hijriYear) || hijriDetails.year;
      const hijriMonth = Number(input.hijriMonth) || hijriDetails.monthNumber;
      const approvedByImam =
        sanitizePlainText(input.approvedByImam, 120) || 'Sheikh Principal de la Mezquita';

      const nextRamadan = { ...current.ramadan };
      const nextEid = { ...current.eid };

      if (input.occasion === 'ramadan') {
        nextRamadan.confirmedStartGregorian = confirmedDate;
        nextRamadan.hijriYear = hijriYear;
        if (input.activateBanner !== undefined) {
          nextRamadan.bannerActive = Boolean(input.activateBanner);
        } else {
          nextRamadan.bannerActive = true;
        }
      } else if (input.occasion === 'eid_al_fitr') {
        nextEid.eidAlFitrDateGregorian = confirmedDate;
        nextEid.eidAlFitrActive = true;
        nextRamadan.bannerActive = false;
      } else if (input.occasion === 'dhul_hijjah_eid_al_adha') {
        nextEid.eidAlAdhaDateGregorian = confirmedDate;
        nextEid.eidAlAdhaActive = true;
      }

      const updatedSettings = await settingsService.updateSettings({
        shifting,
        ramadan: nextRamadan,
        eid: nextEid,
      });

      let announcementDoc: Record<string, unknown> | null = null;
      try {
        announcementDoc = await strapi
          .documents(`plugin::${PLUGIN_ID}.hilal-announcement`)
          .create({
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

      // Optional Ecosystem Bridge: Inbox Alert Banner
      if (input.activateBanner && updatedSettings.enableInboxAlertBridge) {
        try {
          if (strapi.contentTypes?.['plugin::inbox.alert-banner']) {
            const titleEs =
              input.occasion === 'ramadan'
                ? `🌙 ¡Ramadán Mubarak ${hijriYear} AH! Inicio confirmado: ${confirmedDate}`
                : input.occasion === 'eid_al_fitr'
                  ? `🎉 ¡Eid al-Fitr Mubarak ${hijriYear} AH! Oración de Eid: ${confirmedDate}`
                  : `🕌 Anuncio Oficial de Hilal (${confirmedDate})`;
            await strapi.documents('plugin::inbox.alert-banner').create({
              data: {
                title: titleEs,
                severity: 'announcement',
                active: true,
              },
            });
          }
        } catch {
          // Non-fatal bridge
        }
      }

      return {
        settings: updatedSettings,
        announcement: announcementDoc,
      };
    },

    async getScriptureHub(params?: {
      date?: string;
      locale?: string;
      category?: string;
      topic?: string;
      surahNumber?: number | string;
    }) {
      const settings = await getSettingsService().getSettings();
      const date = sanitizeIsoDateYmd(params?.date);
      const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
      const topicFilter = sanitizePlainText(params?.topic, 60).toLowerCase();
      const categoryFilter = sanitizePlainText(params?.category, 60).toLowerCase();

      let customEntries: Array<Record<string, any>> = [];
      try {
        customEntries = await strapi
          .documents(`plugin::${PLUGIN_ID}.scripture-entry`)
          .findMany({
            filters: { active: true },
            limit: 100,
          });
      } catch {
        customEntries = [];
      }

      const customAyat: CuratedAyahItem[] = customEntries
        .filter((e) => e.entryKind === 'ayah')
        .map((e) => ({
          id: String(e.slug || e.documentId),
          surahNumber: Number(String(e.referenceKey || '1:1').split(':')[0]) || 1,
          ayahNumber: Number(String(e.referenceKey || '1:1').split(':')[1]) || 1,
          referenceKey: String(e.referenceKey || '1:1'),
          surahNameAr: '',
          surahNameTranslit: String(e.referenceKey || ''),
          arabicUthmani: String(e.arabicText || ''),
          transliteration: String(e.transliteration || ''),
          translations: (e.translations || { es: '', en: '', ar: '', tr: '' }) as any,
          reflections: (e.reflections || { es: '', en: '', ar: '', tr: '' }) as any,
          topicTags: Array.isArray(e.topicTags) ? e.topicTags : [],
          audioUrl: String(e.audioUrl || ''),
        }));

      const customHadiths: CuratedHadithItem[] = customEntries
        .filter((e) => e.entryKind === 'hadith')
        .map((e) => ({
          id: String(e.slug || e.documentId),
          collectionSlug: 'nawawi40',
          collectionNames: {
            es: String(e.referenceKey || 'Hadith'),
            en: String(e.referenceKey || 'Hadith'),
            ar: String(e.referenceKey || 'حديث'),
            tr: String(e.referenceKey || 'Hadis'),
          },
          hadithNumber: String(e.referenceKey || '1'),
          grading: e.gradingOrCategory === 'Hasan' ? 'Hasan' : 'Sahih',
          narrator: { es: '', en: '', ar: '', tr: '' },
          arabicText: String(e.arabicText || ''),
          transliteration: String(e.transliteration || ''),
          translations: (e.translations || { es: '', en: '', ar: '', tr: '' }) as any,
          keyTakeaways: (e.reflections || { es: '', en: '', ar: '', tr: '' }) as any,
          topicTags: Array.isArray(e.topicTags) ? e.topicTags : [],
        }));

      const customDuas: CuratedDuaItem[] = customEntries
        .filter((e) => e.entryKind === 'dua')
        .map((e) => ({
          id: String(e.slug || e.documentId),
          category: (e.gradingOrCategory as any) || 'travel_daily',
          categoryLabels: {
            es: 'Súplica Comunitaria',
            en: 'Community Supplication',
            ar: 'دعاء مختار',
            tr: 'Seçilmiş Dua',
          },
          titles: (e.reflections || {
            es: String(e.referenceKey || 'Dua'),
            en: String(e.referenceKey || 'Dua'),
            ar: String(e.referenceKey || 'دعاء'),
            tr: String(e.referenceKey || 'Dua'),
          }) as any,
          arabicText: String(e.arabicText || ''),
          transliteration: String(e.transliteration || ''),
          translations: (e.translations || { es: '', en: '', ar: '', tr: '' }) as any,
          virtueAndSource: {
            es: String(e.referenceKey || ''),
            en: String(e.referenceKey || ''),
            ar: String(e.referenceKey || ''),
            tr: String(e.referenceKey || ''),
          },
          recommendedRepetitions: Number(e.recommendedRepetitions) || 1,
          topicTags: Array.isArray(e.topicTags) ? e.topicTags : [],
        }));

      let ayat = [...CURATED_AYAT, ...customAyat];
      let hadiths = [...CURATED_HADITHS, ...customHadiths];
      let duas = [...CURATED_DUAS, ...customDuas];

      if (topicFilter) {
        ayat = ayat.filter((a) => a.topicTags.some((t) => t.toLowerCase().includes(topicFilter)));
        hadiths = hadiths.filter((h) =>
          h.topicTags.some((t) => t.toLowerCase().includes(topicFilter))
        );
        duas = duas.filter((d) => d.topicTags.some((t) => t.toLowerCase().includes(topicFilter)));
      }

      if (categoryFilter) {
        duas = duas.filter((d) => d.category.toLowerCase() === categoryFilter);
      }

      const dailyInspiration = getDailyInspirationBundle(
        date,
        locale,
        settings.dailyPins
      );

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
    },

    async getQuranChapters(params?: { locale?: string }) {
      const settings = await getSettingsService().getSettings();
      const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
      const qf = settings.quranFoundation;
      const cacheKey = `qf:chapters:${locale}`;
      const cached = getCached<any>(cacheKey);
      if (cached) return cached;

      const upstream = await fetchQuranFoundationV4Json(qf, 'chapters', {
        language: locale,
      });

      const chapters = Array.isArray(upstream?.data?.chapters)
        ? upstream.data.chapters
        : SURAH_DIRECTORY.map((s) => ({
            id: s.number,
            revelation_place: s.revelationType === 'Meccan' ? 'makkah' : 'madinah',
            name_simple: s.transliteration,
            name_arabic: s.nameAr,
            verses_count: s.ayahCount,
            translated_name: {
              language_name: locale,
              name: s.names[locale] || s.names.es,
            },
          }));

      const result = {
        locale,
        source: upstream?.source || 'curated_corpus',
        chaptersCount: chapters.length,
        chapters,
        surahDirectory: SURAH_DIRECTORY,
        translationPolicy: {
          disableBrowserAutoTranslate: Boolean(qf?.disableBrowserAutoTranslate ?? true),
          htmlAttributes: { translate: 'no', className: 'notranslate' },
        },
      };

      setCached(cacheKey, result, settings.cacheTtlSeconds || 3600);
      return result;
    },

    async getQuranChapterInfo(params: { chapterNumber: number | string; locale?: string }) {
      const settings = await getSettingsService().getSettings();
      const chapterNumber = sanitizeSurahNumber(params?.chapterNumber, 1);
      const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
      const qf = settings.quranFoundation;

      const cacheKey = `qf:chapter-info:${chapterNumber}:${locale}`;
      const cached = getCached<any>(cacheKey);
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

      const localSurah =
        SURAH_DIRECTORY.find((s) => s.number === chapterNumber) || SURAH_DIRECTORY[0];

      const result = {
        chapterNumber,
        locale,
        source:
          chapterRes?.source ||
          infoRes?.source ||
          'curated_corpus',
        surah: localSurah,
        chapter: chapterRes?.data?.chapter || {
          id: localSurah.number,
          name_simple: localSurah.transliteration,
          name_arabic: localSurah.nameAr,
          verses_count: localSurah.ayahCount,
          revelation_place: localSurah.revelationType === 'Meccan' ? 'makkah' : 'madinah',
          translated_name: {
            language_name: locale,
            name: localSurah.names[locale] || localSurah.names.es,
          },
        },
        chapterInfo: infoRes?.data?.chapter_info || null,
      };

      setCached(cacheKey, result, settings.cacheTtlSeconds || 3600);
      return result;
    },

    async getQuranChapterVerses(params: {
      chapterNumber: number | string;
      locale?: string;
      page?: number | string;
      perPage?: number | string;
      script?: string;
      words?: boolean | string;
      reciterId?: number | string;
      translations?: string;
      tafsirs?: string;
    }) {
      const settings = await getSettingsService().getSettings();
      const qf = settings.quranFoundation;
      const chapterNumber = sanitizeSurahNumber(params?.chapterNumber, 1);
      const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
      const page = sanitizePositiveInt(params?.page, 1, 1, 300);
      const perPage = sanitizePositiveInt(params?.perPage, 20, 1, 50);
      const script = sanitizeQuranScript(params?.script, qf.defaultScript);
      const includeWords =
        params?.words !== undefined
          ? String(params.words) === 'true' || String(params.words) === '1'
          : qf.includeWordByWordByDefault;
      const reciterId = sanitizePositiveInt(
        params?.reciterId,
        qf.defaultReciterId || 7,
        1,
        500
      );

      const defaultTranslationIds = [
        ...(qf.defaultTranslationIdsByLocale?.[locale] || [83]),
        ...(qf.includeTransliterationByDefault ? [57] : []),
      ];
      const translationsParam =
        sanitizePlainText(params?.translations, 80).replace(/[^0-9,]/g, '') ||
        Array.from(new Set(defaultTranslationIds)).join(',');

      const tafsirsParam = sanitizePlainText(params?.tafsirs, 80).replace(
        /[^0-9,]/g,
        ''
      );

      const cacheKey = `qf:verses:${chapterNumber}:${locale}:${page}:${perPage}:${script}:${includeWords}:${reciterId}:${translationsParam}:${tafsirsParam}`;
      const cached = getCached<any>(cacheKey);
      if (cached) return cached;

      const upstream = await fetchQuranFoundationV4Json(
        qf,
        `verses/by_chapter/${chapterNumber}`,
        {
          language: locale,
          words: includeWords ? 'true' : 'false',
          translations: translationsParam,
          audio: reciterId,
          tafsirs: tafsirsParam || undefined,
          fields:
            'text_uthmani,text_uthmani_tajweed,text_uthmani_simple,text_imlaei,text_indopak_nastaleeq,chapter_id,verse_number,verse_key,juz_number,hizb_number,rub_el_hizb_number,page_number,sajdah_number',
          word_fields: includeWords
            ? 'text_uthmani,text_indopak,verse_key,location,audio_url'
            : undefined,
          translation_fields: 'resource_name,language_name',
          page,
          per_page: perPage,
        },
        { targetSurah: chapterNumber }
      );

      const localSurah =
        SURAH_DIRECTORY.find((s) => s.number === chapterNumber) || SURAH_DIRECTORY[0];
      const fallbackCuratedAyat = CURATED_AYAT.filter(
        (a) => a.surahNumber === chapterNumber
      );

      const verses = Array.isArray(upstream?.data?.verses)
        ? upstream.data.verses
        : fallbackCuratedAyat.map((a) => ({
            id: a.ayahNumber,
            chapter_id: a.surahNumber,
            verse_number: a.ayahNumber,
            verse_key: a.referenceKey,
            text_uthmani: a.arabicUthmani,
            translations: [
              {
                resource_id: locale === 'es' ? 83 : 20,
                language_name: locale,
                text: a.translations[locale] || a.translations.es,
              },
              {
                resource_id: 57,
                language_name: 'transliteration',
                text: a.transliteration,
              },
            ],
            audio: {
              url: a.audioUrl,
            },
          }));

      const pagination = upstream?.data?.pagination || {
        per_page: perPage,
        current_page: page,
        next_page: null,
        total_pages: 1,
        total_records: verses.length,
      };

      const result = {
        chapterNumber,
        surah: localSurah,
        locale,
        script,
        reciterId,
        translationsRequested: translationsParam,
        source: upstream?.source || 'curated_corpus',
        verses,
        pagination,
        translationPolicy: {
          disableBrowserAutoTranslate: Boolean(qf?.disableBrowserAutoTranslate ?? true),
          htmlAttributes: { translate: 'no', className: 'notranslate' },
        },
      };

      setCached(cacheKey, result, settings.cacheTtlSeconds || 3600);
      return result;
    },

    async getQuranVerseByKey(params: {
      verseKey: string;
      locale?: string;
      words?: boolean | string;
      reciterId?: number | string;
      translations?: string;
      tafsirs?: string;
    }) {
      const settings = await getSettingsService().getSettings();
      const qf = settings.quranFoundation;
      const verseKey = sanitizeVerseKey(params?.verseKey, '1:1');
      const [surahNum] = verseKey.split(':').map(Number);
      const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
      const includeWords =
        params?.words !== undefined
          ? String(params.words) === 'true' || String(params.words) === '1'
          : true;
      const reciterId = sanitizePositiveInt(
        params?.reciterId,
        qf.defaultReciterId || 7,
        1,
        500
      );

      const defaultTranslationIds = [
        ...(qf.defaultTranslationIdsByLocale?.[locale] || [83]),
        ...(qf.includeTransliterationByDefault ? [57] : []),
      ];
      const translationsParam =
        sanitizePlainText(params?.translations, 80).replace(/[^0-9,]/g, '') ||
        Array.from(new Set(defaultTranslationIds)).join(',');

      const defaultTafsirIds = qf.defaultTafsirIdsByLocale?.[locale] || [169];
      const tafsirsParam =
        sanitizePlainText(params?.tafsirs, 80).replace(/[^0-9,]/g, '') ||
        defaultTafsirIds.join(',');

      const cacheKey = `qf:verse:${verseKey}:${locale}:${includeWords}:${reciterId}:${translationsParam}:${tafsirsParam}`;
      const cached = getCached<any>(cacheKey);
      if (cached) return cached;

      const upstream = await fetchQuranFoundationV4Json(
        qf,
        `verses/by_key/${verseKey}`,
        {
          language: locale,
          words: includeWords ? 'true' : 'false',
          translations: translationsParam,
          audio: reciterId,
          tafsirs: tafsirsParam,
          fields:
            'text_uthmani,text_uthmani_tajweed,text_uthmani_simple,text_imlaei,text_indopak_nastaleeq,chapter_id,verse_number,verse_key,juz_number,hizb_number,rub_el_hizb_number,page_number,sajdah_number',
          word_fields: includeWords
            ? 'text_uthmani,text_indopak,verse_key,location,audio_url'
            : undefined,
          translation_fields: 'resource_name,language_name',
        },
        { targetSurah: surahNum }
      );

      const localSurah =
        SURAH_DIRECTORY.find((s) => s.number === surahNum) || SURAH_DIRECTORY[0];
      const curatedMatch =
        CURATED_AYAT.find(
          (a) =>
            a.referenceKey === verseKey ||
            (a.surahNumber === surahNum && a.referenceKey.startsWith(`${surahNum}:`))
        ) || CURATED_AYAT[0];

      const verse = upstream?.data?.verse || {
        id: curatedMatch.ayahNumber,
        chapter_id: curatedMatch.surahNumber,
        verse_number: curatedMatch.ayahNumber,
        verse_key: verseKey,
        text_uthmani: curatedMatch.arabicUthmani,
        translations: [
          {
            resource_id: locale === 'es' ? 83 : 20,
            language_name: locale,
            text: curatedMatch.translations[locale] || curatedMatch.translations.es,
          },
          {
            resource_id: 57,
            language_name: 'transliteration',
            text: curatedMatch.transliteration,
          },
        ],
        audio: {
          url: curatedMatch.audioUrl,
        },
      };

      const result = {
        verseKey,
        surah: localSurah,
        locale,
        source: upstream?.source || 'curated_corpus',
        verse,
        curatedReflection:
          curatedMatch.referenceKey === verseKey ? curatedMatch.reflections : null,
        translationPolicy: {
          disableBrowserAutoTranslate: Boolean(qf?.disableBrowserAutoTranslate ?? true),
          htmlAttributes: { translate: 'no', className: 'notranslate' },
        },
      };

      setCached(cacheKey, result, settings.cacheTtlSeconds || 3600);
      return result;
    },

    async getQuranAyahHadiths(params: {
      verseKey: string;
      locale?: string;
      page?: number | string;
      limit?: number | string;
    }) {
      const settings = await getSettingsService().getSettings();
      const qf = settings.quranFoundation;
      const verseKey = sanitizeVerseKey(params?.verseKey, '1:1');
      const [surahNum] = verseKey.split(':').map(Number);
      const locale = sanitizeLocale(params?.locale, settings.defaultLocale);
      // Quran Foundation v4.0.0 `/hadith_references/by_ayah/{ayah_key}/hadiths` supports `en` and `ar`
      const qfHadithLanguage = locale === 'ar' ? 'ar' : 'en';
      const page = sanitizePositiveInt(params?.page, 1, 1, 50);
      const limit = sanitizePositiveInt(params?.limit, 4, 1, 20);

      const cacheKey = `qf:ayah-hadiths:${verseKey}:${qfHadithLanguage}:${page}:${limit}`;
      const cached = getCached<any>(cacheKey);
      if (cached) return cached;

      const [hadithsRes, answersRes] = await Promise.all([
        fetchQuranFoundationV4Json(
          qf,
          `hadith_references/by_ayah/${verseKey}/hadiths`,
          {
            language: qfHadithLanguage,
            page,
            limit,
          },
          { targetSurah: surahNum }
        ),
        fetchQuranFoundationV4Json(
          qf,
          `answers/by_ayah/${verseKey}`,
          {
            language: qfHadithLanguage,
          },
          { targetSurah: surahNum }
        ),
      ]);

      const hadiths = Array.isArray(hadithsRes?.data?.hadiths)
        ? hadithsRes.data.hadiths
        : [];
      const answers = Array.isArray(answersRes?.data?.answers)
        ? answersRes.data.answers
        : Array.isArray(answersRes?.data)
          ? answersRes.data
          : [];

      const result = {
        verseKey,
        locale,
        qfHadithLanguage,
        source:
          hadithsRes?.source ||
          answersRes?.source ||
          'curated_corpus',
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
    },

    async getQuranChapterAudio(params: {
      chapterNumber: number | string;
      reciterId?: number | string;
      segments?: boolean | string;
    }) {
      const settings = await getSettingsService().getSettings();
      const qf = settings.quranFoundation;
      const chapterNumber = sanitizeSurahNumber(params?.chapterNumber, 1);
      const reciterId = sanitizePositiveInt(
        params?.reciterId,
        qf.defaultChapterReciterId || 7,
        1,
        500
      );
      const segments =
        params?.segments === undefined
          ? true
          : String(params.segments) === 'true' || String(params.segments) === '1';

      const cacheKey = `qf:chapter-audio:${reciterId}:${chapterNumber}:${segments}`;
      const cached = getCached<any>(cacheKey);
      if (cached) return cached;

      const upstream = await fetchQuranFoundationV4Json(
        qf,
        `chapter_recitations/${reciterId}/${chapterNumber}`,
        {
          segments: segments ? 'true' : 'false',
        },
        { targetSurah: chapterNumber }
      );

      const paddedChapter = String(chapterNumber).padStart(3, '0');
      const audioFile = upstream?.data?.audio_file || {
        id: chapterNumber,
        chapter_id: chapterNumber,
        format: 'mp3',
        audio_url: `https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal/${chapterNumber}.mp3`,
        fallback_cdn_url: `https://server8.mp3quran.net/afs/${paddedChapter}.mp3`,
        timestamps: [],
      };

      const result = {
        chapterNumber,
        reciterId,
        segmentsIncluded: segments,
        source: upstream?.source || 'curated_audio_cdn',
        audioFile,
      };

      setCached(cacheKey, result, settings.cacheTtlSeconds || 3600);
      return result;
    },

    async getQuranResources(params?: { locale?: string }) {
      const settings = await getSettingsService().getSettings();
      const qf = settings.quranFoundation;
      const locale = sanitizeLocale(params?.locale, settings.defaultLocale);

      const cacheKey = `qf:resources:${locale}`;
      const cached = getCached<any>(cacheKey);
      if (cached) return cached;

      const [translationsRes, recitationsRes, chapterRecitersRes, tafsirsRes] =
        await Promise.all([
          fetchQuranFoundationV4Json(qf, 'resources/translations', {
            language: locale,
          }),
          fetchQuranFoundationV4Json(qf, 'resources/recitations', {
            language: locale,
          }),
          fetchQuranFoundationV4Json(qf, 'resources/chapter_reciters', {
            language: locale,
          }),
          fetchQuranFoundationV4Json(qf, 'resources/tafsirs', {
            language: locale,
          }),
        ]);

      const result = {
        locale,
        source:
          translationsRes?.source ||
          recitationsRes?.source ||
          'curated_defaults',
        translations: translationsRes?.data?.translations || [
          { id: 83, name: 'Sheikh Isa Garcia', language_name: 'spanish' },
          { id: 140, name: 'Montada Islamic Foundation', language_name: 'spanish' },
          { id: 20, name: 'Saheeh International', language_name: 'english' },
          { id: 85, name: 'M.A.S. Abdel Haleem', language_name: 'english' },
          { id: 77, name: 'Diyanet İşleri', language_name: 'turkish' },
          { id: 57, name: 'Transliteration', language_name: 'english' },
        ],
        recitations: recitationsRes?.data?.recitations || [
          { id: 7, reciter_name: 'Mishari Rashid al-`Afasy', style: 'Murattal' },
          { id: 2, reciter_name: 'AbdulBaset AbdulSamad', style: 'Murattal' },
          { id: 3, reciter_name: 'Abdur-Rahman as-Sudais', style: 'Murattal' },
          { id: 4, reciter_name: 'Abu Bakr al-Shatri', style: 'Murattal' },
        ],
        chapterReciters: chapterRecitersRes?.data?.reciters || [],
        tafsirs: tafsirsRes?.data?.tafsirs || [
          { id: 169, name: 'Ibn Kathir (Abridged)', language_name: 'english' },
          { id: 16, name: 'Tafsir Muyassar', language_name: 'arabic' },
          { id: 14, name: 'Tafsir Ibn Kathir', language_name: 'arabic' },
        ],
      };

      setCached(cacheKey, result, Math.max(settings.cacheTtlSeconds || 3600, 43200));
      return result;
    },

    async getNisabThresholds(params?: {
      currency?: string;
      standard?: string;
      unit?: string;
    }): Promise<NisabThresholdResult> {
      const settings = await getSettingsService().getSettings();
      const currency = sanitizeCurrency(
        params?.currency,
        settings.fiqhRates.defaultCurrency
      );
      const standard = sanitizeNisabStandard(
        params?.standard,
        settings.fiqhRates.defaultStandard
      );
      const unit: 'g' | 'oz' = params?.unit === 'oz' ? 'oz' : 'g';

      let goldSpotOverridePerGram: number | undefined;
      let silverSpotOverridePerGram: number | undefined;
      let source: 'configured_or_live' | 'external_api' = 'configured_or_live';

      if (settings.externalApiEnabled && process.env.ISLAMIC_API_KEY) {
        const cacheKey = `nisab:${currency}:${standard}`;
        const cached = getCached<{ goldUnit: number; silverUnit: number }>(cacheKey);
        if (cached) {
          goldSpotOverridePerGram = cached.goldUnit;
          silverSpotOverridePerGram = cached.silverUnit;
          source = 'external_api';
        } else {
          const upstream = await tryFetchUpstreamJson(
            settings.externalApiBaseUrl,
            'zakat-nisab/',
            {
              standard,
              currency: currency.toLowerCase(),
              unit: 'g',
            }
          );
          const gPrice = Number(upstream?.data?.nisab_thresholds?.gold?.unit_price);
          const sPrice = Number(upstream?.data?.nisab_thresholds?.silver?.unit_price);
          if (Number.isFinite(gPrice) && gPrice > 0 && Number.isFinite(sPrice) && sPrice > 0) {
            goldSpotOverridePerGram = gPrice;
            silverSpotOverridePerGram = sPrice;
            source = 'external_api';
            setCached(
              cacheKey,
              { goldUnit: gPrice, silverUnit: sPrice },
              settings.cacheTtlSeconds || 3600
            );
          }
        }
      }

      return calculateNisabThresholds(settings.fiqhRates, {
        currency,
        standard,
        unit,
        goldSpotOverridePerGram,
        silverSpotOverridePerGram,
        source,
      });
    },

    async getAllCurrencyNisabEntries(params?: {
      standard?: string;
      unit?: string;
    }): Promise<NisabThresholdResult[]> {
      const currencies: SupportedCurrency[] = ['COP', 'USD', 'EUR', 'TRY'];
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
      const locale: SupportedLocale = sanitizeLocale(
        localeParam,
        settings.defaultLocale
      );
      const todayTimetable = await this.getDailyPrayerTimes({ locale });
      const observances = await this.getHijriAndObservances({ locale });
      const scripture = await this.getScriptureHub({ locale });
      const nisabCop = await this.getNisabThresholds({
        currency: 'COP',
        standard: settings.fiqhRates.defaultStandard,
      });
      const nisabUsd = await this.getNisabThresholds({
        currency: 'USD',
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

