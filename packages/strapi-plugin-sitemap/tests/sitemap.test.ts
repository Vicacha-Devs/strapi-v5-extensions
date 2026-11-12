import assert from "node:assert/strict";
import { describe, it } from "node:test";

import serverPlugin from "../server/src/index";

const makeCrudRepo = <T extends { id: number }>(
  getItems: () => T[],
  setItems: (next: T[]) => void,
  baseId = 0
) => ({
  async findMany() {
    return getItems();
  },
  async update({
    where,
    data,
  }: {
    where: { id: number };
    data: Record<string, unknown>;
  }) {
    const updated = getItems().map((item) =>
      item.id === where.id ? ({ ...item, ...data } as T) : item
    );
    setItems(updated);
    return updated.find((item) => item.id === where.id);
  },
  async delete({ where }: { where: { id: number } }) {
    setItems(getItems().filter((item) => item.id !== where.id));
  },
  async create({ data }: { data: Record<string, unknown> }) {
    const items = getItems();
    const maxId = items.reduce((max, item) => Math.max(max, item.id), baseId);
    const created = { id: maxId + 1, ...data } as unknown as T;
    setItems([...items, created]);
    return created;
  },
});

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
}: Record<string, any> = {}): any => {
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
        pluginOptions: { "content-manager": { visible: false } },
        attributes: { name: { type: "string" }, slug: { type: "uid" } },
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
          return makeCrudRepo(
            () => currentEntries,
            (next) => {
              currentEntries = next;
            },
            0
          );
        }
        if (uid === "plugin::sitemap.sitemap-content-type-single-url") {
          return makeCrudRepo(
            () => currentCustomUrls,
            (next) => {
              currentCustomUrls = next;
            },
            10
          );
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

  return strapi as any;
};

describe("strapi-plugin-sitemap", () => {
  it("parses table references and blocks prototype pollution", () => {
    const strapi = createMockStrapi();
    const svc = serverPlugin.services.service({ strapi });

    const single = svc.parseTableReferences("blog/[category.slug]/[slug]");
    assert.deepEqual(single, { populate: { category: true } });

    const nested = svc.parseTableReferences(
      "shop/[department.category.slug]/[slug]"
    );
    assert.deepEqual(nested, {
      populate: { department: { populate: { category: true } } },
    });

    const polluted = svc.parseTableReferences(
      "evil/[__proto__.polluted.slug]/[constructor.prototype.x]/[slug]"
    );
    assert.deepEqual(polluted, {});
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
    assert.equal(svc.getNestedValue({ a: 1 }, "__proto__.toString"), null);
    assert.equal(svc.getNestedValue({ a: 1 }, "toString"), null);
  });

  it("generates XML urlset with dynamic entries and exclusions", async () => {
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

  it("excludes draft entries when draftAndPublish is enabled", async () => {
    const strapi = createMockStrapi({
      articleDocs: [
        {
          id: 100,
          documentId: "doc-published",
          slug: "published-post",
          title: "Published",
          category: { slug: "tech" },
          publishedAt: "2026-01-15T00:00:00.000Z",
          updatedAt: "2026-01-15T00:00:00.000Z",
          cover: { url: "", name: "" },
        },
        {
          id: 101,
          documentId: "doc-draft",
          slug: "secret-draft",
          title: "Draft",
          category: { slug: "tech" },
          publishedAt: null,
          updatedAt: "2026-01-15T00:00:00.000Z",
          cover: { url: "", name: "" },
        },
      ] as never,
    });
    const svc = serverPlugin.services.service({ strapi });
    const xml = await svc.getSitemap();
    assert.ok(xml.includes("published-post"));
    assert.ok(!xml.includes("secret-draft"));
  });

  it("attaches hreflang alternates across localized documents", async () => {
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
    const enLink =
      '<xhtml:link rel="alternate" hreflang="en" ' +
      'href="https://example.com/en/blog/hello-world" />';
    const esLink =
      '<xhtml:link rel="alternate" hreflang="es" ' +
      'href="https://example.com/es/blog/hola-mundo" />';
    assert.ok(xml.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'));
    assert.ok(xml.includes(enLink));
    assert.ok(xml.includes(esLink));
  });

  it("generates sitemap index XML and sub-sitemaps", async () => {
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

  it("extracts allowed fields, mediaFields, and locales", async () => {
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

  it("synchronizes settings and enforces RBAC routes", async () => {
    const adminRoutes = serverPlugin.routes.admin.routes;
    assert.equal(adminRoutes.length, 5);
    for (const route of adminRoutes) {
      assert.ok(route.config.policies.includes("admin::isAuthenticatedAdmin"));
    }
    assert.throws(() => serverPlugin.config.validator({ hostname: 123 }));

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

    const updated = await settingsSvc.updateSettings({
      baseUrl: "https://new-domain.org/",
      excludedUrls: ["/admin-preview", "/admin-preview"],
      useSitemapIndex: true,
      sitemaps: [
        {
          name: "main",
          collectionTypeConfigIndices: [0, 0],
          includeCustomUrls: true,
        },
      ],
      collectionTypes: [
        {
          type: "article",
          langcode: "en",
          pattern: "/articles/[slug]",
          priority: 9.5,
          frequency: "INVALID_FREQ",
          lastModified: true,
          thumbnail: "cover",
          populateLinkedModels: true,
        },
      ],
      customURLs: [{ url: "/contact", priority: -2, frequency: "monthly" }],
    });

    assert.equal(updated.baseUrl, "https://new-domain.org");
    assert.deepEqual(updated.excludedUrls, ["/admin-preview"]);
    assert.equal(updated.collectionTypes[0].priority, 1);
    assert.equal(updated.collectionTypes[0].frequency, "monthly");
    assert.equal(updated.customURLs[0].priority, 0);
    assert.equal(updated.customURLs[0].url, "contact");
  });
});
