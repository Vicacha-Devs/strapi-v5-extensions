const withPerm = (action: string) => [
  "admin::isAuthenticatedAdmin",
  {
    name: "admin::hasPermissions",
    config: { actions: [`plugin::certificates.${action}`] },
  },
];

const READ_POLICIES = withPerm("read");
const ISSUE_POLICIES = withPerm("issue");
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
      method: "POST",
      path: "/settings/rotate-keys",
      handler: "admin.rotateKeys",
      config: { policies: SETTINGS_POLICIES },
    },
    {
      method: "GET",
      path: "/templates",
      handler: "admin.listTemplates",
      config: { policies: READ_POLICIES },
    },
    {
      method: "POST",
      path: "/templates",
      handler: "admin.createTemplate",
      config: { policies: ISSUE_POLICIES },
    },
    {
      method: "POST",
      path: "/templates/seed",
      handler: "admin.seedTemplates",
      config: { policies: ISSUE_POLICIES },
    },
    {
      method: "GET",
      path: "/certificates",
      handler: "admin.listCertificates",
      config: { policies: READ_POLICIES },
    },
    {
      method: "POST",
      path: "/certificates/issue",
      handler: "admin.issueCertificate",
      config: { policies: ISSUE_POLICIES },
    },
    {
      method: "POST",
      path: "/certificates/:documentId/send-docusign",
      handler: "admin.sendDocuSignEnvelope",
      config: { policies: ISSUE_POLICIES },
    },
    {
      method: "PUT",
      path: "/certificates/:documentId/approve",
      handler: "admin.approveCertificate",
      config: { policies: ISSUE_POLICIES },
    },
    {
      method: "PUT",
      path: "/certificates/:documentId/revoke",
      handler: "admin.revokeCertificate",
      config: { policies: ISSUE_POLICIES },
    },
    {
      method: "GET",
      path: "/certificates/:documentId/print",
      handler: "admin.printCertificate",
      config: { policies: READ_POLICIES },
    },
    {
      method: "GET",
      path: "/certificates/export/csv",
      handler: "admin.exportCsv",
      config: { policies: READ_POLICIES },
    },
  ],
};
