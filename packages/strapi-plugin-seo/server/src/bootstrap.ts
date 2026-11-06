import type { Core } from "@strapi/strapi";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  const actions = [
    {
      section: "plugins",
      displayName: "Access the SEO plugin",
      uid: "read",
      pluginName: "seo",
    },
    {
      section: "plugins",
      displayName: "Manage SEO plugin settings",
      uid: "settings.update",
      pluginName: "seo",
    },
  ];
  await strapi.admin.services.permission.actionProvider.registerMany(actions);
};

export default bootstrap;
