import catalogService from "./catalogService";
import mediaLibraryService from "./mediaLibraryService";
import settings from "./settings";

const services: Record<string, unknown> = {
  settings,
  mediaLibraryService,
  catalogService,
};

export default services;
