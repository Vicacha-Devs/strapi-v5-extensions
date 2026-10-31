import type { BookingsPluginConfig } from "../types";

const defaultConfig: BookingsPluginConfig = {
  defaultTimezone: "America/Bogota",
  defaultLocale: "es",
  theme: "breeze",
  secondaryCalendarLanguage: "local",
  defaultSlotDurationMinutes: 60,
  defaultBufferBeforeMinutes: 0,
  defaultBufferAfterMinutes: 0,
  defaultCapacityPerSlot: 1,
  defaultMinLeadTimeHours: 2,
  defaultMaxAdvanceDays: 90,
  defaultRequiresApproval: false,
  sendEmailNotifications: true,
  secondaryCalendars: [],
  sources: [],
  calendarSystems: {},
  schemaExtensions: {},
  customFields: [],
};

export default {
  default: defaultConfig,
  validator(config: unknown) {
    if (config && typeof config !== "object") {
      throw new Error("@vicacha-devs/strapi-plugin-bookings config must be an object");
    }
  },
};
