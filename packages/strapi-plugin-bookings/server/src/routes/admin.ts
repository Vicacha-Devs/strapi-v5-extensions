export default [
  {
    method: 'GET',
    path: '/settings',
    handler: 'admin.getSettings',
    config: {
      policies: [],
    },
  },
  {
    method: 'PUT',
    path: '/settings',
    handler: 'admin.updateSettings',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/schemas',
    handler: 'admin.discoverSchemas',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/resources',
    handler: 'admin.listResources',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/resources',
    handler: 'admin.saveResource',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/calendar',
    handler: 'admin.getCalendar',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/bookings',
    handler: 'admin.createBooking',
    config: {
      policies: [],
    },
  },
  {
    method: 'PUT',
    path: '/bookings/:documentId/status',
    handler: 'admin.updateBookingStatus',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/bookings/reschedule',
    handler: 'admin.rescheduleBooking',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/export.csv',
    handler: 'admin.exportCsv',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/export.ics',
    handler: 'admin.exportICal',
    config: {
      policies: [],
    },
  },
];
