export default {
  type: "content-api",
  routes: [
    {
      method: "GET",
      path: "/occurrences",
      handler: "content-api.listOccurrences",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/spotlights",
      handler: "content-api.listSpotlights",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/feed.ics",
      handler: "content-api.downloadFeedIcs",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/:documentId/invite.ics",
      handler: "content-api.downloadEventInviteIcs",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/:documentId/stats",
      handler: "content-api.getEventStats",
      config: {
        policies: [],
      },
    },
    {
      method: "POST",
      path: "/:documentId/register",
      handler: "content-api.registerAttendee",
      config: {
        policies: [],
      },
    },
    {
      method: "POST",
      path: "/registrations/:token/cancel",
      handler: "content-api.cancelRegistration",
      config: {
        policies: [],
      },
    },
  ],
};
