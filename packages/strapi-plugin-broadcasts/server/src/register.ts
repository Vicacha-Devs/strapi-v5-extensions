import type { Core } from '@strapi/strapi';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.debug(
    '[@vicacha-devs/strapi-plugin-broadcasts] Registered omnichannel broadcasts plugin'
  );
};

export default register;
