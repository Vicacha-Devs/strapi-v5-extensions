import type { Core } from '@strapi/strapi';
import {
  EVENT_CONTENT_TYPE_UID,
  PLUGIN_ID,
  REGISTRATION_CONTENT_TYPE_UID,
} from '../../shared/pluginId';
import type { EventsPluginSettings } from '../../shared/types';

interface MutableContentTypeSchema {
  attributes?: Record<string, Record<string, unknown>>;
  __schema__?: {
    attributes?: Record<string, Record<string, unknown>>;
  };
}

function applyAttributeExtensions(
  contentType: MutableContentTypeSchema | undefined,
  extraAttributes?: Record<string, Record<string, unknown>>
): void {
  if (!contentType || !extraAttributes || typeof extraAttributes !== 'object') {
    return;
  }

  for (const [attrName, attrDef] of Object.entries(extraAttributes)) {
    if (!attrName || !attrDef || typeof attrDef !== 'object') continue;
    if (contentType.attributes && typeof contentType.attributes === 'object') {
      contentType.attributes[attrName] = {
        ...(contentType.attributes[attrName] ?? {}),
        ...attrDef,
      };
    }
    if (
      contentType.__schema__ &&
      contentType.__schema__.attributes &&
      typeof contentType.__schema__.attributes === 'object'
    ) {
      contentType.__schema__.attributes[attrName] = {
        ...(contentType.__schema__.attributes[attrName] ?? {}),
        ...attrDef,
      };
    }
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  // 1. Register the visual RFC 5545 RRULE custom field
  strapi.customFields.register({
    name: 'rrule',
    plugin: PLUGIN_ID,
    type: 'json',
    inputSize: {
      default: 12,
      isResizable: true,
    },
  });

  // 2. Apply declarative schema extensions (e.g., hijriDate, speaker, custom registration fields)
  // configured in `config/plugins.ts` under `events.config.schemaExtensions`
  const userConfig = (strapi.config?.get?.(`plugin::${PLUGIN_ID}`) ??
    {}) as Partial<EventsPluginSettings>;

  if (userConfig.schemaExtensions) {
    const strapiInternal = strapi as unknown as {
      contentTypes?: Record<string, MutableContentTypeSchema>;
      contentType?: (uid: string) => MutableContentTypeSchema | undefined;
    };
    const getCt = (uid: string): MutableContentTypeSchema | undefined =>
      strapiInternal.contentTypes?.[uid] ??
      (typeof strapiInternal.contentType === 'function'
        ? strapiInternal.contentType(uid)
        : undefined);

    if (userConfig.schemaExtensions.event) {
      applyAttributeExtensions(
        getCt(EVENT_CONTENT_TYPE_UID),
        userConfig.schemaExtensions.event
      );
    }

    if (userConfig.schemaExtensions.registration) {
      applyAttributeExtensions(
        getCt(REGISTRATION_CONTENT_TYPE_UID),
        userConfig.schemaExtensions.registration
      );
    }
  }
};
