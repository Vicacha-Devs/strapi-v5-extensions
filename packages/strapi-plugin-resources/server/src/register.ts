import type { Core } from '@strapi/strapi';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info('[strapi-plugin-resources] Registering Media Library & Digital Catalog plugin');
};

export default register;
