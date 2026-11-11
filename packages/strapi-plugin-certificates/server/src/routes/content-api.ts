export default {
  type: "content-api",
  routes: [
    {
      method: "GET",
      path: "/templates",
      handler: "content-api.listPublicTemplates",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/public-key",
      handler: "content-api.getPublicKey",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/apply",
      handler: "content-api.applyCertificate",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/verify/:serial",
      handler: "content-api.verifyBySerial",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/verify/:serial/print",
      handler: "content-api.downloadPrintableHtml",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/webhooks/docusign",
      handler: "content-api.docusignWebhook",
      config: { auth: false },
    },
  ],
};
