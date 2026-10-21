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
      path: '/pledges/:referenceCode/verify',
      handler: 'admin.verifyPledge',
      config: { policies: [] },
    },
  ],
};
