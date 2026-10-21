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
      method: 'POST',
      path: '/settings/rotate-keys',
      handler: 'admin.rotateKeys',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/templates',
      handler: 'admin.listTemplates',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/templates',
      handler: 'admin.createTemplate',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/templates/seed',
      handler: 'admin.seedTemplates',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/certificates',
      handler: 'admin.listCertificates',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/certificates/issue',
      handler: 'admin.issueCertificate',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/certificates/:documentId/send-docusign',
      handler: 'admin.sendDocuSignEnvelope',
      config: { policies: [] },
    },
    {
      method: 'PUT',
      path: '/certificates/:documentId/approve',
      handler: 'admin.approveCertificate',
      config: { policies: [] },
    },
    {
      method: 'PUT',
      path: '/certificates/:documentId/revoke',
      handler: 'admin.revokeCertificate',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/certificates/:documentId/print',
      handler: 'admin.printCertificate',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/certificates/export/csv',
      handler: 'admin.exportCsv',
      config: { policies: [] },
    },
  ],
};
