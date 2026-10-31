export default {
  type: "content-api",
  routes: [
    {
      method: "GET",
      path: "/campaigns",
      handler: "content-api.listCampaigns",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/invoices",
      handler: "content-api.listUtilityInvoices",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/utility-invoices",
      handler: "content-api.listUtilityInvoices",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/campaigns/:slug",
      handler: "content-api.getCampaignBySlug",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/calculator",
      handler: "content-api.getCalculatorAndDirectory",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/calculate",
      handler: "content-api.calculateAssessment",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/pledges",
      handler: "content-api.submitPledge",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/webhook",
      handler: "content-api.handleWebhook",
      config: { auth: false },
    },
  ],
};
