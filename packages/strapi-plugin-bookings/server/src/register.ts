import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../shared/pluginId';
import type { BookingsPluginConfig } from './types';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const pluginConfig = (strapi.config.get(`plugin::${PLUGIN_ID}`) ??
    {}) as BookingsPluginConfig;

  if (Array.isArray(pluginConfig.customFields)) {
    for (const field of pluginConfig.customFields) {
      if (field?.name && field?.type) {
        strapi.customFields.register({
          name: field.name,
          plugin: PLUGIN_ID,
          type: field.type,
        });
      }
    }
  }

  const contentTypes = (strapi.contentTypes ?? {}) as Record<
    string,
    {
      attributes?: Record<string, Record<string, unknown>>;
      __schema__?: { attributes?: Record<string, Record<string, unknown>> };
    }
  >;

  const applyExtensions = (
    uid: string,
    extra?: Record<string, unknown>
  ) => {
    if (!extra || typeof extra !== 'object') return;
    const schema = contentTypes[uid];
    if (!schema) return;
    for (const [attrName, attrDef] of Object.entries(extra)) {
      if (!attrName || !attrDef || typeof attrDef !== 'object') continue;
      if (schema.attributes) {
        schema.attributes[attrName] = {
          ...(schema.attributes[attrName] ?? {}),
          ...(attrDef as Record<string, unknown>),
        };
      }
      if (schema.__schema__?.attributes) {
        schema.__schema__.attributes[attrName] = {
          ...(schema.__schema__.attributes[attrName] ?? {}),
          ...(attrDef as Record<string, unknown>),
        };
      }
    }
  };

  applyExtensions('plugin::bookings.resource', pluginConfig.schemaExtensions?.resource);
  applyExtensions('plugin::bookings.booking', pluginConfig.schemaExtensions?.booking);
};
