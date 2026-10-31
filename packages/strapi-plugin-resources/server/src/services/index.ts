import settings from './settings';
import mediaLibraryService from './mediaLibraryService';
import catalogService from './catalogService';

const services: Record<string, unknown> = {
  settings,
  mediaLibraryService,
  catalogService,
};

export default services;
