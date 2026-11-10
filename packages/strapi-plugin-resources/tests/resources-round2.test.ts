import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CONTENT_TYPE_UIDS, toSafeOpenableHref } from "../shared/index.ts";
import { createHardenedMockStrapi, createMockCtx } from "./testHarness.ts";

describe("Resources Round 2 Edge-Case Hardening", () => {
  it("[High-1] preserves draft status on updatePublication, updateGalleryAlbum, updateGlossaryTerm & syncAlbumFromMediaFolder", async () => {
    const { strapi, catalogSvc, mediaSvc, controller } =
      createHardenedMockStrapi();

    const draftPub = await strapi
      .documents(CONTENT_TYPE_UIDS.publication)
      .create({
        locale: "es",
        status: "draft",
        data: {
          title: "Unpublished Draft Guide",
          slug: "unpublished-draft-guide",
          summary: "Confidential draft",
          category: "guide",
          allowPublicDownload: true,
        },
      });

    const draftAlbum = await strapi
      .documents(CONTENT_TYPE_UIDS.galleryAlbum)
      .create({
        locale: "es",
        status: "draft",
        data: {
          title: "Unpublished Draft Album",
          slug: "unpublished-draft-album",
          description: "Internal curation in progress",
          category: "architecture",
          mediaFolderPath: "/galleries/architecture",
        },
      });

    const draftTerm = await strapi
      .documents(CONTENT_TYPE_UIDS.glossaryTerm)
      .create({
        locale: "es",
        status: "draft",
        data: {
          term: "Minbar",
          slug: "minbar-draft",
          definition: "Draft definition",
          category: "community",
          letterGroup: "M",
        },
      });

    await catalogSvc.updatePublication(
      String(draftPub.documentId),
      { summary: "Edited confidential draft" },
      "es"
    );
    await catalogSvc.updateGalleryAlbum(
      String(draftAlbum.documentId),
      { description: "Updated draft caption" },
      "es"
    );
    await catalogSvc.updateGlossaryTerm(
      String(draftTerm.documentId),
      { definition: "Updated draft definition" },
      "es"
    );
    await mediaSvc.syncAlbumFromMediaFolder(
      String(draftAlbum.documentId),
      "es"
    );

    const pubSlugCtx = createMockCtx({
      params: { slug: "unpublished-draft-guide" },
      query: { locale: "es" },
    });
    await controller.getPublicationBySlug(pubSlugCtx);
    assert.equal(pubSlugCtx.errorStatus, 404);

    const albumSlugCtx = createMockCtx({
      params: { slug: "unpublished-draft-album" },
      query: { locale: "es" },
    });
    await controller.getGalleryBySlug(albumSlugCtx);
    assert.equal(albumSlugCtx.errorStatus, 404);

    const publicGlossary = await catalogSvc.listGlossaryTerms({ locale: "es" });
    assert.equal(
      publicGlossary.some((t) => t.slug === "minbar-draft"),
      false
    );
  });

  it("[High-2] strips javascript: and .svg externalDownloadUrl & active-script file URLs on public reads and toSafeOpenableHref", async () => {
    const { strapi, controller } = createHardenedMockStrapi();

    await strapi.documents(CONTENT_TYPE_UIDS.publication).create({
      locale: "es",
      status: "published",
      data: {
        title: "Legacy JS Scheme Row",
        slug: "legacy-js-scheme",
        summary: "Legacy unvalidated DB row",
        category: "guide",
        allowPublicDownload: true,
        externalDownloadUrl: "javascript:void(0)",
      },
    });

    await strapi.documents(CONTENT_TYPE_UIDS.publication).create({
      locale: "es",
      status: "published",
      data: {
        title: "Legacy SVG External Row",
        slug: "legacy-svg-external",
        summary: "Active-script external SVG",
        category: "guide",
        allowPublicDownload: true,
        externalDownloadUrl: "https://cdn.example.org/payload.svg",
        file: {
          id: 990,
          name: "inline.svg",
          url: "/uploads/inline.svg",
          mime: "image/svg+xml",
          ext: ".svg",
          size: 12,
        },
      },
    });

    const listCtx = createMockCtx({ query: { locale: "es" } });
    await controller.listPublications(listCtx);
    const items = (listCtx.body as { data: Array<Record<string, unknown>> })
      .data;
    assert.equal(items.length, 2);

    for (const item of items) {
      assert.equal("externalDownloadUrl" in item, false);
      if (item.file) {
        const f = item.file as Record<string, unknown>;
        assert.equal(f.url, "");
        assert.equal(f.optimizedUrl, "");
        assert.equal(f.thumbnailUrl, "");
      }
    }

    assert.equal(toSafeOpenableHref("/uploads/test.svg"), null);
    assert.equal(toSafeOpenableHref("https://cdn.example.org/app.html"), null);
    assert.equal(toSafeOpenableHref("javascript:alert(1)"), null);
    assert.equal(
      toSafeOpenableHref("/uploads/guide.pdf"),
      "/uploads/guide.pdf"
    );
  });

  it("[Medium-1] caps MAX_SCAN_WINDOW <= 500 on deep pagination while preserving page=2&limit=2", async () => {
    const { catalogSvc, controller, findManyCalls } =
      createHardenedMockStrapi();

    for (let i = 1; i <= 4; i += 1) {
      await catalogSvc.createGalleryAlbum(
        {
          title: `Gallery Item ${i}`,
          slug: `gallery-item-${i}`,
          description: `Album ${i}`,
          sortOrder: i,
        },
        "es"
      );
    }

    const page2Ctx = createMockCtx({
      query: { locale: "es", page: "2", limit: "2" },
    });
    await controller.listGalleries(page2Ctx);
    const page2Items = (page2Ctx.body as { data: Array<{ slug: string }> })
      .data;
    assert.equal(page2Items.length, 2);
    assert.equal(page2Items[0].slug, "gallery-item-3");
    assert.equal(page2Items[1].slug, "gallery-item-4");

    findManyCalls.length = 0;
    const deepPageCtx = createMockCtx({
      query: { locale: "es", page: "10000", limit: "100" },
    });
    await controller.listGalleries(deepPageCtx);
    const deepItems = (deepPageCtx.body as { data: unknown[] }).data;
    assert.deepEqual(deepItems, []);
    assert.ok(findManyCalls.length >= 1);
    for (const call of findManyCalls) {
      const lim = Number(call.params?.limit ?? 0);
      assert.ok(lim <= 500, `Expected limit <= 500, received ${lim}`);
    }
  });

  it("[Medium-2] defaults sync force=false, serializes omitted+explicit locale downloads, and recovers NULL SQL counts", async () => {
    const { catalogSvc, controller } = createHardenedMockStrapi({
      pluginConfig: { autoSyncMediaFolders: false },
    });
    const album = await catalogSvc.createGalleryAlbum(
      {
        title: "Gated Sync Album",
        description: "Test sync gate",
        mediaFolderPath: "/galleries/architecture",
      },
      "es"
    );

    const unforcedCtx = createMockCtx({
      params: { documentId: album.documentId },
      request: { body: {} },
    });
    await controller.syncAlbumMediaFolder(unforcedCtx);
    assert.equal(unforcedCtx.errorStatus, 400);

    const forcedCtx = createMockCtx({
      params: { documentId: album.documentId },
      request: { body: { force: true } },
    });
    await controller.syncAlbumMediaFolder(forcedCtx);
    assert.equal(forcedCtx.errorStatus, undefined);
    const syncedData = (forcedCtx.body as { data: { photoCount: number } })
      .data;
    assert.equal(syncedData.photoCount, 2);

    // Concurrent omitted-locale + explicit-locale downloads + SQL NULL recovery
    const {
      strapi: sqlStrapi,
      catalogSvc: sqlCatalogSvc,
      getSqlNullRecoveryCalls,
    } = createHardenedMockStrapi({
      withSqlConnection: true,
      pluginConfig: { downloadSecret: "round2-secret-key" },
    });

    const nullPub = await sqlStrapi
      .documents(CONTENT_TYPE_UIDS.publication)
      .create({
        locale: "es",
        status: "published",
        data: {
          title: "Legacy Null Counter Guide",
          slug: "legacy-null-counter",
          summary: "Row with NULL download_count in SQL",
          category: "guide",
          allowPublicDownload: true,
          file: 501,
          downloadCount: null,
        },
      });
    assert.ok(nullPub.documentId);

    const mixedTickets = await Promise.all([
      ...Array.from({ length: 5 }, () =>
        sqlCatalogSvc.recordPublicationDownload("legacy-null-counter")
      ),
      ...Array.from({ length: 5 }, () =>
        sqlCatalogSvc.recordPublicationDownload("legacy-null-counter", "es")
      ),
    ]);

    assert.equal(getSqlNullRecoveryCalls(), 1);
    const counts = mixedTickets
      .map((t) => t.downloadCount)
      .sort((a, b) => a - b);
    assert.deepEqual(
      counts,
      Array.from({ length: 10 }, (_, idx) => idx + 1)
    );
  });
});
