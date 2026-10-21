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
    { attributes?: Record<string, unknown> }
  >;

  if (
    pluginConfig.schemaExtensions?.resource &&
    contentTypes['plugin::bookings.resource']?.attributes
  ) {
    Object.assign(
      contentTypes['plugin::bookings.resource'].attributes,
      pluginConfig.schemaExtensions.resource
    );
  }

  if (
    pluginConfig.schemaExtensions?.booking &&
    contentTypes['plugin::bookings.booking']?.attributes
  ) {
    Object.assign(
      contentTypes['plugin::bookings.booking'].attributes,
      pluginConfig.schemaExtensions.booking
    );
  }
};
