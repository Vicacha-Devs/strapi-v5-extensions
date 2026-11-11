import { PLUGIN_ID } from "../../shared";

export const pluginPermissions = {
  main: [{ action: `plugin::${PLUGIN_ID}.read`, subject: null }],
  sync: [{ action: `plugin::${PLUGIN_ID}.sync`, subject: null }],
  settings: [{ action: `plugin::${PLUGIN_ID}.settings.update`, subject: null }],
};

export default pluginPermissions;
