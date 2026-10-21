import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../../shared';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getIslamService = () => strapi.plugin(PLUGIN_ID).service('islamService') as any;

  return {
    async getPrayerTimes(ctx: any) {
      const q = ctx.query || {};
      const dateParam = typeof q.date === 'string' ? q.date.trim() : undefined;

      if (dateParam && /^\d{4}-\d{2}$/.test(dateParam)) {
        const monthly = await getIslamService().getMonthlyPrayerTimes({
          yearMonth: dateParam,
          lat: q.lat,
          lon: q.lon,
          city: q.city,
          country: q.country,
          locale: q.locale,
        });
        ctx.body = { data: monthly };
        return;
      }

      const daily = await getIslamService().getDailyPrayerTimes({
        date: dateParam,
        lat: q.lat,
        lon: q.lon,
        city: q.city,
        country: q.country,
        locale: q.locale,
      });
      ctx.body = { data: daily };
    },

    async getMonthlyPrayerTimes(ctx: any) {
      const q = ctx.query || {};
      const data = await getIslamService().getMonthlyPrayerTimes({
        yearMonth: q.yearMonth || q.date,
        lat: q.lat,
        lon: q.lon,
        city: q.city,
        country: q.country,
        locale: q.locale,
      });
      ctx.body = { data };
    },

    async getPrayerCalendarIcs(ctx: any) {
      const q = ctx.query || {};
      const icsContent = await getIslamService().getPrayerCalendarIcs({
        yearMonth: q.yearMonth || q.date,
        lat: q.lat,
        lon: q.lon,
        locale: q.locale,
      });
      ctx.set('Content-Type', 'text/calendar; charset=utf-8');
      ctx.set('Content-Disposition', 'attachment; filename="salah-timetable.ics"');
      ctx.set('X-Content-Type-Options', 'nosniff');
      ctx.body = icsContent;
    },

    async getQibla(ctx: any) {
      const q = ctx.query || {};
      const data = await getIslamService().getQiblaCompass({
        lat: q.lat,
        lon: q.lon,
        city: q.city,
        country: q.country,
      });
      ctx.body = { data };
    },

    async getHijriAndObservances(ctx: any) {
      const q = ctx.query || {};
      const data = await getIslamService().getHijriAndObservances({
        date: q.date,
        locale: q.locale,
      });
      ctx.body = { data };
    },

    async convertDate(ctx: any) {
      const q = ctx.query || {};
      const data = await getIslamService().convertDate({
        direction: q.direction,
        date: q.date,
        hijriYear: q.hijriYear,
        hijriMonth: q.hijriMonth,
        hijriDay: q.hijriDay,
        locale: q.locale,
      });
      ctx.body = { data };
    },

    async getScriptureHub(ctx: any) {
      const q = ctx.query || {};
      const data = await getIslamService().getScriptureHub({
        date: q.date,
        locale: q.locale,
        category: q.category,
        topic: q.topic,
        surahNumber: q.surahNumber,
      });
      ctx.body = { data };
    },

    async getDailyInspiration(ctx: any) {
      const q = ctx.query || {};
      const hub = await getIslamService().getScriptureHub({
        date: q.date,
        locale: q.locale,
      });
      ctx.body = { data: hub.dailyInspiration };
    },

    async getQuranChapters(ctx: any) {
      const q = ctx.query || {};
      const data = await getIslamService().getQuranChapters({
        locale: q.locale,
      });
      if (typeof ctx.set === 'function') {
        ctx.set('X-Translation-Integrity', 'notranslate');
      }
      ctx.body = { data };
    },

    async getQuranChapterInfo(ctx: any) {
      const q = ctx.query || {};
      const params = ctx.params || {};
      const data = await getIslamService().getQuranChapterInfo({
        chapterNumber: params.chapterNumber ?? q.chapterNumber,
        locale: q.locale,
      });
      if (typeof ctx.set === 'function') {
        ctx.set('X-Translation-Integrity', 'notranslate');
      }
      ctx.body = { data };
    },

    async getQuranChapterVerses(ctx: any) {
      const q = ctx.query || {};
      const params = ctx.params || {};
      const data = await getIslamService().getQuranChapterVerses({
        chapterNumber: params.chapterNumber ?? q.chapterNumber,
        locale: q.locale,
        page: q.page,
        perPage: q.perPage ?? q.per_page,
        script: q.script,
        words: q.words,
        reciterId: q.reciterId ?? q.audio,
        translations: q.translations,
        tafsirs: q.tafsirs,
      });
      if (typeof ctx.set === 'function') {
        ctx.set('X-Translation-Integrity', 'notranslate');
      }
      ctx.body = { data };
    },

    async getQuranVerseByKey(ctx: any) {
      const q = ctx.query || {};
      const params = ctx.params || {};
      const data = await getIslamService().getQuranVerseByKey({
        verseKey: params.verseKey ?? q.verseKey,
        locale: q.locale,
        words: q.words,
        reciterId: q.reciterId ?? q.audio,
        translations: q.translations,
        tafsirs: q.tafsirs,
      });
      if (typeof ctx.set === 'function') {
        ctx.set('X-Translation-Integrity', 'notranslate');
      }
      ctx.body = { data };
    },

    async getQuranAyahHadiths(ctx: any) {
      const q = ctx.query || {};
      const params = ctx.params || {};
      const data = await getIslamService().getQuranAyahHadiths({
        verseKey: params.verseKey ?? q.verseKey,
        locale: q.locale,
        page: q.page,
        limit: q.limit,
      });
      if (typeof ctx.set === 'function') {
        ctx.set('X-Translation-Integrity', 'notranslate');
      }
      ctx.body = { data };
    },

    async getQuranChapterAudio(ctx: any) {
      const q = ctx.query || {};
      const params = ctx.params || {};
      const data = await getIslamService().getQuranChapterAudio({
        chapterNumber: params.chapterNumber ?? q.chapterNumber,
        reciterId: params.reciterId ?? q.reciterId,
        segments: q.segments,
      });
      ctx.body = { data };
    },

    async getQuranResources(ctx: any) {
      const q = ctx.query || {};
      const data = await getIslamService().getQuranResources({
        locale: q.locale,
      });
      ctx.body = { data };
    },

    async getNisab(ctx: any) {
      const q = ctx.query || {};
      if (q.allCurrencies === 'true' || q.allCurrencies === '1') {
        const entries = await getIslamService().getAllCurrencyNisabEntries({
          standard: q.standard,
          unit: q.unit,
        });
        ctx.body = { data: entries };
        return;
      }

      const data = await getIslamService().getNisabThresholds({
        currency: q.currency,
        standard: q.standard,
        unit: q.unit,
      });
      ctx.body = { data };
    },

    async calculateZakat(ctx: any) {
      const body =
        ctx.request?.body && typeof ctx.request.body === 'object'
          ? ctx.request.body
          : {};
      const data = await getIslamService().calculateZakat(body);
      ctx.body = { data };
    },

    async calculateFitranaFidyah(ctx: any) {
      const body =
        ctx.request?.body && typeof ctx.request.body === 'object'
          ? ctx.request.body
          : {};
      const data = await getIslamService().calculateFitranaFidyah(body);
      ctx.body = { data };
    },
  };
};

