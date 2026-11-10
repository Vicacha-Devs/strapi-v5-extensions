import type { Core } from "@strapi/strapi";

import {
  EVENT_CONTENT_TYPE_UID,
  PLUGIN_ID,
  REGISTRATION_CONTENT_TYPE_UID,
} from "../../shared/pluginId";
import { isSafeObjectKey } from "../../shared/spotlightHelpers";
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
  if (!target || typeof target !== "object" || !isSafeObjectKey(attrName)) {
    return;
  }
  const prev = Object.hasOwn(target, attrName) ? target[attrName] : undefined;
  const safeDef: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrDef)) {
    if (isSafeObjectKey(k)) {
      safeDef[k] = v;
    }
  }
  target[attrName] = {
    ...(prev && typeof prev === "object" ? prev : {}),
    ...safeDef,
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
    if (
      !isSafeObjectKey(attrName) ||
      !attrDef ||
      typeof attrDef !== "object" ||
      Array.isArray(attrDef)
    ) {
      continue;
    }
    mergeAttributeIntoTarget(contentType.attributes, attrName, attrDef);
    mergeAttributeIntoTarget(
      contentType.__schema__?.attributes,
      attrName,
      attrDef
    );
  }
}

function buildCategoryEnumAttribute(
  categoryColors: Record<string, string>
): Record<string, unknown> {
  const colorKeys = Object.keys(categoryColors).filter(isSafeObjectKey);
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

  const eventExtensions: Record<string, Record<string, unknown>> = {};
  if (
    userConfig.schemaExtensions?.event &&
    typeof userConfig.schemaExtensions.event === "object"
  ) {
    for (const [k, v] of Object.entries(userConfig.schemaExtensions.event)) {
      if (isSafeObjectKey(k) && v && typeof v === "object") {
        eventExtensions[k] = v;
      }
    }
  }

  if (
    eventSourceWithCategories?.categoryColors &&
    !Object.hasOwn(eventExtensions, "category")
  ) {
    eventExtensions.category = buildCategoryEnumAttribute(
      eventSourceWithCategories.categoryColors
    );
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
