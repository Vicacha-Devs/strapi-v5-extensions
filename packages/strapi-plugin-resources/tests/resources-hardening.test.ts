import assert from "node:assert/strict";
import { describe, it } from "node:test";

import pluginConfig from "../server/src/config/index.ts";
import type { ControllerCtx } from "../server/src/controllers/resourcesController.ts";
import registerPlugin from "../server/src/register.ts";
import {
  CONTENT_TYPE_UIDS,
  formatSecondaryCalendarDate,
  parsePositiveInt,
  resolveSlug,
  toSafeHref,
  validateGalleryAlbumInput,
  validateGlossaryTermInput,
  validateMediaFolderPath,
  validatePublicationInput,
} from "../shared/index.ts";
import { createHardenedMockStrapi } from "./testHarness.ts";

describe("Resources Partial Updates, Sync Idempotency, Validation & Query Safety", () => {
  it("preserves populated media relations on partial updates and prioritizes explicit *Id / photoIds aliases", async () => {
    const { catalogSvc } = createHardenedMockStrapi({
      pluginConfig: {
        maxPhotosPerAlbum: 3,
        downloadSecret: "hardening-test-secret",
      },
    });

    const createdPub = await catalogSvc.createPublication(
      {
        title: "Original Handbook",
        summary: "Initial summary",
        fileId: 501,
        coverImageId: 602,
      },
      "es"
    );
    assert.equal(createdPub.file?.id, 501);
    assert.equal(createdPub.coverImage?.id, 602);

    const renamedPub = await catalogSvc.updatePublication(
      createdPub.documentId!,
      { title: "Renamed Handbook" },
      "es"
    );
    assert.equal(renamedPub.title, "Renamed Handbook");
    assert.equal(renamedPub.file?.id, 501);
    assert.equal(renamedPub.coverImage?.id, 602);

    const replacedFilePub = await catalogSvc.updatePublication(
      createdPub.documentId!,
      { fileId: null },
      "es"
    );
    assert.equal(replacedFilePub.file, null);
    assert.equal(replacedFilePub.coverImage?.id, 602);

    const createdAlbum = await catalogSvc.createGalleryAlbum(
      {
        title: "Ramadan Gallery",
        description: "Community iftar photos",
        photoIds: [602, 603],
        coverPhotoId: 602,
      },
      "es"
    );
    assert.equal(createdAlbum.photos.length, 2);
    assert.equal(createdAlbum.coverPhoto?.id, 602);

    const updatedAlbum = await catalogSvc.updateGalleryAlbum(
      createdAlbum.documentId!,
      { description: "Updated caption" },
      "es"
    );
    assert.equal(updatedAlbum.photos.length, 2);
    assert.equal(updatedAlbum.photoCount, 2);
    assert.equal(updatedAlbum.coverPhoto?.id, 602);

    await assert.rejects(
      () =>
        catalogSvc.updateGalleryAlbum(createdAlbum.documentId!, {
          photoIds: [602, 603, 602, 603],
        }),
      /maxPhotosPerAlbum/
    );

    const createdTerm = await catalogSvc.createGlossaryTerm(
      {
        term: "Adhan",
        definition: "Call to prayer",
        pronunciationAudioId: 604,
      },
      "es"
    );
    const updatedTerm = await catalogSvc.updateGlossaryTerm(
      createdTerm.documentId!,
      { definition: "Islamic call to prayer recited five times daily." },
      "es"
    );
    assert.equal(updatedTerm.pronunciationAudio?.id, 604);
  });

  it("clears stale photos on empty-folder re-sync, resolves folderId first, gates autoSyncMediaFolders, and seeds idempotently", async () => {
    const { catalogSvc, mediaSvc, setFolderEmpty } = createHardenedMockStrapi({
      pluginConfig: { autoSyncMediaFolders: false },
    });

    const album = await catalogSvc.createGalleryAlbum(
      {
        title: "Folder Synced Album",
        description: "Synced via mediaFolderId",
        mediaFolderId: 77,
        mediaFolderPath: "/galleries/stale-old-path",
      },
      "es"
    );

    await assert.rejects(
      () => mediaSvc.syncAlbumFromMediaFolder(album.documentId!, "es"),
      /disabled/
    );

    const firstSync = await mediaSvc.syncAlbumFromMediaFolder(
      album.documentId!,
      "es",
      { force: true }
    );
    assert.equal(firstSync.photoCount, 2);

    setFolderEmpty(true);
    const emptySync = await mediaSvc.syncAlbumFromMediaFolder(
      album.documentId!,
      "es",
      { force: true }
    );
    assert.equal(emptySync.photoCount, 0);
    assert.equal(emptySync.photos.length, 0);

    const reloadedAlbum = await catalogSvc.getGalleryAlbumBySlug(
      album.slug,
      "es"
    );
    assert.equal(reloadedAlbum?.photoCount, 0);
    assert.equal(reloadedAlbum?.photos.length, 0);
    assert.equal(reloadedAlbum?.coverPhoto, null);

    const { mediaSvc: failingMediaSvc } = createHardenedMockStrapi({
      failDbQuery: true,
    });
    await assert.rejects(
      () => failingMediaSvc.listMediaFolders(),
      /DB_CONNECTION_LOST/
    );

    await catalogSvc.seedDefaultResources();
    const esPubsBefore = await catalogSvc.listPublications({ locale: "es" });
    const targetToDelete = esPubsBefore.find(
      (p) => p.slug === "guia-bienvenida-visita-mezquita"
    );
    assert.ok(targetToDelete?.documentId);
    await catalogSvc.deletePublication(targetToDelete.documentId!);

    const esPubsAfterDelete = await catalogSvc.listPublications({
      locale: "es",
    });
    assert.equal(esPubsAfterDelete.length, esPubsBefore.length - 1);

    await catalogSvc.seedDefaultResources();
    const esPubsRestored = await catalogSvc.listPublications({ locale: "es" });
    assert.equal(esPubsRestored.length, esPubsBefore.length);
  });

  it("handles non-scalar query params (?letter[]=A, ?category[$ne]=guide), clamps pagination, and hides raw DB errors", async () => {
    const { catalogSvc, controller } = createHardenedMockStrapi();
    await catalogSvc.seedDefaultResources();

    const glossaryCtx: ControllerCtx = {
      query: {
        locale: "es",
        letter: ["A", "B"],
        category: { $ne: "worship" },
        page: "-9",
        limit: "999999",
      },
      badRequest: (msg) => msg,
      notFound: (msg) => msg,
    };
    await controller.listGlossary(glossaryCtx);
    const glossaryBody = glossaryCtx.body as { data: unknown[] };
    assert.ok(Array.isArray(glossaryBody.data));

    const pubCtx: ControllerCtx = {
      query: { locale: "es", page: "1", limit: "2" },
      badRequest: (msg) => msg,
      notFound: (msg) => msg,
    };
    await controller.listPublications(pubCtx);
    const pubBody = pubCtx.body as { data: unknown[] };
    assert.equal(pubBody.data.length, 2);

    let notFoundTriggered = false;
    const missingCtx: ControllerCtx = {
      params: { slug: "non-existent-slug" },
      badRequest: (msg) => msg,
      notFound: (msg) => {
        notFoundTriggered = true;
        return msg;
      },
    };
    await controller.downloadPublication(missingCtx);
    assert.equal(notFoundTriggered, true);

    const { controller: brokenController } = createHardenedMockStrapi({
      failDbQuery: true,
    });
    const errCtx: ControllerCtx = {
      query: { locale: "es" },
      badRequest: (msg) => msg,
      notFound: (msg) => msg,
    };
    await brokenController.listPublications(errCtx);
    assert.equal(errCtx.status, 500);
    assert.equal(JSON.stringify(errCtx.body).includes("secret_token"), false);
  });

  it("generates deterministic slugs for Arabic/Cyrillic/CJK, rejects .svg/../ settings & __proto__ pollution, and sanitizes URLs", async () => {
    const arWithTranslit = validateGlossaryTermInput({
      term: "أذان",
      transliteration: "Adhān",
      definition: "النداء للصلاة",
    });
    assert.equal(arWithTranslit.valid, true);
    assert.equal(arWithTranslit.data?.slug, "adhan");

    const arPub = validatePublicationInput({
      title: "دليل الزوار للمسجد",
      summary: "ملخص",
    });
    const ruAlbum = validateGalleryAlbumInput({
      title: "Архитектура мечети",
      description: "Фотографии",
    });
    const zhTerm = validateGlossaryTermInput({
      term: "清真寺建筑",
      definition: "伊斯兰建筑术语",
    });
    assert.equal(arPub.valid, true);
    assert.equal(ruAlbum.valid, true);
    assert.equal(zhTerm.valid, true);
    assert.match(arPub.data!.slug, /^entry-[0-9a-f]{8}$/);
    assert.match(ruAlbum.data!.slug, /^entry-[0-9a-f]{8}$/);
    assert.match(zhTerm.data!.slug, /^entry-[0-9a-f]{8}$/);
    assert.notEqual(arPub.data!.slug, ruAlbum.data!.slug);
    assert.equal(
      resolveSlug(undefined, "دليل الزوار للمسجد"),
      arPub.data!.slug
    );

    assert.equal(parsePositiveInt(0.2), undefined);
    assert.equal(parsePositiveInt(3_000_000_000), undefined);
    assert.equal(parsePositiveInt(42), 42);

    const normFolder = validateMediaFolderPath("//publications///guides/");
    assert.equal(normFolder.valid, true);
    assert.equal(normFolder.data, "/publications/guides");
    assert.equal(validateMediaFolderPath("../etc/passwd").valid, false);
    assert.equal(validateMediaFolderPath("\\windows\\system32").valid, false);

    const { settingsSvc } = createHardenedMockStrapi();
    await assert.rejects(
      () =>
        settingsSvc.updateSettings({
          allowedDownloadExtensions: [".pdf", ".svg"],
        }),
      /not allowed/
    );
    await assert.rejects(
      () =>
        settingsSvc.updateSettings({
          allowedDownloadMimeTypes: ["application/pdf", "image/svg+xml"],
        }),
      /not allowed/
    );
    await assert.rejects(
      () =>
        settingsSvc.updateSettings({
          defaultPublicationsFolderPath: "/publications/../secrets",
        }),
      /traversal/
    );
    await assert.rejects(
      () =>
        settingsSvc.updateSettings({
          defaultLocale: "es; DROP TABLE",
        }),
      /BCP-47/
    );
    assert.throws(() =>
      pluginConfig.validator({
        allowedDownloadExtensions: [".html"],
      })
    );

    const formatted = formatSecondaryCalendarDate(
      "2026-03-01",
      "islamic-umalqura",
      "ar-SA-u-ca-gregory-nu-latn"
    );
    assert.ok(formatted.length > 0);

    assert.equal(toSafeHref("javascript:alert(1)"), null);
    assert.equal(toSafeHref("data:text/html,<script>alert(1)</script>"), null);
    assert.equal(toSafeHref("//evil.example.com/payload.pdf"), null);
    assert.equal(toSafeHref("/uploads/../secret.pdf"), null);
    assert.equal(toSafeHref("/uploads\\secret.pdf"), null);
    assert.equal(toSafeHref("/uploads//guide.pdf"), "/uploads/guide.pdf");
    assert.equal(
      toSafeHref("https://example.org/guide.pdf"),
      "https://example.org/guide.pdf"
    );

    const pollutedExtensions = JSON.parse(
      '{"publication":{"__proto__":{"polluted":true},"safeField":{"type":"string"}}}'
    ) as Record<string, unknown>;
    const targetSchema = { attributes: {} as Record<string, unknown> };
    registerPlugin({
      strapi: {
        config: { get: () => ({ schemaExtensions: pollutedExtensions }) },
        contentTypes: { [CONTENT_TYPE_UIDS.publication]: targetSchema },
        log: { info: () => undefined },
      } as never,
    });
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
    assert.ok(targetSchema.attributes.safeField);
  });
});
