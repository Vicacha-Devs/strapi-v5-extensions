import { PLUGIN_ID } from "../../../shared";

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

const deletePolicies = [
  "admin::isAuthenticatedAdmin",
  {
    name: "admin::hasPermissions",
    config: { actions: [`plugin::${PLUGIN_ID}.delete`] },
  },
];

export default {
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/notes",
      handler: "notesController.find",
      config: {
        policies: readPolicies,
      },
    },
    {
      method: "GET",
      path: "/notes/stats",
      handler: "notesController.stats",
      config: {
        policies: readPolicies,
      },
    },
    {
      method: "GET",
      path: "/notes/:id",
      handler: "notesController.findOne",
      config: {
        policies: readPolicies,
      },
    },
    {
      method: "POST",
      path: "/notes",
      handler: "notesController.create",
      config: {
        policies: updatePolicies,
      },
    },
    {
      method: "PUT",
      path: "/notes/:id",
      handler: "notesController.update",
      config: {
        policies: updatePolicies,
      },
    },
    {
      method: "DELETE",
      path: "/notes/:id",
      handler: "notesController.delete",
      config: {
        policies: deletePolicies,
      },
    },
  ],
};
