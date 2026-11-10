import type { StrapiLike } from "./types";
import { PLUGIN_ID } from "./utils/constants";

const RBAC_ACTIONS = [
  {
    section: "plugins",
    displayName: "Search content",
    uid: "read",
    pluginName: PLUGIN_ID,
  },
  {
    section: "settings",
    category: "global search",
    subCategory: "general",
    displayName: "Configure global search",
    uid: "settings",
    pluginName: PLUGIN_ID,
  },
];

export default ({ strapi }: { strapi: StrapiLike }) => {
  strapi.admin?.services?.permission?.actionProvider?.registerMany(
    RBAC_ACTIONS
  );
};
