import createFeedService from "../server/src/services/feedService";
import createSettingsService from "../server/src/services/settings";
import createSyncService from "../server/src/services/syncService";
import { MEDIA_ITEM_UID, PLUGIN_ID, type MediaFeedsSettings } from "../shared";

export function createTestStrapi(
  initialConfig: Partial<MediaFeedsSettings> = {}
) {
  let storedSettings: Partial<MediaFeedsSettings> | null = null;
  const mediaRecords: Array<Record<string, unknown>> = [];
  const queriedUids: string[] = [];

  const strapi: any = {
    queriedUids,
    mediaRecords,
    log: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
    config: {
      get: (key: string) =>
        key === `plugin::${PLUGIN_ID}` ? initialConfig : {},
    },
    contentTypes: {
      [MEDIA_ITEM_UID]: { attributes: {} },
      "admin::user": { attributes: { password: { type: "password" } } },
      "plugin::users-permissions.user": { attributes: {} },
      "api::sermon.sermon": { attributes: {} },
    },
    store: () => ({
      get: async () => storedSettings,
      set: async ({ value }: { value: Partial<MediaFeedsSettings> }) => {
        storedSettings = value;
      },
    }),
    documents: (uid: string) => ({
      findMany: async (params?: Record<string, any>) => {
        queriedUids.push(uid);
        if (uid !== MEDIA_ITEM_UID) return [];
        let rows = [...mediaRecords];
        if (params?.status) {
          rows = rows.filter(
            (r) => (r.status ?? "published") === params.status
          );
        }
        const inList = params?.filters?.externalId?.$in;
        if (Array.isArray(inList)) {
          const set = new Set(inList);
          rows = rows.filter((r) => set.has(r.externalId));
        }
        if (typeof params?.limit === "number") {
          rows = rows.slice(0, params.limit);
        }
        return rows;
      },
      create: async ({
        data,
        status = "published",
      }: {
        data: Record<string, unknown>;
        status?: string;
      }) => {
        await new Promise((r) => setTimeout(r, 5));
        const rec = {
          id: mediaRecords.length + 1,
          documentId: `doc-${mediaRecords.length + 1}`,
          status,
          ...data,
        };
        mediaRecords.push(rec);
        return rec;
      },
    }),
    plugin: () => ({
      service: (name: string) => {
        if (name === "settings") return createSettingsService({ strapi });
        if (name === "feedService") return createFeedService({ strapi });
        if (name === "syncService") return createSyncService({ strapi });
        return {};
      },
    }),
  };

  return strapi;
}
