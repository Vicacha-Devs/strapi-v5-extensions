export default {
  type: "content-api",
  routes: [
    {
      method: "GET",
      path: "/occurrences",
      handler: "content-api.getOccurrences",
      config: {},
    },
    {
      method: "GET",
      path: "/feed.ics",
      handler: "content-api.downloadFeedIcs",
      config: {},
    },
    {
      method: "GET",
      path: "/:documentId/invite.ics",
      handler: "content-api.downloadEventIcs",
      config: {},
    },
  ],
};
