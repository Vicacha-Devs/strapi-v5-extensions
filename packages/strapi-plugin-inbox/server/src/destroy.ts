import type { Core } from "@strapi/strapi";

import { clearSubscribedStrapiInstance } from "./bootstrap";

const destroy = ({ strapi }: { strapi: Core.Strapi }) => {
  clearSubscribedStrapiInstance(strapi);
  strapi.log.debug("[@vicacha-devs/strapi-plugin-inbox] Destroyed");
};

export default destroy;
