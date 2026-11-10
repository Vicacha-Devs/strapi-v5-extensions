import automationServiceFactory from "../server/src/services/automationService";
import campaignServiceFactory from "../server/src/services/campaignService";
import settingsServiceFactory from "../server/src/services/settings";
import transportServiceFactory from "../server/src/services/transportService";
import {
  AUTOMATION_RULE_UID,
  CAMPAIGN_UID,
  DELIVERY_LOG_UID,
  type BroadcastSettings,
} from "../shared";

export function createStrictMockStrapi(
  customConfig: Partial<BroadcastSettings> = {},
  emailSender?: (opts: Record<string, unknown>) => Promise<void>
) {
  const storeMap = new Map<string, unknown>();
  const collections: Record<string, Array<Record<string, unknown>>> = {
    [CAMPAIGN_UID]: [],
    [AUTOMATION_RULE_UID]: [],
    [DELIVERY_LOG_UID]: [],
  };
  let idCounter = 1;
  const emittedEvents: Array<{ event: string; payload: unknown }> = [];
  const listeners = new Map<
    string,
    Set<(payload: unknown) => void | Promise<void>>
  >();

  const services: Record<string, unknown> = {};
  const strapiObj = {
    config: {
      get: (_key: string, def?: unknown) => ({
        ...(def as Record<string, unknown>),
        ...customConfig,
      }),
    },
    contentTypes: {
      [CAMPAIGN_UID]: { attributes: {} },
    },
    log: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
    eventHub: {
      emit: (event: string, payload?: unknown) => {
        emittedEvents.push({ event, payload });
      },
      on: (event: string, fn: (payload: unknown) => void | Promise<void>) => {
        const set = listeners.get(event) ?? new Set();
        set.add(fn);
        listeners.set(event, set);
      },
      off: (event: string, fn: (payload: unknown) => void | Promise<void>) => {
        listeners.get(event)?.delete(fn);
      },
    },
    store: () => ({
      get: async ({ key }: { key: string }) => storeMap.get(key) ?? null,
      set: async ({ key, value }: { key: string; value: unknown }) => {
        storeMap.set(key, value);
      },
    }),
    documents: (uid: string) => ({
      findMany: async (params?: {
        filters?: Record<string, unknown>;
        limit?: number;
      }) => {
        const matched = (collections[uid] || []).filter((item) =>
          Object.entries(params?.filters || {}).every(([k, v]) =>
            v && typeof v === "object" && "$in" in v
              ? ((v as { $in: unknown[] }).$in || []).includes(item[k])
              : item[k] === v
          )
        );
        return typeof params?.limit === "number"
          ? matched.slice(0, params.limit)
          : matched;
      },
      findOne: async ({ documentId }: { documentId: string }) =>
        (collections[uid] || []).find((i) => i.documentId === documentId) ??
        null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const list = (collections[uid] ||= []);
        if (uid === DELIVERY_LOG_UID && data.idempotencyKey) {
          if (list.some((r) => r.idempotencyKey === data.idempotencyKey)) {
            throw new Error("Unique constraint failed: idempotencyKey");
          }
        }
        if (uid === CAMPAIGN_UID && data.slug) {
          if (list.some((r) => r.slug === data.slug)) {
            throw new Error("Unique constraint failed: slug");
          }
        }
        const doc = { ...data, documentId: `doc_${idCounter++}` };
        list.push(doc);
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
        return (list[idx] = { ...list[idx], ...data });
      },
    }),
    plugin: (name: string) => {
      if (name === "email") {
        return { service: () => ({ send: emailSender }) };
      }
      if (name === "inbox") {
        return {
          service: () => ({
            listSubscribers: async () => [
              {
                email: "subscriber@mezquitabogota.org",
                phone: "+573101234567",
                fullName: "Karim",
                locale: "es",
                topics: ["announcements"],
                status: "confirmed",
                unsubscribeToken: "tok_123",
              },
            ],
          }),
        };
      }
      return { service: (svcName: string) => services[svcName] };
    },
    admin: {
      services: {
        permission: {
          actionProvider: {
            registerMany: async () => {},
          },
        },
      },
    },
  };

  const strapi = strapiObj as unknown as Parameters<
    typeof settingsServiceFactory
  >[0]["strapi"];

  const typedServices = {
    settings: settingsServiceFactory({ strapi }),
    transportService: transportServiceFactory({ strapi }),
    campaignService: campaignServiceFactory({ strapi }),
    automationService: automationServiceFactory({ strapi }),
  };
  Object.assign(services, typedServices);

  return {
    strapi,
    services: typedServices,
    collections,
    emittedEvents,
    listeners,
  };
}
