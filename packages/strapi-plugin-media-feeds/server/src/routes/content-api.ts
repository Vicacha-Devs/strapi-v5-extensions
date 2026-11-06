export default [
  {
    method: "GET",
    path: "/episodes",
    handler: "content-api.listEpisodes",
    config: {
      auth: false,
      policies: [],
    },
  },
  {
    method: "GET",
    path: "/series",
    handler: "content-api.listSeries",
    config: {
      auth: false,
      policies: [],
    },
  },
  {
    method: "GET",
    path: "/live",
    handler: "content-api.getLiveStatus",
    config: {
      auth: false,
      policies: [],
    },
  },
  {
    method: "GET",
    path: "/rss.xml",
    handler: "content-api.getRssXml",
    config: {
      auth: false,
      policies: [],
    },
  },
];
