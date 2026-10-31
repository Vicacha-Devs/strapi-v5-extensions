import assert from "node:assert/strict";
import { describe, it } from "node:test";

import catalogServiceFactory from "../server/src/services/catalogService.ts";
import mediaLibraryServiceFactory from "../server/src/services/mediaLibraryService.ts";
import settingsFactory from "../server/src/services/settings.ts";
import {
  buildAttachmentHeaders,
  computeLetterGroup,
  CONTENT_TYPE_UIDS,
  formatMediaSizeFromKB,
  formatSecondaryCalendarDate,
  isAllowedDownloadAsset,
  normalizeUploadFile,
  optimizeCloudinaryMediaUrl,
  PLUGIN_ID,
  sanitizeFilename,
  validateGalleryAlbumInput,
  validateGlossaryTermInput,
  validateMediaFolderPath,
  validatePublicationInput,
} from "../shared/index.ts";

function createMockStrapi() {
  const storeMap = new Map<string, unknown>();
  const docsByUid = new Map<string, Record<string, unknown>[]>();
  let idCounter = 100;

  const mockUploadFolders = [
    {
      id: 1,
      documentId: "folder-arch",
      name: "Architecture Gallery",
      path: "/resources/galleries/architecture",
      pathId: 1,
    },
    {
      id: 2,
      documentId: "folder-pubs",
      name: "Digital Publications",
      path: "/resources/publications",
      pathId: 2,
    },
  ];

  const mockUploadFiles = [
    {
      id: 501,
      documentId: "file-dome-1",
      name: "central-dome-calligraphy.jpg",
      alternativeText: "Central Dome Calligraphy",
      caption: "Hand-painted dome calligraphy inside the main prayer hall",
      url: "https://res.cloudinary.com/demo/image/upload/v1700000000/dome.jpg",
      mime: "image/jpeg",
      ext: ".jpg",
      size: 640,
      width: 1920,
      height: 1080,
      folderPath: "/resources/galleries/architecture",
      formats: {
        medium: {
          url: "https://res.cloudinary.com/demo/image/upload/v1700000000/dome_md.jpg",
          width: 750,
          height: 422,
          mime: "image/jpeg",
          size: 145,
        },
      },
    },
    {
      id: 502,
      documentId: "file-mihrab-2",
      name: "wood-carved-mihrab.webp",
      alternativeText: "Carved Mihrab Niche",
      caption: "Mihrab indicating the Qibla direction",
      url: "https://res.cloudinary.com/demo/image/upload/v1700000000/mihrab.webp",
      mime: "image/webp",
      ext: ".webp",
      size: 420,
      width: 1600,
      height: 1200,
      folderPath: "/resources/galleries/architecture",
    },
  ];

  const servicesMap = new Map<string, unknown>();

  const strapi = {
    config: {
      get: () => ({
        organizationName: "Mezquita Central de Bogotá",
        defaultLocale: "es",
        supportedLocales: ["es", "en", "ar"],
        secondaryCalendar: "islamic-umalqura",
        enableCloudinaryOptimization: true,
        autoSyncMediaFolders: true,
      }),
    },
    store: () => ({
      get: async ({ key }: { key: string }) => storeMap.get(key) ?? null,
      set: async ({ key, value }: { key: string; value: unknown }) => {
        storeMap.set(key, value);
      },
    }),
    db: {
      query: (uid: string) => ({
        findMany: async (opts?: { where?: Record<string, unknown> }) => {
          if (uid === "plugin::upload.folder") {
            return mockUploadFolders;
          }
          if (uid === "plugin::upload.file") {
            const folderPath = opts?.where?.folderPath;
            if (typeof folderPath === "string") {
              return mockUploadFiles.filter((f) => f.folderPath === folderPath);
            }
            return mockUploadFiles;
          }
          return [];
        },
      }),
    },
    documents: (uid: string) => {
      if (!docsByUid.has(uid)) {
        docsByUid.set(uid, []);
      }
      const list = docsByUid.get(uid)!;

      return {
        findMany: async (params?: { locale?: string; filters?: Record<string, unknown> }) => {
          return list.filter((item) => {
            if (params?.locale && item.locale && item.locale !== params.locale) {
              return false;
            }
            if (params?.filters) {
              for (const [k, v] of Object.entries(params.filters)) {
                if (v !== undefined && item[k] !== v) return false;
              }
            }
            return true;
          });
        },
        findOne: async ({ documentId }: { documentId: string }) => {
          return list.find((item) => item.documentId === documentId) || null;
        },
        create: async ({ locale, data }: { locale?: string; data: Record<string, unknown> }) => {
          idCounter += 1;
          const record: Record<string, unknown> = {
            id: idCounter,
            documentId: `doc-${idCounter}`,
            locale: locale || "es",
            ...data,
          };
          list.push(record);
          return record;
        },
        update: async ({
          documentId,
          data,
        }: {
          documentId: string;
          data: Record<string, unknown>;
        }) => {
          const idx = list.findIndex((item) => item.documentId === documentId);
          if (idx >= 0) {
            const updated = { ...list[idx], ...data };
            if (Array.isArray(data.photos)) {
              updated.photos = mockUploadFiles.filter((f) =>
                (data.photos as (number | string)[]).includes(f.id)
              );
            }
            list[idx] = updated;
            return updated;
          }
          return null;
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

  return { strapi, settingsSvc, mediaSvc, catalogSvc, docsByUid };
}

describe("@vicacha-devs/strapi-plugin-resources", () => {
  it("sanitizes filenames against path traversal and builds hardened attachment headers", () => {
    const dirty = '../../etc/passwd/../../visitor_guide"2026\r\n.pdf';
    const clean = sanitizeFilename(dirty);
    assert.equal(clean.includes(".."), false);
    assert.equal(clean.includes("/"), false);
    assert.equal(clean, "visitor_guide-2026-.pdf");

    const headers = buildAttachmentHeaders(dirty, "application/pdf");
    assert.equal(headers["Content-Disposition"], 'attachment; filename="visitor_guide-2026-.pdf"');
    assert.equal(headers["X-Content-Type-Options"], "nosniff");
    assert.equal(headers["Cache-Control"], "private, no-store");
  });

  it("enforces download extension and MIME allow-lists", () => {
    assert.equal(isAllowedDownloadAsset(".pdf", "application/pdf"), true);
    assert.equal(isAllowedDownloadAsset("epub", "application/epub+zip"), true);
    assert.equal(isAllowedDownloadAsset(".exe", "application/x-msdownload"), false);
    assert.equal(isAllowedDownloadAsset(".html", "text/html"), false);
    assert.equal(isAllowedDownloadAsset(".pdf", "text/html"), false);
  });

  it("optimizes Cloudinary Media Library URLs and normalizes plugin::upload.file records", () => {
    const rawUrl = "https://res.cloudinary.com/demo/image/upload/v1700000000/mosque.jpg";
    assert.equal(
      optimizeCloudinaryMediaUrl(rawUrl, true),
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1700000000/mosque.jpg"
    );
    assert.equal(
      optimizeCloudinaryMediaUrl(rawUrl, true, 640),
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_640/v1700000000/mosque.jpg"
    );
    assert.equal(formatMediaSizeFromKB(512), "512 KB");
    assert.equal(formatMediaSizeFromKB(2048), "2.0 MB");

    const normalized = normalizeUploadFile(
      {
        id: 12,
        documentId: "upload-12",
        name: "visitor-guide.pdf",
        url: "https://res.cloudinary.com/demo/image/upload/v1/visitor-guide.pdf",
        mime: "application/pdf",
        ext: ".pdf",
        size: 1536,
      },
      true
    );
    assert.ok(normalized);
    assert.equal(normalized.formattedSize, "1.5 MB");
    assert.ok(normalized.optimizedUrl.includes("f_auto,q_auto"));
  });

  it("validates Media Library folder paths, publications, gallery albums, and glossary terms", () => {
    assert.equal(validateMediaFolderPath("../secret").valid, false);
    const validFolder = validateMediaFolderPath("resources/galleries/ramadan");
    assert.equal(validFolder.valid, true);
    assert.equal(validFolder.data, "/resources/galleries/ramadan");

    const pubValidation = validatePublicationInput({
      title: "Guía del Visitante",
      summary: "Guía oficial ilustrada para visitantes y colegios.",
      category: "guide",
      mediaFolderPath: "/resources/publications",
    });
    assert.equal(pubValidation.valid, true);
    assert.equal(pubValidation.data?.slug, "guia-del-visitante");

    const albumValidation = validateGalleryAlbumInput({
      title: "Arquitectura y Cúpula",
      description: "Recorrido fotográfico por el Mihrab y la cúpula central.",
      category: "architecture",
      mediaFolderPath: "/resources/galleries/architecture",
    });
    assert.equal(albumValidation.valid, true);

    const termValidation = validateGlossaryTermInput({
      term: "Árabe / Adhān",
      definition: "Llamado público a la oración islámica.",
      category: "worship",
    });
    assert.equal(termValidation.valid, true);
    assert.equal(termValidation.data?.letterGroup, "A");
    assert.equal(computeLetterGroup("أذان"), "#");
  });

  it("formats secondary liturgical dates across calendar systems", () => {
    const hijri = formatSecondaryCalendarDate("2026-03-01", "islamic-umalqura", "es");
    assert.ok(hijri.length > 0);
    assert.equal(formatSecondaryCalendarDate("2026-03-01", "none", "es"), "");
  });

  it("syncs Strapi v5 Media Library folder files (plugin::upload.folder -> gallery-album)", async () => {
    const { mediaSvc, catalogSvc } = createMockStrapi();
    const folders = await mediaSvc.listMediaFolders();
    assert.equal(folders.length, 2);

    const createdAlbum = await catalogSvc.createGalleryAlbum(
      {
        title: "Galería de Arquitectura",
        description: "Fotografías oficiales desde Strapi Media Library.",
        category: "architecture",
        mediaFolderPath: "/resources/galleries/architecture",
        featured: true,
      },
      "es"
    );
    assert.ok(createdAlbum.documentId);
    assert.equal(createdAlbum.photoCount, 0);

    const syncResult = await mediaSvc.syncAlbumFromMediaFolder(createdAlbum.documentId!, "es");
    assert.equal(syncResult.photoCount, 2);
    assert.equal(syncResult.photos[0].name, "central-dome-calligraphy.jpg");
    assert.ok(syncResult.photos[0].optimizedUrl.includes("f_auto,q_auto"));
  });

  it("seeds trilingual catalog records and issues hardened download tickets", async () => {
    const { catalogSvc, docsByUid } = createMockStrapi();
    await catalogSvc.seedDefaultResources();

    const esPubs = await catalogSvc.listPublications({ locale: "es" });
    const enPubs = await catalogSvc.listPublications({ locale: "en" });
    const arPubs = await catalogSvc.listPublications({ locale: "ar" });
    assert.ok(esPubs.length >= 3);
    assert.ok(enPubs.length >= 2);
    assert.ok(arPubs.length >= 1);

    const ticket = await catalogSvc.recordPublicationDownload(
      "guia-bienvenida-visita-mezquita",
      "es"
    );
    assert.equal(ticket.downloadCount, 1);
    assert.equal(ticket.headers["X-Content-Type-Options"], "nosniff");
    assert.ok(ticket.headers["Content-Disposition"].startsWith("attachment; filename="));

    const terms = await catalogSvc.listGlossaryTerms({
      locale: "es",
      letterGroup: "M",
    });
    assert.equal(terms.length, 1);
    assert.equal(terms[0].term, "Mihrab");
    assert.ok(docsByUid.get(CONTENT_TYPE_UIDS.glossaryTerm)!.length >= 7);
  });

  it("verifies all 10 Admin UI locales and server entry point exports", async () => {
    const locales = ["en", "es", "ar", "fr", "de", "pt", "it", "tr", "ru", "zh"];
    const enMod = await import("../admin/src/translations/en.json");
    const enKeys = Object.keys(enMod.default).sort();
    assert.ok(enKeys.length >= 4);

    for (const loc of locales) {
      const mod = await import(`../admin/src/translations/${loc}.json`);
      const keys = Object.keys(mod.default).sort();
      assert.deepEqual(keys, enKeys, `Locale ${loc} keys must match en.json`);
    }

    const serverEntry = (await import("../server/src/index.ts")).default;
    assert.ok(serverEntry.contentTypes.publication);
    assert.ok(serverEntry.contentTypes["gallery-album"]);
    assert.ok(serverEntry.contentTypes["glossary-term"]);
    assert.ok(serverEntry.routes.admin);
    assert.ok(serverEntry.routes["content-api"]);
  });
});
