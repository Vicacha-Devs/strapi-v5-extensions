import { PLUGIN_ID } from "../../../shared/pluginId";

export default {
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/calendar",
      handler: "admin.getCalendar",
      config: {
        policies: [
          "admin::isAuthenticatedAdmin",
          {
            name: "admin::hasPermissions",
            config: { actions: [`plugin::${PLUGIN_ID}.read`] },
          },
        ],
      },
    },
    {
      method: "POST",
      path: "/calendar/reschedule",
      handler: "admin.reschedule",
      config: {
        policies: [
          "admin::isAuthenticatedAdmin",
          {
            name: "admin::hasPermissions",
            config: { actions: [`plugin::${PLUGIN_ID}.update`] },
          },
        ],
      },
    },
    {
      method: "POST",
      path: "/calendar/quick-create",
      handler: "admin.quickCreate",
      config: {
        policies: [
          "admin::isAuthenticatedAdmin",
          {
            name: "admin::hasPermissions",
            config: { actions: [`plugin::${PLUGIN_ID}.update`] },
          },
        ],
      },
    },
    {
      method: "GET",
      path: "/content-types",
      handler: "admin.getContentTypes",
      config: {
        policies: [
          "admin::isAuthenticatedAdmin",
          {
            name: "admin::hasPermissions",
            config: { actions: [`plugin::${PLUGIN_ID}.read`] },
          },
        ],
      },
    },
    {
      method: "GET",
      path: "/settings",
      handler: "admin.getSettings",
      config: {
        policies: [
          "admin::isAuthenticatedAdmin",
          {
            name: "admin::hasPermissions",
            config: { actions: [`plugin::${PLUGIN_ID}.read`] },
          },
        ],
      },
    },
    {
      method: "PUT",
      path: "/settings",
      handler: "admin.updateSettings",
      config: {
        policies: [
          "admin::isAuthenticatedAdmin",
          {
            name: "admin::hasPermissions",
            config: { actions: [`plugin::${PLUGIN_ID}.settings.update`] },
          },
        ],
      },
    },
    {
      method: "POST",
      path: "/clear-settings",
      handler: "admin.clearSettings",
      config: {
        policies: [
          "admin::isAuthenticatedAdmin",
          {
            name: "admin::hasPermissions",
            config: { actions: [`plugin::${PLUGIN_ID}.settings.update`] },
          },
        ],
      },
    },
  ],
};
