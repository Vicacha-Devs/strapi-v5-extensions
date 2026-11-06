export default [
  {
    method: "GET",
    path: "/overview",
    handler: "admin.getOverview",
    config: {
      policies: [],
    },
  },
  {
    method: "GET",
    path: "/settings",
    handler: "admin.getSettings",
    config: {
      policies: [],
    },
  },
  {
    method: "PUT",
    path: "/settings",
    handler: "admin.updateSettings",
    config: {
      policies: [],
    },
  },
  {
    method: "POST",
    path: "/enrich-url",
    handler: "admin.enrichUrl",
    config: {
      policies: [],
    },
  },
  {
    method: "POST",
    path: "/sync-youtube",
    handler: "admin.syncYouTube",
    config: {
      policies: [],
    },
  },
];
