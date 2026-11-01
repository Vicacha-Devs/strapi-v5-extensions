import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  generateRawCancelToken,
  hashCancelToken,
  verifyCancelToken,
} from "../server/src/services/reservationHelpers.ts";
import {
  computeAvailableSlots,
  doesBookingOverlapSlot,
  formatTimeMinutes,
  generateBookingsCsv,
  generateBookingsICalFeed,
  isSlotBlackedOut,
  parseTimeMinutes,
  sanitizeCsvCell,
  type BookingRecord,
  type BookingResource,
} from "../shared/index.ts";

const baseResource: BookingResource = {
  documentId: "res-consultation",
  name: "1-on-1 Consultation Room",
  slug: "consultation-room",
  resourceType: "service",
  color: "#0d9488",
  timezone: "UTC",
  slotDurationMinutes: 60,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  capacityPerSlot: 10,
  maxPartySize: 10,
  minLeadTimeHours: 0,
  maxAdvanceDays: 90,
  requiresApproval: false,
  weeklySchedule: {
    mode: "interval",
    days: {
      "1": [{ start: "09:00", end: "12:00" }],
    },
  },
  blackoutDates: [
    { start: "2026-10-26", end: "2026-10-26", reason: "Maintenance" },
  ],
  supportedLanguages: ["en", "es", "ar"],
  assignedHosts: [
    { id: "host-1", name: "Alice", languages: ["en", "es"] },
    { id: "host-2", name: "Tariq", languages: ["ar", "en"] },
  ],
  isActive: true,
};

describe("Slot Availability Engine (Interval, Window, Buffers, Blackouts & Hosts)", () => {
  it("parses and formats HH:mm time minutes accurately", () => {
    assert.equal(parseTimeMinutes("09:30"), 570);
    assert.equal(formatTimeMinutes(570), "09:30");
  });

  it("slices interval slots, subtracts active bookings, and skips blackout dates", () => {
    const existingBookings: BookingRecord[] = [
      {
        documentId: "bkg-1",
        bookingCode: "BKG-20261019-AAA111",
        title: "Client A",
        resourceDocumentId: "res-consultation",
        customerName: "Client A",
        customerEmail: "a@example.com",
        startDate: "2026-10-19T09:00:00.000Z",
        endDate: "2026-10-19T10:00:00.000Z",
        timezone: "UTC",
        partySize: 6,
        status: "confirmed",
        assignedHost: "Alice",
      },
    ];

    // 2026-10-19 is Monday ('1'), 2026-10-26 is blacked out Monday ('1')
    const slots = computeAvailableSlots({
      resource: baseResource,
      from: "2026-10-19",
      to: "2026-10-26",
      existingBookings,
      partySize: 5,
      preferredLanguage: "ar",
    });

    // Only 3 slots from 2026-10-19 (09:00-10:00, 10:00-11:00, 11:00-12:00) because 2026-10-26 is blacked out
    assert.equal(slots.length, 3);
    assert.equal(slots[0].slotLabel, "09:00-10:00");
    assert.equal(slots[0].bookedCount, 6);
    assert.equal(slots[0].remainingCapacity, 4);
    assert.equal(slots[0].isAvailable, false); // requested partySize=5 > remainingCapacity=4
    assert.equal(slots[0].availableHosts[0]?.name, "Tariq"); // Alice is busy & Tariq matches 'ar'

    assert.equal(slots[1].slotLabel, "10:00-11:00");
    assert.equal(slots[1].remainingCapacity, 10);
    assert.equal(slots[1].isAvailable, true);
  });

  it("supports named window mode and buffer windows between slots", () => {
    const windowResource: BookingResource = {
      ...baseResource,
      weeklySchedule: {
        mode: "window",
        days: {
          "2": [
            { start: "09:00", end: "12:00", label: "morning", capacity: 30 },
            { start: "14:00", end: "17:00", label: "afternoon", capacity: 30 },
          ],
        },
      },
    };

    const slots = computeAvailableSlots({
      resource: windowResource,
      from: "2026-10-20",
      to: "2026-10-20",
      existingBookings: [],
      partySize: 10,
    });

    assert.equal(slots.length, 2);
    assert.equal(slots[0].slotLabel, "morning");
    assert.equal(slots[0].capacity, 30);
    assert.equal(slots[1].slotLabel, "afternoon");

    const overlapsWithBuffer = doesBookingOverlapSlot(
      {
        startDate: "2026-10-20T10:00:00.000Z",
        endDate: "2026-10-20T11:00:00.000Z",
        status: "confirmed",
      },
      Date.parse("2026-10-20T11:10:00.000Z"),
      Date.parse("2026-10-20T12:10:00.000Z"),
      0,
      15 // 15m buffer after 11:00 extends to 11:15
    );
    assert.equal(overlapsWithBuffer, true);
    assert.equal(
      isSlotBlackedOut(
        Date.parse("2026-10-26T10:00:00.000Z"),
        Date.parse("2026-10-26T11:00:00.000Z"),
        baseResource.blackoutDates
      ),
      true
    );
  });

  it("applies seasonal schedule overrides (including yearless cross-year ranges) and holiday rules", () => {
    const seasonalResource: BookingResource = {
      ...baseResource,
      seasonalSchedules: [
        {
          id: "year-end-season",
          label: "Year-End Schedule",
          startDate: "12-20",
          endDate: "01-05",
          yearless: true,
          priority: 10,
          slotDurationMinutes: 120,
          schedule: {
            mode: "window",
            days: {
              "1": [
                {
                  start: "10:00",
                  end: "12:00",
                  label: "holiday-morning",
                  capacity: 25,
                },
              ],
              "5": [
                {
                  start: "10:00",
                  end: "12:00",
                  label: "holiday-friday",
                  capacity: 25,
                },
              ],
            },
          },
        },
      ],
      holidayRules: [
        {
          id: "new-year-day",
          name: "New Year's Day (Closed)",
          date: "01-01",
          yearless: true,
          isClosed: true,
        },
        {
          id: "dec-28-special",
          name: "Reduced Hours Day",
          date: "2026-12-28",
          isClosed: false,
          mode: "window",
          windows: [
            { start: "11:00", end: "12:00", label: "special-1h", capacity: 15 },
          ],
        },
      ],
    };

    // 2026-12-21 is a Monday inside the yearless 12-20..01-05 range -> uses 'Year-End Schedule'
    const dec21Slots = computeAvailableSlots({
      resource: seasonalResource,
      from: "2026-12-21",
      to: "2026-12-21",
      existingBookings: [],
    });
    assert.equal(dec21Slots.length, 1);
    assert.equal(dec21Slots[0].slotLabel, "holiday-morning");
    assert.equal(dec21Slots[0].scheduleLabel, "Year-End Schedule");
    assert.equal(dec21Slots[0].capacity, 25);

    // 2026-12-28 is a Monday with a specific HolidayScheduleRule override -> uses 'Reduced Hours Day'
    const dec28Slots = computeAvailableSlots({
      resource: seasonalResource,
      from: "2026-12-28",
      to: "2026-12-28",
      existingBookings: [],
    });
    assert.equal(dec28Slots.length, 1);
    assert.equal(dec28Slots[0].slotLabel, "special-1h");
    assert.equal(dec28Slots[0].scheduleLabel, "Reduced Hours Day");
    assert.equal(dec28Slots[0].capacity, 15);

    // 2027-01-01 is a Friday (cross-year match for 12-20..01-05), but closed by yearless '01-01' holiday rule
    const jan1Slots = computeAvailableSlots({
      resource: seasonalResource,
      from: "2027-01-01",
      to: "2027-01-01",
      existingBookings: [],
    });
    assert.equal(jan1Slots.length, 0);

    // 2027-01-04 is a Monday still inside the cross-year 12-20..01-05 range -> uses 'Year-End Schedule'
    const jan4Slots = computeAvailableSlots({
      resource: seasonalResource,
      from: "2027-01-04",
      to: "2027-01-04",
      existingBookings: [],
    });
    assert.equal(jan4Slots.length, 1);
    assert.equal(jan4Slots[0].slotLabel, "holiday-morning");
    assert.equal(jan4Slots[0].scheduleLabel, "Year-End Schedule");
  });
});

describe("Security Primitives: Cancel Token Hashing, CSV Injection & iCal (.ics)", () => {
  it("hashes cancel tokens with SHA-256 and verifies in constant time", () => {
    const rawToken = generateRawCancelToken();
    const hashed = hashCancelToken(rawToken);
    assert.notEqual(rawToken, hashed);
    assert.equal(verifyCancelToken(rawToken, hashed), true);
    assert.equal(verifyCancelToken("wrong-token", hashed), false);
    assert.equal(verifyCancelToken(undefined, hashed), false);
  });

  it("neutralizes CSV formula injection payloads and builds valid RFC 5545 iCal feed", () => {
    assert.equal(
      sanitizeCsvCell("=cmd|'/C calc'!A0"),
      "\"'=cmd|'/C calc'!A0\""
    );
    assert.equal(sanitizeCsvCell("+SUM(A1:A2)"), '"\'+SUM(A1:A2)"');
    assert.equal(sanitizeCsvCell("@IMPORTXML()"), '"\'@IMPORTXML()"');

    const sampleBookings: BookingRecord[] = [
      {
        documentId: "bkg-sec-1",
        bookingCode: "BKG-20261019-SEC001",
        title: "Security Review Booking",
        customerName: "=MaliciousUser",
        customerEmail: "sec@example.com",
        startDate: "2026-10-19T14:00:00.000Z",
        endDate: "2026-10-19T15:00:00.000Z",
        timezone: "UTC",
        partySize: 2,
        status: "confirmed",
      },
    ];

    const csv = generateBookingsCsv(sampleBookings);
    assert.ok(csv.includes('"\'=MaliciousUser"'));

    const ics = generateBookingsICalFeed(sampleBookings, "Bookings Feed");
    assert.ok(ics.includes("BEGIN:VCALENDAR"));
    assert.ok(ics.includes("SUMMARY:Security Review Booking"));
    assert.ok(ics.includes("STATUS:CONFIRMED"));
  });
});
