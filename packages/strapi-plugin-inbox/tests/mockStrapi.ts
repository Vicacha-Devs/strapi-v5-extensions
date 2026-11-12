import alertServiceFactory from "../server/src/services/alertService";
import formServiceFactory from "../server/src/services/formService";
import submissionServiceFactory from "../server/src/services/submissionService";
import subscriberServiceFactory from "../server/src/services/subscriberService";
import {
  DEFAULT_INBOX_SETTINGS,
  FORM_BUILDER_CMS_FORM_UID,
  FORM_BUILDER_CMS_SUBMISSION_UID,
  FORM_UID,
  SUBMISSION_UID,
  SUBSCRIBER_UID,
  ALERT_BANNER_UID,
} from "../shared";

export function createMockStrapi() {
  const storeMap = new Map<string, unknown>();
  const collections: Record<string, Array<Record<string, unknown>>> = {
    [FORM_UID]: [],
    [SUBMISSION_UID]: [],
    [SUBSCRIBER_UID]: [],
    [ALERT_BANNER_UID]: [],
  };
  let idCounter = 1;
  const emittedEvents: Array<{ event: string; payload: unknown }> = [];

  const strapi: Record<string, unknown> = {
    __hasFormBuilderCms: true,
    contentTypes: {
      [FORM_BUILDER_CMS_FORM_UID]: {},
      [FORM_BUILDER_CMS_SUBMISSION_UID]: {},
    },
    config: {
      get: (_key: string, def?: unknown) => def ?? {},
    },
    log: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    eventHub: {
      emit: (event: string, payload?: unknown) => {
        emittedEvents.push({ event, payload });
      },
    },
    store: () => ({
      get: async ({ key }: { key: string }) => storeMap.get(key) ?? null,
      set: async ({ key, value }: { key: string; value: unknown }) => {
        storeMap.set(key, value);
      },
    }),
    db: {
      query: (uid: string) => ({
        findMany: async (params?: { where?: Record<string, unknown> }) => {
          const list = collections[uid] || [];
          const where = params?.where || {};
          return list.filter((item) =>
            Object.entries(where).every(([k, v]) => item[k] === v)
          );
        },
        findOne: async (params?: { where?: Record<string, unknown> }) => {
          const list = collections[uid] || [];
          const where = params?.where || {};
          return (
            list.find((item) =>
              Object.entries(where).every(([k, v]) => item[k] === v)
            ) ?? null
          );
        },
        count: async (params?: { where?: Record<string, unknown> }) => {
          const list = collections[uid] || [];
          const where = params?.where || {};
          return list.filter((item) =>
            Object.entries(where).every(([k, v]) => item[k] === v)
          ).length;
        },
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const numId = idCounter++;
          const row = {
            ...data,
            id: numId,
            documentId: `cms_doc_${numId}`,
            createdAt: new Date().toISOString(),
          };
          if (!collections[uid]) collections[uid] = [];
          collections[uid].push(row);
          return row;
        },
        update: async ({
          where,
          data,
        }: {
          where: Record<string, unknown>;
          data: Record<string, unknown>;
        }) => {
          const list = collections[uid] || [];
          const idx = list.findIndex((item) =>
            Object.entries(where).every(([k, v]) => item[k] === v)
          );
          if (idx === -1) return null;
          list[idx] = { ...list[idx], ...data };
          return list[idx];
        },
      }),
    },
    documents: (uid: string) => ({
      findMany: async (params?: {
        filters?: Record<string, unknown>;
        limit?: number;
      }) => {
        const list = collections[uid] || [];
        const filters = params?.filters || {};
        return list.filter((item) =>
          Object.entries(filters).every(([k, v]) => item[k] === v)
        );
      },
      findOne: async ({ documentId }: { documentId: string }) => {
        const list = collections[uid] || [];
        return list.find((item) => item.documentId === documentId) ?? null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const doc = {
          ...data,
          documentId: `doc_${idCounter++}`,
        };
        if (!collections[uid]) collections[uid] = [];
        collections[uid].push(doc);
        return doc;
      },
      update: async ({
        documentId,
        data,
      }: {
        documentId: string;
        data: Record<string, unknown>;
      }) => {
        const list = collections[uid] || [];
        const idx = list.findIndex((item) => item.documentId === documentId);
        if (idx === -1) return null;
        list[idx] = { ...list[idx], ...data };
        return list[idx];
      },
    }),
  };

  const services: Record<string, unknown> = {
    settings: {
      getSettings: async () => ({
        ...DEFAULT_INBOX_SETTINGS,
        supportedLocales: ["es", "en", "ar", "tr"],
      }),
    },
  };

  strapi.plugin = (name: string) => {
    if (name === "bookings") {
      return {
        service: () => ({
          createBooking: async (input: {
            serviceSlug: string;
            date: string;
          }) => ({
            documentId: "bkg_doc_1",
            referenceCode: `BKG-${input.serviceSlug.toUpperCase()}-${input.date}`,
          }),
        }),
      };
    }
    if (name === "certificates") {
      return {
        service: () => ({
          issueCertificate: async (input: { templateSlug: string }) => ({
            certificateNumber: `CERT-2026-${input.templateSlug.toUpperCase()}`,
          }),
        }),
      };
    }
    return {
      service: (svcName: string) => services[svcName],
    };
  };

  services.formService = formServiceFactory({ strapi: strapi as never });
  services.submissionService = submissionServiceFactory({
    strapi: strapi as never,
  });
  services.subscriberService = subscriberServiceFactory({
    strapi: strapi as never,
  });
  services.alertService = alertServiceFactory({ strapi: strapi as never });

  return {
    strapi,
    services: services as {
      formService: ReturnType<typeof formServiceFactory>;
      submissionService: ReturnType<typeof submissionServiceFactory>;
      subscriberService: ReturnType<typeof subscriberServiceFactory>;
      alertService: ReturnType<typeof alertServiceFactory>;
    },
    emittedEvents,
  };
}
