import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.debug(
    "[@vicacha-devs/strapi-plugin-islam] Registered Islam Liturgical, Scriptural & Fiqh Suite"
  );
};
