import { describe, it, expect } from "vitest";

import {
  formatDateInCalendarSystem,
  extractCalendarParts,
  resolveOccurrenceAlternateDates,
  registerCalendarSystemFormatter,
} from "../shared/calendarSystems";
import {
  generateIcsCalendar,
  buildCalendarLinks,
} from "../shared/icalGenerator";
import {
  parseRRule,
  buildRRule,
  describeRRule,
  parseRRuleFieldValue,
  expandRuleSlots,
} from "../shared/rruleEngine";

describe("RFC 5545 RRULE & RFC 7529 RSCALE Recurrence Engine", () => {
  it("parses and builds standard RFC 5545 RRULE strings and RFC 7529 RSCALE strings", () => {
    const parsedWeekly = parseRRule(
      "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,FR;COUNT=10"
    );
    expect(parsedWeekly.freq).toBe("WEEKLY");
    expect(parsedWeekly.interval).toBe(1);
    expect(parsedWeekly.byDay).toEqual(["MO", "FR"]);
    expect(parsedWeekly.count).toBe(10);

    const parsedRscale = parseRRule(
      "RSCALE=ISLAMIC-UMALQURA;FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=1"
    );
    expect(parsedRscale.rscale).toBe("islamic-umalqura");
    expect(parsedRscale.freq).toBe("YEARLY");
    expect(parsedRscale.byMonth).toBe(9);
    expect(parsedRscale.byMonthDay).toBe(1);

    const built = buildRRule(parsedRscale);
    expect(built).toContain("RSCALE=ISLAMIC-UMALQURA");
    expect(built).toContain("FREQ=YEARLY");
    expect(built).toContain("BYMONTH=9");
    expect(built).toContain("BYMONTHDAY=1");

    const human = describeRRule(built);
    expect(human).toContain("[ISLAMIC-UMALQURA]");
    expect(human).toContain("Every year");
  });

  it("expands standard Gregorian weekly occurrences and respects EXDATE exclusions", () => {
    const recurrence = parseRRuleFieldValue({
      rrule: "FREQ=WEEKLY;BYDAY=FR",
      timezone: "UTC",
      exdates: ["2026-05-08"],
      overrides: {},
    });

    const slots = expandRuleSlots({
      baseStartDate: "2026-05-01T13:00:00.000Z", // Friday
      baseEndDate: "2026-05-01T14:00:00.000Z",
      recurrence,
      windowStart: "2026-05-01T00:00:00.000Z",
      windowEnd: "2026-05-25T23:59:59.000Z",
    });

    // Fridays in range: May 1, May 8 (excluded), May 15, May 22 -> 3 occurrences
    expect(slots.length).toBe(3);
    expect(slots[0].startDate).toBe("2026-05-01T13:00:00.000Z");
    expect(slots[1].startDate).toBe("2026-05-15T13:00:00.000Z");
    expect(slots[2].startDate).toBe("2026-05-22T13:00:00.000Z");
  });

  it("expands RFC 7529 RSCALE non-Gregorian occurrences (e.g. Islamic Umm al-Qura 1st of Ramadan)", () => {
    const probeDate = new Date("2026-02-18T12:00:00.000Z");
    const probeParts = extractCalendarParts(probeDate, "islamic-umalqura", 0);
    expect(probeParts?.year).toBeGreaterThan(1440);

    const rrule = `RSCALE=ISLAMIC-UMALQURA;FREQ=YEARLY;BYMONTH=${probeParts?.month};BYMONTHDAY=${probeParts?.day}`;
    const recurrence = parseRRuleFieldValue(rrule, "UTC");

    const slots = expandRuleSlots({
      baseStartDate: "2026-02-01T18:00:00.000Z",
      baseEndDate: "2026-02-01T19:30:00.000Z",
      recurrence,
      windowStart: "2026-02-01T00:00:00.000Z",
      windowEnd: "2026-02-28T23:59:59.000Z",
    });

    expect(slots.length).toBe(1);
    expect(slots[0].occurrenceDate).toBe("2026-02-18");
    expect(slots[0].rscale).toBe("islamic-umalqura");
  });

  it("aligns WEEKLY INTERVAL>1 to calendar weeks and expands series >4 years old", () => {
    const biweekly = parseRRuleFieldValue(
      "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR",
      "UTC"
    );
    // Starts Friday 2026-05-01 (Week 0). Week 1 (May 4-10) skipped.
    // Week 2 (May 11-17) includes Mon May 11, Wed May 13, Fri May 15.
    const weeklySlots = expandRuleSlots({
      baseStartDate: "2026-05-01T09:00:00.000Z",
      recurrence: biweekly,
      windowStart: "2026-05-01T00:00:00.000Z",
      windowEnd: "2026-05-17T23:59:59.000Z",
    });
    expect(weeklySlots.map((s) => s.occurrenceDate)).toEqual([
      "2026-05-01",
      "2026-05-11",
      "2026-05-13",
      "2026-05-15",
    ]);

    // Series starting 8 years before windowStart (2018 -> 2026)
    const longRunning = parseRRuleFieldValue("FREQ=YEARLY;INTERVAL=1", "UTC");
    const longSlots = expandRuleSlots({
      baseStartDate: "2018-05-10T10:00:00.000Z",
      recurrence: longRunning,
      windowStart: "2026-05-01T00:00:00.000Z",
      windowEnd: "2026-05-31T23:59:59.000Z",
    });
    expect(longSlots.map((s) => s.occurrenceDate)).toEqual(["2026-05-10"]);
  });
});

describe("Multi-Calendar Systems & Custom Formatters", () => {
  it("formats Hijri, Hebrew, and Persian dates with dayOffset and custom formatters", () => {
    const hijriBase = formatDateInCalendarSystem("2026-05-01T12:00:00.000Z", {
      id: "hijri",
      label: "Hijri",
      intlCalendar: "islamic-umalqura",
      locale: "en-US",
      dayOffset: 0,
      enabled: true,
    });
    const hijriShifted = formatDateInCalendarSystem(
      "2026-05-01T12:00:00.000Z",
      {
        id: "hijri",
        label: "Hijri (+1)",
        intlCalendar: "islamic-umalqura",
        locale: "en-US",
        dayOffset: 1,
        enabled: true,
      }
    );
    expect(hijriBase.length).toBeGreaterThan(3);
    expect(hijriBase !== hijriShifted).toBe(true);

    registerCalendarSystemFormatter(
      "custom-lunar",
      (date) => `Lunar-${date.getUTCFullYear()}`
    );

    const map = resolveOccurrenceAlternateDates({
      occurrenceDate: "2026-05-01",
      baseDateKey: "2026-05-01",
      isRecurring: false,
      doc: { hijriDate: "14 Dhu al-Qiʻdah 1447 AH (Sighted)" },
      source: {
        id: "events",
        label: "Events",
        uid: "api::event.event",
        color: "#0D9488",
        enabled: true,
        fields: {
          title: "title",
          startDate: "startDate",
        },
      },
      secondaryCalendars: [
        {
          id: "hijri",
          label: "Hijri",
          intlCalendar: "islamic-umalqura",
          overrideField: "hijriDate",
          enabled: true,
        },
        {
          id: "lunar",
          label: "Lunar",
          intlCalendar: "custom-lunar",
          enabled: true,
        },
      ],
    });

    expect(map.hijri.formatted).toBe("14 Dhu al-Qiʻdah 1447 AH (Sighted)");
    expect(map.hijri.isOverridden).toBe(true);
    expect(map.lunar.formatted).toBe("Lunar-2026");
  });

  it("generates valid RFC 5545 iCalendar (.ics) feeds with 75-octet UTF-8 folding and exclusive all-day DTEND", () => {
    const calendarLinks = buildCalendarLinks({
      documentId: "doc-1",
      title: "Community Gathering, Dinner & Talk",
      startDate: "2026-05-01T00:00:00.000Z",
      endDate: "2026-05-01T00:00:00.000Z",
      allDay: true,
    });
    expect(calendarLinks.google).toContain("dates=20260501%2F20260502");

    const ics = generateIcsCalendar({
      calendarTitle: "Unified Calendar Feed",
      timezone: "UTC",
      occurrences: [
        {
          occurrenceId: "events:doc-1:2026-05-01",
          sourceId: "events",
          sourceLabel: "Events",
          uid: "api::event.event",
          documentId: "doc-1",
          occurrenceDate: "2026-05-01",
          startDate: "2026-05-01T00:00:00.000Z",
          endDate: "2026-05-01T00:00:00.000Z",
          allDay: true,
          timezone: "UTC",
          title:
            "Community Gathering, Dinner & Talk — اجتماع المجتمع واللقاء السنوي العام",
          category: "Community",
          location: "Main Hall",
          status: "scheduled",
          color: "#0D9488",
          isRecurring: false,
          calendarLinks,
          alternateDates: {
            hijri: {
              calendarId: "hijri",
              label: "Hijri",
              formatted: "14 Dhu al-Qiʻdah 1447 AH",
            },
          },
        },
      ],
    });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260501");
    expect(ics).toContain("DTEND;VALUE=DATE:20260502");
    expect(ics).toContain("CATEGORIES:Community");
    expect(ics).toContain("X-ALT-DATE-HIJRI:14 Dhu al-Qiʻdah 1447 AH");
    expect(ics).toContain("END:VCALENDAR");

    const encoder = new TextEncoder();
    for (const line of ics.split("\r\n")) {
      expect(encoder.encode(line).byteLength <= 75).toBe(true);
    }
  });
});
