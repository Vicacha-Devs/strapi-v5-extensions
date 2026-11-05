import type { Core } from "@strapi/strapi";
import { describe, it, expect } from "vitest";

import adminControllerFactory from "../server/src/controllers/admin";
import contentApiControllerFactory from "../server/src/controllers/content-api";
import icalServiceFactory from "../server/src/services/ical";
import occurrenceServiceFactory from "../server/src/services/occurrence";
import registryServiceFactory from "../server/src/services/registry";
import settingsServiceFactory from "../server/src/services/settings";
import type {
  CalendarPluginServiceMap,
  StrapiRouteContext,
} from "../server/src/types";
import {
  type CalendarPluginSettings,
  type DiscoveredContentType,
  type ExpandedCalendarOccurrence,
} from "../shared/types";

function createMockStrapi(pluginConfig: Record<string, unknown> = {}) {
  let storedSettings: unknown = null;
  const documentsDb: Record<string, Array<Record<string, unknown>>> = {
    "api::event.event": [
      {
        documentId: "evt-doc-1",
        title: "Weekly Friday Khutbah",
        startDate: "2026-05-01T13:00:00.000Z",
        endDate: "2026-05-01T14:00:00.000Z",
        rrule: "FREQ=WEEKLY;BYDAY=FR",
        category: "Religious",
        hijriDate: "14 Dhu al-Qiʻdah 1447 AH",
      },
    ],
    "api::booking.booking": [
      {
        documentId: "bkg-doc-1",
        bookingTitle: "Hall Reservation - Wedding",
        checkIn: "2026-05-03T15:00:00.000Z",
        checkOut: "2026-05-03T19:00:00.000Z",
        status: "confirmed",
      },
    ],
  };

  const services = {} as CalendarPluginServiceMap;

  const strapi: Core.Strapi = {
    config: {
      get: <T = unknown>(_key: string, defaultVal?: T): T =>
        (pluginConfig ?? defaultVal) as T,
    },
    contentTypes: {
      "api::event.event": {
        kind: "collectionType",
        info: { displayName: "Event", singularName: "event" },
        attributes: {
          title: { type: "string" },
          startDate: { type: "datetime" },
          endDate: { type: "datetime" },
          allDay: { type: "boolean" },
          rrule: { type: "string", customField: "plugin::calendar.rrule" },
          category: { type: "string" },
          color: { type: "string" },
          hijriDate: { type: "string" },
        },
      },
      "api::booking.booking": {
        kind: "collectionType",
        info: { displayName: "Booking", singularName: "booking" },
        attributes: {
          bookingTitle: { type: "string" },
          checkIn: { type: "datetime" },
          checkOut: { type: "datetime" },
          status: { type: "enumeration" },
        },
      },
      "admin::permission": {
        kind: "collectionType",
        info: { displayName: "Permission" },
        attributes: { action: { type: "string" } },
      },
    },
    store: () => ({
      get: async () => storedSettings,
      set: async ({ value }: { key: string; value: unknown }) => {
        storedSettings = value;
      },
    }),
    documents: (uid: string) => ({
      findMany: async () => documentsDb[uid] || [],
      findOne: async ({ documentId }: { documentId: string }) => {
        const list = documentsDb[uid] || [];
        return list.find((d) => d.documentId === documentId) ?? null;
      },
      update: async ({
        documentId,
        data,
      }: {
        documentId: string;
        data: Record<string, unknown>;
      }) => {
        const list = documentsDb[uid] || [];
        const idx = list.findIndex((d) => d.documentId === documentId);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...data };
          return list[idx];
        }
        return null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const created = { documentId: `doc-${Date.now()}`, ...data };
        if (!documentsDb[uid]) documentsDb[uid] = [];
        documentsDb[uid].push(created);
        return created;
      },
    }),
    plugin: (name: string) => ({
      service: <T = Record<string, unknown>>(sName: string): T => {
        if (name === "calendar") {
          return services[
            sName as keyof CalendarPluginServiceMap
          ] as unknown as T;
        }
        return {} as T;
      },
    }),
    customFields: {
      register: () => {},
    },
  };

  services.registry = registryServiceFactory({ strapi });
  services.settings = settingsServiceFactory({ strapi });
  services.occurrence = occurrenceServiceFactory({ strapi });
  services.ical = icalServiceFactory({ strapi });

  return { strapi, services, documentsDb };
}

describe("Strapi Plugin Calendar Services & Controllers", () => {
  it("discovers non-system content types and classifies fields for the No-Code Mapper", async () => {
    const { services } = createMockStrapi();
    const schemas: DiscoveredContentType[] =
      services.settings.discoverContentTypes();

    expect(schemas.length).toBe(2);
    const eventSchema = schemas.find((s) => s.uid === "api::event.event");
    expect(eventSchema?.displayName).toBe("Event");
    const fieldNames = (eventSchema?.fields ?? []).map((f) => f.name);
    expect(fieldNames).toContain("startDate");
    expect(fieldNames).toContain("endDate");
    expect(fieldNames).toContain("title");
    expect(fieldNames).toContain("rrule");
  });

  it("aggregates occurrences across multiple collections + runtime-registered companion plugins", async () => {
    const { services } = createMockStrapi({
      sources: [
        {
          id: "events",
          label: "Events",
          uid: "api::event.event",
          color: "#4945ff",
          enabled: true,
          fields: {
            title: "title",
            startDate: "startDate",
            endDate: "endDate",
            rrule: "rrule",
            category: "category",
          },
        },
      ],
      secondaryCalendars: [
        {
          id: "hijri",
          label: "Hijri",
          intlCalendar: "islamic-umalqura",
          overrideField: "hijriDate",
          enabled: true,
        },
      ],
    });

    // Companion plugin registers Bookings source programmatically
    services.registry.registerSource({
      id: "bookings",
      label: "Bookings",
      uid: "api::booking.booking",
      color: "#059669",
      enabled: true,
      fields: {
        title: "bookingTitle",
        startDate: "checkIn",
        endDate: "checkOut",
        status: "status",
      },
    });

    const occurrences: ExpandedCalendarOccurrence[] =
      await services.occurrence.getOccurrences({
        from: "2026-05-01T00:00:00.000Z",
        to: "2026-05-10T23:59:59.000Z",
      });

    // 2 Friday Khutbahs (May 1 & May 8) + 1 Booking (May 3) = 3 unified occurrences
    expect(occurrences.length).toBe(3);

    const khutbah = occurrences.find((o) => o.sourceId === "events");
    expect(khutbah?.title).toBe("Weekly Friday Khutbah");
    expect(khutbah?.alternateDates?.hijri?.formatted).toBe(
      "14 Dhu al-Qiʻdah 1447 AH"
    );

    const booking = occurrences.find((o) => o.sourceId === "bookings");
    expect(booking?.title).toBe("Hall Reservation - Wedding");
    expect(booking?.color).toBe("#059669");
  });

  it("supports drag-and-drop rescheduling and slot quick-create via mapped field names", async () => {
    const { services, documentsDb } = createMockStrapi({
      sources: [
        {
          id: "bookings",
          label: "Bookings",
          uid: "api::booking.booking",
          color: "#059669",
          enabled: true,
          fields: {
            title: "bookingTitle",
            startDate: "checkIn",
            endDate: "checkOut",
          },
        },
      ],
    });

    // Reschedule existing booking
    await services.occurrence.rescheduleOccurrence({
      sourceId: "bookings",
      documentId: "bkg-doc-1",
      occurrenceDate: "2026-05-03",
      newStartDate: "2026-05-04T10:00:00.000Z",
      newEndDate: "2026-05-04T12:00:00.000Z",
    });
    expect(documentsDb["api::booking.booking"][0].checkIn).toBe(
      "2026-05-04T10:00:00.000Z"
    );
    expect(documentsDb["api::booking.booking"][0].checkOut).toBe(
      "2026-05-04T12:00:00.000Z"
    );

    // Quick-create new booking from slot selection
    const created = await services.occurrence.quickCreateEntry({
      sourceId: "bookings",
      title: "Board Room Meeting",
      startDate: "2026-05-06T09:00:00.000Z",
      endDate: "2026-05-06T10:30:00.000Z",
    });
    expect(created.bookingTitle).toBe("Board Room Meeting");
    expect(created.checkIn).toBe("2026-05-06T09:00:00.000Z");
  });

  it("auto-discovers companion Events & Bookings plugins and creates valid Events and Bookings from calendar clicks", async () => {
    const { strapi, services, documentsDb } = createMockStrapi();
    documentsDb["plugin::events.event"] = [];
    documentsDb["plugin::bookings.booking"] = [];
    (strapi.contentTypes as Record<string, unknown>)["plugin::events.event"] = {
      kind: "collectionType",
      options: { draftAndPublish: true },
      info: { displayName: "Event", singularName: "event" },
      attributes: {
        title: { type: "string" },
        slug: { type: "uid" },
        startDate: { type: "datetime" },
        endDate: { type: "datetime" },
        recurrence: {
          type: "customField",
          customField: "plugin::events.rrule",
        },
      },
    };
    (strapi.contentTypes as Record<string, unknown>)[
      "plugin::bookings.booking"
    ] = {
      kind: "collectionType",
      options: { draftAndPublish: false },
      info: { displayName: "Booking", singularName: "booking" },
      attributes: {
        bookingCode: { type: "string", required: true },
        title: { type: "string", required: true },
        customerName: { type: "string", required: true },
        customerEmail: { type: "email", required: true },
        startDate: { type: "datetime", required: true },
        endDate: { type: "datetime", required: true },
        partySize: { type: "integer", required: true },
        status: { type: "enumeration" },
      },
    };

    const settings = await services.settings.getSettings();
    expect(settings.sources.some((s) => s.uid === "plugin::events.event")).toBe(
      true
    );
    expect(
      settings.sources.some((s) => s.uid === "plugin::bookings.booking")
    ).toBe(true);

    const createdEvent = await services.occurrence.quickCreateEntry({
      sourceId: "events",
      title: "Interfaith Dialogue Workshop",
      startDate: "2026-05-12T18:00:00.000Z",
      location: "Auditorium",
      rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=TU",
    });
    expect(createdEvent.title).toBe("Interfaith Dialogue Workshop");
    expect(String(createdEvent.slug)).toContain("interfaith-dialogue-workshop");

    const createdBooking = await services.occurrence.quickCreateEntry({
      sourceId: "bookings",
      title: "University Guided Visit",
      startDate: "2026-05-14T10:00:00.000Z",
      customerName: "Prof. Carlos Rivera",
      customerEmail: "crivera@universidad.edu.co",
      partySize: 25,
    });
    expect(createdBooking.title).toBe("University Guided Visit");
    expect(String(createdBooking.bookingCode)).toContain("BK-20260514-");
    expect(createdBooking.customerName).toBe("Prof. Carlos Rivera");
    expect(createdBooking.customerEmail).toBe("crivera@universidad.edu.co");
    expect(createdBooking.partySize).toBe(25);
    expect(createdBooking.status).toBe("confirmed");
    expect(createdBooking.endDate).toBe("2026-05-14T11:00:00.000Z");
  });

  it("supports clearSettings(), localization settings persistence, and controller endpoints", async () => {
    const { strapi } = createMockStrapi({ defaultView: "dayGridMonth" });
    const adminCtrl = adminControllerFactory({ strapi });
    const contentCtrl = contentApiControllerFactory({ strapi });

    // Update settings including FullCalendar localization options & modern themes
    const updateCtx: StrapiRouteContext<Partial<CalendarPluginSettings>> = {
      request: {
        body: {
          defaultView: "multiMonthYearStacked",
          defaultLocale: "ar",
          direction: "rtl",
          weekNumbers: true,
          weekNumberCalculation: "local",
          timeFormat24h: false,
          theme: "forma",
          colorScheme: "dark",
          themePalette: "indigo",
        },
      },
      body: null,
    };
    await adminCtrl.updateSettings(updateCtx);
    const updatedBody = updateCtx.body as { data: CalendarPluginSettings };
    expect(updatedBody.data.defaultView).toBe("multiMonthYearStacked");
    expect(updatedBody.data.defaultLocale).toBe("ar");
    expect(updatedBody.data.direction).toBe("rtl");
    expect(updatedBody.data.weekNumbers).toBe(true);
    expect(updatedBody.data.weekNumberCalculation).toBe("local");
    expect(updatedBody.data.timeFormat24h).toBe(false);
    expect(updatedBody.data.theme).toBe("forma");
    expect(updatedBody.data.colorScheme).toBe("dark");
    expect(updatedBody.data.themePalette).toBe("indigo");

    // Clear settings back to config defaults
    const clearCtx: StrapiRouteContext = { body: null };
    await adminCtrl.clearSettings(clearCtx);
    const clearedBody = clearCtx.body as { data: CalendarPluginSettings };
    expect(clearedBody.data.defaultView).toBe("dayGridMonth");
    expect(clearedBody.data.defaultLocale).toBe("auto");

    // Export .ics feed via content-api
    const headers: Record<string, string> = {};
    const icsCtx: StrapiRouteContext = {
      query: {},
      set: (k: string, v: string) => {
        headers[k] = v;
      },
      body: null,
    };
    await contentCtrl.downloadFeedIcs(icsCtx);
    expect(headers["Content-Type"]).toContain("text/calendar");
    expect(String(icsCtx.body)).toContain("BEGIN:VCALENDAR");
  });

  it("persists deleted sources, rejects unknown sourceId in reschedule, and scopes single-occurrence ICS", async () => {
    const { services } = createMockStrapi({
      sources: [
        {
          id: "events",
          label: "Events",
          uid: "api::event.event",
          color: "#4945ff",
          enabled: true,
          fields: {
            title: "title",
            startDate: "startDate",
            endDate: "endDate",
            rrule: "rrule",
          },
        },
      ],
    });
    const afterDelete = await services.settings.updateSettings({ sources: [] });
    expect(afterDelete.sources).toEqual([]);

    await services.settings.clearSettings();
    let rescheduleErr = "";
    try {
      await services.occurrence.rescheduleOccurrence({
        sourceId: "non-existent-source",
        documentId: "evt-doc-1",
        occurrenceDate: "2026-05-01",
        newStartDate: "2026-05-02T13:00:00.000Z",
      });
    } catch (err) {
      rescheduleErr = (err as Error).message;
    }
    expect(rescheduleErr).toContain("Target calendar source is not configured");

    const singleIcs = await services.ical.buildSingleInviteIcs({
      documentId: "evt-doc-1",
      occurrenceDate: "2032-05-07",
    });
    expect(singleIcs).toContain("DTSTART:20320507T130000Z");

    const missingIcs = await services.ical.buildSingleInviteIcs({
      documentId: "evt-doc-1",
      occurrenceDate: "2032-05-06",
    });
    expect(missingIcs.includes("BEGIN:VEVENT")).toBe(false);
  });
});
