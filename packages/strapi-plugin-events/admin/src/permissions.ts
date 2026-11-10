import { PLUGIN_ID } from "../../shared/pluginId";

export const pluginPermissions = {
  read: [{ action: `plugin::${PLUGIN_ID}.read`, subject: null }],
  update: [{ action: `plugin::${PLUGIN_ID}.update`, subject: null }],
  settings: [{ action: `plugin::${PLUGIN_ID}.settings.update`, subject: null }],
};

export default pluginPermissions;
