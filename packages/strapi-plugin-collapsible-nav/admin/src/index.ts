import { createRegisterTrads } from "@vicacha-devs/plugin-shared";

import pluginId from "./pluginId";
import ar from "./translations/ar.json";
import en from "./translations/en.json";
import es from "./translations/es.json";
import fr from "./translations/fr.json";
import tr from "./translations/tr.json";
import { initCollapsibleNav } from "./utils/navDomController";

const BUILTIN_TRANSLATIONS: Record<string, Record<string, string>> = {
  en,
  es,
  fr,
  ar,
  tr,
};

interface StrapiApp {
  registerPlugin: (plugin: Record<string, unknown>) => void;
}

let cleanupNav: (() => void) | null = null;

export default {
  register(app: StrapiApp) {
    app.registerPlugin({
      id: pluginId,
      name: pluginId,
    });
  },

  bootstrap() {
    if (cleanupNav) return;
    cleanupNav = initCollapsibleNav(BUILTIN_TRANSLATIONS);
  },

  registerTrads: createRegisterTrads({
    pluginId,
    defaultLocales: [],
    keepUnprefixed: false,
    translations: BUILTIN_TRANSLATIONS,
  }),
};
