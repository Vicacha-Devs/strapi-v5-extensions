import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../shared';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  const settingsService = strapi.plugin(PLUGIN_ID).service('settings') as any;
  await settingsService.getSettings();
};
