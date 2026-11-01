import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ASMA_UL_HUSNA,
  CURATED_AYAT,
  CURATED_DUAS,
  CURATED_HADITHS,
  DEFAULT_ISLAM_SETTINGS,
  FIVE_PILLARS_REFERENCE,
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
} from "../shared";

describe("@vicacha-devs/strapi-plugin-islam — Astronomical Salah, Qibla, Hijri, Scripture & Fiqh Suite", () => {
  it("calculates accurate Qibla Great-Circle bearing and Haversine distance from Bogotá to the Kaaba in Makkah", () => {
    const qibla = calculateQiblaCompass(4.6685, -74.0758, "Bogotá", "Colombia");
    assert.ok(qibla.direction.degrees > 64 && qibla.direction.degrees < 66.5);
    assert.equal(qibla.direction.cardinal, "ENE");
    assert.equal(qibla.direction.from, "True North");
    assert.ok(
      qibla.distance.kilometers > 12000 && qibla.distance.kilometers < 12500
    );
    assert.ok(qibla.distance.miles > 7400 && qibla.distance.miles < 7800);
  });

  it("computes Daily & Monthly Salah, Adhan, Iqamah, Prohibited (Makruh) windows, and .ics calendar feed", () => {
    const timetable = computeDailyPrayerTimetable(
      "2026-10-20",
      DEFAULT_ISLAM_SETTINGS,
      {
        nowMinutesOverride: 13 * 60, // 1:00 PM (during Dhuhr window)
      }
    );

    assert.equal(timetable.dateGregorian, "2026-10-20");
    assert.equal(timetable.activePrayer, "dhuhr");
    assert.equal(timetable.nextPrayer, "asr");
    assert.equal(timetable.prohibitedTimes.isCurrentlyProhibited, false);
    assert.match(timetable.times.fajr, /^\d{2}:\d{2}$/);
    assert.match(timetable.times.dhuhr, /^\d{2}:\d{2}$/);
    assert.match(timetable.times.asr, /^\d{2}:\d{2}$/);
    assert.match(timetable.times.maghrib, /^\d{2}:\d{2}$/);
    assert.match(timetable.times.isha, /^\d{2}:\d{2}$/);

    // Verify Iqamah offset rule (+20 min for Fajr)
    const fajrRule = resolveIqamahTime(
      "fajr",
      280,
      DEFAULT_ISLAM_SETTINGS.iqamahRules
    );
    assert.equal(fajrRule.iqamahMinutes, 300);
    assert.equal(fajrRule.iqamah, "05:00");

    // Verify Monthly timetable & RFC 5545 .ics generation
    const monthly = computeMonthlyPrayerTimetable(
      "2026-10",
      DEFAULT_ISLAM_SETTINGS
    );
    assert.equal(monthly.length, 31);
    const ics = generatePrayerCalendarIcs(
      monthly.slice(0, 2),
      "Mezquita Central de Bogotá"
    );
    assert.ok(ics.includes("BEGIN:VCALENDAR"));
    assert.ok(ics.includes("BEGIN:VEVENT"));
    assert.ok(ics.includes("END:VCALENDAR"));
  });

  it("converts Gregorian <-> Hijri dates with shifting offsets, detects Ayyam al-Beed, and computes upcoming Islamic observances & Hawl", () => {
    const hijriBase = gregorianToHijri("2026-10-20", 0, "es");
    const hijriShifted = gregorianToHijri("2026-10-20", 1, "es");
    assert.ok(hijriBase.year >= 1448);
    assert.notEqual(hijriBase.date, hijriShifted.date);

    const roundTripGreg = hijriToGregorian(
      hijriBase.year,
      hijriBase.monthNumber,
      hijriBase.day,
      0
    );
    assert.equal(roundTripGreg, "2026-10-20");

    const observances = computeUpcomingObservances("2026-10-20", 0, "es");
    assert.ok(observances.length >= 8);
    assert.ok(observances.some((o) => o.slug === "start-of-ramadan"));
    assert.ok(observances.some((o) => o.slug === "eid-al-fitr"));
    assert.ok(observances.some((o) => o.slug === "eid-al-adha"));

    const hawl = calculateHawlMaturity("2025-10-01", 0);
    assert.equal(hawl.lunarDays, 354);
    assert.equal(hawl.isMatured, true);
  });

  it("provides full 114 Surah directory, curated Ayat, Hadiths, Hisnul Muslim Duas, Asma-ul-Husna, Tasbih presets, and Daily Inspiration pinning", () => {
    assert.equal(SURAH_DIRECTORY.length, 114);
    assert.equal(SURAH_DIRECTORY[0].transliteration, "Al-Fatihah");
    assert.equal(SURAH_DIRECTORY[113].transliteration, "An-Nas");
    assert.ok(CURATED_AYAT.length >= 6);
    assert.ok(CURATED_HADITHS.length >= 4);
    assert.ok(CURATED_DUAS.length >= 5);
    assert.ok(ASMA_UL_HUSNA.length >= 5);
    assert.ok(TASBIH_PRESETS.length >= 4);
    assert.equal(FIVE_PILLARS_REFERENCE.length, 5);

    const dailyAuto = getDailyInspirationBundle("2026-10-20", "es");
    assert.equal(dailyAuto.isPinnedOverride.ayah, false);

    const dailyPinned = getDailyInspirationBundle("2026-10-20", "es", {
      pinnedAyahId: "al-ikhlas-112-1-4",
    });
    assert.equal(dailyPinned.isPinnedOverride.ayah, true);
    assert.equal(dailyPinned.ayahOfTheDay.referenceKey, "112:1-4");
  });

  it("calculates Zakat al-Mal (with 24K/22K/18K gold carat purity & agricultural Ushr), Nisab (common & classical), Zakat al-Fitr, Fidyah, and Kaffarah", () => {
    const nisabCommon = calculateNisabThresholds(
      DEFAULT_ISLAM_SETTINGS.fiqhRates,
      {
        currency: "COP",
        standard: "common",
      }
    );
    assert.equal(nisabCommon.gold.weightGrams, 85);
    assert.equal(nisabCommon.silver.weightGrams, 595);
    assert.equal(nisabCommon.gold.nisabAmount, 85 * 385000);

    const nisabClassical = calculateNisabThresholds(
      DEFAULT_ISLAM_SETTINGS.fiqhRates,
      {
        currency: "USD",
        standard: "classical",
      }
    );
    assert.equal(nisabClassical.gold.weightGrams, 87.48);
    assert.equal(nisabClassical.silver.weightGrams, 612.36);

    const zakatResult = calculateZakatAlMal(
      {
        currency: "COP",
        standard: "common",
        benchmark: "gold",
        cashAndBank: 40_000_000,
        goldGrams24K: 10,
        goldGrams18K: 8, // 8g * 0.75 = 6g pure gold equivalent
        shortTermLiabilities: 5_000_000,
        agriculturalProduceValue: 10_000_000,
        agriculturalIrrigation: "irrigated_5",
      },
      DEFAULT_ISLAM_SETTINGS.fiqhRates
    );

    assert.equal(zakatResult.meetsNisab, true);
    assert.equal(zakatResult.breakdown.goldAndSilverComputedValue, 6_160_000);
    assert.equal(zakatResult.breakdown.netZakatableWealth, 41_160_000);
    assert.equal(zakatResult.wealthZakatDue, 1_029_000);
    assert.equal(zakatResult.agriculturalUshrDue, 500_000);
    assert.equal(zakatResult.totalZakatPayable, 1_529_000);

    const fitranaResult = calculateFitranaFidyahKaffarah(
      {
        currency: "COP",
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
    assert.equal(
      fitranaResult.grandTotalPayable,
      140_000 + 125_000 + 250_000 + 50_000
    );
  });
});
