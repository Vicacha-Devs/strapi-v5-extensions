import type { Core } from "@strapi/strapi";

import {
  EVENT_CONTENT_TYPE_UID,
  PLUGIN_ID,
  REGISTRATION_CONTENT_TYPE_UID,
} from "../../shared/pluginId";
import type { EventsPluginSettings } from "../../shared/types";

interface MutableContentTypeSchema {
  attributes?: Record<string, Record<string, unknown>>;
  __schema__?: {
    attributes?: Record<string, Record<string, unknown>>;
  };
}

function mergeAttributeIntoTarget(
  target: Record<string, Record<string, unknown>> | undefined,
  attrName: string,
  attrDef: Record<string, unknown>
): void {
  if (!target || typeof target !== "object") return;
  target[attrName] = {
    ...target[attrName],
    ...attrDef,
  };
}

function applyAttributeExtensions(
  contentType: MutableContentTypeSchema | undefined,
  extraAttributes?: Record<string, Record<string, unknown>>
): void {
  if (!contentType || !extraAttributes || typeof extraAttributes !== "object") {
    return;
  }

  for (const [attrName, attrDef] of Object.entries(extraAttributes)) {
    if (!attrName || !attrDef || typeof attrDef !== "object") continue;
    mergeAttributeIntoTarget(contentType.attributes, attrName, attrDef);
    mergeAttributeIntoTarget(contentType.__schema__?.attributes, attrName, attrDef);
  }
}

function buildCategoryEnumAttribute(
  categoryColors: Record<string, string>
): Record<string, unknown> {
  const colorKeys = Object.keys(categoryColors);
  const enumValues = Array.from(new Set(["general", ...colorKeys]));
  return {
    type: "enumeration",
    enum: enumValues,
    default: enumValues.includes("general") ? "general" : enumValues[0],
    pluginOptions: {
      i18n: {
        localized: false,
      },
    },
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.customFields.register({
    name: "rrule",
    plugin: PLUGIN_ID,
    type: "json",
    inputSize: {
      default: 12,
      isResizable: true,
    },
  });

  const userConfig = (strapi.config?.get?.(`plugin::${PLUGIN_ID}`) ??
    {}) as Partial<EventsPluginSettings>;

  const strapiInternal = strapi as unknown as {
    contentTypes?: Record<string, MutableContentTypeSchema>;
    contentType?: (uid: string) => MutableContentTypeSchema | undefined;
  };
  const getCt = (uid: string): MutableContentTypeSchema | undefined =>
    strapiInternal.contentTypes?.[uid] ?? strapiInternal.contentType?.(uid);

  const eventSourceWithCategories = userConfig.sources?.find(
    (s) =>
      s?.uid === EVENT_CONTENT_TYPE_UID &&
      Boolean(s.categoryColors && Object.keys(s.categoryColors).length > 0)
  );

  const eventExtensions: Record<string, Record<string, unknown>> = {
    ...userConfig.schemaExtensions?.event,
  };

  if (eventSourceWithCategories?.categoryColors && !eventExtensions.category) {
    eventExtensions.category = buildCategoryEnumAttribute(eventSourceWithCategories.categoryColors);
  }

  if (Object.keys(eventExtensions).length > 0) {
    applyAttributeExtensions(getCt(EVENT_CONTENT_TYPE_UID), eventExtensions);
  }

  if (userConfig.schemaExtensions?.registration) {
    applyAttributeExtensions(
      getCt(REGISTRATION_CONTENT_TYPE_UID),
      userConfig.schemaExtensions.registration
    );
  }
};
