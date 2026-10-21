import type { Core } from '@strapi/strapi';

const destroy = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.debug('[@vicacha-devs/strapi-plugin-broadcasts] Destroyed');
};

export default destroy;
