import { CheckCircle } from "@strapi/icons";
import type { StrapiApp } from "@strapi/strapi/admin";
import { createRegisterTrads } from "@vicacha-devs/plugin-shared";

import { PLUGIN_ID } from "../../shared/pluginId";
import { CM_LABEL_TRANSLATIONS } from "./translations/cmLabels";
import { CM_PLACEHOLDER_TRANSLATIONS } from "./translations/cmPlaceholders";

export default {
  register(app: StrapiApp) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: CheckCircle,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Certificates",
      },
      Component: () =>
        import("./pages/CertificatesPage").then((mod) => ({
          default: mod.CertificatesPage,
        })),
      permissions: [],
    });

    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: `${PLUGIN_ID}.settings.section`,
          defaultMessage: "Certificates Authority",
        },
      },
      [
        {
          intlLabel: {
            id: `${PLUGIN_ID}.settings.page`,
            defaultMessage: "Signing Keys & Templates",
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
