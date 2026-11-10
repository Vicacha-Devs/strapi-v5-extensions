import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseBoundaryMs } from "../server/src/services/reservationHelpers.ts";
import { parseIsoDateYmd, wallClockToUtcMs } from "../shared/index.ts";
import { createTestHarness, getFutureMonday } from "./test-harness.ts";

describe("Round 2 Adversarial Regressions: 500-Row Truncation, Slot Alignment, Host Reassignment & Rollover", () => {
  it("prevents overbooking when >500 historical/cancelled rows precede an active future booking", async () => {
    const { services, ensureCollection } = createTestHarness();
    const targetMonday = getFutureMonday(21);

    const resource = await services.availability.saveResource({
      name: "High Volume Desk",
      timezone: "UTC",
      slotDurationMinutes: 60,
      capacityPerSlot: 1,
      maxPartySize: 1,
      minLeadTimeHours: 1,
      weeklySchedule: {
        mode: "interval",
        days: { "1": [{ start: "09:00", end: "12:00" }] },
      },
    });

    // Seed 505 historical & cancelled rows so an unbounded 500-row query would truncate row #506!
    const col = ensureCollection("plugin::bookings.booking");
    for (let i = 1; i <= 505; i += 1) {
      const day = String(((i - 1) % 28) + 1).padStart(2, "0");
      const month = String((Math.floor((i - 1) / 28) % 6) + 1).padStart(2, "0");
      col.set(`hist-${i}`, {
        documentId: `hist-${i}`,
        bookingCode: `BKG-HIST-${i}`,
        resource: resource.documentId,
        customerName: `Past Guest ${i}`,
        customerEmail: `past${i}@example.com`,
        startDate: `2025-${month}-${day}T09:00:00.000Z`,
        endDate: `2025-${month}-${day}T10:00:00.000Z`,
        partySize: 1,
        status: i % 2 === 0 ? "cancelled" : "completed",
      });
    }

    // Create 1 active future booking (#506 in startDate:asc order)
    await services.reservation.createReservation({
      resourceDocumentId: resource.documentId,
      customerName: "Future Holder",
      customerEmail: "holder@example.com",
      startDate: `${targetMonday}T09:00:00.000Z`,
      endDate: `${targetMonday}T10:00:00.000Z`,
      partySize: 1,
    });

    const slots = await services.availability.getAvailableSlots({
      resourceDocumentId: resource.documentId,
      from: targetMonday,
      to: targetMonday,
      partySize: 1,
    });
    const nineAmSlot = slots.find((s) => s.slotLabel === "09:00-10:00");
    assert.ok(nineAmSlot);
    assert.equal(nineAmSlot.remainingCapacity, 0);
    assert.equal(nineAmSlot.isAvailable, false);

    // Second reservation for the same future slot MUST be rejected despite 505 earlier rows!
    await assert.rejects(
      () =>
        services.reservation.createReservation({
          resourceDocumentId: resource.documentId,
          customerName: "Double Booker",
          customerEmail: "double@example.com",
          startDate: `${targetMonday}T09:00:00.000Z`,
          endDate: `${targetMonday}T10:00:00.000Z`,
          partySize: 1,
        }),
      /Insufficient slot capacity/
    );
  });

  it("enforces exact interval slot-boundary alignment and reassigns busy hosts on reschedule", async () => {
    const { services, ensureCollection } = createTestHarness();
    const targetMonday = getFutureMonday(14);

    const resource = await services.availability.saveResource({
      name: "Advisory Room",
      timezone: "UTC",
      slotDurationMinutes: 60,
      capacityPerSlot: 2,
      maxPartySize: 2,
      minLeadTimeHours: 1,
      weeklySchedule: {
        mode: "interval",
        days: { "1": [{ start: "09:00", end: "12:00" }] },
      },
      assignedHosts: [
        { id: "h-alice", name: "Alice", languages: ["en"] },
        { id: "h-tariq", name: "Tariq", languages: ["ar", "en"] },
      ],
    });

    // Reject 2-minute straddle (09:59-10:01) and half-slot shift (09:30-10:30)
    await assert.rejects(
      () =>
        services.reservation.createReservation({
          resourceDocumentId: resource.documentId,
          customerName: "Straddler",
          customerEmail: "straddle@example.com",
          startDate: `${targetMonday}T09:59:00.000Z`,
          endDate: `${targetMonday}T10:01:00.000Z`,
          partySize: 1,
        }),
      /align with an exact configured interval slot/
    );
    await assert.rejects(
      () =>
        services.reservation.createReservation({
          resourceDocumentId: resource.documentId,
          customerName: "Half Shifter",
          customerEmail: "shift@example.com",
          startDate: `${targetMonday}T09:30:00.000Z`,
          endDate: `${targetMonday}T10:30:00.000Z`,
          partySize: 1,
        }),
      /align with an exact configured interval slot/
    );

    // Booking 1 at 09:00 gets Alice; Booking 2 at 10:00 explicitly books Alice (admin passing host id "h-alice" normalizes to "Alice")
    const b1 = await services.reservation.createReservation({
      resourceDocumentId: resource.documentId,
      customerName: "Guest One",
      customerEmail: "g1@example.com",
      startDate: `${targetMonday}T09:00:00.000Z`,
      partySize: 1,
      preferredLanguage: "en",
    });
    assert.equal(b1.booking.assignedHost, "Alice");

    const b2 = await services.reservation.createReservation(
      {
        resourceDocumentId: resource.documentId,
        customerName: "Guest Two",
        customerEmail: "g2@example.com",
        startDate: `${targetMonday}T10:00:00.000Z`,
        partySize: 1,
        assignedHost: "h-alice",
      },
      { isAdmin: true, skipLeadTimeCheck: true }
    );
    assert.equal(b2.booking.assignedHost, "Alice");

    // Admin attempting to book "h-alice" AGAIN at 10:00 must be rejected as already booked
    await assert.rejects(
      () =>
        services.reservation.createReservation(
          {
            resourceDocumentId: resource.documentId,
            customerName: "Admin Duplicate Host",
            customerEmail: "dup@example.com",
            startDate: `${targetMonday}T10:00:00.000Z`,
            partySize: 1,
            assignedHost: "h-alice",
          },
          { isAdmin: true, skipLeadTimeCheck: true }
        ),
      /already booked/
    );

    // Customer reschedules b1 (had Alice) into 10:00-11:00 (where Alice is busy, Tariq is free):
    // Must succeed, reassign to Tariq, and persist Tariq in DB!
    const moved = await services.reservation.rescheduleBooking({
      bookingCode: b1.booking.bookingCode,
      cancelToken: b1.cancelToken,
      newStartDate: `${targetMonday}T10:00:00.000Z`,
      newEndDate: `${targetMonday}T11:00:00.000Z`,
    });
    assert.equal(moved.assignedHost, "Tariq");
    assert.equal(
      ensureCollection("plugin::bookings.booking").get(b1.booking.documentId)
        ?.assignedHost,
      "Tariq"
    );
  });

  it("rejects impossible calendar rollover dates such as 2026-02-29 and 2026-02-31", async () => {
    assert.equal(parseIsoDateYmd("2026-02-29"), null);
    assert.equal(parseIsoDateYmd("2026-02-31"), null);
    assert.equal(parseIsoDateYmd("2026-04-31"), null);
    assert.deepEqual(parseIsoDateYmd("2028-02-29"), {
      year: 2028,
      month: 2,
      day: 29,
    });
    assert.equal(wallClockToUtcMs("2026-02-29", 540, "UTC"), null);
    assert.equal(parseBoundaryMs("2026-02-29", false), null);
    assert.equal(parseBoundaryMs("2026-02-31T09:00:00.000Z", false), null);

    const { services } = createTestHarness();
    const resource = await services.availability.saveResource({
      name: "Rollover Guard Room",
      timezone: "UTC",
    });
    await assert.rejects(
      () =>
        services.reservation.createReservation(
          {
            resourceDocumentId: resource.documentId,
            customerName: "Calendar Attacker",
            customerEmail: "cal@example.com",
            startDate: "2027-02-29T09:00:00.000Z",
          },
          { isAdmin: true, skipLeadTimeCheck: true }
        ),
      /valid ISO startDate/
    );
  });
});
