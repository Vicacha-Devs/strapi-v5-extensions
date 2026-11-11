import { PLUGIN_ID } from "../../../shared";

function adminPermissionPolicies(action: string) {
  return [
    "admin::isAuthenticatedAdmin",
    {
      name: "admin::hasPermissions",
      config: { actions: [action] },
    },
  ];
}

export default [
  {
    method: "GET",
    path: "/overview",
    handler: "admin.getOverview",
    config: {
      policies: adminPermissionPolicies(`plugin::${PLUGIN_ID}.read`),
    },
  },
  {
    method: "GET",
    path: "/settings",
    handler: "admin.getSettings",
    config: {
      policies: adminPermissionPolicies(`plugin::${PLUGIN_ID}.settings.update`),
    },
  },
  {
    method: "PUT",
    path: "/settings",
    handler: "admin.updateSettings",
    config: {
      policies: adminPermissionPolicies(`plugin::${PLUGIN_ID}.settings.update`),
    },
  },
  {
    method: "POST",
    path: "/enrich-url",
    handler: "admin.enrichUrl",
    config: {
      policies: adminPermissionPolicies(`plugin::${PLUGIN_ID}.sync`),
    },
  },
  {
    method: "POST",
    path: "/sync-youtube",
    handler: "admin.syncYouTube",
    config: {
      policies: adminPermissionPolicies(`plugin::${PLUGIN_ID}.sync`),
    },
  },
];
