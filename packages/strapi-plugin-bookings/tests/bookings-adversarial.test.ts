import assert from "node:assert/strict";
import { describe, it } from "node:test";

import serverPlugin from "../server/src/index.ts";
import {
  computeAvailableSlots,
  formatSecondaryCalendars,
  type BookingRecord,
  type BookingResource,
  type CreateReservationResult,
} from "../shared/index.ts";
import {
  createMockHttpCtx,
  createTestHarness,
  getFutureMonday,
} from "./test-harness.ts";

describe("Adversarial Hardening: Timezone/DST, Concurrency & State Machine", () => {
  it("evaluates wall-clock slots accurately in America/Bogota, Asia/Tokyo & America/New_York DST", () => {
    const bogotaResource: BookingResource = {
      documentId: "res-bogota",
      name: "Bogota Room",
      slug: "bogota-room",
      resourceType: "room",
      color: "#0d9488",
      timezone: "America/Bogota",
      slotDurationMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      capacityPerSlot: 5,
      maxPartySize: 5,
      minLeadTimeHours: 0,
      maxAdvanceDays: 365,
      requiresApproval: false,
      weeklySchedule: {
        mode: "interval",
        days: { "1": [{ start: "09:00", end: "11:00" }] },
      },
      blackoutDates: [],
      supportedLanguages: ["es"],
      assignedHosts: [],
      isActive: true,
    };

    // Orphan booking without resourceDocumentId must NOT subtract capacity!
    const orphanBooking: BookingRecord = {
      documentId: "orphan-1",
      bookingCode: "BKG-ORPHAN",
      title: "Orphan",
      customerName: "Orphan",
      customerEmail: "o@example.com",
      startDate: "2026-10-19T14:00:00.000Z",
      endDate: "2026-10-19T15:00:00.000Z",
      timezone: "America/Bogota",
      partySize: 5,
      status: "confirmed",
    };

    const bogotaSlots = computeAvailableSlots({
      resource: bogotaResource,
      from: "2026-10-19",
      to: "2026-10-19",
      existingBookings: [orphanBooking],
    });
    assert.equal(bogotaSlots.length, 2);
    assert.equal(bogotaSlots[0].start, "2026-10-19T14:00:00.000Z");
    assert.equal(bogotaSlots[0].remainingCapacity, 5);

    // Asia/Tokyo (UTC+9): Monday 2026-10-19 09:00 JST = 2026-10-19T00:00:00.000Z
    const tokyoSlots = computeAvailableSlots({
      resource: { ...bogotaResource, timezone: "Asia/Tokyo" },
      from: "2026-10-19",
      to: "2026-10-19",
      existingBookings: [],
    });
    assert.equal(tokyoSlots[0].start, "2026-10-19T00:00:00.000Z");

    // America/New_York Spring-Forward (2026-03-08: 23h day, 02:00 jumps to 03:00 EDT)
    const nyResource: BookingResource = {
      ...bogotaResource,
      documentId: "res-ny",
      timezone: "America/New_York",
      weeklySchedule: {
        mode: "interval",
        days: {
          "6": [{ start: "09:00", end: "10:00" }],
          "0": [
            { start: "01:00", end: "04:00" },
            { start: "09:00", end: "10:00" },
          ],
        },
      },
    };

    const springSlots = computeAvailableSlots({
      resource: nyResource,
      from: "2026-03-07",
      to: "2026-03-08",
      existingBookings: [],
    });
    assert.equal(springSlots[0].start, "2026-03-07T14:00:00.000Z");
    const sunLabels = springSlots
      .filter((s) => s.date === "2026-03-08")
      .map((s) => `${s.slotLabel}@${s.start}`);
    assert.deepEqual(sunLabels, [
      "01:00-02:00@2026-03-08T06:00:00.000Z",
      "03:00-04:00@2026-03-08T07:00:00.000Z",
      "09:00-10:00@2026-03-08T13:00:00.000Z",
    ]);

    // America/New_York Fall-Back (2026-10-31 EDT -> 2026-11-01 EST: 25h span)
    const fallSlots = computeAvailableSlots({
      resource: {
        ...nyResource,
        weeklySchedule: {
          mode: "interval",
          days: {
            "6": [{ start: "09:00", end: "10:00" }],
            "0": [{ start: "09:00", end: "10:00" }],
          },
        },
      },
      from: "2026-10-31",
      to: "2026-11-01",
      existingBookings: [],
    });
    assert.equal(fallSlots[0].start, "2026-10-31T13:00:00.000Z");
    assert.equal(fallSlots[1].start, "2026-11-01T14:00:00.000Z");
    assert.deepEqual(formatSecondaryCalendars(new Date("invalid"), []), {});
  });

  it("prevents race-condition double-booking across 5x concurrent Promise.all reservations", async () => {
    const { services, getTxCount } = createTestHarness();
    const targetMonday = getFutureMonday(14);
    const resource = await services.availability.saveResource({
      name: "Concurrency Lab",
      timezone: "UTC",
      slotDurationMinutes: 60,
      capacityPerSlot: 2,
      maxPartySize: 2,
      minLeadTimeHours: 1,
      weeklySchedule: {
        mode: "interval",
        days: { "1": [{ start: "09:00", end: "12:00" }] },
      },
      assignedHosts: [{ id: "h1", name: "Host One", languages: ["en"] }],
    });

    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, (_, idx) =>
        services.reservation.createReservation({
          resourceDocumentId: resource.documentId,
          customerName: `Concurrent User ${idx}`,
          customerEmail: `u${idx}@example.com`,
          startDate: `${targetMonday}T09:00:00.000Z`,
          endDate: `${targetMonday}T10:00:00.000Z`,
          partySize: 1,
        })
      )
    );

    const fulfilled = attempts.filter(
      (a): a is PromiseFulfilledResult<CreateReservationResult> =>
        a.status === "fulfilled"
    );
    const rejected = attempts.filter((a) => a.status === "rejected");

    assert.equal(fulfilled.length, 2);
    assert.equal(rejected.length, 3);
    assert.ok(getTxCount() >= 5);
    const assignedHosts = fulfilled
      .map((f) => f.value.booking.assignedHost)
      .filter(Boolean);
    assert.deepEqual(assignedHosts, ["Host One"]);
  });

  it("enforces resource requirement, partySize/maxPartySize, operating windows, host validation & state machine", async () => {
    const { strapi, services, ensureCollection } = createTestHarness();
    const contentApi = serverPlugin.controllers["content-api"]({
      strapi: strapi as never,
    });
    const targetMonday = getFutureMonday(14);

    const resource = await services.availability.saveResource({
      name: "Strict Clinic",
      timezone: "UTC",
      slotDurationMinutes: 60,
      capacityPerSlot: 10,
      maxPartySize: 4,
      minLeadTimeHours: 2,
      maxAdvanceDays: 60,
      weeklySchedule: {
        mode: "interval",
        days: { "1": [{ start: "09:00", end: "12:00" }] },
      },
      assignedHosts: [
        {
          id: "dr-1",
          name: "Dr. Samira",
          email: "samira-private@clinic.internal",
          languages: ["en"],
        },
      ],
    });

    // 1. Resource-less public POST /reserve is rejected with 400
    const noResCtx = createMockHttpCtx({
      body: {
        customerName: "Attacker",
        customerEmail: "attacker@example.com",
        startDate: `${targetMonday}T09:00:00.000Z`,
      },
    });
    await contentApi.createReservation(noResCtx);
    assert.equal(noResCtx.status, 400);

    // 2. Malformed partySize ("NaN", 1.5, -3, 0) & maxPartySize < capacityPerSlot (5 > 4)
    for (const badParty of ["NaN", 1.5, -3, 0, Number.NaN, 5]) {
      const badPartyCtx = createMockHttpCtx({
        body: {
          resourceDocumentId: resource.documentId,
          customerName: "Bad Party",
          customerEmail: "bp@example.com",
          startDate: `${targetMonday}T09:00:00.000Z`,
          partySize: badParty,
        },
      });
      await contentApi.createReservation(badPartyCtx);
      assert.equal(badPartyCtx.status, 400);
    }

    const badSlotQueryCtx = createMockHttpCtx({
      query: { from: targetMonday, to: targetMonday, partySize: "NaN" },
    });
    await contentApi.getAvailableSlots(badSlotQueryCtx);
    assert.equal(badSlotQueryCtx.status, 400);

    // 3. Out-of-hours (22:00Z) and excessive duration (09:00-12:00 > 60m) rejected
    await assert.rejects(
      () =>
        services.reservation.createReservation({
          resourceDocumentId: resource.documentId,
          customerName: "Night Owl",
          customerEmail: "owl@example.com",
          startDate: `${targetMonday}T22:00:00.000Z`,
        }),
      /outside operating hours/
    );
    await assert.rejects(
      () =>
        services.reservation.createReservation({
          resourceDocumentId: resource.documentId,
          customerName: "Greedy",
          customerEmail: "greedy@example.com",
          startDate: `${targetMonday}T09:00:00.000Z`,
          endDate: `${targetMonday}T12:00:00.000Z`,
        }),
      /exceeds maximum slot duration/
    );

    // 4. Spoofed non-existent host rejected on public reservation
    await assert.rejects(
      () =>
        services.reservation.createReservation({
          resourceDocumentId: resource.documentId,
          customerName: "Spoofer",
          customerEmail: "spoof@example.com",
          startDate: `${targetMonday}T09:00:00.000Z`,
          assignedHost: "Fake CEO Host",
        }),
      /Requested host is unavailable/
    );

    // 5. Valid booking has no non-schema resourceDocumentId in raw DB row
    const created = await services.reservation.createReservation({
      resourceDocumentId: resource.documentId,
      customerName: "Valid Patient",
      customerEmail: "patient@example.com",
      startDate: `${targetMonday}T09:00:00.000Z`,
      partySize: 4,
    });
    const rawSaved = ensureCollection("plugin::bookings.booking").get(
      created.booking.documentId
    )!;
    assert.equal("resourceDocumentId" in rawSaved, false);
    assert.equal(rawSaved.resource, resource.documentId);

    // Staff adds internalNotes; customer cancels -> notes appended, token cleared!
    await services.reservation.updateBookingStatus(
      created.booking.documentId,
      "confirmed",
      { internalNotes: "VIP verified by desk" }
    );
    const cancelled = await services.reservation.cancelBooking({
      bookingCode: created.booking.bookingCode,
      cancelToken: created.cancelToken,
      reason: "Flight delayed",
    });
    assert.equal(cancelled.status, "cancelled");
    assert.equal(
      cancelled.internalNotes,
      "VIP verified by desk\nCancelled: Flight delayed"
    );
    assert.equal(
      ensureCollection("plugin::bookings.booking").get(
        created.booking.documentId
      )?.cancelTokenHash,
      null
    );

    // Replaying cancelled token fails (403) and re-cancelling cancelled fails (400)
    await assert.rejects(
      () =>
        services.reservation.rescheduleBooking({
          bookingCode: created.booking.bookingCode,
          cancelToken: created.cancelToken,
          newStartDate: `${targetMonday}T10:00:00.000Z`,
        }),
      /Invalid or missing cancelToken/
    );
    await assert.rejects(
      () =>
        services.reservation.cancelBooking(
          { bookingCode: created.booking.bookingCode },
          { isAdmin: true }
        ),
      /Cannot cancel a booking with status 'cancelled'/
    );

    // Fill slot (8/10) and reject reactivating cancelled 4-seat booking (8+4 > 10)
    for (const n of ["A", "B"]) {
      await services.reservation.createReservation(
        {
          resourceDocumentId: resource.documentId,
          customerName: `Admin Group ${n}`,
          customerEmail: `group-${n}@example.com`,
          startDate: `${targetMonday}T09:00:00.000Z`,
          partySize: 4,
        },
        { isAdmin: true, skipLeadTimeCheck: true }
      );
    }
    await assert.rejects(
      () =>
        services.reservation.updateBookingStatus(
          created.booking.documentId,
          "confirmed"
        ),
      /Insufficient slot capacity/
    );
    await assert.rejects(
      () =>
        services.reservation.updateBookingStatus(
          created.booking.documentId,
          "bogus_status" as never
        ),
      /Invalid booking status/
    );
  });
});
