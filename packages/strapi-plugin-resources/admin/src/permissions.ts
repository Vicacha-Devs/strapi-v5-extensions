import { PLUGIN_ID } from "./pluginId";

export const pluginPermissions = {
  read: [{ action: `plugin::${PLUGIN_ID}.read`, subject: null }],
  manage: [{ action: `plugin::${PLUGIN_ID}.manage`, subject: null }],
  settings: [{ action: `plugin::${PLUGIN_ID}.settings`, subject: null }],
};

export default pluginPermissions;
