const withPerm = (action: string) => [
  "admin::isAuthenticatedAdmin",
  {
    name: "admin::hasPermissions",
    config: { actions: [`plugin::inbox.${action}`] },
  },
];

const FORMS_POLICIES = withPerm("forms.manage");
const SUBMISSIONS_POLICIES = withPerm("submissions.manage");
const SUBSCRIBERS_POLICIES = withPerm("subscribers.manage");
const SETTINGS_POLICIES = withPerm("settings.manage");

export default {
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/settings",
      handler: "inboxController.getSettings",
      config: { policies: SETTINGS_POLICIES },
    },
    {
      method: "PUT",
      path: "/settings",
      handler: "inboxController.updateSettings",
      config: { policies: SETTINGS_POLICIES },
    },
    {
      method: "GET",
      path: "/templates",
      handler: "inboxController.listTemplates",
      config: { policies: FORMS_POLICIES },
    },
    {
      method: "GET",
      path: "/form-builder-forms",
      handler: "inboxController.listFormBuilderForms",
      config: { policies: FORMS_POLICIES },
    },
    {
      method: "POST",
      path: "/forms/sync-builder",
      handler: "inboxController.syncFormBuilder",
      config: { policies: FORMS_POLICIES },
    },
    {
      method: "GET",
      path: "/forms",
      handler: "inboxController.listForms",
      config: { policies: FORMS_POLICIES },
    },
    {
      method: "POST",
      path: "/forms",
      handler: "inboxController.saveForm",
      config: { policies: FORMS_POLICIES },
    },
    {
      method: "POST",
      path: "/forms/from-template",
      handler: "inboxController.createFromTemplate",
      config: { policies: FORMS_POLICIES },
    },
    {
      method: "GET",
      path: "/submissions",
      handler: "inboxController.listSubmissions",
      config: { policies: SUBMISSIONS_POLICIES },
    },
    {
      method: "PUT",
      path: "/submissions/:documentId/casework",
      handler: "inboxController.updateCasework",
      config: { policies: SUBMISSIONS_POLICIES },
    },
    {
      method: "POST",
      path: "/submissions/:documentId/schedule-booking",
      handler: "inboxController.scheduleBooking",
      config: { policies: SUBMISSIONS_POLICIES },
    },
    {
      method: "POST",
      path: "/submissions/:documentId/issue-certificate",
      handler: "inboxController.issueCertificate",
      config: { policies: SUBMISSIONS_POLICIES },
    },
    {
      method: "GET",
      path: "/submissions/export-csv",
      handler: "inboxController.exportCsv",
      config: { policies: SUBMISSIONS_POLICIES },
    },
    {
      method: "POST",
      path: "/captcha/test",
      handler: "inboxController.testCaptcha",
      config: { policies: SETTINGS_POLICIES },
    },
    {
      method: "GET",
      path: "/subscribers",
      handler: "inboxController.listSubscribers",
      config: { policies: SUBSCRIBERS_POLICIES },
    },
    {
      method: "GET",
      path: "/alerts",
      handler: "inboxController.getActiveAlerts",
      config: { policies: SUBSCRIBERS_POLICIES },
    },
    {
      method: "POST",
      path: "/alerts",
      handler: "inboxController.upsertAlertBanner",
      config: { policies: SUBSCRIBERS_POLICIES },
    },
  ],
};
