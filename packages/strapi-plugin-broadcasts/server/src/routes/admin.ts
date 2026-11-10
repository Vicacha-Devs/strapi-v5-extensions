import { PLUGIN_ID } from "../../../shared";

function adminPolicies(...actionUids: string[]) {
  return [
    "admin::isAuthenticatedAdmin",
    {
      name: "admin::hasPermissions",
      config: {
        actions: actionUids.map((uid) => `plugin::${PLUGIN_ID}.${uid}`),
      },
    },
  ];
}

export default {
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/settings",
      handler: "broadcastController.getSettings",
      config: { policies: adminPolicies("settings.manage") },
    },
    {
      method: "PUT",
      path: "/settings",
      handler: "broadcastController.updateSettings",
      config: { policies: adminPolicies("settings.manage") },
    },
    {
      method: "GET",
      path: "/templates",
      handler: "broadcastController.listStarterTemplates",
      config: { policies: adminPolicies("read") },
    },
    {
      method: "GET",
      path: "/email-templates",
      handler: "broadcastController.listEmailTemplates",
      config: { policies: adminPolicies("read") },
    },
    {
      method: "GET",
      path: "/campaigns",
      handler: "broadcastController.listCampaigns",
      config: { policies: adminPolicies("read") },
    },
    {
      method: "POST",
      path: "/campaigns",
      handler: "broadcastController.createCampaign",
      config: { policies: adminPolicies("campaigns.manage") },
    },
    {
      method: "PUT",
      path: "/campaigns/:documentId",
      handler: "broadcastController.updateCampaign",
      config: { policies: adminPolicies("campaigns.manage") },
    },
    {
      method: "POST",
      path: "/campaigns/from-template",
      handler: "broadcastController.createFromTemplate",
      config: { policies: adminPolicies("campaigns.manage") },
    },
    {
      method: "POST",
      path: "/campaigns/:documentId/send",
      handler: "broadcastController.sendCampaign",
      config: { policies: adminPolicies("campaigns.send") },
    },
    {
      method: "GET",
      path: "/automation-rules",
      handler: "broadcastController.listAutomationRules",
      config: { policies: adminPolicies("read") },
    },
    {
      method: "POST",
      path: "/automation-rules",
      handler: "broadcastController.createAutomationRule",
      config: { policies: adminPolicies("automations.manage") },
    },
    {
      method: "PUT",
      path: "/automation-rules/:documentId",
      handler: "broadcastController.updateAutomationRule",
      config: { policies: adminPolicies("automations.manage") },
    },
    {
      method: "GET",
      path: "/delivery-logs",
      handler: "broadcastController.listDeliveryLogs",
      config: { policies: adminPolicies("read") },
    },
  ],
};
