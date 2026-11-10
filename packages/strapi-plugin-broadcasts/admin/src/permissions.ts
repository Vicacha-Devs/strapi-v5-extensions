import { PLUGIN_ID } from "./pluginId";

export const pluginPermissions = {
  read: [{ action: `plugin::${PLUGIN_ID}.read`, subject: null }],
  campaignsManage: [
    { action: `plugin::${PLUGIN_ID}.campaigns.manage`, subject: null },
  ],
  campaignsSend: [
    { action: `plugin::${PLUGIN_ID}.campaigns.send`, subject: null },
  ],
  automationsManage: [
    { action: `plugin::${PLUGIN_ID}.automations.manage`, subject: null },
  ],
  settingsManage: [
    { action: `plugin::${PLUGIN_ID}.settings.manage`, subject: null },
  ],
  main: [
    { action: `plugin::${PLUGIN_ID}.read`, subject: null },
    { action: `plugin::${PLUGIN_ID}.campaigns.manage`, subject: null },
    { action: `plugin::${PLUGIN_ID}.campaigns.send`, subject: null },
    { action: `plugin::${PLUGIN_ID}.automations.manage`, subject: null },
  ],
  settings: [{ action: `plugin::${PLUGIN_ID}.settings.manage`, subject: null }],
};
