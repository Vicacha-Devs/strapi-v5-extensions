import type { Core } from "@strapi/strapi";

import { clearOccurrenceLocks } from "./services/rsvpSecurity";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  clearOccurrenceLocks(strapi);
};
