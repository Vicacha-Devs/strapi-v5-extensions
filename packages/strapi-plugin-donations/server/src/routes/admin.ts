const withPerm = (action: string) => [
  "admin::isAuthenticatedAdmin",
  {
    name: "admin::hasPermissions",
    config: { actions: [`plugin::donations.${action}`] },
  },
];

const READ_POLICIES = withPerm("read");
const MANAGE_POLICIES = withPerm("manage");
const SETTINGS_POLICIES = withPerm("settings");

export default {
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/settings",
      handler: "admin.getSettings",
      config: { policies: READ_POLICIES },
    },
    {
      method: "PUT",
      path: "/settings",
      handler: "admin.updateSettings",
      config: { policies: SETTINGS_POLICIES },
    },
    {
      method: "GET",
      path: "/overview",
      handler: "admin.getOverview",
      config: { policies: READ_POLICIES },
    },
    {
      method: "POST",
      path: "/campaigns",
      handler: "admin.createCampaign",
      config: { policies: MANAGE_POLICIES },
    },
    {
      method: "PUT",
      path: "/campaigns/:identifier",
      handler: "admin.updateCampaign",
      config: { policies: MANAGE_POLICIES },
    },
    {
      method: "POST",
      path: "/campaigns/:identifier/evidences",
      handler: "admin.addEvidence",
      config: { policies: MANAGE_POLICIES },
    },
    {
      method: "DELETE",
      path: "/campaigns/:identifier/evidences/:evidenceId",
      handler: "admin.removeEvidence",
      config: { policies: MANAGE_POLICIES },
    },
    {
      method: "POST",
      path: "/pledges/:referenceCode/verify",
      handler: "admin.verifyPledge",
      config: { policies: MANAGE_POLICIES },
    },
  ],
};
