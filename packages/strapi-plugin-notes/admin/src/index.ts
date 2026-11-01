import { createRegisterTrads } from "@vicacha-devs/plugin-shared";

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

  registerTrads: createRegisterTrads({
    pluginId: PLUGIN_ID,
    defaultLocales: [
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
    ],
    loadTranslation: (locale) => import(`./translations/${locale}.json`),
  }),
};
