export default {
  type: "content-api",
  routes: [
    {
      method: "GET",
      path: "/public/channels",
      handler: "broadcastController.listPublicChannels",
      config: {
        policies: [],
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/public/archive",
      handler: "broadcastController.listPublicArchive",
      config: {
        policies: [],
        auth: false,
      },
    },
  ],
};
