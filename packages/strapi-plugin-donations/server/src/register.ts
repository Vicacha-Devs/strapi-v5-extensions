import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.debug('[vicacha:donations] Registered generic donations, campaigns & utility bills plugin.');
};
