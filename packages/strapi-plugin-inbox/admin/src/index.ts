import { createRegisterTrads } from "@vicacha-devs/plugin-shared";

import { Initializer } from "./components/Initializer";
import { PluginIcon } from "./components/PluginIcon";
import { PLUGIN_ID } from "./pluginId";
import { CM_LABEL_TRANSLATIONS } from "./translations/cmLabels";
import { CM_PLACEHOLDER_TRANSLATIONS } from "./translations/cmPlaceholders";

export const SUPPORTED_ADMIN_LOCALES = [
  "en",
  "es",
  "ar",
  "fr",
  "de",
  "pt",
  "it",
  "tr",
  "ru",
  "zh",
] as const;

export default {
  register(app: {
    addMenuLink: (link: Record<string, unknown>) => void;
    createSettingSection: (
      section: {
        id: string;
        intlLabel: { id: string; defaultMessage: string };
      },
      links: Array<Record<string, unknown>>
    ) => void;
    registerPlugin: (plugin: Record<string, unknown>) => void;
  }) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Inbox & Form Builder",
      },
      Component: () =>
        import("./pages/InboxHomePage").then((mod) => ({
          default: mod.InboxHomePage,
        })),
      permissions: [],
    });

    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: `${PLUGIN_ID}.settings.section`,
          defaultMessage: "Inbox & Service Desk",
        },
      },
      [
        {
          intlLabel: {
            id: `${PLUGIN_ID}.settings.page`,
            defaultMessage: "Anti-Spam, Casework & Alerts",
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
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });
  },

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
