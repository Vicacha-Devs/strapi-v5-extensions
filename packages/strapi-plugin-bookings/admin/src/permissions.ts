import { PLUGIN_ID } from "./pluginId";

export const PLUGIN_PERMISSIONS = {
  read: [{ action: `plugin::${PLUGIN_ID}.read`, subject: null }],
  manage: [{ action: `plugin::${PLUGIN_ID}.manage`, subject: null }],
  settings: [{ action: `plugin::${PLUGIN_ID}.settings`, subject: null }],
};

export const pluginPermissions = PLUGIN_PERMISSIONS;
export default PLUGIN_PERMISSIONS;
