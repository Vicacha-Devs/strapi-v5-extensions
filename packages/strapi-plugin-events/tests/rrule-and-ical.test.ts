import assert from "node:assert/strict";
import { describe, it } from "node:test";

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
  isValidCalendarDateKey,
  parseRRule,
  parseRRuleFieldValue,
} from "../shared/rruleEngine";
import type { ExpandedOccurrence } from "../shared/types";

describe("RRULE Engine (RFC 5545)", () => {
  it("parses and rebuilds weekly RRULE with BYDAY, INTERVAL, and UNTIL", () => {
    const raw =
      "RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR;UNTIL=20261231T235959Z";
    const parsed = parseRRule(raw);

    assert.equal(parsed.freq, "WEEKLY");
    assert.equal(parsed.interval, 2);
    assert.deepEqual(parsed.byDay, ["MO", "FR"]);
    assert.equal(parsed.until, "2026-12-31");

    const rebuilt = buildRRule(parsed);
    assert.equal(
      rebuilt,
      "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR;UNTIL=20261231T235959Z"
    );
    assert.ok(
      describeRRule(rebuilt).includes(
        "Every 2 weeks on MO, FR until 2026-12-31"
      )
    );
  });

  it("validates calendar YYYY-MM-DD dates strictly", () => {
    assert.equal(isValidCalendarDateKey("2026-10-16"), true);
    assert.equal(isValidCalendarDateKey("2024-02-29"), true);
    assert.equal(isValidCalendarDateKey("2026-02-29"), false);
    assert.equal(isValidCalendarDateKey("2026-02-31"), false);
    assert.equal(isValidCalendarDateKey("2026-13-01"), false);
    assert.equal(isValidCalendarDateKey("not-a-date"), false);
  });

  it("expands weekly Friday occurrences and respects exdates and overrides", () => {
    const recurrence = parseRRuleFieldValue({
      rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=FR",
      timezone: "UTC",
      exdates: ["2026-10-09"],
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

    assert.deepEqual(
      slots.map((s) => s.occurrenceDate),
      ["2026-10-02", "2026-10-16", "2026-10-30"]
    );
    assert.equal(slots[1].isOverridden, true);
    assert.equal(slots[1].startDate, "2026-10-16T18:00:00.000Z");
    assert.equal(slots[1].override?.title, "Keynote Session (Rescheduled)");
  });

  it("expands monthly occurrences with COUNT limit and strips malformed override dates", () => {
    const recurrence = parseRRuleFieldValue({
      rrule: "FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15;COUNT=3",
      timezone: "UTC",
      overrides: {
        "2026-02-15": {
          originalDate: "2026-02-15",
          startDate: "invalid-date",
        },
      },
    });

    const slots = expandRuleSlots({
      baseStartDate: "2026-01-15T10:00:00.000Z",
      baseEndDate: "2026-01-15T11:00:00.000Z",
      recurrence,
      windowStart: "2026-01-01T00:00:00.000Z",
      windowEnd: "2026-12-31T23:59:59.000Z",
    });

    assert.deepEqual(
      slots.map((s) => s.occurrenceDate),
      ["2026-01-15", "2026-02-15", "2026-03-15"]
    );
    assert.equal(slots[1].startDate, "2026-02-15T10:00:00.000Z");
  });
});

describe("iCal (.ics) RFC 5545 & CSV Security Utilities", () => {
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

    assert.ok(links.google.includes("calendar.google.com"));
    assert.ok(links.outlook.includes("outlook.live.com"));
    assert.equal(
      links.icsPath,
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
    assert.ok(ics.includes("BEGIN:VCALENDAR"));
    assert.ok(
      ics.includes("SUMMARY:Annual Developer Conference\\; Special Edition")
    );
    assert.ok(ics.includes("RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=FR"));
    assert.ok(ics.includes("END:VCALENDAR"));
  });

  it("strips CRLF from RRULE, escapes bare CR, advances 1-day allDay DTEND, and folds by 75 UTF-8 octets without splitting surrogates", () => {
    assert.equal(
      escapeIcsText("A, B; C\rD\r\nE\nF"),
      "A\\, B\\; C\\nD\\nE\\nF"
    );

    const emojiTitle = `SUMMARY:${"🎉".repeat(30)}`;
    const foldedEmoji = foldIcsLine(emojiTitle);
    const encoder = new TextEncoder();
    const physicalLines = foldedEmoji.split("\r\n");
    assert.ok(physicalLines.length >= 2);
    for (const pl of physicalLines) {
      assert.ok(
        encoder.encode(pl).byteLength <= 75,
        `Folded line exceeded 75 UTF-8 octets: ${encoder.encode(pl).byteLength}`
      );
      assert.equal(
        /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(
          pl
        ),
        false,
        "Folded line must never split UTF-16 surrogate pairs"
      );
    }

    const allDayLinks = buildCalendarLinks({
      documentId: "doc-allday",
      title: "All-Day Retreat",
      startDate: "2026-05-31T00:00:00.000Z",
      endDate: "2026-05-31T23:59:59.000Z",
      allDay: true,
    });
    assert.ok(allDayLinks.google.includes("dates=20260531%2F20260601"));

    const allDayOcc: ExpandedOccurrence = {
      occurrenceId: "events:doc-allday:2026-05-31",
      sourceId: "events",
      sourceLabel: "Events",
      uid: "api::event.event",
      documentId: "doc-allday",
      occurrenceDate: "2026-05-31",
      startDate: "2026-05-31T00:00:00.000Z",
      endDate: "2026-05-31T23:59:59.000Z",
      allDay: true,
      timezone: "UTC",
      title: "All-Day Retreat",
      status: "scheduled",
      color: "#0D9488",
      isRecurring: true,
      rrule: "FREQ=YEARLY;INTERVAL=1\r\nBEGIN:VALARM\r\nACTION:AUDIO",
      calendarLinks: allDayLinks,
    };

    const ics = generateIcsCalendar([allDayOcc], "Feed");
    assert.ok(ics.includes("DTSTART;VALUE=DATE:20260531"));
    assert.ok(ics.includes("DTEND;VALUE=DATE:20260601"));
    assert.equal(ics.includes("\r\nBEGIN:VALARM"), false);
  });

  it("neutralizes CSV formula injection payloads including pipe and leading whitespace", () => {
    assert.equal(
      sanitizeCsvCell("=cmd|'/C calc'!A0"),
      "\"'=cmd|'/C calc'!A0\""
    );
    assert.equal(sanitizeCsvCell("+SUM(A1:A2)"), '"\'+SUM(A1:A2)"');
    assert.equal(sanitizeCsvCell("   =SUM(A1:A2)"), '"\'   =SUM(A1:A2)"');
    assert.equal(sanitizeCsvCell("|cmd"), '"\'|cmd"');
    assert.equal(sanitizeCsvCell("  |cmd"), '"\'  |cmd"');
    assert.equal(sanitizeCsvCell("\n@IMPORTXML()"), '"\'\n@IMPORTXML()"');

    const csv = generateRegistrationsCsv([
      {
        documentId: "reg-1",
        eventUid: "api::event.event",
        eventDocumentId: "doc-123",
        eventTitle: "Weekly Workshop",
        occurrenceDate: "2026-10-23",
        attendeeName: "  =EvilFormula",
        attendeeEmail: "guest@example.org",
        guestsCount: 2,
        status: "confirmed",
        locale: "en",
      },
    ]);
    assert.ok(csv.includes('"\'  =EvilFormula"'));
  });
});
