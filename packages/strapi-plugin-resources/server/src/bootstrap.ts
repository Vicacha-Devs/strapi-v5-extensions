import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../shared';

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  try {
    const actions = [
      {
        section: 'plugins',
        displayName: 'Read resources & media catalogs',
        uid: 'read',
        pluginName: PLUGIN_ID,
      },
      {
        section: 'plugins',
        displayName: 'Manage publications, galleries & glossary',
        uid: 'manage',
        pluginName: PLUGIN_ID,
      },
      {
        section: 'plugins',
        displayName: 'Configure resources settings',
        uid: 'settings',
        pluginName: PLUGIN_ID,
      },
    ];

    await strapi.admin?.services?.permission?.actionProvider?.registerMany(
      actions
    );

    const catalogService = strapi
      .plugin(PLUGIN_ID)
      .service('catalogService') as {
      seedDefaultResources: () => Promise<void>;
    };
    await catalogService.seedDefaultResources();
  } catch (err) {
    strapi.log.warn(
      `[strapi-plugin-resources] Bootstrap warning: ${(err as Error).message}`
    );
  }
};

export default bootstrap;
