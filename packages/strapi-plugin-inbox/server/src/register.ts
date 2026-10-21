import type { Core } from '@strapi/strapi';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.debug('[@vicacha-devs/strapi-plugin-inbox] Registered inbox & form builder plugin');
};

export default register;
