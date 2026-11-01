import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import bootstrap from "../server/src/bootstrap";
import adminControllerFactory from "../server/src/controllers/admin";
import contentApiControllerFactory from "../server/src/controllers/content-api";
import register from "../server/src/register";
import icalFactory from "../server/src/services/ical";
import occurrenceFactory from "../server/src/services/occurrence";
import rsvpFactory from "../server/src/services/rsvp";
import settingsFactory from "../server/src/services/settings";
import {
  EVENT_CONTENT_TYPE_UID,
  REGISTRATION_CONTENT_TYPE_UID,
} from "../shared/pluginId";

const currentTestDir = path.dirname(fileURLToPath(import.meta.url));

function createMockStrapi() {
  const storeData: Record<string, any> = {};
  const db: Record<string, Array<Record<string, any>>> = {
    [EVENT_CONTENT_TYPE_UID]: [],
    [REGISTRATION_CONTENT_TYPE_UID]: [],
    "api::event.event": [],
    "api::booking.booking": [],
  };

  let seq = 1;

  const strapi: any = {
    config: {
      get: () => ({
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
              endDate: "endDate",
              rrule: "recurrence",
              location: "location",
              category: "category",
              capacity: "capacity",
              rsvpEnabled: "rsvpEnabled",
            },
          },
          {
            id: "slot-bookings",
            label: "Bookings",
            uid: "api::booking.booking",
            color: "#D97706",
            enabled: true,
            fields: {
              title: "customerName",
              startDate: "preferredDate",
              timeSlot: "preferredTimeSlot",
              status: "status",
            },
          },
        ],
      }),
    },
    store: () => ({
      get: async ({ key }: { key: string }) => storeData[key] ?? null,
      set: async ({ key, value }: { key: string; value: any }) => {
        storeData[key] = value;
      },
    }),
    documents: (uid: string) => ({
      findOne: async ({ documentId }: { documentId: string }) => {
        return (db[uid] ?? []).find((d) => d.documentId === documentId) ?? null;
      },
      findMany: async ({ filters }: { filters?: Record<string, any> } = {}) => {
        let items = [...(db[uid] ?? [])];
        if (filters?.documentId?.$eq) {
          items = items.filter((d) => d.documentId === filters.documentId.$eq);
        }
        if (filters?.eventDocumentId?.$eq) {
          items = items.filter(
            (d) => d.eventDocumentId === filters.eventDocumentId.$eq
          );
        }
        if (filters?.occurrenceDate?.$eq) {
          items = items.filter(
            (d) => d.occurrenceDate === filters.occurrenceDate.$eq
          );
        }
        if (filters?.attendeeEmail?.$eq) {
          items = items.filter(
            (d) => d.attendeeEmail === filters.attendeeEmail.$eq
          );
        }
        if (filters?.checkInToken?.$eq) {
          items = items.filter(
            (d) => d.checkInToken === filters.checkInToken.$eq
          );
        }
        if (filters?.status?.$eq) {
          items = items.filter((d) => d.status === filters.status.$eq);
        }
        if (filters?.status?.$in) {
          items = items.filter((d) => filters.status.$in.includes(d.status));
        }
        return items;
      },
      create: async ({ data }: { data: Record<string, any> }) => {
        const record = {
          ...data,
          documentId: data.documentId ?? `doc-${seq++}`,
          createdAt: new Date().toISOString(),
        };
        if (!db[uid]) db[uid] = [];
        db[uid].push(record);
        return record;
      },
      update: async ({
        documentId,
        data,
      }: {
        documentId: string;
        data: Record<string, any>;
      }) => {
        const list = db[uid] ?? [];
        const idx = list.findIndex((d) => d.documentId === documentId);
        if (idx < 0) throw new Error("Not found");
        list[idx] = { ...list[idx], ...data };
        return list[idx];
      },
    }),
    log: {
      debug: () => {},
    },
    plugin: (name: string) => {
      if (name === "events") {
        return {
          service: (svcName: string) => services[svcName],
        };
      }
      if (name === "calendar") {
        return {
          service: (svcName: string) =>
            svcName === "registry"
              ? {
                  registerSource: async (src: Record<string, unknown>) => {
                    bridgedCalendarSources.push(src);
                  },
                }
              : null,
        };
      }
      return null;
    },
  };

  const bridgedCalendarSources: Array<Record<string, unknown>> = [];
  const services: Record<string, any> = {};
  services.settings = settingsFactory({ strapi });
  services.rsvp = rsvpFactory({ strapi });
  services.occurrence = occurrenceFactory({ strapi });
  services.ical = icalFactory({ strapi });

  const controllers = {
    admin: adminControllerFactory({ strapi }),
    contentApi: contentApiControllerFactory({ strapi }),
  };

  return { strapi, services, controllers, db, bridgedCalendarSources };
}

describe("RSVP Capacity, Waitlist Auto-Promotion & Multi-Source Calendar Services", () => {
  it("enforces capacity, places overflow on waitlist, and auto-promotes when confirmed cancels", async () => {
    const { services, db } = createMockStrapi();
    await services.settings.ensureInitialized();

    // Seed an event with capacity = 3 seats
    db["api::event.event"].push({
      documentId: "evt-summit-1",
      title: "Product Design Summit",
      startDate: "2026-11-10T18:00:00.000Z",
      endDate: "2026-11-10T20:00:00.000Z",
      rsvpEnabled: true,
      capacity: 3,
      waitlistEnabled: true,
    });

    // 1. Register first attendee with 2 seats -> confirmed
    const reg1 = await services.rsvp.registerAttendee("evt-summit-1", {
      attendeeName: "Alice Rivera",
      attendeeEmail: "alice@example.org",
      guestsCount: 2,
    });
    expect(reg1.status).toBe("confirmed");
    expect(reg1.cancellationToken.length).toBeGreaterThanOrEqual(32);

    // 2. Register second attendee with 2 seats -> exceeds 3 capacity -> waitlisted!
    const reg2 = await services.rsvp.registerAttendee("evt-summit-1", {
      attendeeName: "Carlos Gómez",
      attendeeEmail: "carlos@example.org",
      guestsCount: 2,
    });
    expect(reg2.status).toBe("waitlisted");

    // 3. Cancel first attendee by token -> Carlos (2 seats) fits into the 3 available seats -> auto-promoted!
    const cancelResult = await services.rsvp.cancelByToken(
      reg1.cancellationToken
    );
    expect(cancelResult.cancelled.status).toBe("cancelled");
    expect(cancelResult.promotedCount).toBe(1);

    const statsAfter = await services.rsvp.getEventStats({
      eventUid: "api::event.event",
      eventDocumentId: "evt-summit-1",
      occurrenceDate: "2026-11-10",
    });
    expect(statsAfter.confirmedSeats).toBe(2);
    expect(statsAfter.waitlistedSeats).toBe(0);
    expect(statsAfter.remainingSeats).toBe(1);

    // 4. Check in Carlos
    const checkedIn = await services.rsvp.checkInAttendee({
      documentId: reg2.documentId,
    });
    expect(checkedIn.status).toBe("checked_in");
    expect(checkedIn.checkedInAt).toBeTruthy();
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

    // Nov 6 (Fri), Nov 12 (Thu booking), Nov 13 (Fri)
    expect(occurrences.length).toBe(3);
    expect(occurrences[0].title).toBe("Weekly Engineering Sync");
    expect(occurrences[1].title).toBe("Enterprise Onboarding Session");
    expect(occurrences[1].startDate).toBe("2026-11-12T09:00:00.000Z");
  });

  it("supports single-occurrence override rescheduling, quickCreate, iCal feeds, and controllers", async () => {
    const { strapi, services, controllers } = createMockStrapi();

    let registeredCustomField: any = null;
    strapi.customFields = {
      register: (field: any) => {
        registeredCustomField = field;
      },
    };
    let registeredPermissions: any[] = [];
    strapi.admin = {
      services: {
        permission: {
          actionProvider: {
            registerMany: async (actions: any[]) => {
              registeredPermissions = actions;
            },
          },
        },
      },
    };

    register({ strapi });
    await bootstrap({ strapi });

    expect(registeredCustomField.name).toBe("rrule");
    expect(registeredPermissions.length).toBe(3);

    // Quick-create a weekly event via admin controller
    const createCtx: any = {
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
    };
    await controllers.admin.quickCreate(createCtx);
    expect(createCtx.status).toBe(201);
    const createdDocId = createCtx.body.data.documentId;

    // Reschedule only the 2026-11-14 occurrence to 2026-11-15
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
    expect(occurrences.length).toBe(2);
    expect(occurrences[1].isOverridden).toBe(true);
    expect(occurrences[1].startDate).toBe("2026-11-15T16:00:00.000Z");

    // Download iCal feed via content-api controller
    const headers: Record<string, string> = {};
    const icsCtx: any = {
      query: {
        from: "2026-11-01T00:00:00.000Z",
        to: "2026-11-20T23:59:59.000Z",
      },
      set: (k: string, v: string) => {
        headers[k] = v;
      },
    };
    await controllers.contentApi.downloadFeedIcs(icsCtx);
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(icsCtx.body).toContain("SUMMARY:Architecture Workshop");
  });

  it("supports extensible secondary calendar systems (Hijri, Hebrew, custom formatters), schemaExtensions, and customFields", async () => {
    const { strapi, services, db, bridgedCalendarSources } = createMockStrapi();

    // 1. Test declarative schemaExtensions in register()
    strapi.customFields = { register: () => {} };
    strapi.contentTypes = {
      [EVENT_CONTENT_TYPE_UID]: {
        attributes: {
          title: { type: "string" },
        },
      },
    };
    strapi.config = {
      get: () => ({
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
              alternateDateFields: {
                hijri: "hijriDate",
              },
              customFields: ["hijriDate", "speaker"],
            },
          },
        ],
      }),
    };

    register({ strapi });
    expect(
      strapi.contentTypes[EVENT_CONTENT_TYPE_UID].attributes.hijriDate
    ).toBeTruthy();
    expect(
      strapi.contentTypes[EVENT_CONTENT_TYPE_UID].attributes.hijriDate.type
    ).toBe("string");

    // 2. Register a custom programmatic calendar formatter ("custom-fiscal")
    services.occurrence.registerCalendarFormatter(
      "custom-fiscal",
      (date: Date) => {
        const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
        return `FY${date.getUTCFullYear()}-Q${quarter}`;
      }
    );

    await bootstrap({ strapi });
    expect(bridgedCalendarSources.some((s) => s.id === "public-events")).toBe(
      true
    );

    db["api::event.event"].push({
      documentId: "evt-hijri-1",
      title: "Community Gathering",
      startDate: "2026-11-06T18:00:00.000Z",
      endDate: "2026-11-06T20:00:00.000Z",
      hijriDate: "26 Jumada al-Ula 1448 AH (Sighted)",
      speaker: "Dr.Tariq",
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

    expect(occurrences.length).toBe(2);

    // Base occurrence (2026-11-06) uses the explicit hijriDate override field + custom fiscal formatter
    expect(occurrences[0].alternateDates?.hijri?.formatted).toBe(
      "26 Jumada al-Ula 1448 AH (Sighted)"
    );
    expect(occurrences[0].alternateDates?.hijri?.isOverridden).toBe(true);
    expect(occurrences[0].alternateDates?.fiscal?.formatted).toBe("FY2026-Q4");
    expect(occurrences[0].customFields?.speaker).toBe("Dr.Tariq");

    // Second recurring occurrence (2026-11-13) automatically computes its Hijri date via Intl
    expect(occurrences[1].alternateDates?.hijri?.isOverridden).toBe(false);
    expect(
      occurrences[1].alternateDates?.hijri?.formatted.length
    ).toBeGreaterThan(4);
    expect(occurrences[1].alternateDates?.fiscal?.formatted).toBe("FY2026-Q4");

    services.occurrence.unregisterCalendarFormatter("custom-fiscal");
  });
});

describe("10-Locale Admin Translation Parity", () => {
  const locales = ["en", "es", "fr", "de", "pt", "it", "nl", "pl", "tr", "ar"];
  const translationsDir = path.resolve(
    currentTestDir,
    "../admin/src/translations"
  );

  it("has complete, non-empty translation keys across all 10 locales", () => {
    const enRaw = fs.readFileSync(
      path.join(translationsDir, "en.json"),
      "utf8"
    );
    const enMap = JSON.parse(enRaw) as Record<string, string>;
    const enKeys = Object.keys(enMap);
    expect(enKeys.length).toBeGreaterThan(65);

    for (const locale of locales) {
      const filePath = path.join(translationsDir, `${locale}.json`);
      expect(fs.existsSync(filePath)).toBe(true);
      const map = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<
        string,
        string
      >;
      for (const k of enKeys) {
        expect(map[k], `Missing key "${k}" in ${locale}.json`).toBeTruthy();
      }
    }
  });
});
