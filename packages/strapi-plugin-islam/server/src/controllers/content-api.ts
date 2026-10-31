import type { Core } from "@strapi/strapi";

import {
  PLUGIN_ID,
  type FitranaFidyahKaffarahInput,
  type ZakatAlMalCalculationInput,
} from "../../../shared";
import type createIslamService from "../services/islamService";

type IslamServiceInstance = ReturnType<typeof createIslamService>;

export interface KoaContentContext {
  query?: Record<string, string | undefined>;
  params?: Record<string, string | undefined>;
  request?: {
    body?: Record<string, unknown>;
  };
  body?: unknown;
  status?: number;
  set: (header: string, value: string) => void;
}

function getQuery(ctx: KoaContentContext): Record<string, string | undefined> {
  return ctx.query || {};
}

function getParams(ctx: KoaContentContext): Record<string, string | undefined> {
  return ctx.params || {};
}

function getRequestBody<T>(ctx: KoaContentContext): T {
  const rawBody = ctx.request?.body;
  return (rawBody && typeof rawBody === "object" ? rawBody : {}) as T;
}

function setNoTranslateHeader(ctx: KoaContentContext): void {
  if (typeof ctx.set === "function") {
    ctx.set("X-Translation-Integrity", "notranslate");
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getIslamService = () =>
    strapi.plugin(PLUGIN_ID).service<IslamServiceInstance>("islamService");

  return {
    async getPrayerTimes(ctx: KoaContentContext) {
      const q = getQuery(ctx);
      const dateParam = typeof q.date === "string" ? q.date.trim() : undefined;

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

    async getMonthlyPrayerTimes(ctx: KoaContentContext) {
      const q = getQuery(ctx);
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

    async getPrayerCalendarIcs(ctx: KoaContentContext) {
      const q = getQuery(ctx);
      const icsContent = await getIslamService().getPrayerCalendarIcs({
        yearMonth: q.yearMonth || q.date,
        lat: q.lat,
        lon: q.lon,
        locale: q.locale,
      });
      ctx.set("Content-Type", "text/calendar; charset=utf-8");
      ctx.set("Content-Disposition", 'attachment; filename="salah-timetable.ics"');
      ctx.set("X-Content-Type-Options", "nosniff");
      ctx.body = icsContent;
    },

    async getQibla(ctx: KoaContentContext) {
      const q = getQuery(ctx);
      const data = await getIslamService().getQiblaCompass({
        lat: q.lat,
        lon: q.lon,
        city: q.city,
        country: q.country,
      });
      ctx.body = { data };
    },

    async getHijriAndObservances(ctx: KoaContentContext) {
      const q = getQuery(ctx);
      const data = await getIslamService().getHijriAndObservances({
        date: q.date,
        locale: q.locale,
      });
      ctx.body = { data };
    },

    async convertDate(ctx: KoaContentContext) {
      const q = getQuery(ctx);
      const direction =
        q.direction === "hijri_to_gregorian" ? "hijri_to_gregorian" : "gregorian_to_hijri";
      const data = await getIslamService().convertDate({
        direction,
        date: q.date,
        hijriYear: q.hijriYear,
        hijriMonth: q.hijriMonth,
        hijriDay: q.hijriDay,
        locale: q.locale,
      });
      ctx.body = { data };
    },

    async getScriptureHub(ctx: KoaContentContext) {
      const q = getQuery(ctx);
      const data = await getIslamService().getScriptureHub({
        date: q.date,
        locale: q.locale,
        category: q.category,
        topic: q.topic,
        surahNumber: q.surahNumber,
      });
      ctx.body = { data };
    },

    async getDailyInspiration(ctx: KoaContentContext) {
      const q = getQuery(ctx);
      const hub = await getIslamService().getScriptureHub({
        date: q.date,
        locale: q.locale,
      });
      ctx.body = { data: hub.dailyInspiration };
    },

    async getQuranChapters(ctx: KoaContentContext) {
      const q = getQuery(ctx);
      const data = await getIslamService().getQuranChapters({
        locale: q.locale,
      });
      setNoTranslateHeader(ctx);
      ctx.body = { data };
    },

    async getQuranChapterInfo(ctx: KoaContentContext) {
      const q = getQuery(ctx);
      const params = getParams(ctx);
      const data = await getIslamService().getQuranChapterInfo({
        chapterNumber: params.chapterNumber ?? q.chapterNumber ?? 1,
        locale: q.locale,
      });
      setNoTranslateHeader(ctx);
      ctx.body = { data };
    },

    async getQuranChapterVerses(ctx: KoaContentContext) {
      const q = getQuery(ctx);
      const params = getParams(ctx);
      const data = await getIslamService().getQuranChapterVerses({
        chapterNumber: params.chapterNumber ?? q.chapterNumber ?? 1,
        locale: q.locale,
        page: q.page,
        perPage: q.perPage ?? q.per_page,
        script: q.script,
        words: q.words,
        reciterId: q.reciterId ?? q.audio,
        translations: q.translations,
        tafsirs: q.tafsirs,
      });
      setNoTranslateHeader(ctx);
      ctx.body = { data };
    },

    async getQuranVerseByKey(ctx: KoaContentContext) {
      const q = getQuery(ctx);
      const params = getParams(ctx);
      const data = await getIslamService().getQuranVerseByKey({
        verseKey: params.verseKey ?? q.verseKey ?? "1:1",
        locale: q.locale,
        words: q.words,
        reciterId: q.reciterId ?? q.audio,
        translations: q.translations,
        tafsirs: q.tafsirs,
      });
      setNoTranslateHeader(ctx);
      ctx.body = { data };
    },

    async getQuranAyahHadiths(ctx: KoaContentContext) {
      const q = getQuery(ctx);
      const params = getParams(ctx);
      const data = await getIslamService().getQuranAyahHadiths({
        verseKey: params.verseKey ?? q.verseKey ?? "1:1",
        locale: q.locale,
        page: q.page,
        limit: q.limit,
      });
      setNoTranslateHeader(ctx);
      ctx.body = { data };
    },

    async getQuranChapterAudio(ctx: KoaContentContext) {
      const q = getQuery(ctx);
      const params = getParams(ctx);
      const data = await getIslamService().getQuranChapterAudio({
        chapterNumber: params.chapterNumber ?? q.chapterNumber ?? 1,
        reciterId: params.reciterId ?? q.reciterId,
        segments: q.segments,
      });
      ctx.body = { data };
    },

    async getQuranResources(ctx: KoaContentContext) {
      const q = getQuery(ctx);
      const data = await getIslamService().getQuranResources({
        locale: q.locale,
      });
      ctx.body = { data };
    },

    async getNisab(ctx: KoaContentContext) {
      const q = getQuery(ctx);
      if (q.allCurrencies === "true" || q.allCurrencies === "1") {
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

    async calculateZakat(ctx: KoaContentContext) {
      const body = getRequestBody<ZakatAlMalCalculationInput>(ctx);
      const data = await getIslamService().calculateZakat(body);
      ctx.body = { data };
    },

    async calculateFitranaFidyah(ctx: KoaContentContext) {
      const body = getRequestBody<FitranaFidyahKaffarahInput>(ctx);
      const data = await getIslamService().calculateFitranaFidyah(body);
      ctx.body = { data };
    },
  };
};
