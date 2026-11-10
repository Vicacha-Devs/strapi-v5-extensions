import type { Core } from "@strapi/strapi";

import { cleanupEventHubListeners } from "./eventHubRegistry";

const destroy = ({ strapi }: { strapi: Core.Strapi }) => {
  cleanupEventHubListeners(strapi);
  strapi.log.debug("[@vicacha-devs/strapi-plugin-broadcasts] Destroyed");
};

export default destroy;
