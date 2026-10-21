export default {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/forms',
      handler: 'inboxController.listForms',
      config: {
        policies: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/forms/:slug',
      handler: 'inboxController.getFormBySlug',
      config: {
        policies: [],
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/forms/:slug/submit',
      handler: 'inboxController.submitForm',
      config: {
        policies: [],
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/subscribers',
      handler: 'inboxController.subscribe',
      config: {
        policies: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/subscribers/confirm/:token',
      handler: 'inboxController.confirmSubscription',
      config: {
        policies: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/subscribers/unsubscribe/:token',
      handler: 'inboxController.unsubscribe',
      config: {
        policies: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/alerts',
      handler: 'inboxController.getActiveAlerts',
      config: {
        policies: [],
        auth: false,
      },
    },
  ],
};
