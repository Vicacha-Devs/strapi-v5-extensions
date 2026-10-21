import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../shared';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.debug(`[${PLUGIN_ID}] Registering official certificates plugin`);
};
