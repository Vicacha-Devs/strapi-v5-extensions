import { PLUGIN_ID } from "../../../shared/pluginId";

const readPolicies = [
  "admin::isAuthenticatedAdmin",
  {
    name: "admin::hasPermissions",
    config: { actions: [`plugin::${PLUGIN_ID}.read`] },
  },
];

const updatePolicies = [
  "admin::isAuthenticatedAdmin",
  {
    name: "admin::hasPermissions",
    config: { actions: [`plugin::${PLUGIN_ID}.update`] },
  },
];

const settingsPolicies = [
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
      path: "/settings",
      handler: "admin.getSettings",
      config: {
        policies: readPolicies,
      },
    },
    {
      method: "PUT",
      path: "/settings",
      handler: "admin.updateSettings",
      config: {
        policies: settingsPolicies,
      },
    },
    {
      method: "GET",
      path: "/calendar",
      handler: "admin.getCalendar",
      config: {
        policies: readPolicies,
      },
    },
    {
      method: "POST",
      path: "/calendar/reschedule",
      handler: "admin.reschedule",
      config: {
        policies: updatePolicies,
      },
    },
    {
      method: "POST",
      path: "/calendar/quick-create",
      handler: "admin.quickCreate",
      config: {
        policies: updatePolicies,
      },
    },
    {
      method: "GET",
      path: "/stats/:documentId",
      handler: "admin.getEventStats",
      config: {
        policies: readPolicies,
      },
    },
    {
      method: "GET",
      path: "/registrations",
      handler: "admin.listRegistrations",
      config: {
        policies: readPolicies,
      },
    },
    {
      method: "GET",
      path: "/registrations/export.csv",
      handler: "admin.exportRegistrationsCsv",
      config: {
        policies: readPolicies,
      },
    },
    {
      method: "POST",
      path: "/registrations/:documentId/status",
      handler: "admin.updateRegistrationStatus",
      config: {
        policies: updatePolicies,
      },
    },
    {
      method: "POST",
      path: "/registrations/:documentId/check-in",
      handler: "admin.checkIn",
      config: {
        policies: updatePolicies,
      },
    },
  ],
};
