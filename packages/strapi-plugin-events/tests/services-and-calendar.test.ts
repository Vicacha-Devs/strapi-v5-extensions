import assert from "node:assert/strict";
import { describe, it } from "node:test";

import bootstrap from "../server/src/bootstrap";
import register from "../server/src/register";
import type { StrapiKoaContext } from "../server/src/types";
import { EVENT_CONTENT_TYPE_UID } from "../shared/pluginId";
import { createMockStrapi } from "./mockStrapiHelper";

describe("RSVP Capacity, Waitlist Promotion & Multi-Source Calendar Services", () => {
  it("enforces capacity, places overflow on waitlist, and auto-promotes on cancel", async () => {
    const { services, db } = createMockStrapi();
    await services.settings.ensureInitialized();

    const futureDate = new Date(Date.now() + 14 * 86400000)
      .toISOString()
      .slice(0, 10);

    db["api::event.event"].push({
      documentId: "evt-summit-1",
      title: "Product Design Summit",
      startDate: `${futureDate}T18:00:00.000Z`,
      endDate: `${futureDate}T20:00:00.000Z`,
      rsvpEnabled: true,
      capacity: 3,
      waitlistEnabled: true,
    });

    const reg1 = await services.rsvp.registerAttendee("evt-summit-1", {
      attendeeName: "Alice Rivera",
      attendeeEmail: "alice@example.org",
      guestsCount: 2,
    });
    assert.equal(reg1.status, "confirmed");
    assert.ok(reg1.cancellationToken.length >= 32);

    const reg2 = await services.rsvp.registerAttendee("evt-summit-1", {
      attendeeName: "Carlos Gómez",
      attendeeEmail: "carlos@example.org",
      guestsCount: 2,
    });
    assert.equal(reg2.status, "waitlisted");

    const cancelResult = await services.rsvp.cancelByToken(
      reg1.cancellationToken
    );
    assert.equal(cancelResult.cancelled.status, "cancelled");
    assert.equal(cancelResult.promotedCount, 1);

    const statsAfter = await services.rsvp.getEventStats({
      eventUid: "api::event.event",
      eventDocumentId: "evt-summit-1",
      occurrenceDate: futureDate,
    });
    assert.equal(statsAfter.confirmedSeats, 2);
    assert.equal(statsAfter.waitlistedSeats, 0);
    assert.equal(statsAfter.remainingSeats, 1);

    const checkedIn = await services.rsvp.checkInAttendee({
      documentId: reg2.documentId,
    });
    assert.equal(checkedIn.status, "checked_in");
    assert.ok(Boolean(checkedIn.checkedInAt));
  });

  it("merges occurrences across multiple mapped collection sources", async () => {
    const { services, db } = createMockStrapi();
    await services.settings.ensureInitialized();

    db["api::event.event"].push({
      documentId: "evt-1",
      title: "Weekly Engineering Sync",
      startDate: "2026-11-06T18:00:00.000Z",
      endDate: "2026-11-06T19:00:00.000Z",
      category: "engineering",
      recurrence: {
        rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=FR",
        timezone: "UTC",
      },
    });

    db["api::booking.booking"].push({
      documentId: "booking-1",
      customerName: "Enterprise Onboarding Session",
      preferredDate: "2026-11-12",
      preferredTimeSlot: "morning",
      status: "confirmed",
    });

    const occurrences = await services.occurrence.getOccurrences({
      from: "2026-11-01T00:00:00.000Z",
      to: "2026-11-15T23:59:59.000Z",
      locale: "en",
      includeDrafts: true,
    });

    assert.equal(occurrences.length, 3);
    assert.equal(occurrences[0].title, "Weekly Engineering Sync");
    assert.equal(occurrences[1].title, "Enterprise Onboarding Session");
    assert.equal(occurrences[1].startDate, "2026-11-12T09:00:00.000Z");
  });

  it("supports single-occurrence override rescheduling, quickCreate, iCal feeds, and controllers", async () => {
    const { strapi, services, controllers } = createMockStrapi();

    let registeredCustomFieldName = "";
    strapi.customFields = {
      register: (field) => {
        registeredCustomFieldName = field.name;
      },
    };
    let registeredPermissionsCount = 0;
    strapi.admin = {
      services: {
        permission: {
          actionProvider: {
            registerMany: async (actions) => {
              registeredPermissionsCount = actions.length;
            },
          },
        },
      },
    };

    register({ strapi });
    await bootstrap({ strapi });

    assert.equal(registeredCustomFieldName, "rrule");
    assert.equal(registeredPermissionsCount, 3);

    const createCtx: StrapiKoaContext = {
      request: {
        body: {
          sourceId: "public-events",
          title: "Architecture Workshop",
          startDate: "2026-11-07T15:00:00.000Z",
          endDate: "2026-11-07T17:00:00.000Z",
          location: "Room 204",
          category: "workshop",
          rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=SA",
          rsvpEnabled: true,
          capacity: 25,
        },
      },
      set: () => {},
      badRequest: () => {},
    };
    await controllers.admin.quickCreate(createCtx);
    assert.equal(createCtx.status, 201);
    const createdDocId = String(
      (createCtx.body as { data: { documentId: string } }).data.documentId
    );

    await services.occurrence.rescheduleOccurrence({
      sourceId: "public-events",
      documentId: createdDocId,
      occurrenceDate: "2026-11-14",
      newStartDate: "2026-11-15T16:00:00.000Z",
      applyToSeries: false,
    });

    const occurrences = await services.occurrence.getOccurrences({
      from: "2026-11-01T00:00:00.000Z",
      to: "2026-11-20T23:59:59.000Z",
      includeDrafts: true,
    });
    assert.equal(occurrences.length, 2);
    assert.equal(occurrences[1].isOverridden, true);
    assert.equal(occurrences[1].startDate, "2026-11-15T16:00:00.000Z");

    const headers: Record<string, string> = {};
    const icsCtx: StrapiKoaContext = {
      query: {
        from: "2026-11-01T00:00:00.000Z",
        to: "2026-11-20T23:59:59.000Z",
      },
      set: (k: string, v: string) => {
        headers[k] = v;
      },
      badRequest: () => {},
    };
    await controllers.contentApi.downloadFeedIcs(icsCtx);
    assert.equal(headers["X-Content-Type-Options"], "nosniff");
    assert.ok(String(icsCtx.body).includes("SUMMARY:Architecture Workshop"));
  });

  it("supports secondary calendar systems, schemaExtensions, and safe customFields", async () => {
    const { strapi, services, db, bridgedCalendarSources } = createMockStrapi({
      defaultTimezone: "UTC",
      schemaExtensions: {
        event: {
          hijriDate: {
            type: "string",
            pluginOptions: { i18n: { localized: true } },
          },
        },
      },
      secondaryCalendars: [
        {
          id: "hijri",
          label: "Hijri (Umm al-Qura)",
          intlCalendar: "islamic-umalqura",
          dayOffset: 0,
          overrideField: "hijriDate",
          enabled: true,
        },
        {
          id: "fiscal",
          label: "Fiscal Quarter",
          intlCalendar: "custom-fiscal",
          enabled: true,
        },
      ],
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
            endDate: "endDate",
            rrule: "recurrence",
            alternateDateFields: { hijri: "hijriDate" },
            customFields: ["hijriDate", "speaker"],
          },
        },
      ],
    });

    strapi.contentTypes = {
      [EVENT_CONTENT_TYPE_UID]: {
        attributes: { title: { type: "string" } },
      },
    };

    register({ strapi });
    assert.equal(
      strapi.contentTypes[EVENT_CONTENT_TYPE_UID].attributes?.hijriDate?.type,
      "string"
    );

    services.occurrence.registerCalendarFormatter(
      "custom-fiscal",
      (date: Date) => {
        const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
        return `FY${date.getUTCFullYear()}-Q${quarter}`;
      }
    );

    await bootstrap({ strapi });
    assert.ok(bridgedCalendarSources.some((s) => s.id === "public-events"));

    db["api::event.event"].push({
      documentId: "evt-hijri-1",
      title: "Community Gathering",
      startDate: "2026-11-06T18:00:00.000Z",
      endDate: "2026-11-06T20:00:00.000Z",
      hijriDate: "26 Jumada al-Ula 1448 AH (Sighted)",
      speaker: "Dr. Tariq",
      recurrence: {
        rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=FR",
        timezone: "UTC",
      },
    });

    const occurrences = await services.occurrence.getOccurrences({
      from: "2026-11-01T00:00:00.000Z",
      to: "2026-11-15T23:59:59.000Z",
      locale: "en",
      includeDrafts: true,
    });

    assert.equal(occurrences.length, 2);
    assert.equal(
      occurrences[0].alternateDates?.hijri?.formatted,
      "26 Jumada al-Ula 1448 AH (Sighted)"
    );
    assert.equal(occurrences[0].alternateDates?.hijri?.isOverridden, true);
    assert.equal(occurrences[0].alternateDates?.fiscal?.formatted, "FY2026-Q4");
    assert.equal(occurrences[0].customFields?.speaker, "Dr. Tariq");
    assert.equal(occurrences[1].alternateDates?.hijri?.isOverridden, false);
    assert.ok(
      (occurrences[1].alternateDates?.hijri?.formatted.length ?? 0) > 4
    );

    services.occurrence.unregisterCalendarFormatter("custom-fiscal");
  });
});
