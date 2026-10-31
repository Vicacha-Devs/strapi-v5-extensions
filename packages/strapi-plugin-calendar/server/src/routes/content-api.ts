export default {
  type: "content-api",
  routes: [
    {
      method: "GET",
      path: "/occurrences",
      handler: "content-api.getOccurrences",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/feed.ics",
      handler: "content-api.downloadFeedIcs",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/:documentId/invite.ics",
      handler: "content-api.downloadEventIcs",
      config: {
        auth: false,
      },
    },
  ],
};
