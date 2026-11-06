import { createRegisterTrads } from "@vicacha-devs/plugin-shared";

import { PLUGIN_ID } from "../../shared";
import { PluginIcon } from "./components/PluginIcon";
import { CM_LABEL_TRANSLATIONS } from "./translations/cmLabels";
import { CM_PLACEHOLDER_TRANSLATIONS } from "./translations/cmPlaceholders";

interface StrapiAdminApp {
  addMenuLink(config: {
    to: string;
    icon: unknown;
    intlLabel: { id: string; defaultMessage: string };
    Component: () => Promise<{ default: unknown }>;
    permissions: unknown[];
  }): void;
  createSettingSection(
    section: { id: string; intlLabel: { id: string; defaultMessage: string } },
    links: Array<{
      intlLabel: { id: string; defaultMessage: string };
      id: string;
      to: string;
      Component: () => Promise<{ default: unknown }>;
      permissions: unknown[];
    }>
  ): void;
  registerPlugin(plugin: { id: string; name: string }): void;
}

export default {
  register(app: StrapiAdminApp) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Islam Suite (Salah, Hilal & Scripture)",
      },
      Component: () =>
        import("./pages/IslamPage").then((mod) => ({
          default: mod.IslamPage,
        })),
      permissions: [],
    });

    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: `${PLUGIN_ID}.settings.section`,
          defaultMessage: "Islam Liturgical & Fiqh Suite",
        },
      },
      [
        {
          intlLabel: {
            id: `${PLUGIN_ID}.settings.title`,
            defaultMessage: "Calculation Engine, Hilal, Nisab & Bridges",
          },
          id: `${PLUGIN_ID}-settings`,
          to: `${PLUGIN_ID}`,
          Component: () =>
            import("./pages/SettingsPage").then((mod) => ({
              default: mod.SettingsPage,
            })),
          permissions: [],
        },
      ]
    );

    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
    });
  },

  bootstrap() {},

  registerTrads: createRegisterTrads({
    pluginId: PLUGIN_ID,
    defaultLocales: ["en", "es", "ar", "tr"],
    loadTranslation: (locale) => import(`./translations/${locale}.json`),
    getBaseTranslations: (locale) => ({
      ...(CM_LABEL_TRANSLATIONS[locale] ?? CM_LABEL_TRANSLATIONS.en),
      ...(CM_PLACEHOLDER_TRANSLATIONS[locale] ??
        CM_PLACEHOLDER_TRANSLATIONS.en),
    }),
  }),
};
