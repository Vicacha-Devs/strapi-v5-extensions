import bootstrap from "./bootstrap";
import contentTypes from "./content-types";
import controllers from "./controllers";
import routes from "./routes";
import services from "./services";

const register = () => {};
const destroy = () => {};
const config = {
  default: {},
  validator() {},
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
