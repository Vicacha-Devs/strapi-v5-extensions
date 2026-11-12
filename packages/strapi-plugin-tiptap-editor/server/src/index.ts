/**
 * Application methods
 */
import bootstrap from "./bootstrap";
/**
 * Plugin server methods
 */
import config from "./config";
import contentTypes from "./content-types";
import controllers from "./controllers";
import destroy from "./destroy";
import middlewares from "./middlewares";
import policies from "./policies";
import register from "./register";
import routes from "./routes";
import services from "./services";

// Explicit annotation: the inferred type references @strapi/types internals
// that declaration emit cannot name portably (TS2742).
const plugin: Record<string, unknown> = {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  routes,
  services,
  contentTypes,
  policies,
  middlewares,
};

export default plugin;

// Re-export shared types for host app developer access via the ./strapi-server entry point
export type {
  TiptapPresetConfig,
  TiptapPluginConfig,
  TiptapThemeConfig,
  ThemeColorEntry,
} from "../../shared/src/types";
export {
  PRESET_FEATURE_KEYS,
  MINIMAL_PRESET_CONFIG,
  isFeatureEnabled,
  getFeatureOptions,
} from "../../shared/src/types";
