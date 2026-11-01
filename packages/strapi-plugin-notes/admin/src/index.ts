import { Initializer } from "./components/Initializer";
import { NotesSidePanel } from "./components/NotesSidePanel";
import { PluginIcon } from "./components/PluginIcon";
import { PLUGIN_ID } from "./pluginId";

export default {
  register(app: {
    addMenuLink: (link: Record<string, unknown>) => void;
    registerPlugin: (plugin: Record<string, unknown>) => void;
  }) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Notes",
      },
      Component: () =>
        import("./pages/NotesHomePage").then((mod) => ({
          default: mod.NotesHomePage,
        })),
      permissions: [],
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });
  },

  bootstrap(app: {
    getPlugin: (name: string) =>
      | {
          apis?: {
            addEditViewSidePanel?: (
              panels: Array<typeof NotesSidePanel>
            ) => void;
          };
        }
      | undefined;
  }) {
    const cmPlugin = app.getPlugin("content-manager");
    if (
      cmPlugin?.apis &&
      typeof cmPlugin.apis.addEditViewSidePanel === "function"
    ) {
      cmPlugin.apis.addEditViewSidePanel([NotesSidePanel]);
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
          const prefixed: Record<string, string> = {};
          for (const [k, v] of Object.entries(data as Record<string, string>)) {
            prefixed[k] = v;
            const fullKey = k.startsWith(`${PLUGIN_ID}.`)
              ? k
              : `${PLUGIN_ID}.${k}`;
            prefixed[fullKey] = v;
          }
          return { data: prefixed, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};
