import { PLUGIN_ID } from "../../shared";

export const pluginPermissions = {
  main: [{ action: `plugin::${PLUGIN_ID}.read`, subject: null }],
  settings: [{ action: `plugin::${PLUGIN_ID}.settings.update`, subject: null }],
};
