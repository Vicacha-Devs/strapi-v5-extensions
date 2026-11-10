import bootstrap from "./bootstrap";
import contentTypes from "./content-types";
import controllers from "./controllers";
import routes from "./routes";
import services from "./services";

const register = () => {};
const destroy = () => {};
const config = {
  default: {
    hostname: "",
    includeHreflang: true,
  },
  validator(pluginConfig: unknown) {
    if (
      pluginConfig === null ||
      typeof pluginConfig !== "object" ||
      Array.isArray(pluginConfig)
    ) {
      throw new Error("Sitemap plugin config must be an object");
    }
    const cfg = pluginConfig as Record<string, unknown>;
    if (cfg.hostname !== undefined && typeof cfg.hostname !== "string") {
      throw new Error("Sitemap plugin config.hostname must be a string");
    }
    if (
      cfg.includeHreflang !== undefined &&
      typeof cfg.includeHreflang !== "boolean"
    ) {
      throw new Error(
        "Sitemap plugin config.includeHreflang must be a boolean"
      );
    }
  },
};

const plugin: {
  register: typeof register;
  bootstrap: typeof bootstrap;
  destroy: typeof destroy;
  config: typeof config;
  controllers: typeof controllers;
  routes: typeof routes;
  services: typeof services;
  contentTypes: typeof contentTypes;
  policies: Record<string, unknown>;
  middlewares: Record<string, unknown>;
} = {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  routes,
  services,
  contentTypes,
  policies: {},
  middlewares: {},
};

export default plugin;
