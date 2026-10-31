export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/settings',
      handler: 'broadcastController.getSettings',
      config: { policies: [] },
    },
    {
      method: 'PUT',
      path: '/settings',
      handler: 'broadcastController.updateSettings',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/templates',
      handler: 'broadcastController.listStarterTemplates',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/email-templates',
      handler: 'broadcastController.listEmailTemplates',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/campaigns',
      handler: 'broadcastController.listCampaigns',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/campaigns',
      handler: 'broadcastController.createCampaign',
      config: { policies: [] },
    },
    {
      method: 'PUT',
      path: '/campaigns/:documentId',
      handler: 'broadcastController.updateCampaign',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/campaigns/from-template',
      handler: 'broadcastController.createFromTemplate',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/campaigns/:documentId/send',
      handler: 'broadcastController.sendCampaign',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/automation-rules',
      handler: 'broadcastController.listAutomationRules',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/automation-rules',
      handler: 'broadcastController.createAutomationRule',
      config: { policies: [] },
    },
    {
      method: 'PUT',
      path: '/automation-rules/:documentId',
      handler: 'broadcastController.updateAutomationRule',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/delivery-logs',
      handler: 'broadcastController.listDeliveryLogs',
      config: { policies: [] },
    },
  ],
};
