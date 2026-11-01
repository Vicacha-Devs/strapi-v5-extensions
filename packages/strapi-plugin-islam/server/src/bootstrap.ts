import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../shared";

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  try {
    const actions = [
      {
        section: "plugins",
        displayName: "Access Islam Cockpit & Salah/Hilal/Scripture Suite",
        uid: "read",
        pluginName: PLUGIN_ID,
      },
      {
        section: "plugins",
        displayName: "Manage Islam Settings, Hilal Moon-Sighting & Nisab Rates",
        uid: "settings.update",
        pluginName: PLUGIN_ID,
      },
    ];
    await strapi.admin?.services?.permission?.actionProvider?.registerMany(
      actions
    );
  } catch {
    // Non-fatal in test environments
  }
};
