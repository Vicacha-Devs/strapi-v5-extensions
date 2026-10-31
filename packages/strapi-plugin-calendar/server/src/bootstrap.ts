import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../shared/pluginId";
import { getCalendarService } from "./types";

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  const actions = [
    {
      section: "plugins",
      displayName: "Read Calendar & Occurrences",
      uid: "read",
      pluginName: PLUGIN_ID,
    },
    {
      section: "plugins",
      displayName: "Create & Reschedule Calendar Entries",
      uid: "update",
      pluginName: PLUGIN_ID,
    },
    {
      section: "plugins",
      displayName: "Manage Calendar Settings",
      uid: "settings.update",
      pluginName: PLUGIN_ID,
    },
  ];

  const actionProvider = strapi.admin?.services?.permission?.actionProvider;
  if (actionProvider && typeof actionProvider.registerMany === "function") {
    await actionProvider.registerMany(actions);
  }

  const settingsService = getCalendarService(strapi, PLUGIN_ID, "settings");
  if (settingsService && typeof settingsService.ensureInitialized === "function") {
    await settingsService.ensureInitialized();
  }
};
