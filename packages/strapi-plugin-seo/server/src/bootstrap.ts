import type { Core } from '@strapi/strapi';

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  const actions = [
    {
      section: 'plugins',
      displayName: 'Access the plugin settings',
      uid: 'read',
      pluginName: 'seo',
    },
  ];
  await strapi.admin.services.permission.actionProvider.registerMany(actions);
};

export default bootstrap;
