import { Play } from "@strapi/icons";
import type { StrapiApp } from "@strapi/strapi/admin";
import { createRegisterTrads } from "@vicacha-devs/plugin-shared";

import { PLUGIN_ID } from "../../shared";
import { pluginPermissions } from "./permissions";
import { CM_LABEL_TRANSLATIONS } from "./translations/cmLabels";
import { CM_PLACEHOLDER_TRANSLATIONS } from "./translations/cmPlaceholders";

export const SUPPORTED_ADMIN_LOCALES = [
  "en",
  "es",
  "ar",
  "tr",
  "fr",
  "de",
  "pt",
  "id",
  "ur",
  "zh",
];

export default {
  register(app: StrapiApp) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: Play,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Media Feeds",
      },
      Component: () =>
        import("./pages/MediaFeedsPage").then((mod) => ({
          default: mod.default,
        })),
      permissions: pluginPermissions.main,
    });

    const broadcastsSuiteSection = {
      id: "broadcasts",
      intlLabel: {
        id: `${PLUGIN_ID}.settings.section`,
        defaultMessage: "Broadcasts, Media Feeds & Podcasts",
      },
    };
    const mediaFeedsSettingsLink = {
      intlLabel: {
        id: `${PLUGIN_ID}.settings.general`,
        defaultMessage: "Media Feeds & Podcasts",
      },
      id: `${PLUGIN_ID}-settings`,
      to: `${PLUGIN_ID}`,
      Component: () =>
        import("./pages/SettingsPage").then((mod) => ({
          default: mod.default,
        })),
      permissions: pluginPermissions.settings,
    };

    try {
      if (typeof app.addSettingsLink === "function") {
        app.addSettingsLink(broadcastsSuiteSection.id, mediaFeedsSettingsLink);
      } else {
        app.createSettingSection(broadcastsSuiteSection, [
          mediaFeedsSettingsLink,
        ]);
      }
    } catch {
      app.createSettingSection(broadcastsSuiteSection, [
        mediaFeedsSettingsLink,
      ]);
    }

    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
    });
  },

  registerTrads: createRegisterTrads({
    pluginId: PLUGIN_ID,
    defaultLocales: ["en", "es", "ar", "tr"],
    supportedLocales: SUPPORTED_ADMIN_LOCALES,
    loadTranslation: (locale) => import(`./translations/${locale}.json`),
    getBaseTranslations: (locale) => {
      const lang = locale.trim().split("-")[0]?.toLowerCase() || "en";
      return {
        ...CM_LABEL_TRANSLATIONS.en,
        ...CM_PLACEHOLDER_TRANSLATIONS.en,
        ...(Object.hasOwn(CM_LABEL_TRANSLATIONS, lang)
          ? CM_LABEL_TRANSLATIONS[lang]
          : {}),
        ...(Object.hasOwn(CM_PLACEHOLDER_TRANSLATIONS, lang)
          ? CM_PLACEHOLDER_TRANSLATIONS[lang]
          : {}),
      };
    },
  }),
};
