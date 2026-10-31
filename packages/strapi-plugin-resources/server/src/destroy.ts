import type { Core } from "@strapi/strapi";

const destroy = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[strapi-plugin-resources] Destroying plugin");
};

export default destroy;
