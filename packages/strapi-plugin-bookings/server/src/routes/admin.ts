const READ_POLICIES = [
  "admin::isAuthenticatedAdmin",
  {
    name: "admin::hasPermissions",
    config: { actions: ["plugin::bookings.read"] },
  },
];

const MANAGE_POLICIES = [
  "admin::isAuthenticatedAdmin",
  {
    name: "admin::hasPermissions",
    config: { actions: ["plugin::bookings.manage"] },
  },
];

const SETTINGS_POLICIES = [
  "admin::isAuthenticatedAdmin",
  {
    name: "admin::hasPermissions",
    config: { actions: ["plugin::bookings.settings"] },
  },
];

export default [
  {
    method: "GET",
    path: "/settings",
    handler: "admin.getSettings",
    config: {
      policies: SETTINGS_POLICIES,
    },
  },
  {
    method: "PUT",
    path: "/settings",
    handler: "admin.updateSettings",
    config: {
      policies: SETTINGS_POLICIES,
    },
  },
  {
    method: "GET",
    path: "/schemas",
    handler: "admin.discoverSchemas",
    config: {
      policies: SETTINGS_POLICIES,
    },
  },
  {
    method: "GET",
    path: "/resources",
    handler: "admin.listResources",
    config: {
      policies: READ_POLICIES,
    },
  },
  {
    method: "POST",
    path: "/resources",
    handler: "admin.saveResource",
    config: {
      policies: MANAGE_POLICIES,
    },
  },
  {
    method: "GET",
    path: "/calendar",
    handler: "admin.getCalendar",
    config: {
      policies: READ_POLICIES,
    },
  },
  {
    method: "POST",
    path: "/bookings",
    handler: "admin.createBooking",
    config: {
      policies: MANAGE_POLICIES,
    },
  },
  {
    method: "PUT",
    path: "/bookings/:documentId/status",
    handler: "admin.updateBookingStatus",
    config: {
      policies: MANAGE_POLICIES,
    },
  },
  {
    method: "POST",
    path: "/bookings/reschedule",
    handler: "admin.rescheduleBooking",
    config: {
      policies: MANAGE_POLICIES,
    },
  },
  {
    method: "GET",
    path: "/export.csv",
    handler: "admin.exportCsv",
    config: {
      policies: READ_POLICIES,
    },
  },
  {
    method: "GET",
    path: "/export.ics",
    handler: "admin.exportICal",
    config: {
      policies: READ_POLICIES,
    },
  },
];
