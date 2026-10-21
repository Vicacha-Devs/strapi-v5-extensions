import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ASMA_UL_HUSNA,
  CURATED_AYAT,
  CURATED_DUAS,
  CURATED_HADITHS,
  DEFAULT_ISLAM_SETTINGS,
  FIVE_PILLARS_REFERENCE,
  PLUGIN_ID,
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
  resolveIqamahTime,
  sanitizeCoordinates,
  sanitizeQuranScript,
  sanitizeSurahNumber,
  sanitizeVerseKey,
} from '../shared';
import createSettingsService from '../server/src/services/settings';
import createIslamService, {
  clearQuranFoundationCaches,
} from '../server/src/services/islamService';
import serverPlugin from '../server/src/index';
import adminPlugin from '../admin/src/index';

function createMockStrapi(customConfig: Record<string, any> = {}) {
  const storeMap = new Map<string, unknown>();
  const docsByUid: Record<string, Array<Record<string, any>>> = {
    'api::prayer-setting.prayer-setting': [
      {
        documentId: 'prayer-setting-doc-1',
        method: '3',
        school: '1',
        calender: 'MATHEMATICAL',
        shifting: '0',
        defaultLat: 4.6685,
        defaultLon: -74.0758,
        jumuahKhutbahTime: '12:15 PM',
        jumuahPrayerTime: '12:45 PM',
        ramadanBannerActive: false,
      },
    ],
    'plugin::islam.hilal-announcement': [],
    'plugin::islam.scripture-entry': [],
    'plugin::inbox.alert-banner': [],
  };

  let calendarSettings: any = {
    secondaryCalendars: [
      { id: 'hijri', intlCalendar: 'islamic-umalqura', dayOffset: 0 },
    ],
  };

  const strapi: any = {
    config: {
      get(key: string, fallback?: any) {
        if (key === `plugin::${PLUGIN_ID}`) return customConfig;
        return fallback;
      },
    },
    log: {
      debug() {},
      info() {},
      warn() {},
      error() {},
    },
    contentTypes: {
      'api::prayer-setting.prayer-setting': { kind: 'singleType' },
      'plugin::islam.hilal-announcement': { kind: 'collectionType' },
      'plugin::islam.scripture-entry': { kind: 'collectionType' },
      'plugin::inbox.alert-banner': { kind: 'collectionType' },
    },
    store() {
      return {
        async get({ key }: { key: string }) {
          return storeMap.get(key);
        },
        async set({ key, value }: { key: string; value: unknown }) {
          storeMap.set(key, value);
        },
      };
    },
    documents(uid: string) {
      if (!docsByUid[uid]) docsByUid[uid] = [];
      return {
        async findMany() {
          return docsByUid[uid];
        },
        async create({ data }: { data: Record<string, any> }) {
          const created = { documentId: `doc-${ docsByUid[uid].length + 1 }`, ...data };
          docsByUid[uid].unshift(created);
          return created;
        },
        async update({
          documentId,
          data,
        }: {
          documentId: string;
          data: Record<string, any>;
        }) {
          const idx = docsByUid[uid].findIndex((d) => d.documentId === documentId);
          if (idx >= 0) {
            docsByUid[uid][idx] = { ...docsByUid[uid][idx], ...data };
            return docsByUid[uid][idx];
          }
          return null;
        },
      };
    },
    plugin(name: string) {
      if (name === PLUGIN_ID) {
        return {
          service(sName: string) {
            if (sName === 'settings') return settingsService;
            if (sName === 'islamService') return islamService;
            return null;
          },
        };
      }
      if (name === 'calendar') {
        return {
          service(sName: string) {
            if (sName === 'settings') {
              return {
                async getSettings() {
                  return calendarSettings;
                },
                async updateSettings(next: any) {
                  calendarSettings = next;
                  return calendarSettings;
                },
              };
            }
            return null;
          },
        };
      }
      return { service: () => null };
    },
    __docsByUid: docsByUid,
    __getCalendarSettings: () => calendarSettings,
  };

  const settingsService = createSettingsService({ strapi });
  const islamService = createIslamService({ strapi });

  return { strapi, settingsService, islamService };
}

describe('@vicacha-devs/strapi-plugin-islam — Astronomical Salah, Qibla, Hijri, Scripture & Fiqh Suite', () => {
  it('calculates accurate Qibla Great-Circle bearing and Haversine distance from Bogotá to the Kaaba in Makkah', () => {
    const qibla = calculateQiblaCompass(4.6685, -74.0758, 'Bogotá', 'Colombia');
    assert.ok(qibla.direction.degrees > 64 && qibla.direction.degrees < 66.5);
    assert.equal(qibla.direction.cardinal, 'ENE');
    assert.equal(qibla.direction.from, 'True North');
    assert.ok(qibla.distance.kilometers > 12000 && qibla.distance.kilometers < 12500);
    assert.ok(qibla.distance.miles > 7400 && qibla.distance.miles < 7800);
  });

  it('computes Daily & Monthly Salah, Adhan, Iqamah, Prohibited (Makruh) windows, and .ics calendar feed', () => {
    const timetable = computeDailyPrayerTimetable('2026-10-20', DEFAULT_ISLAM_SETTINGS, {
      nowMinutesOverride: 13 * 60, // 1:00 PM (during Dhuhr window)
    });

    assert.equal(timetable.dateGregorian, '2026-10-20');
    assert.equal(timetable.activePrayer, 'dhuhr');
    assert.equal(timetable.nextPrayer, 'asr');
    assert.equal(timetable.prohibitedTimes.isCurrentlyProhibited, false);
    assert.match(timetable.times.fajr, /^\d{2}:\d{2}$/);
    assert.match(timetable.times.dhuhr, /^\d{2}:\d{2}$/);
    assert.match(timetable.times.asr, /^\d{2}:\d{2}$/);
    assert.match(timetable.times.maghrib, /^\d{2}:\d{2}$/);
    assert.match(timetable.times.isha, /^\d{2}:\d{2}$/);

    // Verify Iqamah offset rule (+20 min for Fajr)
    const fajrRule = resolveIqamahTime('fajr', 280, DEFAULT_ISLAM_SETTINGS.iqamahRules);
    assert.equal(fajrRule.iqamahMinutes, 300);
    assert.equal(fajrRule.iqamah, '05:00');

    // Verify Monthly timetable & RFC 5545 .ics generation
    const monthly = computeMonthlyPrayerTimetable('2026-10', DEFAULT_ISLAM_SETTINGS);
    assert.equal(monthly.length, 31);
    const ics = generatePrayerCalendarIcs(monthly.slice(0, 2), 'Mezquita Central de Bogotá');
    assert.ok(ics.includes('BEGIN:VCALENDAR'));
    assert.ok(ics.includes('BEGIN:VEVENT'));
    assert.ok(ics.includes('END:VCALENDAR'));
  });

  it('converts Gregorian <-> Hijri dates with shifting offsets, detects Ayyam al-Beed, and computes upcoming Islamic observances & Hawl', () => {
    const hijriBase = gregorianToHijri('2026-10-20', 0, 'es');
    const hijriShifted = gregorianToHijri('2026-10-20', 1, 'es');
    assert.ok(hijriBase.year >= 1448);
    assert.notEqual(hijriBase.date, hijriShifted.date);

    const roundTripGreg = hijriToGregorian(
      hijriBase.year,
      hijriBase.monthNumber,
      hijriBase.day,
      0
    );
    assert.equal(roundTripGreg, '2026-10-20');

    const observances = computeUpcomingObservances('2026-10-20', 0, 'es');
    assert.ok(observances.length >= 8);
    assert.ok(observances.some((o) => o.slug === 'start-of-ramadan'));
    assert.ok(observances.some((o) => o.slug === 'eid-al-fitr'));
    assert.ok(observances.some((o) => o.slug === 'eid-al-adha'));

    const hawl = calculateHawlMaturity('2025-10-01', 0);
    assert.equal(hawl.lunarDays, 354);
    assert.equal(hawl.isMatured, true);
  });

  it('provides full 114 Surah directory, curated Ayat, Hadiths, Hisnul Muslim Duas, Asma-ul-Husna, Tasbih presets, and Daily Inspiration pinning', () => {
    assert.equal(SURAH_DIRECTORY.length, 114);
    assert.equal(SURAH_DIRECTORY[0].transliteration, 'Al-Fatihah');
    assert.equal(SURAH_DIRECTORY[113].transliteration, 'An-Nas');
    assert.ok(CURATED_AYAT.length >= 6);
    assert.ok(CURATED_HADITHS.length >= 4);
    assert.ok(CURATED_DUAS.length >= 5);
    assert.ok(ASMA_UL_HUSNA.length >= 5);
    assert.ok(TASBIH_PRESETS.length >= 4);
    assert.equal(FIVE_PILLARS_REFERENCE.length, 5);

    const dailyAuto = getDailyInspirationBundle('2026-10-20', 'es');
    assert.equal(dailyAuto.isPinnedOverride.ayah, false);

    const dailyPinned = getDailyInspirationBundle('2026-10-20', 'es', {
      pinnedAyahId: 'al-ikhlas-112-1-4',
    });
    assert.equal(dailyPinned.isPinnedOverride.ayah, true);
    assert.equal(dailyPinned.ayahOfTheDay.referenceKey, '112:1-4');
  });

  it('calculates Zakat al-Mal (with 24K/22K/18K gold carat purity & agricultural Ushr), Nisab (common & classical), Zakat al-Fitr, Fidyah, and Kaffarah', () => {
    const nisabCommon = calculateNisabThresholds(DEFAULT_ISLAM_SETTINGS.fiqhRates, {
      currency: 'COP',
      standard: 'common',
    });
    assert.equal(nisabCommon.gold.weightGrams, 85);
    assert.equal(nisabCommon.silver.weightGrams, 595);
    assert.equal(nisabCommon.gold.nisabAmount, 85 * 385000);

    const nisabClassical = calculateNisabThresholds(DEFAULT_ISLAM_SETTINGS.fiqhRates, {
      currency: 'USD',
      standard: 'classical',
    });
    assert.equal(nisabClassical.gold.weightGrams, 87.48);
    assert.equal(nisabClassical.silver.weightGrams, 612.36);

    const zakatResult = calculateZakatAlMal(
      {
        currency: 'COP',
        standard: 'common',
        benchmark: 'gold',
        cashAndBank: 40_000_000,
        goldGrams24K: 10,
        goldGrams18K: 8, // 8g * 0.75 = 6g pure gold equivalent
        shortTermLiabilities: 5_000_000,
        agriculturalProduceValue: 10_000_000,
        agriculturalIrrigation: 'irrigated_5',
      },
      DEFAULT_ISLAM_SETTINGS.fiqhRates
    );

    assert.equal(zakatResult.meetsNisab, true);
    // 16g pure gold * 385,000 = 6,160,000 COP
    assert.equal(zakatResult.breakdown.goldAndSilverComputedValue, 6_160_000);
    // Net wealth = 40,000,000 + 6,160,000 - 5,000,000 = 41,160,000 COP
    assert.equal(zakatResult.breakdown.netZakatableWealth, 41_160_000);
    // 2.5% of 41,160,000 = 1,029,000 COP
    assert.equal(zakatResult.wealthZakatDue, 1_029_000);
    // 5% irrigated Ushr on 10,000,000 = 500,000 COP
    assert.equal(zakatResult.agriculturalUshrDue, 500_000);
    assert.equal(zakatResult.totalZakatPayable, 1_529_000);

    const fitranaResult = calculateFitranaFidyahKaffarah(
      {
        currency: 'COP',
        householdMembersForFitrana: 4,
        missedFastDaysForFidyah: 5,
        brokenOathKaffarahCount: 1,
        voluntarySadaqahAmount: 50_000,
      },
      DEFAULT_ISLAM_SETTINGS.fiqhRates
    );
    assert.equal(fitranaResult.zakatAlFitr.totalDue, 4 * 35_000);
    assert.equal(fitranaResult.fidyah.totalDue, 5 * 25_000);
    assert.equal(fitranaResult.kaffarah.totalDue, 250_000);
    assert.equal(fitranaResult.grandTotalPayable, 140_000 + 125_000 + 250_000 + 50_000);
  });

  it('integrates settings, Hilal confirmation, CalendarHijri offset sync, and Inbox Alert Banner bridge via Strapi service', async () => {
    const { strapi, islamService } = createMockStrapi();

    const hilalRes = await islamService.confirmHilalSighting({
      occasion: 'ramadan',
      hijriYear: 1448,
      hijriMonth: 9,
      confirmedGregorianDate: '2027-02-08',
      shifting: '-1',
      approvedByImam: 'Sheikh Ahmad',
      activateBanner: true,
    });

    assert.equal(hilalRes.settings.shifting, '-1');
    assert.equal(hilalRes.settings.ramadan.bannerActive, true);
    assert.equal(hilalRes.settings.ramadan.confirmedStartGregorian, '2027-02-08');

    // Verify Calendar plugin Hijri offset bridge was updated to -1
    const calSettings = strapi.__getCalendarSettings();
    assert.equal(calSettings.secondaryCalendars[0].dayOffset, -1);

    // Verify host `api::prayer-setting.prayer-setting` was synced
    const hostPrayerDoc = strapi.__docsByUid['api::prayer-setting.prayer-setting'][0];
    assert.equal(hostPrayerDoc.shifting, '-1');
    assert.equal(hostPrayerDoc.ramadanBannerActive, true);

    // Verify Inbox Alert Banner was created
    const banners = strapi.__docsByUid['plugin::inbox.alert-banner'];
    assert.equal(banners.length, 1);

    // Verify Coordinate sanitization rejects out-of-bounds values
    const safeCoords = sanitizeCoordinates(999, -999, 4.6685, -74.0758);
    assert.equal(safeCoords.lat, 4.6685);
    assert.equal(safeCoords.lon, -74.0758);
  });

  it('exposes Strapi v5 server controllers, content-api routes, and admin i18n translations', async () => {
    const { strapi } = createMockStrapi();
    serverPlugin.register({ strapi });
    await serverPlugin.bootstrap({ strapi });

    const contentCtrl = serverPlugin.controllers['content-api']({ strapi });
    const ctxPrayer: any = { query: { date: '2026-10-20', locale: 'es' }, body: null };
    await contentCtrl.getPrayerTimes(ctxPrayer);
    assert.equal(ctxPrayer.body.data.dateGregorian, '2026-10-20');

    const headers: Record<string, string> = {};
    const ctxIcs: any = {
      query: { yearMonth: '2026-10' },
      set(k: string, v: string) {
        headers[k] = v;
      },
      body: null,
    };
    await contentCtrl.getPrayerCalendarIcs(ctxIcs);
    assert.equal(headers['X-Content-Type-Options'], 'nosniff');
    assert.ok(String(ctxIcs.body).includes('BEGIN:VCALENDAR'));

    const trads = await adminPlugin.registerTrads({ locales: ['es', 'en', 'ar', 'tr'] });
    assert.ok(trads.length >= 4);
  });

  it('integrates Quran Foundation Content API v4.0.0 OAuth2 Client Credentials, 401 retry, prelive Surah awareness, Ayah-linked Hadiths, Audio timestamps, and Translation Integrity Policy', async () => {
    // 1. Validate Quran Foundation parameter sanitizers
    assert.equal(sanitizeSurahNumber(114), 114);
    assert.equal(sanitizeSurahNumber(999, 1), 1);
    assert.equal(sanitizeVerseKey('2:255'), '2:255');
    assert.equal(sanitizeVerseKey('999:999', '1:1'), '1:1');
    assert.equal(sanitizeQuranScript('indopak_nastaleeq'), 'indopak_nastaleeq');
    assert.equal(sanitizeQuranScript('invalid_script'), 'uthmani');

    clearQuranFoundationCaches();

    const originalFetch = globalThis.fetch;
    const prevId = process.env.QF_CLIENT_ID;
    const prevSecret = process.env.QF_CLIENT_SECRET;
    const prevEnv = process.env.QF_ENV;

    process.env.QF_CLIENT_ID = 'test-qf-client-id';
    process.env.QF_CLIENT_SECRET = 'test-qf-client-secret';
    process.env.QF_ENV = 'prelive';

    let tokenRequests = 0;
    let firstVerseCall401Triggered = false;
    const capturedAuthHeaders: Array<{ authToken: string | null; clientId: string | null; url: string }> = [];

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = String(input);

      if (urlStr.includes('/oauth2/token')) {
        tokenRequests++;
        return new Response(
          JSON.stringify({
            access_token: `mock-qf-token-${tokenRequests}`,
            token_type: 'bearer',
            expires_in: 3600,
            scope: 'content',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const hdrs = new Headers(init?.headers);
      capturedAuthHeaders.push({
        authToken: hdrs.get('x-auth-token'),
        clientId: hdrs.get('x-client-id'),
        url: urlStr,
      });

      // Simulate 401 on very first Content API request to verify automatic single token refresh retry
      if (urlStr.includes('apis-prelive.quran.foundation') && !firstVerseCall401Triggered) {
        firstVerseCall401Triggered = true;
        return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
      }

      if (urlStr.includes('/hadith_references/by_ayah/2:255/hadiths')) {
        return new Response(
          JSON.stringify({
            hadiths: [
              {
                collection: 'bukhari',
                bookNumber: '66',
                hadithNumber: '5010',
                urn: 46870,
                hadith: [
                  {
                    lang: 'en',
                    chapterTitle: 'The Virtues of the Quran',
                    body: '<p>Whenever you go to bed, recite Ayat-ul-Kursi (2:255) from beginning to end.</p>',
                    grades: [{ graded_by: 'Sahih Bukhari', grade: 'Sahih' }],
                  },
                ],
              },
            ],
            total: 1,
            limit: 4,
            page: 1,
            has_more: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.includes('/answers/by_ayah/2:255')) {
        return new Response(
          JSON.stringify({
            answers: [
              {
                id: 101,
                question: 'What is the virtue of Ayat al-Kursi (2:255)?',
                summary: 'It is the greatest verse in the Book of Allah.',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.includes('/chapter_recitations/7/1')) {
        return new Response(
          JSON.stringify({
            audio_file: {
              id: 1,
              chapter_id: 1,
              format: 'mp3',
              audio_url: 'https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal/1.mp3',
              timestamps: [
                {
                  verse_key: '1:1',
                  timestamp_from: 0,
                  timestamp_to: 6050,
                  duration: 6050,
                  segments: [
                    [1, 0, 1120],
                    [2, 1120, 2430],
                  ],
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.includes('/verses/by_chapter/36')) {
        // Surah 36 (Ya-Sin) in prelive mode automatically routes to publicFallbackBaseUrl (api.quran.com/api/v4)
        return new Response(
          JSON.stringify({
            verses: [
              {
                id: 3706,
                chapter_id: 36,
                verse_number: 1,
                verse_key: '36:1',
                text_uthmani: 'يسٓ',
                translations: [{ resource_id: 83, text: 'Ya. Sin.' }],
              },
            ],
            pagination: {
              per_page: 20,
              current_page: 1,
              next_page: null,
              total_pages: 1,
              total_records: 83,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({}), { status: 404 });
    }) as typeof fetch;

    try {
      const { strapi, islamService } = createMockStrapi();
      const contentCtrl = serverPlugin.controllers['content-api']({ strapi });

      // A. Test v4.0.0 Ayah-linked Hadiths & Answers for Surah 2 (supported in prelive + triggers 401 retry)
      const hadithHeaders: Record<string, string> = {};
      const ctxHadiths: any = {
        params: { verseKey: '2:255' },
        query: { locale: 'es', limit: '4' },
        set(k: string, v: string) {
          hadithHeaders[k] = v;
        },
        body: null,
      };
      await contentCtrl.getQuranAyahHadiths(ctxHadiths);
      assert.equal(hadithHeaders['X-Translation-Integrity'], 'notranslate');
      assert.equal(ctxHadiths.body.data.source, 'quran_foundation_oauth2');
      assert.equal(ctxHadiths.body.data.hadiths.length, 1);
      assert.equal(ctxHadiths.body.data.hadiths[0].collection, 'bukhari');
      assert.equal(ctxHadiths.body.data.answers.length, 1);
      // Verify OAuth2 token was refreshed after simulated 401
      assert.equal(tokenRequests, 2);
      assert.ok(
        capturedAuthHeaders.some(
          (h) =>
            h.clientId === 'test-qf-client-id' &&
            h.authToken === 'mock-qf-token-2'
        )
      );

      // B. Test Chapter Audio with word-level segment triplets
      const audioRes = await islamService.getQuranChapterAudio({
        chapterNumber: 1,
        reciterId: 7,
        segments: true,
      });
      assert.equal(audioRes.source, 'quran_foundation_oauth2');
      assert.equal(audioRes.audioFile.timestamps.length, 1);
      assert.deepEqual(audioRes.audioFile.timestamps[0].segments[0], [1, 0, 1120]);

      // C. Test Prelive Surah 36 (Ya-Sin) seamlessly falling back to Public v4 API since Prelive only holds Surahs 1-2
      const surah36Res = await islamService.getQuranChapterVerses({
        chapterNumber: 36,
        locale: 'es',
      });
      assert.equal(surah36Res.source, 'quran_foundation_public_v4');
      assert.equal(surah36Res.verses[0].verse_key, '36:1');
      assert.equal(surah36Res.translationPolicy.disableBrowserAutoTranslate, true);
      assert.equal(surah36Res.translationPolicy.htmlAttributes.translate, 'no');
    } finally {
      globalThis.fetch = originalFetch;
      if (prevId === undefined) delete process.env.QF_CLIENT_ID;
      else process.env.QF_CLIENT_ID = prevId;
      if (prevSecret === undefined) delete process.env.QF_CLIENT_SECRET;
      else process.env.QF_CLIENT_SECRET = prevSecret;
      if (prevEnv === undefined) delete process.env.QF_ENV;
      else process.env.QF_ENV = prevEnv;
      clearQuranFoundationCaches();
    }
  });
});


