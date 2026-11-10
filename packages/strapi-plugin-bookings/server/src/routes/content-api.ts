export default [
  {
    method: "GET",
    path: "/resources",
    handler: "content-api.listPublicResources",
    config: {
      policies: [],
    },
  },
  {
    method: "GET",
    path: "/available-slots",
    handler: "content-api.getAvailableSlots",
    config: {
      policies: [],
    },
  },
  {
    method: "POST",
    path: "/reserve",
    handler: "content-api.createReservation",
    config: {
      policies: [],
    },
  },
  {
    method: "POST",
    path: "/reschedule",
    handler: "content-api.rescheduleReservation",
    config: {
      policies: [],
    },
  },
  {
    method: "POST",
    path: "/cancel",
    handler: "content-api.cancelReservation",
    config: {
      policies: [],
    },
  },
  {
    method: "GET",
    path: "/feed.ics",
    handler: "content-api.getICalFeed",
    config: {
      policies: [],
    },
  },
];
