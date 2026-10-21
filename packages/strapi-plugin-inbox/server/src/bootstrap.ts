import type { Core } from '@strapi/strapi';
import { PLUGIN_ID, type InboxSettings } from '../../shared';

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  const settingsService = strapi.plugin(PLUGIN_ID).service<{
    getSettings(): Promise<InboxSettings>;
  }>('settings');
  await settingsService.getSettings();

  if (strapi.admin?.services?.permission?.actionProvider?.registerMany) {
    await strapi.admin.services.permission.actionProvider.registerMany([
      {
        section: 'plugins',
        displayName: 'Manage Forms & Builder',
        uid: 'forms.manage',
        pluginName: PLUGIN_ID,
      },
      {
        section: 'plugins',
        displayName: 'Manage Submissions & Casework',
        uid: 'submissions.manage',
        pluginName: PLUGIN_ID,
      },
      {
        section: 'plugins',
        displayName: 'Manage Subscribers & Alert Banners',
        uid: 'subscribers.manage',
        pluginName: PLUGIN_ID,
      },
      {
        section: 'plugins',
        displayName: 'Manage Inbox Settings',
        uid: 'settings.manage',
        pluginName: PLUGIN_ID,
      },
    ]);
  }
};

export default bootstrap;
