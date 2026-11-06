export default {
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/overview",
      handler: "admin.getOverview",
      config: { policies: [] },
    },
    {
      method: "GET",
      path: "/settings",
      handler: "admin.getSettings",
      config: { policies: [] },
    },
    {
      method: "PUT",
      path: "/settings",
      handler: "admin.updateSettings",
      config: { policies: [] },
    },
    {
      method: "POST",
      path: "/hilal/confirm",
      handler: "admin.confirmHilal",
      config: { policies: [] },
    },
    {
      method: "POST",
      path: "/scripture/pins",
      handler: "admin.updateDailyPins",
      config: { policies: [] },
    },
  ],
};
