import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canonicalUrlPreview,
  getAlternativeTextPreview,
  getKeywordDensityPreview,
  lastUpdatedAtPreview,
} from "../admin/src/components/CMEditView/utils/checks.ts";
import { getRegularImageAltTexts } from "../admin/src/components/CMEditView/utils/getRegularImageAltTexts.ts";
import { getRichTextAndBlocksFields } from "../admin/src/components/CMEditView/utils/getRichTextAndBlocksFields.ts";
import { getRichTextData } from "../admin/src/components/CMEditView/utils/getRichTextData.ts";
import serverPlugin from "../server/src/index.ts";
import { DEFAULT_SEO_CHECKS, PLUGIN_ID } from "../shared/index.ts";

const createMockStrapi = () => {
  const storeData = new Map<string, unknown>();
  let createdComponentPayload: Record<string, unknown> | null = null;
  let registeredActions: Array<Record<string, unknown>> = [];

  const strapi: any = {
    reload: {
      isWatching: true,
    },
    admin: {
      services: {
        permission: {
          actionProvider: {
            async registerMany(actions: Array<Record<string, unknown>>) {
              registeredActions = actions;
            },
          },
        },
      },
    },
    components: {
      "shared.seo": {
        category: "shared",
        attributes: {
          metaTitle: { type: "string" },
          metaDescription: { type: "text" },
        },
      },
    },
    contentTypes: {
      "api::article.article": {
        uid: "api::article.article",
        kind: "collectionType",
        globalId: "Article",
        attributes: {
          title: { type: "string" },
          seo: { type: "component", component: "shared.seo" },
        },
      },
      "api::homepage.homepage": {
        uid: "api::homepage.homepage",
        kind: "singleType",
        globalId: "Homepage",
        attributes: {
          heading: { type: "string" },
        },
      },
      "plugin::upload.file": {
        uid: "plugin::upload.file",
        kind: "collectionType",
        globalId: "UploadFile",
        attributes: {},
      },
      "plugin::custom-blog.post": {
        uid: "plugin::custom-blog.post",
        kind: "collectionType",
        globalId: "CustomBlogPost",
        pluginOptions: {
          "content-manager": { visible: true },
        },
        attributes: {},
      },
    },
    store() {
      return {
        async get({ key }: { key: string }) {
          return storeData.get(key) ?? null;
        },
        async set({ key, value }: { key: string; value: unknown }) {
          storeData.set(key, value);
        },
      };
    },
    plugin(name: string) {
      if (name === "content-type-builder") {
        return {
          services: {
            components: {
              async createComponent(payload: Record<string, unknown>) {
                createdComponentPayload = payload;
                return payload;
              },
            },
          },
        };
      }
      return {
        service(serviceName: "seo" | "settings") {
          return serverPlugin.services[serviceName]({ strapi });
        },
      };
    },
    getCreatedComponentPayload() {
      return createdComponentPayload;
    },
    getRegisteredActions() {
      return registeredActions;
    },
  };

  return strapi as any;
};

describe("strapi-plugin-seo", () => {
  it("exports expected shared constants", () => {
    assert.equal(PLUGIN_ID, "seo");
    assert.equal(DEFAULT_SEO_CHECKS.metaTitle, true);
    assert.equal(DEFAULT_SEO_CHECKS.openGraph, true);
    assert.equal(DEFAULT_SEO_CHECKS.lastUpdatedAt, true);
  });

  it("registers RBAC permissions in bootstrap and secures routes", async () => {
    const strapi = createMockStrapi();
    await serverPlugin.bootstrap({ strapi });

    const actions = strapi.getRegisteredActions();
    assert.equal(actions.length, 2);
    assert.equal(actions[0].uid, "read");
    assert.equal(actions[1].uid, "settings.update");

    const seoRoutes = serverPlugin.routes.seo.routes;
    const settingsRoutes = serverPlugin.routes.settings.routes;
    const allRoutes = [...seoRoutes, ...settingsRoutes];
    assert.equal(allRoutes.length, 5);

    for (const route of allRoutes) {
      const policies = route.config?.policies ?? [];
      assert.ok(policies.includes("admin::isAuthenticatedAdmin"));
      assert.ok(
        policies.some(
          (p: unknown) =>
            typeof p === "object" &&
            p !== null &&
            (p as { name?: string }).name === "admin::hasPermissions"
        )
      );
    }
  });

  it("retrieves SEO component and categorizes content types", () => {
    const strapi = createMockStrapi();
    const seoSvc = serverPlugin.services.seo({ strapi });

    const component = seoSvc.getSeoComponent();
    assert.ok(component);
    assert.equal(component.category, "shared");

    const contentTypes = seoSvc.getContentTypes();
    assert.equal(contentTypes.collectionTypes.length, 1);
    assert.equal(contentTypes.collectionTypes[0].uid, "api::article.article");
    assert.equal(contentTypes.collectionTypes[0].seo, true);

    assert.equal(contentTypes.singleTypes.length, 1);
    assert.equal(contentTypes.singleTypes[0].uid, "api::homepage.homepage");
    assert.equal(contentTypes.singleTypes[0].seo, false);

    assert.equal(contentTypes.plugins.length, 1);
    assert.equal(contentTypes.plugins[0].uid, "plugin::custom-blog.post");
  });

  it("creates SEO component when missing and handles open-graph", async () => {
    const strapi = createMockStrapi();
    strapi.components = {};
    const seoSvc = serverPlugin.services.seo({ strapi });

    const created = await seoSvc.createSeoComponent();
    assert.ok(created);
    const payload = strapi.getCreatedComponentPayload();
    assert.equal((payload?.component as any)?.category, "shared");
    const components = payload?.components;
    assert.equal(Array.isArray(components), true);
    assert.equal((components as unknown[]).length, 1);

    // When shared.open-graph already exists, components array is empty
    strapi.components = {
      "shared.open-graph": { category: "shared" },
    };
    await seoSvc.createSeoComponent();
    const secondPayload = strapi.getCreatedComponentPayload();
    const secondComponents = secondPayload?.components;
    assert.equal(Array.isArray(secondComponents), true);
    assert.equal((secondComponents as unknown[]).length, 0);
  });

  it("restores strapi.reload.isWatching on controller failure", async () => {
    const strapi = createMockStrapi();
    strapi.plugin = () => ({
      service() {
        return {
          async createSeoComponent() {
            return null;
          },
        };
      },
    });

    const controller = serverPlugin.controllers.seo({ strapi });
    const ctx: any = {};
    await controller.createSeoComponent(ctx);

    assert.equal(strapi.reload.isWatching, true);
    assert.equal(ctx.status, 500);
    assert.equal(ctx.body.error, "Failed to create SEO component");
  });

  it("sanitizes, merges, and validates plugin settings store", async () => {
    const strapi = createMockStrapi();
    const settingsSvc = serverPlugin.services.settings({ strapi });

    const initialSettings = await settingsSvc.getSettings();
    assert.ok(initialSettings["api::article.article"]);
    assert.ok(initialSettings["api::homepage.homepage"]);

    // Partial update for one content type preserves other content types
    await settingsSvc.setSettings({
      "api::article.article": {
        collectionName: "Article",
        seoChecks: {
          ...DEFAULT_SEO_CHECKS,
          wordCount: false,
        },
      },
    });

    const saved = await settingsSvc.getSettings();
    assert.equal(saved["api::article.article"].seoChecks.wordCount, false);
    assert.ok(saved["api::homepage.homepage"]);

    // Rejects prototype pollution keys and non-object controller bodies
    const settingsCtrl = serverPlugin.controllers.settings({ strapi });
    let badRequestCalled = false;
    const badCtx: any = {
      request: { body: ["invalid"] },
      badRequest() {
        badRequestCalled = true;
      },
    };
    await settingsCtrl.setSettings(badCtx);
    assert.equal(badRequestCalled, true);
  });

  it("handles circular references and deduplicates rich text fields", () => {
    const circular: Record<string, any> = {
      image: { mime: "image/png", alternativeText: "", name: "hero.png" },
    };
    circular.self = circular;

    const regularAlts = getRegularImageAltTexts({ attributes: {} }, circular);
    assert.deepEqual(regularAlts.altTexts, [""]);

    const contentType = {
      attributes: {
        body: { type: "richtext" },
        blocks: { type: "blocks" },
        items: { type: "component", component: "shared.item" },
      },
    };
    const components = {
      "shared.item": {
        attributes: {
          description: { type: "richtext" },
        },
      },
    };
    const modifiedData = {
      body: "",
      blocks: [],
      items: [{ description: "First" }, { description: "Second" }],
    };

    const fields = getRichTextAndBlocksFields(
      contentType,
      components,
      modifiedData
    );
    assert.equal(fields.richTextFields.length, 2);
    assert.equal(fields.blockFields.length, 1);
  });

  it("computes keyword density and SEO check previews accurately", () => {
    const modifiedData = {
      body: "Strapi SEO plugin makes Strapi content optimization simple.",
      seo: {
        keywords: "Strapi, optimization, missing,   ",
      },
    };
    const contentType = {
      attributes: {
        body: { type: "richtext" },
      },
    };
    const { wordCount, keywordsDensity, emptyAltCount } = getRichTextData(
      modifiedData,
      componentsMock,
      contentType
    );

    assert.equal(wordCount, 8);
    assert.equal(keywordsDensity.strapi?.count, 2);
    assert.equal(keywordsDensity.optimization?.count, 1);
    assert.equal(keywordsDensity.missing?.count, 0);
    assert.equal("   " in keywordsDensity, false);
    assert.equal(emptyAltCount.richTextAlts.length, 1);
    assert.equal(emptyAltCount.richTextAlts[0].occurences, 0);

    // Keyword density check keeps 'bad' (count === 1) even if a subsequent
    // keyword has count === 0 ('improvements')
    const densityStatus = getKeywordDensityPreview(keywordsDensity);
    assert.equal(densityStatus.qualityVerdict, "bad");

    const altStatus = getAlternativeTextPreview({
      intersections: 1,
      richTextAlts: [],
      blockTextAlts: [{ occurences: 1, field: "blocks" }],
      altTexts: ["valid alt"],
    });
    assert.equal(altStatus.qualityVerdict, "improvements");

    assert.equal(
      canonicalUrlPreview({ seo: { canonicalURL: "https://example.com" } })
        .qualityVerdict,
      "good"
    );
    assert.equal(
      lastUpdatedAtPreview({ updatedAt: "invalid-date" }).qualityVerdict,
      "bad"
    );

    // Tiptap envelope JSON & prototype keyword filtering regression check
    const tiptapResult = getRichTextData(
      {
        body: JSON.stringify({
          doc: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Hello Tiptap SEO world" }],
              },
            ],
          },
          metrics: { readingTimeMinutes: 1 },
        }),
        seo: { keywords: "__proto__, constructor, prototype, tiptap" },
      },
      componentsMock,
      contentType
    );
    assert.equal(tiptapResult.wordCount, 4);
    assert.equal(tiptapResult.keywordsDensity.tiptap?.count, 1);
    assert.equal(
      Object.prototype.hasOwnProperty.call(
        tiptapResult.keywordsDensity,
        "__proto__"
      ),
      false
    );
  });
});

const componentsMock = {};
