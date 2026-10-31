import type { Core } from "@strapi/strapi";

import {
  registerCalendarSystemFormatter,
  unregisterCalendarSystemFormatter,
} from "../../../shared/calendarSystems";
import type {
  CalendarSourceMapping,
  CalendarSystemConfig,
  CalendarSystemFormatterFn,
} from "../../../shared/types";

/**
 * Runtime registry allowing companion plugins (e.g. `@vicacha-devs/strapi-plugin-events`
 * or `@vicacha-devs/strapi-plugin-bookings`) or host applications to programmatically
 * register collection sources and secondary calendar systems.
 */
export default ({ strapi: _strapi }: { strapi: Core.Strapi }) => {
  const registeredSources = new Map<string, CalendarSourceMapping>();
  const registeredCalendars = new Map<string, CalendarSystemConfig>();

  return {
    registerSource(source: CalendarSourceMapping): void {
      if (!source || !source.id || !source.uid) {
        throw new Error("Calendar source registration requires id and uid.");
      }
      registeredSources.set(source.id, source);
    },

    unregisterSource(sourceId: string): void {
      registeredSources.delete(sourceId);
    },

    getRegisteredSources(): CalendarSourceMapping[] {
      return Array.from(registeredSources.values());
    },

    registerSecondaryCalendar(calendar: CalendarSystemConfig): void {
      if (!calendar || !calendar.id || !calendar.intlCalendar) {
        throw new Error("Secondary calendar registration requires id and intlCalendar.");
      }
      registeredCalendars.set(calendar.id, calendar);
    },

    getRegisteredSecondaryCalendars(): CalendarSystemConfig[] {
      return Array.from(registeredCalendars.values());
    },

    registerCalendarFormatter(calendarId: string, formatter: CalendarSystemFormatterFn): void {
      registerCalendarSystemFormatter(calendarId, formatter);
    },

    unregisterCalendarFormatter(calendarId: string): void {
      unregisterCalendarSystemFormatter(calendarId);
    },
  };
};
