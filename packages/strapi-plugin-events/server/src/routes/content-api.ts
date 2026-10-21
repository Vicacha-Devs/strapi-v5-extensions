export default {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/occurrences',
      handler: 'content-api.listOccurrences',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/spotlights',
      handler: 'content-api.listSpotlights',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/feed.ics',
      handler: 'content-api.downloadFeedIcs',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/:documentId/invite.ics',
      handler: 'content-api.downloadEventInviteIcs',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/:documentId/stats',
      handler: 'content-api.getEventStats',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/:documentId/register',
      handler: 'content-api.registerAttendee',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/registrations/:token/cancel',
      handler: 'content-api.cancelRegistration',
      config: {
        auth: false,
      },
    },
  ],
};
