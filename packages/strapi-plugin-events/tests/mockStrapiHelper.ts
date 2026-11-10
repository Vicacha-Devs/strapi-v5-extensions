import type { Core } from "@strapi/strapi";

import adminControllerFactory from "../server/src/controllers/admin";
import contentApiControllerFactory from "../server/src/controllers/content-api";
import icalFactory from "../server/src/services/ical";
import occurrenceFactory from "../server/src/services/occurrence";
import rsvpFactory from "../server/src/services/rsvp";
import settingsFactory from "../server/src/services/settings";
import type {
  EventsIcalService,
  EventsOccurrenceService,
  EventsRsvpService,
  EventsSettingsService,
  StrapiDocumentQueryOptions,
} from "../server/src/types";
import {
  EVENT_CONTENT_TYPE_UID,
  REGISTRATION_CONTENT_TYPE_UID,
} from "../shared/pluginId";

export interface MockStrapiStats {
  findManyCallsByUid: Record<string, number>;
  lastFindManyFiltersByUid: Record<string, Record<string, unknown> | undefined>;
  transactionCalls: number;
}

export interface MockStrapiHarness {
  strapi: Core.Strapi;
  services: {
    settings: EventsSettingsService;
    rsvp: EventsRsvpService;
    occurrence: EventsOccurrenceService;
    ical: EventsIcalService;
  };
  controllers: {
    admin: ReturnType<typeof adminControllerFactory>;
    contentApi: ReturnType<typeof contentApiControllerFactory>;
  };
  db: Record<string, Array<Record<string, unknown>>>;
  bridgedCalendarSources: Array<Record<string, unknown>>;
  sentEmails: Array<{ to: string; subject: string; text: string }>;
  queryStats: MockStrapiStats;
}

function applyMockFilters(
  items: Array<Record<string, unknown>>,
  opts?: StrapiDocumentQueryOptions
): Array<Record<string, unknown>> {
  let result = [...items];
  if (opts?.status === "published") {
    result = result.filter((d) => d.publishedAt !== null);
  }
  const filters = opts?.filters;
  if (!filters || typeof filters !== "object") {
    return result;
  }
  const eqKeys = [
    "documentId",
    "eventDocumentId",
    "occurrenceDate",
    "attendeeEmail",
    "checkInToken",
    "status",
  ];
  for (const key of eqKeys) {
    const cond = filters[key] as { $eq?: unknown; $in?: unknown[] } | undefined;
    if (cond && cond.$eq !== undefined) {
      result = result.filter((d) => d[key] === cond.$eq);
    }
    if (cond && Array.isArray(cond.$in)) {
      result = result.filter((d) => cond.$in?.includes(d[key]));
    }
  }
  return result;
}

export function createMockStrapi(
  customPluginConfig?: Record<string, unknown>
): MockStrapiHarness {
  const storeData: Record<string, unknown> = {};
  const db: Record<string, Array<Record<string, unknown>>> = {
    [EVENT_CONTENT_TYPE_UID]: [],
    [REGISTRATION_CONTENT_TYPE_UID]: [],
    "api::event.event": [],
    "api::booking.booking": [],
  };
  const bridgedCalendarSources: Array<Record<string, unknown>> = [];
  const sentEmails: Array<{ to: string; subject: string; text: string }> = [];
  const queryStats: MockStrapiStats = {
    findManyCallsByUid: {},
    lastFindManyFiltersByUid: {},
    transactionCalls: 0,
  };

  let seq = 1;
  const defaultConfig: Record<string, unknown> = customPluginConfig ?? {
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
  };

  const serviceMap: Record<string, unknown> = {};

  const strapi = {
    config: {
      get: () => defaultConfig,
    },
    contentTypes: {},
    customFields: {
      register: () => {},
    },
    db: {
      transaction: async <T>(cb: () => Promise<T>): Promise<T> => {
        queryStats.transactionCalls += 1;
        return cb();
      },
    },
    store: () => ({
      get: async ({ key }: { key: string }) => storeData[key] ?? null,
      set: async ({ key, value }: { key: string; value: unknown }) => {
        storeData[key] = value;
      },
    }),
    documents: (uid: string) => ({
      findOne: async ({
        documentId,
        status,
      }: {
        documentId: string;
        status?: "draft" | "published";
      }) => {
        const found =
          (db[uid] ?? []).find((d) => d.documentId === documentId) ?? null;
        if (!found) return null;
        if (status === "published" && found.publishedAt === null) {
          return null;
        }
        return found;
      },
      findMany: async (opts?: StrapiDocumentQueryOptions) => {
        queryStats.findManyCallsByUid[uid] =
          (queryStats.findManyCallsByUid[uid] ?? 0) + 1;
        queryStats.lastFindManyFiltersByUid[uid] = opts?.filters;
        return applyMockFilters(db[uid] ?? [], opts);
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const record: Record<string, unknown> = {
          ...data,
          documentId:
            typeof data.documentId === "string"
              ? data.documentId
              : `doc-${seq++}`,
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
        data: Record<string, unknown>;
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
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    plugin: (name: string) => {
      if (name === "events") {
        return {
          service: <T = Record<string, unknown>>(svcName: string): T =>
            serviceMap[svcName] as T,
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
      if (name === "email") {
        return {
          service: (svcName: string) =>
            svcName === "email"
              ? {
                  send: async (msg: {
                    to: string;
                    subject: string;
                    text: string;
                  }) => {
                    sentEmails.push(msg);
                  },
                }
              : null,
        };
      }
      return {
        service: () => null,
      };
    },
  } as unknown as Core.Strapi;

  const settings = settingsFactory({ strapi });
  const rsvp = rsvpFactory({ strapi });
  const occurrence = occurrenceFactory({ strapi });
  const ical = icalFactory({ strapi });

  serviceMap.settings = settings;
  serviceMap.rsvp = rsvp;
  serviceMap.occurrence = occurrence;
  serviceMap.ical = ical;

  const controllers = {
    admin: adminControllerFactory({ strapi }),
    contentApi: contentApiControllerFactory({ strapi }),
  };

  return {
    strapi,
    services: { settings, rsvp, occurrence, ical },
    controllers,
    db,
    bridgedCalendarSources,
    sentEmails,
    queryStats,
  };
}
