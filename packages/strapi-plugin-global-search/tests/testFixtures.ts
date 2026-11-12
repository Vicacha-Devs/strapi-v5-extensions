import permissionsFactory from "../server/services/permissions";
import queryFactory from "../server/services/query";
import rankingFactory from "../server/services/ranking";
import schemaFactory from "../server/services/schema";
import searchFactory from "../server/services/search";
import settingsFactory from "../server/services/settings";
import type { StrapiLike } from "../server/types";

export const contentTypes: Record<string, unknown> = {
  "api::article.article": {
    uid: "api::article.article",
    kind: "collectionType",
    info: { displayName: "Article", singularName: "article" },
    options: { draftAndPublish: true },
    pluginOptions: { i18n: { localized: true } },
    attributes: {
      title: { type: "string" },
      slug: { type: "uid" },
      body: { type: "richtext" },
      views: { type: "integer" },
      cover: { type: "media" },
      author: { type: "relation", relation: "oneToOne" },
      payload: { type: "json" },
      secret: { type: "string", private: true },
      password: { type: "string" },
      cancelToken: { type: "string" },
      zone: { type: "dynamiczone", components: ["shared.seo"] },
      seo: { type: "component", component: "shared.seo" },
      tags: { type: "component", component: "shared.tag", repeatable: true },
    },
  },
  "api::homepage.homepage": {
    uid: "api::homepage.homepage",
    kind: "singleType",
    info: { displayName: "Homepage" },
    options: { draftAndPublish: false },
    attributes: { name: { type: "string" }, intro: { type: "text" } },
  },
  "api::secret.secret": {
    uid: "api::secret.secret",
    kind: "collectionType",
    info: { displayName: "Secret" },
    attributes: { blob: { type: "json" } }, // nothing searchable
  },
};

export const components = {
  "shared.seo": {
    attributes: {
      metaTitle: { type: "string" },
      metaDescription: { type: "text" },
      social: { type: "component", component: "shared.social" },
    },
  },
  // Deliberately cyclic: social -> seo -> social ...
  "shared.social": {
    attributes: {
      handle: { type: "string" },
      seo: { type: "component", component: "shared.seo" },
    },
  },
  "shared.tag": { attributes: { label: { type: "string" } } },
};

export const makeArticle = (
  id: number,
  title: string,
  slug: string,
  updatedAt: string,
  extra: Record<string, unknown> = {}
) => ({ id, title, slug, body: "z", updatedAt, locale: "en", ...extra });

export const rows: Record<string, unknown> = {
  "api::article.article": [
    makeArticle(7, "Careers", "careers", "2026-01-01", {
      body: "x",
      documentId: "doc-careers",
      publishedAt: "2026-01-01",
    }),
    makeArticle(12, "Career advice", "career-advice", "2026-02-01", {
      body: "y",
      publishedAt: null,
    }),
    makeArticle(3, "Random", "random", "2026-03-01", {
      body: "we are hiring for careers now",
      publishedAt: "2026-03-01",
    }),
    makeArticle(9, "Nested", "nested", "2026-04-01", {
      seo: { metaTitle: "careers page" },
    }),
    makeArticle(55, "Repeatable", "rep", "2026-05-01", {
      tags: [{ label: "other" }, { label: "careers team" }],
    }),
  ],
  "api::homepage.homepage": {
    id: 1,
    name: "careers",
    intro: "hello",
    updatedAt: "2026-01-05",
  },
};

export const services: Record<string, any> = {};

export const strapi: StrapiLike = {
  contentTypes: contentTypes as StrapiLike["contentTypes"],
  components,
  config: { get: () => ({}) },
  store: () => ({ get: async () => ({}), set: async () => {} }),
  log: {
    debug() {},
    warn: (msg: string) => console.log("  [warn]", msg),
    error: (msg: string) => console.log("  [error]", msg),
  },
  plugin: (id: string) => {
    if (id === "content-manager") {
      return {
        service: () => ({
          findConfiguration: async (ct: { uid: string }) => ({
            settings: {
              mainField: ct.uid === "api::article.article" ? "title" : "name",
            },
          }),
        }),
      };
    }

    return { service: (name: string) => services[name] };
  },
  documents: (uid: string) => ({
    findMany: async () => {
      const data = rows[uid];
      if (!data) return [];
      return Array.isArray(data) ? data : [data];
    },
  }),
  admin: {
    services: { permission: { actionProvider: { registerMany() {} } } },
  },
};

services.schema = schemaFactory({ strapi });
services.query = queryFactory();
services.ranking = rankingFactory();
services.permissions = permissionsFactory();
services.settings = settingsFactory({ strapi });
services.search = searchFactory({ strapi });

export const isHomepageOnly = (res: {
  results: Array<{ contentTypeUid: string }>;
}) => res.results.every((h) => h.contentTypeUid === "api::homepage.homepage");

export const mkCt = (uid: string, displayName: string, extra?: object) => ({
  uid,
  kind: "collectionType",
  info: { displayName },
  attributes: { name: { type: "string" } },
  ...extra,
});
