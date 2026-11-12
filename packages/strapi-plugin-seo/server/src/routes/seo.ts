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

export const seoRoutes = {
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/component",
      handler: "seo.findSeoComponent",
      config: {
        policies: READ_POLICIES,
      },
    },
    {
      method: "POST",
      path: "/component",
      handler: "seo.createSeoComponent",
      config: {
        policies: UPDATE_POLICIES,
      },
    },
    {
      method: "GET",
      path: "/content-types",
      handler: "seo.findContentTypes",
      config: {
        policies: READ_POLICIES,
      },
    },
  ],
};
