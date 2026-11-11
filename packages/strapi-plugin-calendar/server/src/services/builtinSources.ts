import type { CalendarSourceMapping } from "../../../shared/types";

export const BUILTIN_EVENTS_SOURCE: CalendarSourceMapping = {
  id: "events",
  label: "Events",
  uid: "plugin::events.event",
  color: "#4945FF",
  enabled: true,
  publicFeed: true,
  fields: {
    title: "title",
    startDate: "startDate",
    endDate: "endDate",
    rrule: "recurrence",
    location: "location",
    category: "category",
    status: "eventStatus",
    summary: "summary",
    slug: "slug",
    color: "color",
  },
};

export const BUILTIN_BOOKINGS_SOURCE: CalendarSourceMapping = {
  id: "bookings",
  label: "Bookings & Reservations",
  uid: "plugin::bookings.booking",
  color: "#0D9488",
  enabled: true,
  publicFeed: false,
  fields: {
    title: "title",
    startDate: "startDate",
    endDate: "endDate",
    status: "status",
    location: "assignedHost",
    summary: "notes",
    category: "status",
  },
};
