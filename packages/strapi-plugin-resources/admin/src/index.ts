import { Initializer } from "./components/Initializer";
import { PluginIcon } from "./components/PluginIcon";
import { PLUGIN_ID } from "./pluginId";
import { CM_DESCRIPTION_TRANSLATIONS } from "./translations/cmDescriptions";
import { CM_LABEL_TRANSLATIONS } from "./translations/cmLabels";
import { CM_PLACEHOLDER_TRANSLATIONS } from "./translations/cmPlaceholders";

const LOADED_TRADS: Record<string, Record<string, string>> = {};

const PLUGIN_CONTENT_TYPES = [
  "plugin::resources.publication",
  "plugin::resources.gallery-album",
  "plugin::resources.glossary-term",
];

interface QueryPlugins {
  i18n?: {
    locale?: string;
  };
}

interface EditViewQuery {
  plugins?: QueryPlugins;
  [key: string]: unknown;
}

interface EditViewField {
  name?: string;
  label?: string;
  placeholder?: string;
  hint?: string;
  [key: string]: unknown;
}

interface EditViewLayout {
  layout?: EditViewField[][][];
  [key: string]: unknown;
}

interface GlobalWithI18nMessages {
  __CM_I18N_MESSAGES__?: Record<string, Record<string, string>>;
}

function getGlobalI18nMap(): Record<string, Record<string, string>> {
  const g = globalThis as unknown as GlobalWithI18nMessages;
  if (!g.__CM_I18N_MESSAGES__) {
    g.__CM_I18N_MESSAGES__ = {};
  }
  return g.__CM_I18N_MESSAGES__;
}

function resolveActiveLocale(query?: EditViewQuery): string {
  const fromQuery = query?.plugins?.i18n?.locale;
  if (typeof fromQuery === "string" && fromQuery) {
    return fromQuery;
  }
  if (typeof window !== "undefined") {
    const urlLoc = new URLSearchParams(window.location.search).get(
      "plugins[i18n][locale]"
    );
    if (urlLoc) return urlLoc;
    try {
      const stored = window.localStorage
        ?.getItem("strapi-admin-language")
        ?.replace(/^"|"$/g, "");
      if (stored) return stored;
    } catch {
      // Ignore storage access errors
    }
  }
  return "en";
}

function detectPluginUidFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const pathname = window.location.pathname || "";
  for (const uid of PLUGIN_CONTENT_TYPES) {
    if (pathname.includes(uid)) {
      return uid;
    }
  }
  return null;
}

function localizeField(
  field: EditViewField,
  uid: string,
  dict: Record<string, string>
): EditViewField {
  if (!field?.name) return field;
  const baseKey = `content-manager.content-types.${uid}.${field.name}`;
  return {
    ...field,
    label: dict[baseKey] || field.label,
    placeholder: dict[`${baseKey}.placeholder`] || field.placeholder,
    hint: dict[`${baseKey}.description`] || field.hint,
  };
}

export default {
  register(app: {
    addMenuLink: (link: Record<string, unknown>) => void;
    createSettingSection: (
      section: Record<string, unknown>,
      links: Record<string, unknown>[]
    ) => void;
    registerPlugin: (plugin: Record<string, unknown>) => void;
  }) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Resources & Media",
      },
      Component: () =>
        import("./pages/ResourcesHomePage").then((mod) => ({
          default: mod.ResourcesHomePage,
        })),
      permissions: [],
    });

    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: `${PLUGIN_ID}.settings.section`,
          defaultMessage: "Resources & Media Library",
        },
      },
      [
        {
          intlLabel: {
            id: `${PLUGIN_ID}.settings.page.title`,
            defaultMessage: "Media Library & Catalog Settings",
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

  bootstrap(app: {
    registerHook?: (
      name: string,
      handler: (payload: { layout: EditViewLayout; query?: EditViewQuery }) => {
        layout: EditViewLayout;
        query?: EditViewQuery;
      }
    ) => void;
  }) {
    if (typeof app.registerHook === "function") {
      app.registerHook(
        "Admin/CM/pages/EditView/mutate-edit-view-layout",
        ({ layout, query }) => {
          const uid = detectPluginUidFromLocation();
          if (!uid || !Array.isArray(layout?.layout)) {
            return { layout, query };
          }
          const locale = resolveActiveLocale(query);
          const globalMap = getGlobalI18nMap();
          const dict =
            LOADED_TRADS[locale] || globalMap[locale] || LOADED_TRADS.en || {};

          const nextPanels = layout.layout.map((panel) =>
            Array.isArray(panel)
              ? panel.map((row) =>
                  Array.isArray(row)
                    ? row.map((field) => localizeField(field, uid, dict))
                    : row
                )
              : panel
          );

          return {
            query,
            layout: {
              ...layout,
              layout: nextPanels,
            },
          };
        }
      );
    }
  },

  async registerTrads({ locales = [] }: { locales?: string[] } = {}) {
    const allLocales = Array.from(
      new Set([
        ...locales,
        "en",
        "es",
        "ar",
        "tr",
        "fr",
        "de",
        "it",
        "pt",
        "ru",
        "zh",
      ])
    );
    return Promise.all(
      allLocales.map(async (locale) => {
        try {
          const { default: data } = await import(
            `./translations/${locale}.json`
          );
          const prefixed: Record<string, string> = {
            ...CM_LABEL_TRANSLATIONS.en,
            ...CM_PLACEHOLDER_TRANSLATIONS.en,
            ...CM_DESCRIPTION_TRANSLATIONS.en,
            ...CM_LABEL_TRANSLATIONS[locale],
            ...CM_PLACEHOLDER_TRANSLATIONS[locale],
            ...CM_DESCRIPTION_TRANSLATIONS[locale],
          };
          for (const [k, v] of Object.entries(data as Record<string, string>)) {
            prefixed[k] = v;
            const fullKey = k.startsWith(`${PLUGIN_ID}.`)
              ? k
              : `${PLUGIN_ID}.${k}`;
            prefixed[fullKey] = v;
          }
          LOADED_TRADS[locale] = prefixed;
          const globalMap = getGlobalI18nMap();
          globalMap[locale] = {
            ...globalMap[locale],
            ...prefixed,
          };
          return { data: prefixed, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};
