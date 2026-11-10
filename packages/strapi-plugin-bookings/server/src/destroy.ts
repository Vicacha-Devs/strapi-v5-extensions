import type { Core } from "@strapi/strapi";

import { cleanupBootstrapState } from "./bootstrap";
import { clearResourceLocks } from "./errors";
import { clearRuntimeSettingsState } from "./services/settings";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  clearRuntimeSettingsState(strapi);
  clearResourceLocks(strapi);
  cleanupBootstrapState(strapi);
};
