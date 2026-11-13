import { PLUGIN_ID } from "./pluginId";

interface StrapiAdminApp {
  registerPlugin: (plugin: Record<string, unknown>) => void;
}

export default {
  register(app: StrapiAdminApp) {
    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
    });
  },
};
