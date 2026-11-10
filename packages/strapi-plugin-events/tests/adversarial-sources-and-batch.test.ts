import assert from "node:assert/strict";
import { describe, it } from "node:test";

import register from "../server/src/register";
import type { StrapiKoaContext } from "../server/src/types";
import {
  EVENT_CONTENT_TYPE_UID,
  REGISTRATION_CONTENT_TYPE_UID,
} from "../shared/pluginId";
import { createMockStrapi } from "./mockStrapiHelper";

const futureIso = (daysAhead: number, hour = 18): string => {
  const dt = new Date(Date.now() + daysAhead * 86400000);
  const datePart = dt.toISOString().slice(0, 10);
  const hh = String(hour).padStart(2, "0");
  return `${datePart}T${hh}:00:00.000Z`;
};

describe("Adversarial Input, Draft, Source UID & Batched Query Regressions", () => {
  it("rejects fake occurrenceDate, malformed guestsCount, malformed deadline, draft events, and cancelled/postponed events", async () => {
    const { services, controllers, db, sentEmails } = createMockStrapi();
    await services.settings.ensureInitialized();

    const winFrom = futureIso(2, 0);
    const winTo = futureIso(30, 23);

    db["api::event.event"].push(
      {
        documentId: "evt-single",
        title: "Single Event\r\nBcc: victim@evil.org",
        startDate: futureIso(10, 18),
        endDate: futureIso(10, 20),
        rsvpEnabled: true,
        capacity: 10,
      },
      {
        documentId: "evt-draft",
        title: "Secret Draft Event",
        startDate: futureIso(11, 18),
        rsvpEnabled: true,
        capacity: 10,
        publishedAt: null,
      },
      {
        documentId: "evt-cancelled",
        title: "Cancelled Event",
        startDate: futureIso(12, 18),
        eventStatus: "cancelled",
        rsvpEnabled: true,
        capacity: 10,
      },
      {
        documentId: "evt-bad-deadline",
        title: "Malformed Deadline Event",
        startDate: futureIso(13, 18),
        rsvpEnabled: true,
        registrationDeadline: "not-a-valid-iso-date",
      },
      {
        documentId: "evt-default-rsvp",
        title: "No RSVP Flag Event",
        startDate: futureIso(14, 18),
      }
    );

    await assert.rejects(
      () =>
        services.rsvp.registerAttendee("evt-single", {
          occurrenceDate: "2099-01-01",
          attendeeName: "Fake Date",
          attendeeEmail: "fake@example.org",
        }),
      /not a scheduled occurrence/
    );
    await assert.rejects(
      () =>
        services.rsvp.registerAttendee("evt-single", {
          occurrenceDate: "2026-02-31",
          attendeeName: "Bad Calendar",
          attendeeEmail: "badcal@example.org",
        }),
      /valid YYYY-MM-DD/
    );
    await assert.rejects(
      () =>
        services.rsvp.registerAttendee("evt-draft", {
          attendeeName: "Draft Probe",
          attendeeEmail: "probe@example.org",
        }),
      /Event not found/
    );
    await assert.rejects(
      () =>
        services.rsvp.registerAttendee("evt-cancelled", {
          attendeeName: "Cancel Probe",
          attendeeEmail: "probe2@example.org",
        }),
      /cancelled/
    );
    await assert.rejects(
      () =>
        services.rsvp.registerAttendee("evt-bad-deadline", {
          attendeeName: "Deadline Probe",
          attendeeEmail: "probe3@example.org",
        }),
      /deadline/
    );
    await assert.rejects(
      () =>
        services.rsvp.registerAttendee("evt-default-rsvp", {
          attendeeName: "Default Probe",
          attendeeEmail: "probe4@example.org",
        }),
      /Registrations are closed/
    );

    const pubOccs = await services.occurrence.getOccurrences({
      from: winFrom,
      to: winTo,
      includeDrafts: false,
    });
    assert.equal(
      pubOccs.some((o) => o.documentId === "evt-draft"),
      false
    );

    // Verify fetchDocumentsFallback preserves status: "published"
    const fallbackHarness = createMockStrapi({
      defaultTimezone: "UTC",
      sources: [
        {
          id: "public-events",
          label: "Public Events",
          uid: "api::event.event",
          color: "#0D9488",
          enabled: true,
          fields: {
            title: "title",
            startDate: "startDate",
            poster: "poster",
          },
        },
      ],
    });
    const origDocs = fallbackHarness.strapi.documents.bind(
      fallbackHarness.strapi
    );
    const seenFallbackStatuses: Array<string | undefined> = [];
    fallbackHarness.strapi.documents = ((uid: string) => {
      const base = origDocs(uid);
      return {
        ...base,
        findMany: async (opts?: {
          populate?: unknown;
          status?: "draft" | "published";
        }) => {
          if (opts?.populate) {
            throw new Error("Unsupported populate");
          }
          seenFallbackStatuses.push(opts?.status);
          return base.findMany(opts);
        },
      };
    }) as typeof fallbackHarness.strapi.documents;
    fallbackHarness.db["api::event.event"].push({
      documentId: "evt-fallback-draft",
      title: "Unpublished Draft in Fallback",
      startDate: futureIso(12, 18),
      publishedAt: null,
    });
    const fallbackOccs =
      await fallbackHarness.services.occurrence.getOccurrences({
        from: winFrom,
        to: winTo,
        includeDrafts: false,
      });
    assert.ok(seenFallbackStatuses.length >= 1);
    assert.ok(seenFallbackStatuses.every((st) => st === "published"));
    assert.equal(fallbackOccs.length, 0);

    const invalidGuests = [
      0,
      -3,
      1.9,
      "NaN",
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ];
    for (const badGuests of invalidGuests) {
      let badReqCalled = false;
      const ctx: StrapiKoaContext = {
        params: { documentId: "evt-single" },
        request: {
          body: {
            attendeeName: "Guest Tester",
            attendeeEmail: "tester@example.org",
            guestsCount: badGuests,
          },
        },
        set: () => {},
        badRequest: () => {
          badReqCalled = true;
        },
      };
      await controllers.contentApi.registerAttendee(ctx);
      assert.equal(badReqCalled, true);
    }

    const validReg = await services.rsvp.registerAttendee("evt-single", {
      attendeeName: "Safe Attendee",
      attendeeEmail: "safe@example.org",
      metadata: JSON.parse('{"__proto__":{"polluted":true},"diet":"halal"}'),
    });
    assert.equal(validReg.status, "confirmed");
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
    assert.equal(sentEmails.length, 1);
    assert.equal(/[\r\n]/.test(sentEmails[0].subject), false);
  });

  it("blocks admin::user UIDs, strips corrupted overrides, clamps pagination, and filters RSVP batch by occurrenceDate", async () => {
    const { strapi, services, controllers, db, queryStats } = createMockStrapi({
      defaultTimezone: "UTC",
      schemaExtensions: {
        event: JSON.parse('{"__proto__":{"pollutedSchema":true}}'),
      },
      sources: [
        {
          id: "evil-users",
          label: "Admin Users",
          uid: "admin::user",
          color: "#000000",
          enabled: true,
          fields: { title: "email", startDate: "createdAt" },
        },
        {
          id: "public-events",
          label: "Public Events",
          uid: "api::event.event",
          color: "#0D9488",
          enabled: true,
          fields: {
            title: "title",
            startDate: "startDate",
            endDate: "endDate",
            rrule: "recurrence",
            rsvpEnabled: "rsvpEnabled",
            capacity: "capacity",
            customFields: [
              "speaker",
              "password",
              "resetPasswordToken",
              "checkInToken",
              "secretApiKey",
              "__proto__",
            ],
          },
        },
      ],
    });

    strapi.contentTypes = {
      [EVENT_CONTENT_TYPE_UID]: { attributes: {} },
      "api::event.event": {
        attributes: {
          speaker: { type: "string" },
          secretApiKey: { type: "string", private: true },
        },
      },
    };
    register({ strapi });
    assert.equal(({} as Record<string, unknown>).pollutedSchema, undefined);

    const initialized = await services.settings.ensureInitialized();
    assert.equal(
      initialized.sources.some((s) => s.uid === "admin::user"),
      false
    );

    await assert.rejects(
      () =>
        services.settings.updateSettings({
          sources: [
            {
              id: "hack",
              label: "Hack",
              uid: "admin::user",
              color: "#111111",
              enabled: true,
              fields: { title: "username", startDate: "createdAt" },
            },
          ],
        }),
      /Disallowed event source UID/
    );

    // R2-E2: Include corrupted overrides that previously triggered RangeError
    db["api::event.event"].push(
      {
        documentId: "evt-batch-1",
        title: "Recurring Batch Event 1",
        startDate: "2026-10-02T17:00:00.000Z",
        endDate: "2026-10-02T18:00:00.000Z",
        rsvpEnabled: true,
        capacity: 20,
        speaker: "Prof. Nadia",
        password: "leaked-password-hash",
        resetPasswordToken: "leaked-reset-token",
        checkInToken: "leaked-checkin",
        secretApiKey: "leaked-private-attr",
        recurrence: {
          rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=FR",
          timezone: "UTC",
          overrides: {
            "2026-10-16": {
              originalDate: "2026-10-16",
              startDate: "invalid-date-value",
            },
            "2026-10-23": {
              originalDate: "2026-10-23",
              startDate: "2026-10-23T20:00:00.000Z",
              endDate: "2026-10-23T18:00:00.000Z",
            },
          },
        },
      },
      {
        documentId: "evt-batch-2",
        title: "Recurring Batch Event 2",
        startDate: "2026-10-03T17:00:00.000Z",
        endDate: "2026-10-03T18:00:00.000Z",
        rsvpEnabled: true,
        capacity: 15,
        recurrence: {
          rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=SA",
          timezone: "UTC",
        },
      }
    );

    await assert.rejects(
      () =>
        services.occurrence.rescheduleOccurrence({
          sourceId: "public-events",
          documentId: "evt-batch-1",
          occurrenceDate: "__proto__",
          newStartDate: "2026-10-05T17:00:00.000Z",
        }),
      /Invalid occurrenceDate/
    );
    await assert.rejects(
      () =>
        services.occurrence.rescheduleOccurrence({
          sourceId: "public-events",
          documentId: "evt-batch-1",
          occurrenceDate: "2026-10-09",
          newStartDate: "not-an-iso-date",
        }),
      /Invalid newStartDate/
    );

    queryStats.findManyCallsByUid[REGISTRATION_CONTENT_TYPE_UID] = 0;
    const expanded = await services.occurrence.getOccurrences({
      from: "2026-10-01T00:00:00.000Z",
      to: "2026-10-31T23:59:59.000Z",
      includeDrafts: false,
    });

    assert.equal(expanded.length, 10);
    assert.equal(
      queryStats.findManyCallsByUid[REGISTRATION_CONTENT_TYPE_UID],
      1
    );

    // R2-E4: Verify attachBatchedRsvpStats scopes query by occurrenceDate $in
    const regFilter =
      queryStats.lastFindManyFiltersByUid[REGISTRATION_CONTENT_TYPE_UID];
    const occDateFilter = regFilter?.occurrenceDate as
      | { $in?: string[] }
      | undefined;
    assert.ok(Array.isArray(occDateFilter?.$in));
    assert.ok((occDateFilter?.$in?.length ?? 0) >= 5);

    // R2-E2 & CR #2: Verify feed.ics, listOccurrences, and listSpotlights
    const feedCtx: StrapiKoaContext = {
      query: {
        from: "2026-10-01T00:00:00.000Z",
        to: "2026-10-31T23:59:59.000Z",
      },
      set: () => {},
      badRequest: () => {},
    };
    await controllers.contentApi.downloadFeedIcs(feedCtx);
    assert.ok(String(feedCtx.body).includes("BEGIN:VCALENDAR"));

    const occCtx: StrapiKoaContext = {
      query: {
        from: "2026-10-01T00:00:00.000Z",
        to: "2027-09-30T23:59:59.000Z",
        page: "-4",
        pageSize: "99999",
      },
      set: () => {},
      badRequest: () => {},
    };
    await controllers.contentApi.listOccurrences(occCtx);
    const occBody = occCtx.body as {
      data: Array<{ occurrenceId: string }>;
    };
    assert.equal(occBody.data.length, 100);
    assert.equal(occBody.data[0].occurrenceId, expanded[0].occurrenceId);

    const spotCtx: StrapiKoaContext = {
      query: {
        date: "2026-10-02T12:00:00.000Z",
        limit: "99999",
      },
      set: () => {},
      badRequest: () => {},
    };
    await controllers.contentApi.listSpotlights(spotCtx);
    const spotBody = spotCtx.body as { data: unknown[] };
    assert.ok(spotBody.data.length <= 100);

    const first = expanded.find((o) => o.documentId === "evt-batch-1")!;
    assert.deepEqual(first.customFields, { speaker: "Prof. Nadia" });

    const emptyInv = await services.occurrence.getOccurrences({
      from: "2026-12-31T00:00:00.000Z",
      to: "2026-01-01T00:00:00.000Z",
      includeDrafts: false,
    });
    assert.deepEqual(emptyInv, []);

    const clamped = await services.occurrence.getOccurrences({
      from: "2026-10-01T00:00:00.000Z",
      to: "2035-10-01T00:00:00.000Z",
      includeDrafts: false,
    });
    const latestStartMs = Math.max(
      ...clamped.map((o) => new Date(o.startDate).getTime())
    );
    const windowLimitMs =
      new Date("2026-10-01T00:00:00.000Z").getTime() + 367 * 86400000;
    assert.ok(latestStartMs <= windowLimitMs);
  });
});
