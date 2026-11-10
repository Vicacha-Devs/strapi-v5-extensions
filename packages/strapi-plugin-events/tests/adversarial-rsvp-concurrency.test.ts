import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it } from "node:test";

import destroy from "../server/src/destroy";
import { REGISTRATION_CONTENT_TYPE_UID } from "../shared/pluginId";
import { createMockStrapi } from "./mockStrapiHelper";

const futureIso = (daysAhead: number, hour = 18): string => {
  const dt = new Date(Date.now() + daysAhead * 86400000);
  const datePart = dt.toISOString().slice(0, 10);
  const hh = String(hour).padStart(2, "0");
  return `${datePart}T${hh}:00:00.000Z`;
};

describe("Adversarial Token Hashing, Check-In & Concurrency Regressions", () => {
  it("hashes tokens, rejects ended occurrences, verifies token+documentId, and blocks cancelled-event check-in", async () => {
    const { strapi, services, db } = createMockStrapi();
    await services.settings.ensureInitialized();

    const start = futureIso(10, 18);
    const end = futureIso(10, 20);
    db["api::event.event"].push({
      documentId: "evt-sec-token",
      title: "Security Token Test",
      startDate: start,
      endDate: end,
      rsvpEnabled: true,
      capacity: 10,
      waitlistEnabled: true,
    });

    const reg1 = await services.rsvp.registerAttendee("evt-sec-token", {
      attendeeName: "Nadia",
      attendeeEmail: "nadia@example.org",
      guestsCount: 1,
    });

    const storedRow = db[REGISTRATION_CONTENT_TYPE_UID][0];
    const expectedHash = crypto
      .createHash("sha256")
      .update(reg1.cancellationToken, "utf8")
      .digest("hex");
    assert.notEqual(storedRow.checkInToken, reg1.cancellationToken);
    assert.equal(storedRow.checkInToken, expectedHash);

    const listed = await services.rsvp.listRegistrations({
      eventDocumentId: "evt-sec-token",
    });
    assert.equal(listed[0].checkInToken, undefined);

    const reg2 = await services.rsvp.registerAttendee("evt-sec-token", {
      attendeeName: "Omar",
      attendeeEmail: "omar@example.org",
      guestsCount: 1,
    });

    // R2-E3: Passing wrong token alongside valid documentId MUST reject!
    await assert.rejects(
      () =>
        services.rsvp.checkInAttendee({
          documentId: reg2.documentId,
          token: "wrong-token-value-00000000000000",
        }),
      /Invalid check-in token/
    );

    const checkedInOnce = await services.rsvp.checkInAttendee({
      token: reg2.cancellationToken,
    });
    const checkedInTwice = await services.rsvp.checkInAttendee({
      documentId: reg2.documentId,
    });
    assert.equal(checkedInOnce.status, "checked_in");
    assert.equal(checkedInTwice.status, "checked_in");

    // R2-E3: Even after check-in, passing wrong token + documentId MUST reject!
    await assert.rejects(
      () =>
        services.rsvp.checkInAttendee({
          documentId: reg2.documentId,
          token: "wrong-token-value-00000000000000",
        }),
      /Invalid check-in token/
    );

    await assert.rejects(
      () => services.rsvp.cancelByToken(reg2.cancellationToken),
      /Checked-in registrations cannot be cancelled/
    );

    const cancelled = await services.rsvp.cancelByToken(reg1.cancellationToken);
    assert.equal(cancelled.cancelled.status, "cancelled");
    assert.equal(db[REGISTRATION_CONTENT_TYPE_UID][0].checkInToken, null);

    await assert.rejects(
      () => services.rsvp.cancelByToken(reg1.cancellationToken),
      /Registration not found|Invalid/
    );

    // R2-E1: Registering for an already-ended single event MUST fail
    db["api::event.event"].push({
      documentId: "evt-past",
      title: "Past Event",
      startDate: "2020-01-10T10:00:00.000Z",
      endDate: "2020-01-10T12:00:00.000Z",
      rsvpEnabled: true,
      capacity: 5,
    });
    await assert.rejects(
      () =>
        services.rsvp.registerAttendee("evt-past", {
          attendeeName: "Tariq",
          attendeeEmail: "tariq@example.org",
        }),
      /already ended/
    );

    // Register on future event, then simulate clock advancing past event end
    db["api::event.event"].push({
      documentId: "evt-expire",
      title: "Expiring Event",
      startDate: futureIso(5, 10),
      endDate: futureIso(5, 12),
      rsvpEnabled: true,
      capacity: 5,
    });
    const expiringReg = await services.rsvp.registerAttendee("evt-expire", {
      attendeeName: "Tariq",
      attendeeEmail: "tariq@example.org",
    });
    const expireDoc = db["api::event.event"].find(
      (d) => d.documentId === "evt-expire"
    )!;
    expireDoc.startDate = "2020-01-10T10:00:00.000Z";
    expireDoc.endDate = "2020-01-10T12:00:00.000Z";
    const expireRegRow = db[REGISTRATION_CONTENT_TYPE_UID].find(
      (r) => r.documentId === expiringReg.documentId
    )!;
    expireRegRow.occurrenceDate = "2020-01-10";
    await assert.rejects(
      () => services.rsvp.cancelByToken(expiringReg.cancellationToken),
      /after the event has ended/
    );

    // R2-E3: Cancelled event blocks check-in and confirmation transitions
    db["api::event.event"].push({
      documentId: "evt-later-cancelled",
      title: "Cancelled Later Event",
      startDate: futureIso(8, 18),
      endDate: futureIso(8, 20),
      rsvpEnabled: true,
      capacity: 1,
      waitlistEnabled: true,
    });
    const cReg1 = await services.rsvp.registerAttendee("evt-later-cancelled", {
      attendeeName: "Samira",
      attendeeEmail: "samira@example.org",
    });
    const cReg2 = await services.rsvp.registerAttendee("evt-later-cancelled", {
      attendeeName: "Yusuf",
      attendeeEmail: "yusuf@example.org",
    });
    const cancelEventDoc = db["api::event.event"].find(
      (d) => d.documentId === "evt-later-cancelled"
    )!;
    cancelEventDoc.eventStatus = "cancelled";
    await assert.rejects(
      () => services.rsvp.checkInAttendee({ documentId: cReg1.documentId }),
      /cancelled/
    );
    await assert.rejects(
      () =>
        services.rsvp.updateRegistrationStatus(cReg2.documentId, "confirmed"),
      /cancelled/
    );

    destroy({ strapi });
  });

  it("resolves recurring events without occurrenceDate to next future slot and rejects ended series", async () => {
    const { services, db } = createMockStrapi();
    await services.settings.ensureInitialized();

    db["api::event.event"].push(
      {
        documentId: "evt-rec-active",
        title: "Ongoing Weekly Workshop",
        startDate: "2025-01-03T18:00:00.000Z",
        endDate: "2025-01-03T19:30:00.000Z",
        rsvpEnabled: true,
        capacity: 10,
        recurrence: {
          rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=FR",
          timezone: "UTC",
        },
      },
      {
        documentId: "evt-rec-ended",
        title: "Finished Series",
        startDate: "2025-01-03T18:00:00.000Z",
        endDate: "2025-01-03T19:30:00.000Z",
        rsvpEnabled: true,
        capacity: 10,
        recurrence: {
          rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=FR;UNTIL=20250201T235959Z",
          timezone: "UTC",
        },
      }
    );

    const nextReg = await services.rsvp.registerAttendee("evt-rec-active", {
      attendeeName: "Layla",
      attendeeEmail: "layla@example.org",
    });
    assert.ok(
      new Date(`${nextReg.occurrenceDate}T23:59:59.999Z`).getTime() >=
        Date.now()
    );

    await assert.rejects(
      () =>
        services.rsvp.registerAttendee("evt-rec-active", {
          occurrenceDate: "2025-01-03",
          attendeeName: "Past Slot",
          attendeeEmail: "past@example.org",
        }),
      /already ended/
    );

    await assert.rejects(
      () =>
        services.rsvp.registerAttendee("evt-rec-ended", {
          attendeeName: "Ended Series",
          attendeeEmail: "ended@example.org",
        }),
      /already ended/
    );
  });

  it("enforces capacity and duplicate-email invariants under concurrent Promise.all registrations and cancellations", async () => {
    const { services, db, queryStats } = createMockStrapi();
    await services.settings.ensureInitialized();

    const start = futureIso(20, 15);
    const occDate = start.slice(0, 10);
    db["api::event.event"].push({
      documentId: "evt-race",
      title: "Concurrent Summit",
      startDate: start,
      endDate: futureIso(20, 17),
      rsvpEnabled: true,
      capacity: 3,
      waitlistEnabled: true,
    });

    const dupOutcomes = await Promise.allSettled([
      services.rsvp.registerAttendee("evt-race", {
        attendeeName: "Dup User",
        attendeeEmail: "dup@example.org",
        guestsCount: 1,
      }),
      services.rsvp.registerAttendee("evt-race", {
        attendeeName: "Dup User",
        attendeeEmail: "dup@example.org",
        guestsCount: 1,
      }),
      services.rsvp.registerAttendee("evt-race", {
        attendeeName: "Dup User",
        attendeeEmail: "dup@example.org",
        guestsCount: 1,
      }),
    ]);
    const dupFulfilled = dupOutcomes.filter((o) => o.status === "fulfilled");
    assert.equal(dupFulfilled.length, 1);

    const burst = await Promise.all(
      Array.from({ length: 6 }, (_, idx) =>
        services.rsvp.registerAttendee("evt-race", {
          attendeeName: `Attendee ${idx}`,
          attendeeEmail: `user-${idx}@example.org`,
          guestsCount: 1,
        })
      )
    );
    assert.ok(queryStats.transactionCalls >= 7);

    const stats = await services.rsvp.getEventStats({
      eventUid: "api::event.event",
      eventDocumentId: "evt-race",
      occurrenceDate: occDate,
    });
    assert.equal(stats.confirmedSeats, 3);
    assert.equal(stats.waitlistedSeats, 4);

    const waitlistedReg = burst.find((r) => r.status === "waitlisted")!;
    await assert.rejects(
      () =>
        services.rsvp.updateRegistrationStatus(
          waitlistedReg.documentId,
          "confirmed"
        ),
      /maximum capacity/
    );
    await assert.rejects(
      () =>
        services.rsvp.checkInAttendee({ documentId: waitlistedReg.documentId }),
      /only confirmed registrations can be checked in/
    );

    const confirmedReg = burst.find((r) => r.status === "confirmed")!;
    const [, p1, p2] = await Promise.all([
      services.rsvp.cancelByToken(confirmedReg.cancellationToken),
      services.rsvp.promoteFromWaitlist({
        eventUid: "api::event.event",
        eventDocumentId: "evt-race",
        occurrenceDate: occDate,
      }),
      services.rsvp.promoteFromWaitlist({
        eventUid: "api::event.event",
        eventDocumentId: "evt-race",
        occurrenceDate: occDate,
      }),
    ]);
    assert.ok(p1.length + p2.length <= 1);
    const statsAfterRace = await services.rsvp.getEventStats({
      eventUid: "api::event.event",
      eventDocumentId: "evt-race",
      occurrenceDate: occDate,
    });
    assert.equal(statsAfterRace.confirmedSeats, 3);
  });
});
