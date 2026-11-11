import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_ISLAM_SETTINGS,
  KAABA_COORDINATES,
  calculateFitranaFidyahKaffarah,
  calculateNisabThresholds,
  calculateQiblaCompass,
  calculateZakatAlMal,
  computeDailyPrayerTimetable,
  computeUpcomingObservances,
  generatePrayerCalendarIcs,
  getDailyInspirationBundle,
  gregorianToHijri,
  hijriToGregorian,
  isValidIsoDateYmd,
  isValidTimezone,
  minutesToHhMm,
  parseHhMmToMinutes,
  sanitizeElevationMeters,
  sanitizeImsakOffsetMinutes,
  sanitizeIsoDateYmd,
  sanitizeMinuteAdjustments,
  sanitizeTimezone,
  type FiqhRatesConfig,
  type IslamPluginSettings,
} from "../shared";

function assertMonotonicTimetable(
  label: string,
  dateIso: string,
  settings: IslamPluginSettings,
  lat: number,
  lon: number
) {
  const day = computeDailyPrayerTimetable(dateIso, settings, { lat, lon });
  const fajr = parseHhMmToMinutes(day.times.fajr);
  const sunrise = parseHhMmToMinutes(day.times.sunrise);
  const dhuhr = parseHhMmToMinutes(day.times.dhuhr);
  const asr = parseHhMmToMinutes(day.times.asr);
  const maghrib = parseHhMmToMinutes(day.times.maghrib);
  const isha = parseHhMmToMinutes(day.times.isha);

  assert.notEqual(fajr, null, `${label} fajr valid`);
  assert.notEqual(sunrise, null, `${label} sunrise valid`);
  assert.notEqual(dhuhr, null, `${label} dhuhr valid`);
  assert.notEqual(asr, null, `${label} asr valid`);
  assert.notEqual(maghrib, null, `${label} maghrib valid`);
  assert.notEqual(isha, null, `${label} isha valid`);

  assert.ok(fajr! >= 0 && fajr! < 1440, `${label} fajr in [0, 1440)`);
  assert.ok(isha! >= 0 && isha! < 1440, `${label} isha in [0, 1440)`);
  assert.ok(fajr! < sunrise!, `${label} fajr < sunrise`);
  assert.ok(sunrise! < dhuhr!, `${label} sunrise < dhuhr`);
  assert.ok(dhuhr! < asr!, `${label} dhuhr < asr`);
  assert.ok(asr! < maghrib!, `${label} asr < maghrib`);
  assert.ok(maghrib! < isha!, `${label} maghrib < isha`);
  return day;
}

function assertAllIcsEventsHaveValidRange(ics: string) {
  const events = ics.split("BEGIN:VEVENT").slice(1);
  assert.ok(events.length > 0, "has VEVENT blocks");
  for (const block of events) {
    const startMatch = /DTSTART;TZID=[^:]+:(\d{8}T\d{6})/.exec(block);
    const endMatch = /DTEND;TZID=[^:]+:(\d{8}T\d{6})/.exec(block);
    assert.ok(startMatch, "DTSTART present");
    assert.ok(endMatch, "DTEND present");
    assert.ok(
      startMatch[1] < endMatch[1],
      `Expected DTSTART (${startMatch[1]}) < DTEND (${endMatch[1]})`
    );
  }
}

describe("@vicacha-devs/strapi-plugin-islam — Astronomy, Timezone/DST, Qibla & Fiqh Edge Cases", () => {
  it("computes monotonic Oslo & Tromsø summer/winter timetables across all highLatitudeRules and valid .ics DTSTART < DTEND", () => {
    const rules: Array<IslamPluginSettings["highLatitudeRule"]> = [
      "AngleBased",
      "OneSeventh",
      "MiddleOfTheNight",
    ];
    const osloFajrByRule: Record<string, number> = {};

    for (const highLatitudeRule of rules) {
      const osloSettings: IslamPluginSettings = {
        ...DEFAULT_ISLAM_SETTINGS,
        timezone: "Europe/Oslo",
        highLatitudeRule,
        elevationMeters: 23,
      };

      const osloSummer = assertMonotonicTimetable(
        `Oslo summer (${highLatitudeRule})`,
        "2026-06-21",
        osloSettings,
        59.91,
        10.75
      );
      osloFajrByRule[highLatitudeRule] = osloSummer.prayers.fajr.adhanMinutes;

      const osloWinter = assertMonotonicTimetable(
        `Oslo winter (${highLatitudeRule})`,
        "2026-12-21",
        osloSettings,
        59.91,
        10.75
      );

      const tromsoSummer = assertMonotonicTimetable(
        `Tromsø summer (${highLatitudeRule})`,
        "2026-06-21",
        osloSettings,
        69.65,
        18.96
      );
      const tromsoWinter = assertMonotonicTimetable(
        `Tromsø winter (${highLatitudeRule})`,
        "2026-12-21",
        osloSettings,
        69.65,
        18.96
      );

      const ics = generatePrayerCalendarIcs(
        [osloSummer, osloWinter, tromsoSummer, tromsoWinter],
        "Nordic Mosque"
      );
      assertAllIcsEventsHaveValidRange(ics);
    }

    assert.notEqual(osloFajrByRule.OneSeventh, osloFajrByRule.AngleBased);
    assert.notEqual(osloFajrByRule.AngleBased, osloFajrByRule.MiddleOfTheNight);
    assert.ok(osloFajrByRule.MiddleOfTheNight < osloFajrByRule.AngleBased);
    assert.ok(osloFajrByRule.AngleBased < osloFajrByRule.OneSeventh);
  });

  it("handles America/New_York 23h/25h DST transitions accurately and falls back invalid timezones consistently to UTC", () => {
    assert.equal(isValidTimezone("America/New_York"), true);
    assert.equal(isValidTimezone("Invalid/Not_A_Zone"), false);
    assert.equal(sanitizeTimezone("Invalid/Not_A_Zone"), "UTC");

    const nySettings: IslamPluginSettings = {
      ...DEFAULT_ISLAM_SETTINGS,
      city: "New York",
      country: "USA",
      defaultLat: 40.7128,
      defaultLon: -74.006,
      elevationMeters: 10,
      timezone: "America/New_York",
      method: "2",
    };

    const beforeSpring = computeDailyPrayerTimetable("2026-03-07", nySettings);
    const onSpringDst = computeDailyPrayerTimetable("2026-03-08", nySettings);
    const springDelta =
      onSpringDst.prayers.dhuhr.adhanMinutes -
      beforeSpring.prayers.dhuhr.adhanMinutes;
    assert.ok(
      springDelta >= 58 && springDelta <= 62,
      `Expected ~+60m spring-forward shift, got ${springDelta}`
    );

    const beforeFall = computeDailyPrayerTimetable("2026-10-31", nySettings);
    const onFallDst = computeDailyPrayerTimetable("2026-11-01", nySettings);
    const fallDelta =
      onFallDst.prayers.dhuhr.adhanMinutes -
      beforeFall.prayers.dhuhr.adhanMinutes;
    assert.ok(
      fallDelta >= -62 && fallDelta <= -58,
      `Expected ~-60m fall-back shift, got ${fallDelta}`
    );

    const invalidTzDay = computeDailyPrayerTimetable("2026-06-15", {
      ...DEFAULT_ISLAM_SETTINGS,
      defaultLat: 0,
      defaultLon: 0,
      timezone: "Mars/Olympus_Mons",
    });
    assert.equal(invalidTzDay.location.timezone, "UTC");
    assert.ok(
      invalidTzDay.prayers.dhuhr.adhanMinutes >= 715 &&
        invalidTzDay.prayers.dhuhr.adhanMinutes <= 726
    );
  });

  it("clamps minuteAdjustments, elevationMeters, imsakOffsetMinutes, and non-finite minutesToHhMm", () => {
    assert.equal(minutesToHhMm(Number.NaN), "00:00");
    assert.equal(minutesToHhMm(Number.POSITIVE_INFINITY), "00:00");
    assert.equal(sanitizeElevationMeters(-500), 0);
    assert.equal(sanitizeElevationMeters(99_999), 9000);
    assert.equal(sanitizeImsakOffsetMinutes(-20), 0);
    assert.equal(sanitizeImsakOffsetMinutes(500), 120);

    const adj = sanitizeMinuteAdjustments({
      fajr: 999,
      dhuhr: -999,
      isha: Number.NaN,
    });
    assert.equal(adj.fajr, 120);
    assert.equal(adj.dhuhr, -120);
    assert.equal(adj.isha, 0);
    assert.equal(adj.asr, 0);
  });

  it("returns 0° North at exact Kaaba coordinates and wraps 359.999° to 0° instead of 360°", () => {
    const atKaaba = calculateQiblaCompass(
      KAABA_COORDINATES.lat,
      KAABA_COORDINATES.lon,
      "Makkah",
      "Saudi Arabia"
    );
    assert.equal(atKaaba.direction.degrees, 0);
    assert.equal(atKaaba.direction.cardinal, "N");
    assert.equal(atKaaba.distance.kilometers, 0);

    // Slightly east of due south of Kaaba so raw bearing is ~359.999°
    const nearNorthBearing = calculateQiblaCompass(
      10.0,
      KAABA_COORDINATES.lon + 0.0002
    );
    assert.equal(nearNorthBearing.direction.degrees, 0);
    assert.notEqual(nearNorthBearing.direction.degrees, 360);
    assert.equal(nearNorthBearing.direction.cardinal, "N");
  });

  it("guards Nisab & Zakat calculators against 0, negative, and NaN spot prices", () => {
    const poisonedRates: FiqhRatesConfig = {
      ...DEFAULT_ISLAM_SETTINGS.fiqhRates,
      goldPricePerGramByCurrency: {
        COP: 0,
        USD: -50,
        EUR: Number.NaN,
        TRY: 0,
      },
      silverPricePerGramByCurrency: {
        COP: -100,
        USD: 0,
        EUR: Number.NaN,
        TRY: -1,
      },
      stapleFoodWeightKg: 0,
    };

    const nisabUsd = calculateNisabThresholds(poisonedRates, {
      currency: "USD",
      goldSpotOverridePerGram: -50,
      silverSpotOverridePerGram: 0,
    });
    assert.ok(nisabUsd.gold.nisabAmount > 0);
    assert.equal(
      nisabUsd.gold.unitPrice,
      DEFAULT_ISLAM_SETTINGS.fiqhRates.goldPricePerGramByCurrency.USD
    );

    const zakatZeroWealth = calculateZakatAlMal(
      { currency: "USD", cashAndBank: 0 },
      poisonedRates
    );
    assert.ok(zakatZeroWealth.nisabThresholdAmount > 0);
    assert.equal(zakatZeroWealth.meetsNisab, false);
    assert.equal(zakatZeroWealth.wealthZakatDue, 0);

    const fitrana = calculateFitranaFidyahKaffarah(
      { currency: "USD", householdMembersForFitrana: 2 },
      poisonedRates
    );
    assert.equal(fitrana.zakatAlFitr.equivalentFoodKg, 5);
  });

  it("rejects impossible calendar dates like 2026-02-31, guards getDailyInspirationBundle('invalid'), ignores stale overrides, and honors MATHEMATICAL vs UAQ", () => {
    assert.equal(isValidIsoDateYmd("2026-02-31"), false);
    assert.equal(isValidIsoDateYmd("2026-02-29"), false);
    assert.equal(isValidIsoDateYmd("2024-02-29"), true);
    assert.equal(
      sanitizeIsoDateYmd("2026-02-31", new Date("2026-10-20T12:00:00Z")),
      "2026-10-20"
    );

    const inspiration = getDailyInspirationBundle("invalid");
    assert.match(inspiration.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(inspiration.ayahOfTheDay?.id);
    assert.ok(inspiration.hadithOfTheDay?.id);
    assert.ok(inspiration.duaOfTheDay?.id);
    assert.ok(inspiration.nameOfAllahOfTheDay?.number >= 1);

    const obsWithStaleOverride = computeUpcomingObservances(
      "2026-10-20",
      0,
      "en",
      { ramadanStartGregorian: "2025-03-01" },
      "UAQ"
    );
    const ramadanObs = obsWithStaleOverride.find(
      (o) => o.slug === "start-of-ramadan"
    );
    assert.ok(ramadanObs);
    assert.notEqual(ramadanObs.estimatedGregorianDate, "2025-03-01");
    assert.ok(ramadanObs.daysUntil > 60);

    const mathHijri = gregorianToHijri("2026-02-18", 0, "en", "MATHEMATICAL");
    const mathRoundTrip = hijriToGregorian(
      mathHijri.year,
      mathHijri.monthNumber,
      mathHijri.day,
      0,
      "MATHEMATICAL"
    );
    assert.equal(mathRoundTrip, "2026-02-18");
  });

  it("normalizes solar noon across the International Date Line for Apia, Samoa (Pacific/Apia, UTC+13)", () => {
    const apiaSettings: IslamPluginSettings = {
      ...DEFAULT_ISLAM_SETTINGS,
      city: "Apia",
      country: "Samoa",
      defaultLat: -13.8333,
      defaultLon: -171.7667,
      elevationMeters: 2,
      timezone: "Pacific/Apia",
      method: "3",
    };

    const apiaSolstice = assertMonotonicTimetable(
      "Apia Samoa winter solstice",
      "2026-06-21",
      apiaSettings,
      -13.8333,
      -171.7667
    );
    const dhuhrMin = apiaSolstice.prayers.dhuhr.adhanMinutes;
    assert.ok(
      dhuhrMin >= 735 && dhuhrMin <= 765,
      `Expected Apia Dhuhr near 12:30 local (735..765m), got ${apiaSolstice.times.dhuhr} (${dhuhrMin}m)`
    );
  });
});
