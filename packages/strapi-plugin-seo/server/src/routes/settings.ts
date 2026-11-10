const SETTINGS_POLICIES = [
  "admin::isAuthenticatedAdmin",
  {
    name: "admin::hasPermissions",
    config: { actions: ["plugin::seo.read"] },
  },
];

export const settingsRoutes = {
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/settings",
      handler: "settings.getSettings",
      config: { policies: SETTINGS_POLICIES },
    },
    {
      method: "POST",
      path: "/settings",
      handler: "settings.setSettings",
      config: { policies: SETTINGS_POLICIES },
    },
  ],
};
