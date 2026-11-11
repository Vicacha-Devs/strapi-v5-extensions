import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../shared";

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  const actionProvider = strapi.admin?.services?.permission?.actionProvider;
  if (actionProvider && typeof actionProvider.registerMany === "function") {
    await actionProvider.registerMany([
      {
        section: "plugins",
        displayName: "Read notes",
        uid: "read",
        pluginName: PLUGIN_ID,
      },
      {
        section: "plugins",
        displayName: "Create & edit notes",
        uid: "update",
        pluginName: PLUGIN_ID,
      },
      {
        section: "plugins",
        displayName: "Delete notes",
        uid: "delete",
        pluginName: PLUGIN_ID,
      },
    ]);
  }
};
