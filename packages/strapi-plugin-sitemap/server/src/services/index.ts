import sitemap from "./service";
import settings from "./settings";

const services: {
  service: typeof sitemap.service;
  settings: typeof settings.settings;
} = {
  ...sitemap,
  ...settings,
};

export default services;
