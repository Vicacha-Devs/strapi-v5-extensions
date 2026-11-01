import assert from "node:assert/strict";
import { describe, it } from "node:test";

import serverPlugin from "../dist/server/index.mjs";

const createMockStrapi = ({
  pluginConfig = {},
  optionsDoc = {
    baseUrl: "https://example.com",
    excludedUrls: ["/excluded"],
    useSitemapIndex: false,
    sitemapDefinitions: [],
  },
  sitemapEntries = [
    {
      id: 1,
      type: "article",
      langcode: "-",
      pattern: "blog/[category.slug]/[slug]",
      priority: 0.8,
      frequency: "weekly",
      lastModified: "true",
      thumbnail: "cover",
      populateLinkedModels: "true",
    },
  ],
  customUrls = [
    { id: 10, slug: "about", priority: 0.5, frequency: "monthly" },
    { id: 11, slug: "excluded", priority: 0.3, frequency: "yearly" },
  ],
  articleDocs = [
    {
      id: 100,
      documentId: "doc-article-1",
      slug: "hello-world",
      title: "Hello & Welcome <World>",
      category: { slug: "tech" },
      updatedAt: "2026-01-15T00:00:00.000Z",
      cover: { url: "/uploads/cover.jpg", name: "" },
    },
  ],
  localeDocs = [{ code: "en" }, { code: "es" }],
} = {}) => {
  let currentOptions = optionsDoc;
  let currentEntries = [...sitemapEntries];
  let currentCustomUrls = [...customUrls];

  const strapi = {
    log: { error() {} },
    config: {
      get(key: string, defaultVal = {}) {
        return key === "plugin::sitemap" || key === "plugin.sitemap"
          ? pluginConfig
          : defaultVal;
      },
    },
    components: {
      "shared.meta": { attributes: { canonical: { type: "string" } } },
    },
    contentTypes: {
      "api::article.article": {
        kind: "collectionType",
        info: {
          singularName: "article",
          pluralName: "articles",
          displayName: "Article",
        },
        options: { draftAndPublish: true },
        pluginOptions: { i18n: { localized: true } },
        attributes: {
          title: { type: "string" },
          slug: { type: "uid" },
          cover: { type: "media" },
          category: {
            type: "relation",
            relation: "manyToOne",
            target: "api::category.category",
          },
          meta: {
            type: "component",
            repeatable: false,
            component: "shared.meta",
          },
          createdAt: { type: "datetime" },
        },
      },
      "api::category.category": {
        kind: "collectionType",
        info: {
          singularName: "category",
          pluralName: "categories",
          displayName: "Category",
        },
        pluginOptions: {
          "content-manager": { visible: false },
        },
        attributes: {
          name: { type: "string" },
          slug: { type: "uid" },
        },
      },
      "plugin::upload.file": {
        kind: "collectionType",
        info: {
          singularName: "file",
          pluralName: "files",
          displayName: "File",
        },
      },
    },
    get(key: string) {
      return key;
    },
    plugin(this: { get: (k: string) => unknown }, _name: string) {
      this.get("plugins");
      return undefined;
    },
    documents(this: { get: (k: string) => unknown }, uid: string) {
      this.get("documents");
      if (uid === "plugin::sitemap.sitemap-option") {
        return {
          async findFirst() {
            return currentOptions;
          },
          async update({ data }: { data: Record<string, unknown> }) {
            currentOptions = { ...currentOptions, ...data };
            return currentOptions;
          },
        };
      }
      if (uid === "api::article.article") {
        return {
          async findMany(params?: { locale?: string }) {
            if (params?.locale) {
              return articleDocs.filter(
                (doc: { locale?: string }) =>
                  !doc.locale || doc.locale === params.locale
              );
            }
            return articleDocs;
          },
        };
      }
      if (uid === "plugin::i18n.locale") {
        return {
          async findMany() {
            return localeDocs;
          },
        };
      }
      return {
        async findFirst() {
          return null;
        },
        async findMany() {
          return [];
        },
      };
    },
    db: {
      query(uid: string) {
        if (uid === "plugin::sitemap.sitemap-content-type") {
          return {
            async findMany() {
              return currentEntries;
            },
            async update({
              where,
              data,
            }: {
              where: { id: number };
              data: Record<string, unknown>;
            }) {
              currentEntries = currentEntries.map((e) =>
                e.id === where.id
                  ? ({ ...e, ...data } as (typeof currentEntries)[number])
                  : e
              );
              return currentEntries.find((e) => e.id === where.id);
            },
            async delete({ where }: { where: { id: number } }) {
              currentEntries = currentEntries.filter((e) => e.id !== where.id);
            },
            async create({ data }: { data: Record<string, unknown> }) {
              const maxId = currentEntries.reduce(
                (max, e) => Math.max(max, e.id),
                0
              );
              const created = { id: maxId + 1, ...data };
              currentEntries.push(created as (typeof currentEntries)[number]);
              return created;
            },
          };
        }
        if (uid === "plugin::sitemap.sitemap-content-type-single-url") {
          return {
            async findMany() {
              return currentCustomUrls;
            },
            async update({
              where,
              data,
            }: {
              where: { id: number };
              data: Record<string, unknown>;
            }) {
              currentCustomUrls = currentCustomUrls.map((u) =>
                u.id === where.id
                  ? ({ ...u, ...data } as (typeof currentCustomUrls)[number])
                  : u
              );
              return currentCustomUrls.find((u) => u.id === where.id);
            },
            async delete({ where }: { where: { id: number } }) {
              currentCustomUrls = currentCustomUrls.filter(
                (u) => u.id !== where.id
              );
            },
            async create({ data }: { data: Record<string, unknown> }) {
              const maxId = currentCustomUrls.reduce(
                (max, u) => Math.max(max, u.id),
                10
              );
              const created = { id: maxId + 1, ...data };
              currentCustomUrls.push(
                created as (typeof currentCustomUrls)[number]
              );
              return created;
            },
          };
        }
        if (uid === "plugin::sitemap.sitemap-option") {
          return {
            async findMany() {
              return currentOptions ? [{ id: 1, ...currentOptions }] : [];
            },
            async update({ data }: { data: Record<string, unknown> }) {
              currentOptions = { ...currentOptions, ...data };
              return currentOptions;
            },
            async create({ data }: { data: typeof currentOptions }) {
              currentOptions = data;
              return currentOptions;
            },
          };
        }
        if (uid === "plugin::i18n.locale") {
          return {
            async findMany() {
              return localeDocs;
            },
          };
        }
        return {
          async findMany() {
            return [];
          },
        };
      },
    },
  };

  return strapi;
};

describe("strapi-plugin-sitemap", () => {
  it("parses single and multi-level table references from URL patterns", () => {
    const strapi = createMockStrapi();
    const svc = serverPlugin.services.service({ strapi });

    const single = svc.parseTableReferences("blog/[category.slug]/[slug]");
    assert.deepEqual(single, {
      populate: {
        category: true,
      },
    });

    const nested = svc.parseTableReferences(
      "shop/[department.category.slug]/[slug]"
    );
    assert.deepEqual(nested, {
      populate: {
        department: {
          populate: {
            category: true,
          },
        },
      },
    });
  });

  it("generates XML urlset with dynamic entries, relative media URLs, XML escaping, and exclusions", async () => {
    const strapi = createMockStrapi();
    const svc = serverPlugin.services.service({ strapi });

    const xml = await svc.getSitemap();
    assert.ok(
      xml.includes("<loc>https://example.com/blog/tech/hello-world</loc>")
    );
    assert.ok(xml.includes("<lastmod>2026-01-15T00:00:00.000Z</lastmod>"));
    assert.ok(
      xml.includes(
        "<image:loc>https://example.com/uploads/cover.jpg</image:loc>"
      )
    );
    assert.ok(
      xml.includes(
        "<image:title>Hello &amp; Welcome &lt;World&gt;</image:title>"
      )
    );
    assert.ok(xml.includes("<loc>https://example.com/about</loc>"));
    assert.ok(!xml.includes("https://example.com/excluded"));
  });

  it("attaches xhtml:link hreflang alternates across localized documents sharing a documentId", async () => {
    const strapi = createMockStrapi({
      sitemapEntries: [
        {
          id: 1,
          type: "article",
          langcode: "en",
          pattern: "[locale]/blog/[slug]",
          priority: 0.8,
          frequency: "weekly",
          lastModified: "false",
          thumbnail: "",
          populateLinkedModels: "false",
        },
        {
          id: 2,
          type: "article",
          langcode: "es",
          pattern: "[locale]/blog/[slug]",
          priority: 0.8,
          frequency: "weekly",
          lastModified: "false",
          thumbnail: "",
          populateLinkedModels: "false",
        },
      ],
      articleDocs: [
        {
          id: 101,
          documentId: "shared-doc-1",
          locale: "en",
          slug: "hello-world",
          title: "Hello",
          category: { slug: "tech" },
          updatedAt: "2026-01-15T00:00:00.000Z",
          cover: { url: "", name: "" },
        },
        {
          id: 102,
          documentId: "shared-doc-1",
          locale: "es",
          slug: "hola-mundo",
          title: "Hola",
          category: { slug: "tech" },
          updatedAt: "2026-01-15T00:00:00.000Z",
          cover: { url: "", name: "" },
        },
      ],
    });
    const svc = serverPlugin.services.service({ strapi });

    const xml = await svc.getSitemap();
    assert.ok(xml.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'));
    assert.ok(
      xml.includes(
        '<xhtml:link rel="alternate" hreflang="en" href="https://example.com/en/blog/hello-world" />'
      )
    );
    assert.ok(
      xml.includes(
        '<xhtml:link rel="alternate" hreflang="es" href="https://example.com/es/blog/hola-mundo" />'
      )
    );
  });

  it("generates sitemap index XML and sub-sitemaps when useSitemapIndex is enabled", async () => {
    const strapi = createMockStrapi({
      optionsDoc: {
        baseUrl: "https://example.com",
        excludedUrls: [],
        useSitemapIndex: true,
        sitemapDefinitions: [
          {
            name: "articles",
            collectionTypeConfigIds: [1],
            includeCustomUrls: false,
          },
        ],
      },
    });
    const svc = serverPlugin.services.service({ strapi });

    const indexXml = await svc.getSitemap();
    assert.ok(indexXml.includes("<sitemapindex"));
    assert.ok(
      indexXml.includes(
        "<loc>https://example.com/api/sitemap/sitemap-articles.xml</loc>"
      )
    );

    const subXml = await svc.getSitemap("articles");
    assert.ok(
      subXml.includes("<loc>https://example.com/blog/tech/hello-world</loc>")
    );
    assert.ok(!subXml.includes("<loc>https://example.com/about</loc>"));
  });

  it("extracts allowed fields, mediaFields, target relation subfields, and locales", async () => {
    const strapi = createMockStrapi();
    const svc = serverPlugin.services.service({ strapi });

    const { collectionTypes } = await svc.getContentTypes();
    assert.equal(collectionTypes.length, 1);
    assert.equal(collectionTypes[0].uid, "api::article.article");

    const { locales } = await svc.getLocales();
    assert.deepEqual(locales, ["en", "es"]);

    const { allowedFields, mediaFields, slug } = await svc.getAllowedFields(
      "article",
      true
    );
    assert.equal(slug, "articles");
    assert.deepEqual(mediaFields, ["cover"]);
    assert.ok(allowedFields.includes("title"));
    assert.ok(allowedFields.includes("slug"));
    assert.ok(allowedFields.includes("category.id"));
    assert.ok(allowedFields.includes("category.slug"));
    assert.ok(allowedFields.includes("category.name"));
    assert.ok(allowedFields.includes("meta.canonical"));
    assert.ok(allowedFields.includes("id"));
    assert.ok(!allowedFields.includes("createdAt"));
  });

  it("synchronizes unified settings via getSettings and updateSettings and falls back to config.hostname", async () => {
    const strapi = createMockStrapi({
      pluginConfig: { hostname: "https://fallback.example.org" },
      optionsDoc: {
        baseUrl: "",
        excludedUrls: ["/private"],
        useSitemapIndex: false,
        sitemapDefinitions: [],
      },
    });
    const settingsSvc = serverPlugin.services.settings({ strapi });

    const initial = await settingsSvc.getSettings();
    assert.equal(initial.baseUrl, "https://fallback.example.org");
    assert.equal(initial.collectionTypes.length, 1);
    assert.equal(initial.collectionTypes[0].lastModified, true);
    assert.equal(initial.customURLs.length, 2);

    const updated = await settingsSvc.updateSettings({
      baseUrl: "https://new-domain.org",
      excludedUrls: ["/admin-preview"],
      useSitemapIndex: true,
      sitemaps: [
        {
          name: "main",
          collectionTypeConfigIndices: [0],
          includeCustomUrls: true,
        },
      ],
      collectionTypes: [
        {
          type: "article",
          langcode: "en",
          pattern: "/articles/[slug]",
          priority: 0.9,
          frequency: "daily",
          lastModified: true,
          thumbnail: "cover",
          populateLinkedModels: true,
        },
      ],
      customURLs: [{ url: "/contact", priority: 0.6, frequency: "monthly" }],
    });

    assert.equal(updated.baseUrl, "https://new-domain.org");
    assert.equal(updated.useSitemapIndex, true);
    assert.equal(updated.collectionTypes.length, 1);
    assert.equal(updated.collectionTypes[0].priority, 0.9);
    assert.equal(updated.customURLs.length, 1);
    assert.equal(updated.customURLs[0].url, "contact");
  });
});
