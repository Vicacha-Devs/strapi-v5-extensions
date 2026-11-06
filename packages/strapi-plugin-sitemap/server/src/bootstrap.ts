import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "./pluginId";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  const actions = [
    {
      section: "plugins",
      displayName: "Access the plugin settings",
      uid: "settings.read",
      pluginName: PLUGIN_ID,
    },
    {
      section: "plugins",
      displayName: "Update the plugin settings",
      uid: "settings.update",
      pluginName: PLUGIN_ID,
    },
    {
      section: "plugins",
      displayName: "Menu link to plugin settings",
      uid: "menu-link",
      pluginName: PLUGIN_ID,
    },
  ];
  await strapi.admin.services.permission.actionProvider.registerMany(actions);
};

export default bootstrap;
