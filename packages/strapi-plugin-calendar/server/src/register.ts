import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../shared/pluginId";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.customFields.register({
    name: "rrule",
    plugin: PLUGIN_ID,
    type: "json",
    inputSize: {
      default: 12,
      isResizable: true,
    },
  });
};
