const frontend = [
  {
    method: "GET",
    path: "/sitemap.xml",
    handler: "controller.getSitemap",
    config: {
      policies: [],
    },
  },
  {
    method: "GET",
    path: "/sitemap-:slug.xml",
    handler: "controller.getSitemapBySlug",
    config: {
      policies: [],
    },
  },
];

const admin = [
  {
    method: "GET",
    path: "/settings",
    handler: "controller.getSettings",
    config: {
      policies: [],
    },
  },
  {
    method: "PUT",
    path: "/settings",
    handler: "controller.updateSettings",
    config: {
      policies: [],
    },
  },
  {
    method: "GET",
    path: "/content-types",
    handler: "controller.getContentTypes",
    config: {
      policies: [],
    },
  },
  {
    method: "GET",
    path: "/locales",
    handler: "controller.getLocales",
    config: {
      policies: [],
    },
  },
  {
    method: "GET",
    path: "/allowed-fields",
    handler: "controller.getAllowedFields",
    config: {
      policies: [],
    },
  },
];

export default {
  frontend: {
    type: "content-api",
    routes: [...frontend],
  },
  admin: {
    type: "admin",
    routes: [...admin],
  },
};
