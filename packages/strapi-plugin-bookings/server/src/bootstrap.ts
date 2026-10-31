import type { Core } from "@strapi/strapi";

import { registerCalendarSystemFormatter } from "../../shared/calendarSystems";
import { PLUGIN_ID } from "../../shared/pluginId";
import type { BookingsPluginConfig } from "./types";

const BOOKING_CALENDAR_SOURCE = {
  id: "bookings",
  label: "Bookings & Reservations",
  uid: "plugin::bookings.booking",
  color: "#0D9488",
  enabled: true,
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

async function registerCalendarCompanion(strapi: Core.Strapi): Promise<void> {
  const calendarPlugin = strapi.plugin("calendar") as
    | {
        service?: (name: string) => {
          registerSource?: (source: Record<string, unknown>) => Promise<unknown> | unknown;
          registerCompanionSource?: (source: Record<string, unknown>) => void;
        };
      }
    | undefined;

  try {
    const calendarRegistry = calendarPlugin?.service?.("registry");
    if (typeof calendarRegistry?.registerSource === "function") {
      await calendarRegistry.registerSource(BOOKING_CALENDAR_SOURCE);
    }

    const calendarSettingsSvc = calendarPlugin?.service?.("settings");
    if (typeof calendarSettingsSvc?.registerCompanionSource === "function") {
      calendarSettingsSvc.registerCompanionSource(BOOKING_CALENDAR_SOURCE);
    }
  } catch {
    // Ignore if calendar registry store is unavailable during isolated unit tests
  }
}

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  const pluginConfig = (strapi.config.get(`plugin::${PLUGIN_ID}`) ?? {}) as BookingsPluginConfig;

  if (pluginConfig.calendarSystems) {
    for (const [systemId, formatter] of Object.entries(pluginConfig.calendarSystems)) {
      if (typeof formatter === "function") {
        registerCalendarSystemFormatter(systemId, formatter);
      }
    }
  }

  const actions = [
    {
      section: "plugins",
      displayName: "Access the Bookings & Availability Workspace",
      uid: "read",
      pluginName: PLUGIN_ID,
    },
    {
      section: "plugins",
      displayName: "Manage Bookings, Resources & Approvals",
      uid: "manage",
      pluginName: PLUGIN_ID,
    },
    {
      section: "plugins",
      displayName: "Configure Bookings Settings",
      uid: "settings",
      pluginName: PLUGIN_ID,
    },
  ];

  const actionProvider = (
    strapi.admin?.services?.permission as
      | { actionProvider?: { registerMany?: (items: unknown[]) => Promise<void> } }
      | undefined
  )?.actionProvider;

  if (actionProvider?.registerMany) {
    await actionProvider.registerMany(actions);
  }

  await registerCalendarCompanion(strapi);
};
