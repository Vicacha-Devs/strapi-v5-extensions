const READ_POLICIES = [
  "admin::isAuthenticatedAdmin",
  {
    name: "admin::hasPermissions",
    config: { actions: ["plugin::seo.read"] },
  },
];

const UPDATE_POLICIES = [
  "admin::isAuthenticatedAdmin",
  {
    name: "admin::hasPermissions",
    config: { actions: ["plugin::seo.settings.update"] },
  },
];

export const settingsRoutes = {
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/settings",
      handler: "settings.getSettings",
      config: { policies: READ_POLICIES },
    },
    {
      method: "POST",
      path: "/settings",
      handler: "settings.setSettings",
      config: { policies: UPDATE_POLICIES },
    },
  ],
};
