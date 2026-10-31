import { PLUGIN_ID } from '../utils/constants';

const withPermission = (action: string) => ({
  policies: [
    {
      name: 'admin::hasPermissions',
      config: { actions: [`plugin::${PLUGIN_ID}.${action}`] },
    },
  ],
});

export default {
  admin: {
    type: 'admin',
    routes: [
      {
        method: 'GET',
        path: '/search',
        handler: 'search.find',
        config: withPermission('read'),
      },
      {
        method: 'GET',
        path: '/schema',
        handler: 'schema.find',
        config: withPermission('read'),
      },
      {
        method: 'GET',
        path: '/schema/all',
        handler: 'schema.findAll',
        config: withPermission('settings'),
      },
      {
        method: 'GET',
        path: '/settings',
        handler: 'settings.find',
        config: withPermission('settings'),
      },
      {
        method: 'PUT',
        path: '/settings',
        handler: 'settings.update',
        config: withPermission('settings'),
      },
      {
        method: 'POST',
        path: '/settings/reset',
        handler: 'settings.reset',
        config: withPermission('settings'),
      },
    ],
  },
};
