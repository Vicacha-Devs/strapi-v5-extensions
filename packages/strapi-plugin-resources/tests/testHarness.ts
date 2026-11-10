import assert from "node:assert/strict";

import resourcesControllerFactory, {
  type ControllerCtx,
} from "../server/src/controllers/resourcesController.ts";
import catalogServiceFactory from "../server/src/services/catalogService.ts";
import mediaLibraryServiceFactory from "../server/src/services/mediaLibraryService.ts";
import settingsFactory from "../server/src/services/settings.ts";
import { CONTENT_TYPE_UIDS, PLUGIN_ID } from "../shared/index.ts";

export interface StoredDoc extends Record<string, unknown> {
  id: number;
  documentId: string;
  locale: string;
  status: "draft" | "published";
}

export interface HardenedMockOptions {
  withSqlConnection?: boolean;
  failDbQuery?: boolean;
  emptyFolder?: boolean;
  pluginConfig?: Record<string, unknown>;
}

const DEFAULT_MOCK_FOLDERS = [
  {
    id: 10,
    documentId: "folder-10",
    name: "Architecture",
    path: "/galleries/architecture",
    pathId: 10,
  },
  {
    id: 77,
    documentId: "folder-77",
    name: "Renamed Ramadan Folder",
    path: "/galleries/ramadan-2026",
    pathId: 77,
  },
];

const DEFAULT_MOCK_FILES: Array<Record<string, unknown>> = [
  {
    id: 501,
    documentId: "asset-501",
    name: "guide.pdf",
    url: "https://res.cloudinary.com/demo/image/upload/v1/guide.pdf",
    mime: "application/pdf",
    ext: ".pdf",
    size: 512,
    folderPath: "/publications",
    formats: {
      thumbnail: {
        url: "https://res.cloudinary.com/demo/image/upload/v1/guide_thumb.jpg",
        width: 200,
        height: 260,
      },
    },
  },
  {
    id: 502,
    documentId: "asset-502",
    name: "cover.jpg",
    url: "https://res.cloudinary.com/demo/image/upload/v1/cover.jpg",
    mime: "image/jpeg",
    ext: ".jpg",
    size: 256,
    folderPath: "/galleries/architecture",
  },
  {
    id: 503,
    documentId: "asset-503",
    name: "dome.webp",
    url: "https://res.cloudinary.com/demo/image/upload/v1/dome.webp",
    mime: "image/webp",
    ext: ".webp",
    size: 310,
    folderPath: "/galleries/architecture",
  },
  {
    id: 602,
    documentId: "f-602",
    name: "cover-art.jpg",
    url: "https://cdn.example.org/cover-art.jpg",
    mime: "image/jpeg",
    ext: ".jpg",
    size: 180,
    folderPath: "/galleries/ramadan-2026",
  },
  {
    id: 603,
    documentId: "f-603",
    name: "iftar-photo.webp",
    url: "https://cdn.example.org/iftar-photo.webp",
    mime: "image/webp",
    ext: ".webp",
    size: 220,
    folderPath: "/galleries/ramadan-2026",
  },
  {
    id: 604,
    documentId: "f-604",
    name: "adhan.mp3",
    url: "https://cdn.example.org/adhan.mp3",
    mime: "audio/mpeg",
    ext: ".mp3",
    size: 95,
    folderPath: "/audio",
  },
];

function hydrateMediaFields(
  row: StoredDoc,
  uploadFiles: Array<Record<string, unknown>>
): StoredDoc {
  const clone: StoredDoc = { ...row };
  const singleKeys = ["file", "coverImage", "coverPhoto", "pronunciationAudio"];
  for (const singleKey of singleKeys) {
    const val = clone[singleKey];
    if (typeof val === "number" || typeof val === "string") {
      clone[singleKey] =
        uploadFiles.find((f) => String(f.id) === String(val)) ?? null;
    }
  }
  if (Array.isArray(clone.photos)) {
    clone.photos = clone.photos
      .map((item) =>
        typeof item === "object" && item !== null
          ? item
          : uploadFiles.find((f) => String(f.id) === String(item))
      )
      .filter(Boolean);
  }
  return clone;
}

export function createHardenedMockStrapi(opts?: HardenedMockOptions) {
  const storeMap = new Map<string, unknown>();
  const docsByUid = new Map<string, StoredDoc[]>();
  const warningLogs: string[] = [];
  const errorLogs: string[] = [];
  let idSeq = 200;
  let folderEmpty = Boolean(opts?.emptyFolder);
  let sqlUpdateCalls = 0;
  let sqlNullRecoveryCalls = 0;
  let docUpdateCallsOnDownload = 0;
  const findManyCalls: Array<{
    uid: string;
    params?: Record<string, unknown>;
  }> = [];

  const uploadFolders = DEFAULT_MOCK_FOLDERS.map((f) => ({ ...f }));
  const uploadFiles = DEFAULT_MOCK_FILES.map((f) => ({ ...f }));
  const servicesMap = new Map<string, unknown>();
  const pubUid = CONTENT_TYPE_UIDS.publication;

  const strapi = {
    config: {
      get: () => ({
        organizationName: "Security Test Library",
        defaultLocale: "es",
        supportedLocales: ["es", "en", "ar"],
        secondaryCalendar: "islamic-umalqura",
        enableCloudinaryOptimization: true,
        autoSyncMediaFolders: true,
        ...opts?.pluginConfig,
      }),
    },
    log: {
      debug: () => undefined,
      info: () => undefined,
      warn: (msg: string) => {
        warningLogs.push(msg);
      },
      error: (msg: string) => {
        errorLogs.push(msg);
      },
    },
    contentTypes: {
      [pubUid]: { collectionName: "resources_publications" },
    },
    store: () => ({
      get: async ({ key }: { key: string }) => storeMap.get(key) ?? null,
      set: async ({ key, value }: { key: string; value: unknown }) => {
        storeMap.set(key, value);
      },
    }),
    db: {
      query: (uid: string) => ({
        findMany: async (qOpts?: { where?: Record<string, unknown> }) => {
          if (opts?.failDbQuery) {
            throw new Error("DB_CONNECTION_LOST_INTERNAL_DETAIL");
          }
          if (uid === "plugin::upload.folder") {
            return uploadFolders;
          }
          if (uid === "plugin::upload.file") {
            if (folderEmpty) return [];
            const fp = qOpts?.where?.folderPath;
            if (typeof fp === "string") {
              return uploadFiles.filter((f) => f.folderPath === fp);
            }
            return uploadFiles;
          }
          return [];
        },
      }),
      ...(opts?.withSqlConnection
        ? {
            connection: (_table: string) => ({
              where: (filter: Record<string, unknown>) => ({
                increment: async (col: string, amount = 1) => {
                  sqlUpdateCalls += 1;
                  const pubRows = docsByUid.get(pubUid) || [];
                  for (const row of pubRows) {
                    const matched =
                      row.documentId === filter.document_id &&
                      col === "download_count";
                    if (matched) {
                      await Promise.resolve();
                      if (row.downloadCount === null) {
                        // Mirror SQL: NULL + 1 remains NULL
                        row.downloadCount = null;
                      } else {
                        const prev = Number(row.downloadCount || 0);
                        row.downloadCount = prev + amount;
                      }
                    }
                  }
                  return 1;
                },
                update: async (patch: Record<string, unknown>) => {
                  sqlNullRecoveryCalls += 1;
                  const pubRows = docsByUid.get(pubUid) || [];
                  for (const row of pubRows) {
                    if (row.documentId === filter.document_id) {
                      if ("download_count" in patch) {
                        row.downloadCount = patch.download_count;
                      }
                    }
                  }
                  return 1;
                },
                select: async () => {
                  const pubRows = docsByUid.get(pubUid) || [];
                  return pubRows
                    .filter((r) => r.documentId === filter.document_id)
                    .map((r) => ({ download_count: r.downloadCount }));
                },
              }),
            }),
          }
        : {}),
    },
    documents: (uid: string) => {
      if (!docsByUid.has(uid)) {
        docsByUid.set(uid, []);
      }
      const list = docsByUid.get(uid)!;

      return {
        findMany: async (params?: {
          locale?: string;
          status?: "draft" | "published";
          filters?: Record<string, unknown>;
          limit?: number;
        }) => {
          findManyCalls.push({ uid, params });
          if (opts?.failDbQuery) {
            throw new Error("SELECT pg_catalog.secret_token FAILED");
          }
          const filtered = list.filter((item) => {
            if (params?.locale && item.locale !== params.locale) return false;
            if (params?.status && item.status !== params.status) return false;
            if (params?.filters) {
              for (const [k, v] of Object.entries(params.filters)) {
                if (v !== undefined && item[k] !== v) return false;
              }
            }
            return true;
          });
          const sliced =
            typeof params?.limit === "number"
              ? filtered.slice(0, params.limit)
              : filtered;
          return sliced.map((r) => hydrateMediaFields(r, uploadFiles));
        },
        findOne: async ({
          documentId,
          locale,
        }: {
          documentId: string;
          locale?: string;
        }) => {
          const found = list.find(
            (item) =>
              item.documentId === documentId &&
              (!locale || item.locale === locale)
          );
          return found ? hydrateMediaFields(found, uploadFiles) : null;
        },
        create: async ({
          locale,
          status,
          data,
        }: {
          locale?: string;
          status?: "draft" | "published";
          data: Record<string, unknown>;
        }) => {
          idSeq += 1;
          const created: StoredDoc = {
            ...data,
            id: idSeq,
            documentId: `doc-${idSeq}`,
            locale: locale || "es",
            status: status || "draft",
          };
          list.push(created);
          return hydrateMediaFields(created, uploadFiles);
        },
        update: async ({
          documentId,
          locale,
          status,
          data,
        }: {
          documentId: string;
          locale?: string;
          status?: "draft" | "published";
          data: Record<string, unknown>;
        }) => {
          if ("downloadCount" in data && Object.keys(data).length === 1) {
            docUpdateCallsOnDownload += 1;
          }
          await Promise.resolve();
          const idx = list.findIndex(
            (item) =>
              item.documentId === documentId &&
              (!locale || item.locale === locale) &&
              (!status || item.status === status)
          );
          const targetIdx =
            idx >= 0
              ? idx
              : list.findIndex((item) => item.documentId === documentId);
          if (targetIdx < 0) return null;
          list[targetIdx] = {
            ...list[targetIdx],
            ...data,
            ...(status ? { status } : {}),
          };
          return hydrateMediaFields(list[targetIdx], uploadFiles);
        },
        delete: async ({ documentId }: { documentId: string }) => {
          const idx = list.findIndex((item) => item.documentId === documentId);
          if (idx >= 0) list.splice(idx, 1);
          return { documentId };
        },
      };
    },
    plugin: (name: string) => {
      assert.equal(name, PLUGIN_ID);
      return {
        service: (svcName: string) => servicesMap.get(svcName),
      };
    },
  };

  const settingsSvc = settingsFactory({ strapi: strapi as never });
  servicesMap.set("settings", settingsSvc);
  const mediaSvc = mediaLibraryServiceFactory({ strapi: strapi as never });
  servicesMap.set("mediaLibraryService", mediaSvc);
  const catalogSvc = catalogServiceFactory({ strapi: strapi as never });
  servicesMap.set("catalogService", catalogSvc);
  const controller = resourcesControllerFactory({ strapi: strapi as never });

  return {
    strapi,
    settingsSvc,
    mediaSvc,
    catalogSvc,
    controller,
    docsByUid,
    warningLogs,
    errorLogs,
    findManyCalls,
    setFolderEmpty: (empty: boolean) => {
      folderEmpty = empty;
    },
    getSqlUpdateCalls: () => sqlUpdateCalls,
    getSqlNullRecoveryCalls: () => sqlNullRecoveryCalls,
    getDocUpdateCallsOnDownload: () => docUpdateCallsOnDownload,
  };
}

export function createMockCtx(overrides?: Partial<ControllerCtx>) {
  const headersSet: Record<string, string> = {};
  const ctx: ControllerCtx & {
    headersSet: Record<string, string>;
    errorStatus?: number;
    errorMessage?: string;
  } = {
    query: {},
    params: {},
    request: { body: {} },
    headersSet,
    set: (k: string, v: string) => {
      headersSet[k] = v;
    },
    badRequest: (msg: string) => {
      ctx.status = 400;
      ctx.errorStatus = 400;
      ctx.errorMessage = msg;
      return { error: msg };
    },
    notFound: (msg: string) => {
      ctx.status = 404;
      ctx.errorStatus = 404;
      ctx.errorMessage = msg;
      return { error: msg };
    },
    ...overrides,
  };
  return ctx;
}
