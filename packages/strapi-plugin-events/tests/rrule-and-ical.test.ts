import { describe, expect, it } from "vitest";

import {
  buildCalendarLinks,
  escapeIcsText,
  foldIcsLine,
  generateIcsCalendar,
  generateRegistrationsCsv,
  sanitizeCsvCell,
} from "../shared/icalGenerator";
import {
  buildRRule,
  describeRRule,
  expandRuleSlots,
  parseRRule,
  parseRRuleFieldValue,
} from "../shared/rruleEngine";
import type { ExpandedOccurrence } from "../shared/types";

describe("RRULE Engine (RFC 5545)", () => {
  it("parses and rebuilds weekly RRULE with BYDAY, INTERVAL, and UNTIL", () => {
    const raw =
      "RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR;UNTIL=20261231T235959Z";
    const parsed = parseRRule(raw);

    expect(parsed.freq).toBe("WEEKLY");
    expect(parsed.interval).toBe(2);
    expect(parsed.byDay).toEqual(["MO", "FR"]);
    expect(parsed.until).toBe("2026-12-31");

    const rebuilt = buildRRule(parsed);
    expect(rebuilt).toBe(
      "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR;UNTIL=20261231T235959Z"
    );
    expect(describeRRule(rebuilt)).toContain(
      "Every 2 weeks on MO, FR until 2026-12-31"
    );
  });

  it("expands weekly Friday occurrences and respects exdates and single-instance overrides", () => {
    // 2026-10-02 is a Friday
    const recurrence = parseRRuleFieldValue({
      rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=FR",
      timezone: "UTC",
      exdates: ["2026-10-09"], // Skip 2nd Friday
      overrides: {
        "2026-10-16": {
          originalDate: "2026-10-16",
          startDate: "2026-10-16T18:00:00.000Z",
          endDate: "2026-10-16T20:00:00.000Z",
          title: "Keynote Session (Rescheduled)",
        },
        "2026-10-23": {
          originalDate: "2026-10-23",
          cancelled: true,
        },
      },
    });

    const slots = expandRuleSlots({
      baseStartDate: "2026-10-02T17:00:00.000Z",
      baseEndDate: "2026-10-02T18:30:00.000Z",
      recurrence,
      windowStart: "2026-10-01T00:00:00.000Z",
      windowEnd: "2026-10-31T23:59:59.000Z",
    });

    // Oct 2026 Fridays: Oct 2, Oct 9 (excluded), Oct 16 (overridden), Oct 23 (cancelled), Oct 30
    expect(slots.map((s) => s.occurrenceDate)).toEqual([
      "2026-10-02",
      "2026-10-16",
      "2026-10-30",
    ]);

    expect(slots[1].isOverridden).toBe(true);
    expect(slots[1].startDate).toBe("2026-10-16T18:00:00.000Z");
    expect(slots[1].override?.title).toBe("Keynote Session (Rescheduled)");
  });

  it("expands monthly occurrences with COUNT limit", () => {
    const recurrence = parseRRuleFieldValue({
      rrule: "FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15;COUNT=3",
      timezone: "UTC",
    });

    const slots = expandRuleSlots({
      baseStartDate: "2026-01-15T10:00:00.000Z",
      baseEndDate: "2026-01-15T11:00:00.000Z",
      recurrence,
      windowStart: "2026-01-01T00:00:00.000Z",
      windowEnd: "2026-12-31T23:59:59.000Z",
    });

    expect(slots.map((s) => s.occurrenceDate)).toEqual([
      "2026-01-15",
      "2026-02-15",
      "2026-03-15",
    ]);
  });
});

describe("iCal (.ics) & CSV Security Utilities", () => {
  it("generates valid RFC 5545 VCALENDAR feed and calendar links", () => {
    const links = buildCalendarLinks({
      documentId: "doc-123",
      title: "Annual Developer Conference",
      startDate: "2026-10-18T14:00:00.000Z",
      endDate: "2026-10-18T17:00:00.000Z",
      summary: "Annual engineering summit and product showcase",
      location: "Convention Center Hall A",
      occurrenceDate: "2026-10-18",
    });

    expect(links.google).toContain("calendar.google.com");
    expect(links.outlook).toContain("outlook.live.com");
    expect(links.icsPath).toBe(
      "/api/events/doc-123/invite.ics?occurrenceDate=2026-10-18"
    );

    const occ: ExpandedOccurrence = {
      occurrenceId: "events:doc-123:2026-10-18",
      sourceId: "events",
      sourceLabel: "Events",
      uid: "api::event.event",
      documentId: "doc-123",
      occurrenceDate: "2026-10-18",
      startDate: "2026-10-18T14:00:00.000Z",
      endDate: "2026-10-18T17:00:00.000Z",
      allDay: false,
      timezone: "UTC",
      title: "Annual Developer Conference; Special Edition",
      summary: "Line 1\nLine 2",
      location: "Convention Center Hall A",
      status: "scheduled",
      color: "#0D9488",
      isRecurring: true,
      rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=FR",
      calendarLinks: links,
    };

    const ics = generateIcsCalendar([occ], "Organization Events Calendar");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain(
      "SUMMARY:Annual Developer Conference\\; Special Edition"
    );
    expect(ics).toContain("RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=FR");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("folds long ICS lines and neutralizes CSV formula injection payloads", () => {
    const longLine = `SUMMARY:${"A".repeat(120)}`;
    const folded = foldIcsLine(longLine);
    expect(folded).toContain("\r\n ");

    expect(escapeIcsText("A, B; C\nD")).toBe("A\\, B\\; C\\nD");
    expect(sanitizeCsvCell("=cmd|'/C calc'!A0")).toBe("\"'=cmd|'/C calc'!A0\"");
    expect(sanitizeCsvCell("+SUM(A1:A2)")).toBe('"\'+SUM(A1:A2)"');

    const csv = generateRegistrationsCsv([
      {
        documentId: "reg-1",
        eventUid: "api::event.event",
        eventDocumentId: "doc-123",
        eventTitle: "Weekly Workshop",
        occurrenceDate: "2026-10-23",
        attendeeName: "=EvilFormula",
        attendeeEmail: "guest@example.org",
        guestsCount: 2,
        status: "confirmed",
        locale: "en",
      },
    ]);
    expect(csv).toContain('"\'=EvilFormula"');
  });
});
