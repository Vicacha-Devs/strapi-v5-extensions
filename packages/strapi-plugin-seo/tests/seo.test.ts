import assert from "node:assert/strict";
import { describe, it } from "node:test";

import serverPlugin from "../dist/server/index.mjs";
import { DEFAULT_SEO_CHECKS, PLUGIN_ID } from "../shared/index.ts";

const createMockStrapi = () => {
  const storeData = new Map();
  let createdComponentPayload = null;

  const strapi = {
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
        async get({ key }) {
          return storeData.get(key) ?? null;
        },
        async set({ key, value }) {
          storeData.set(key, value);
        },
      };
    },
    plugin(name) {
      if (name === "content-type-builder") {
        return {
          services: {
            components: {
              async createComponent(payload) {
                createdComponentPayload = payload;
                return payload;
              },
            },
          },
        };
      }
      return {
        service(serviceName) {
          return serverPlugin.services[serviceName]({ strapi });
        },
      };
    },
    getCreatedComponentPayload() {
      return createdComponentPayload;
    },
  };

  return strapi;
};

describe("strapi-plugin-seo", () => {
  it("exports expected shared constants", () => {
    assert.equal(PLUGIN_ID, "seo");
    assert.equal(DEFAULT_SEO_CHECKS.metaTitle, true);
    assert.equal(DEFAULT_SEO_CHECKS.openGraph, true);
    assert.equal(DEFAULT_SEO_CHECKS.lastUpdatedAt, true);
  });

  it("retrieves SEO component and categorizes content types accurately", () => {
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

  it("creates SEO component when missing", async () => {
    const strapi = createMockStrapi();
    strapi.components = {};
    const seoSvc = serverPlugin.services.seo({ strapi });

    const created = await seoSvc.createSeoComponent();
    assert.ok(created);
    assert.equal(strapi.getCreatedComponentPayload().component.category, "shared");
  });

  it("initializes and updates plugin settings store", async () => {
    const strapi = createMockStrapi();
    const settingsSvc = serverPlugin.services.settings({ strapi });

    const initialSettings = await settingsSvc.getSettings();
    assert.ok(initialSettings["api::article.article"]);
    assert.equal(initialSettings["api::article.article"].seoChecks.metaTitle, true);

    const updatedSettings = {
      ...initialSettings,
      "api::article.article": {
        collectionName: "Article",
        seoChecks: {
          ...DEFAULT_SEO_CHECKS,
          wordCount: false,
        },
      },
    };
    await settingsSvc.setSettings(updatedSettings);
    const saved = await settingsSvc.getSettings();
    assert.equal(saved["api::article.article"].seoChecks.wordCount, false);
  });
});
