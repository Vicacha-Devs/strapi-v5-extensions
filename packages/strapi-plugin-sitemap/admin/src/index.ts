import { createRegisterTrads } from "@vicacha-devs/plugin-shared";

import { PLUGIN_ID } from "./pluginId";
import getTrad from "./utils/getTrad";

interface StrapiAdminApp {
  createSettingSection: (
    section: Record<string, unknown>,
    links: Array<Record<string, unknown>>
  ) => void;
  registerPlugin: (plugin: Record<string, unknown>) => void;
}

const SUPPORTED_LOCALES = ["en", "es", "ar", "tr", "fr", "pt-BR"] as const;

export default {
  register(app: StrapiAdminApp) {
    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: getTrad("plugin.name"),
          defaultMessage: "Sitemap",
        },
      },
      [
        {
          intlLabel: {
            id: getTrad("plugin.section.item"),
            defaultMessage: "Configuration",
          },
          id: `${PLUGIN_ID}.configuration`,
          to: PLUGIN_ID,
          Component: () => import("./pages/Settings"),
          permissions: [],
        },
      ]
    );

    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
    });
  },

  registerTrads: createRegisterTrads({
    pluginId: PLUGIN_ID,
    defaultLocales: [],
    supportedLocales: SUPPORTED_LOCALES,
    keepUnprefixed: false,
    loadTranslation: (locale) => import(`./translations/${locale}.json`),
  }),
};
