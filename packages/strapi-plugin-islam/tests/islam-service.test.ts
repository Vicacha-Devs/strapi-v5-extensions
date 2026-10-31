import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLUGIN_ID,
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
          const created = { documentId: `doc-${docsByUid[uid].length + 1}`, ...data };
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

describe('@vicacha-devs/strapi-plugin-islam — Strapi Services, Controllers, Bridges & Quran Foundation v4', () => {
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

    const calSettings = strapi.__getCalendarSettings();
    assert.equal(calSettings.secondaryCalendars[0].dayOffset, -1);

    const hostPrayerDoc = strapi.__docsByUid['api::prayer-setting.prayer-setting'][0];
    assert.equal(hostPrayerDoc.shifting, '-1');
    assert.equal(hostPrayerDoc.ramadanBannerActive, true);

    const banners = strapi.__docsByUid['plugin::inbox.alert-banner'];
    assert.equal(banners.length, 1);

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
      assert.equal((ctxHadiths.body.data as any).source, 'quran_foundation_oauth2');
      assert.equal((ctxHadiths.body.data as any).hadiths.length, 1);
      assert.equal((ctxHadiths.body.data as any).hadiths[0].collection, 'bukhari');
      assert.equal((ctxHadiths.body.data as any).answers.length, 1);
      assert.equal(tokenRequests, 2);
      assert.ok(
        capturedAuthHeaders.some(
          (h) =>
            h.clientId === 'test-qf-client-id' &&
            h.authToken === 'mock-qf-token-2'
        )
      );

      const audioRes = (await islamService.getQuranChapterAudio({
        chapterNumber: 1,
        reciterId: 7,
        segments: true,
      })) as any;
      assert.equal(audioRes.source, 'quran_foundation_oauth2');
      assert.equal(audioRes.audioFile.timestamps.length, 1);
      assert.deepEqual(audioRes.audioFile.timestamps[0].segments[0], [1, 0, 1120]);

      const surah36Res = (await islamService.getQuranChapterVerses({
        chapterNumber: 36,
        locale: 'es',
      })) as any;
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
