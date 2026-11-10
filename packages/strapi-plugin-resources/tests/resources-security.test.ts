import assert from "node:assert/strict";
import { describe, it } from "node:test";

import pluginPermissions from "../admin/src/permissions.ts";
import adminRoutes from "../server/src/routes/admin.ts";
import {
  resolveDownloadSecret,
  signDownloadTicket,
  verifyDownloadTicket,
} from "../server/src/services/downloadTicketSigner.ts";
import { CONTENT_TYPE_UIDS } from "../shared/index.ts";
import { createHardenedMockStrapi, createMockCtx } from "./testHarness.ts";

describe("Resources Security & RBAC Hardening", () => {
  it("enforces RBAC policies across all 18 admin routes and permissions.ts", () => {
    assert.equal(adminRoutes.length, 18);
    assert.equal(pluginPermissions.read[0].action, "plugin::resources.read");
    assert.equal(
      pluginPermissions.manage[0].action,
      "plugin::resources.manage"
    );
    assert.equal(
      pluginPermissions.settings[0].action,
      "plugin::resources.settings"
    );

    for (const route of adminRoutes) {
      const policies = route.config.policies;
      assert.equal(policies.length, 2, `Missing policies on ${route.path}`);
      assert.equal(policies[0], "admin::isAuthenticatedAdmin");
      const permPolicy = policies[1] as {
        name: string;
        config: { actions: string[] };
      };
      assert.equal(permPolicy.name, "admin::hasPermissions");

      if (route.path === "/settings") {
        assert.deepEqual(permPolicy.config.actions, [
          "plugin::resources.settings",
        ]);
      } else if (route.method === "GET") {
        assert.deepEqual(permPolicy.config.actions, ["plugin::resources.read"]);
      } else {
        assert.deepEqual(permPolicy.config.actions, [
          "plugin::resources.manage",
        ]);
      }
    }
  });

  it("excludes drafts, strips Media Library dump & internal fields, and redacts allowPublicDownload=false URLs", async () => {
    const { strapi, catalogSvc, controller } = createHardenedMockStrapi();

    await catalogSvc.createPublication(
      {
        title: "Restricted Press Kit",
        slug: "restricted-press-kit",
        summary: "Embargoed publication",
        category: "press_kit",
        fileId: 501,
        coverImageId: 502,
        externalDownloadUrl: "https://cdn.example.org/secret.pdf",
        mediaFolderPath: "/publications/internal",
        allowPublicDownload: false,
      },
      "es"
    );

    await catalogSvc.createGalleryAlbum(
      {
        title: "Public Courtyard Album",
        slug: "public-courtyard",
        description: "Architectural photos",
        category: "architecture",
        mediaFolderId: 10,
        mediaFolderPath: "/galleries/architecture",
        framingNotes: "INTERNAL ONLY: blur license plates",
        photoIds: [502, 503],
      },
      "es"
    );

    await strapi.documents(CONTENT_TYPE_UIDS.publication).create({
      locale: "es",
      status: "draft",
      data: {
        title: "Confidential Draft Guide",
        slug: "confidential-draft-guide",
        summary: "Must never leak publicly",
        category: "guide",
        allowPublicDownload: true,
      },
    });

    const publicHubCtx = createMockCtx({ query: { locale: "es" } });
    await controller.getHubOverview(publicHubCtx);
    const hubData = (publicHubCtx.body as { data: Record<string, unknown> })
      .data;

    assert.equal("mediaFolders" in hubData, false);
    assert.equal("mediaFiles" in hubData, false);
    const settingsSummary = hubData.settings as Record<string, unknown>;
    assert.equal("enableCloudinaryOptimization" in settingsSummary, false);
    assert.equal("autoSyncMediaFolders" in settingsSummary, false);

    const publicPubs = hubData.publications as Array<Record<string, unknown>>;
    assert.equal(publicPubs.length, 1);
    assert.equal(publicPubs[0].slug, "restricted-press-kit");
    assert.equal("mediaFolderPath" in publicPubs[0], false);
    assert.equal("externalDownloadUrl" in publicPubs[0], false);
    const redactedFile = publicPubs[0].file as Record<string, unknown>;
    assert.equal(redactedFile.url, "");
    assert.equal(redactedFile.optimizedUrl, "");
    assert.equal(redactedFile.thumbnailUrl, "");
    assert.equal(redactedFile.formats, undefined);
    const coverImg = publicPubs[0].coverImage as Record<string, unknown>;
    assert.ok(String(coverImg.url).includes("cover.jpg"));
    assert.equal("folderPath" in coverImg, false);

    const publicAlbums = hubData.galleries as Array<Record<string, unknown>>;
    assert.equal(publicAlbums.length, 1);
    assert.equal("framingNotes" in publicAlbums[0], false);
    assert.equal("mediaFolderId" in publicAlbums[0], false);
    assert.equal("mediaFolderPath" in publicAlbums[0], false);

    const draftSlugCtx = createMockCtx({
      params: { slug: "confidential-draft-guide" },
      query: { locale: "es" },
    });
    await controller.getPublicationBySlug(draftSlugCtx);
    assert.equal(draftSlugCtx.errorStatus, 404);

    const adminHubCtx = createMockCtx({ query: { locale: "es" } });
    await controller.getAdminHubOverview(adminHubCtx);
    const adminData = (adminHubCtx.body as { data: Record<string, unknown> })
      .data;
    assert.equal((adminData.publications as unknown[]).length, 2);
    assert.ok(Array.isArray(adminData.mediaFolders));
    assert.ok(Array.isArray(adminData.mediaFiles));
  });

  it("signs & verifies HMAC-SHA256 tickets, checks externalDownloadUrl allow-lists, and keeps JSON headers clean", async () => {
    const secret = "super-secret-32-byte-hmac-key-for-testing!!";
    const now = 1_750_000_000_000;
    const payload = {
      documentId: "doc-101",
      slug: "visitor-guide",
      downloadUrl: "https://cdn.example.org/visitor-guide.pdf",
      expiresAt: now + 60_000,
    };
    const sig = signDownloadTicket(payload, secret);
    assert.equal(sig.length, 64);
    assert.equal(
      verifyDownloadTicket({ ...payload, signature: sig }, secret, now),
      true
    );

    assert.equal(
      verifyDownloadTicket(
        { ...payload, signature: sig },
        secret,
        now + 60_000
      ),
      false
    );
    assert.equal(
      verifyDownloadTicket(
        { ...payload, expiresAt: Number.NaN, signature: sig },
        secret,
        now
      ),
      false
    );
    assert.equal(
      verifyDownloadTicket(
        { ...payload, slug: "other-guide", signature: sig },
        secret,
        now
      ),
      false
    );
    assert.equal(
      verifyDownloadTicket({ ...payload, signature: "abcd" }, secret, now),
      false
    );

    const prevNodeEnv = process.env.NODE_ENV;
    const prevSecret = process.env.RESOURCES_DOWNLOAD_SECRET;
    try {
      delete process.env.RESOURCES_DOWNLOAD_SECRET;
      process.env.NODE_ENV = "production";
      const { strapi: prodStrapi } = createHardenedMockStrapi();
      assert.throws(
        () => resolveDownloadSecret(prodStrapi as never),
        /RESOURCES_DOWNLOAD_SECRET/
      );

      process.env.NODE_ENV = "test";
      const { strapi: devStrapi, warningLogs } = createHardenedMockStrapi();
      const generated = resolveDownloadSecret(devStrapi as never);
      assert.equal(generated.length, 64);
      assert.equal(warningLogs.length, 1);
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
      if (prevSecret === undefined) {
        delete process.env.RESOURCES_DOWNLOAD_SECRET;
      } else {
        process.env.RESOURCES_DOWNLOAD_SECRET = prevSecret;
      }
    }

    const { catalogSvc, controller } = createHardenedMockStrapi({
      pluginConfig: { downloadSecret: secret },
    });
    await catalogSvc.createPublication(
      {
        title: "Official Guide",
        slug: "official-guide",
        summary: "Public downloadable PDF",
        fileId: 501,
      },
      "es"
    );

    await catalogSvc.createPublication(
      {
        title: "Unsafe External SVG",
        slug: "unsafe-external-svg",
        summary: "External SVG must be blocked at download time",
        externalDownloadUrl: "https://cdn.example.org/payload.svg",
      },
      "es"
    );
    await assert.rejects(
      () => catalogSvc.recordPublicationDownload("unsafe-external-svg", "es"),
      /allow-list/
    );

    const dlCtx = createMockCtx({
      params: { slug: "official-guide" },
      query: { locale: "es" },
    });
    await controller.downloadPublication(dlCtx);
    assert.equal(dlCtx.headersSet["Content-Type"], undefined);
    assert.equal(dlCtx.headersSet["Content-Disposition"], undefined);
    assert.equal(dlCtx.headersSet["X-Content-Type-Options"], "nosniff");

    const ticket = (dlCtx.body as { data: Record<string, unknown> }).data;
    assert.equal(typeof ticket.signature, "string");
    assert.equal(typeof ticket.expiresAt, "number");
    assert.ok(ticket.recommendedHeaders);
    assert.equal(verifyDownloadTicket(ticket, secret), true);
  });

  it("atomically increments downloadCount across 15 concurrent calls without losing updates or dirtying drafts", async () => {
    const { catalogSvc: docCatalogSvc } = createHardenedMockStrapi({
      pluginConfig: { downloadSecret: "lock-test-secret" },
    });
    await docCatalogSvc.createPublication(
      {
        title: "Concurrent Lock Publication",
        slug: "concurrent-lock-pub",
        summary: "Concurrency test",
        fileId: 501,
      },
      "es"
    );

    const lockTickets = await Promise.all(
      Array.from({ length: 15 }, () =>
        docCatalogSvc.recordPublicationDownload("concurrent-lock-pub", "es")
      )
    );
    const lockCounts = lockTickets
      .map((t) => t.downloadCount)
      .sort((a, b) => a - b);
    assert.deepEqual(
      lockCounts,
      Array.from({ length: 15 }, (_, idx) => idx + 1)
    );

    const {
      strapi: sqlStrapi,
      catalogSvc: sqlCatalogSvc,
      getSqlUpdateCalls,
      getDocUpdateCallsOnDownload,
    } = createHardenedMockStrapi({
      withSqlConnection: true,
      pluginConfig: { downloadSecret: "sql-test-secret" },
    });

    const created = await sqlCatalogSvc.createPublication(
      {
        title: "SQL Atomic Publication",
        slug: "sql-atomic-pub",
        summary: "Published v1",
        fileId: 501,
      },
      "es"
    );

    await sqlStrapi.documents(CONTENT_TYPE_UIDS.publication).create({
      locale: "es",
      status: "draft",
      data: {
        title: "Editorial Draft v2 In Progress",
        slug: "sql-atomic-pub",
        summary: "Unpublished draft edits",
      },
    });

    await Promise.all(
      Array.from({ length: 15 }, () =>
        sqlCatalogSvc.recordPublicationDownload("sql-atomic-pub", "es")
      )
    );

    assert.equal(getSqlUpdateCalls(), 15);
    assert.equal(getDocUpdateCallsOnDownload(), 0);
    const refreshed = await sqlCatalogSvc.getPublicationBySlug(
      "sql-atomic-pub",
      "es"
    );
    assert.equal(refreshed?.documentId, created.documentId);
    assert.equal(refreshed?.downloadCount, 15);
  });
});
