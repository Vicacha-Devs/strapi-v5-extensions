export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/settings',
      handler: 'admin.getSettings',
      config: { policies: [] },
    },
    {
      method: 'PUT',
      path: '/settings',
      handler: 'admin.updateSettings',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/overview',
      handler: 'admin.getOverview',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/campaigns',
      handler: 'admin.createCampaign',
      config: { policies: [] },
    },
    {
      method: 'PUT',
      path: '/campaigns/:identifier',
      handler: 'admin.updateCampaign',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/campaigns/:identifier/evidences',
      handler: 'admin.addEvidence',
      config: { policies: [] },
    },
    {
      method: 'DELETE',
      path: '/campaigns/:identifier/evidences/:evidenceId',
      handler: 'admin.removeEvidence',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/pledges/:referenceCode/verify',
      handler: 'admin.verifyPledge',
      config: { policies: [] },
    },
  ],
};

