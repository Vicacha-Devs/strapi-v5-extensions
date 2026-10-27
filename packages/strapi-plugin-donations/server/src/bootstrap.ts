import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../shared';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  const settingsService = strapi.plugin(PLUGIN_ID).service('settings') as any;
  const settings = await settingsService.getSettings();

  if (settings?.richTextCustomField) {
    const uid = `plugin::${PLUGIN_ID}.campaign`;
    const ct = (strapi.contentTypes as Record<string, any> | undefined)?.[uid];
    if (ct) {
      for (const field of ['body']) {
        if (ct.attributes?.[field]) {
          ct.attributes[field].customField = settings.richTextCustomField;
        }
        if (ct.__schema__?.attributes?.[field]) {
          ct.__schema__.attributes[field].customField = settings.richTextCustomField;
        }
      }
    }
  }
};

