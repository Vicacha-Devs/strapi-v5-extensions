import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../shared/pluginId';
import type { BookingsPluginConfig } from './types';

function mergeAttributeIntoTarget(
  attributes: Record<string, Record<string, unknown>> | undefined,
  attrName: string,
  attrDef: Record<string, unknown>
): void {
  if (!attributes) return;
  attributes[attrName] = {
    ...(attributes[attrName] ?? {}),
    ...attrDef,
  };
}

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
    const schema = extra && typeof extra === 'object' ? contentTypes[uid] : undefined;
    if (!schema || !extra) return;
    for (const [attrName, attrDef] of Object.entries(extra)) {
      if (!attrName || !attrDef || typeof attrDef !== 'object') continue;
      const typedDef = attrDef as Record<string, unknown>;
      mergeAttributeIntoTarget(schema.attributes, attrName, typedDef);
      mergeAttributeIntoTarget(schema.__schema__?.attributes, attrName, typedDef);
    }
  };

  applyExtensions('plugin::bookings.resource', pluginConfig.schemaExtensions?.resource);
  applyExtensions('plugin::bookings.booking', pluginConfig.schemaExtensions?.booking);
};
