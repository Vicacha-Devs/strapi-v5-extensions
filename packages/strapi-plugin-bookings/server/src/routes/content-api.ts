export default [
  {
    method: "GET",
    path: "/resources",
    handler: "content-api.listPublicResources",
    config: {
      auth: false,
      policies: [],
    },
  },
  {
    method: "GET",
    path: "/available-slots",
    handler: "content-api.getAvailableSlots",
    config: {
      auth: false,
      policies: [],
    },
  },
  {
    method: "POST",
    path: "/reserve",
    handler: "content-api.createReservation",
    config: {
      auth: false,
      policies: [],
    },
  },
  {
    method: "POST",
    path: "/reschedule",
    handler: "content-api.rescheduleReservation",
    config: {
      auth: false,
      policies: [],
    },
  },
  {
    method: "POST",
    path: "/cancel",
    handler: "content-api.cancelReservation",
    config: {
      auth: false,
      policies: [],
    },
  },
  {
    method: "GET",
    path: "/feed.ics",
    handler: "content-api.getICalFeed",
    config: {
      auth: false,
      policies: [],
    },
  },
];
