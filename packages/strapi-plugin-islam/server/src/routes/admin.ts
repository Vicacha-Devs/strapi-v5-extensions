import { PLUGIN_ID } from "../../../shared";

const READ_POLICIES = [
  "admin::isAuthenticatedAdmin",
  {
    name: "admin::hasPermissions",
    config: { actions: [`plugin::${PLUGIN_ID}.read`] },
  },
];

const SETTINGS_POLICIES = [
  "admin::isAuthenticatedAdmin",
  {
    name: "admin::hasPermissions",
    config: { actions: [`plugin::${PLUGIN_ID}.settings.update`] },
  },
];

export default {
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/overview",
      handler: "admin.getOverview",
      config: { policies: READ_POLICIES },
    },
    {
      method: "GET",
      path: "/settings",
      handler: "admin.getSettings",
      config: { policies: SETTINGS_POLICIES },
    },
    {
      method: "PUT",
      path: "/settings",
      handler: "admin.updateSettings",
      config: { policies: SETTINGS_POLICIES },
    },
    {
      method: "POST",
      path: "/hilal/confirm",
      handler: "admin.confirmHilal",
      config: { policies: SETTINGS_POLICIES },
    },
    {
      method: "POST",
      path: "/scripture/pins",
      handler: "admin.updateDailyPins",
      config: { policies: SETTINGS_POLICIES },
    },
  ],
};
