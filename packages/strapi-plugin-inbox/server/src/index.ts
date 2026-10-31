import bootstrap from "./bootstrap";
import config from "./config";
import contentTypes from "./content-types";
import controllers from "./controllers";
import destroy from "./destroy";
import register from "./register";
import routes from "./routes";
import services from "./services";

const serverEntry: Record<string, unknown> = {
  register,
  bootstrap,
  destroy,
  config,
  contentTypes,
  controllers,
  routes,
  services,
};

export default serverEntry;
