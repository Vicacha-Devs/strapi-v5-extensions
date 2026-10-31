import pluginId from './pluginId';

const pluginPermissions = {
  main: [{ action: `plugin::${pluginId}.read`, subject: null }],
  settings: [{ action: `plugin::${pluginId}.settings`, subject: null }],
};

export default pluginPermissions;
