import { PLUGIN_ID } from "../pluginId";

const readSettingsPolicies = [
  "admin::isAuthenticatedAdmin",
  {
    name: "admin::hasPermissions",
    config: {
      actions: [`plugin::${PLUGIN_ID}.settings.read`],
    },
  },
];

const updateSettingsPolicies = [
  "admin::isAuthenticatedAdmin",
  {
    name: "admin::hasPermissions",
    config: {
      actions: [`plugin::${PLUGIN_ID}.settings.update`],
    },
  },
];

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
      policies: readSettingsPolicies,
    },
  },
  {
    method: "PUT",
    path: "/settings",
    handler: "controller.updateSettings",
    config: {
      policies: updateSettingsPolicies,
    },
  },
  {
    method: "GET",
    path: "/content-types",
    handler: "controller.getContentTypes",
    config: {
      policies: readSettingsPolicies,
    },
  },
  {
    method: "GET",
    path: "/locales",
    handler: "controller.getLocales",
    config: {
      policies: readSettingsPolicies,
    },
  },
  {
    method: "GET",
    path: "/allowed-fields",
    handler: "controller.getAllowedFields",
    config: {
      policies: readSettingsPolicies,
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
