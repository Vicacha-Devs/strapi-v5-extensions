import type { Core } from "@strapi/strapi";

import {
  MEDIA_ITEM_UID,
  MEDIA_SERIES_UID,
  PLUGIN_ID,
  type MediaFeedsSettings,
} from "../../shared";

interface SchemaContainer {
  attributes?: Record<string, Record<string, unknown>>;
  __schema__?: { attributes?: Record<string, Record<string, unknown>> };
}

function resolveExtensionUid(targetKey: string): string {
  if (targetKey === "media-item" || targetKey === "mediaItem") {
    return MEDIA_ITEM_UID;
  }
  if (targetKey === "media-series" || targetKey === "mediaSeries") {
    return MEDIA_SERIES_UID;
  }
  return targetKey;
}

function applyAttributeToSchema(
  schema: SchemaContainer | undefined,
  attrName: string,
  attrDef: Record<string, unknown>
): void {
  if (!schema) return;
  if (schema.attributes) {
    schema.attributes[attrName] = {
      ...schema.attributes[attrName],
      ...attrDef,
    };
  }
  if (schema.__schema__?.attributes) {
    schema.__schema__.attributes[attrName] = {
      ...schema.__schema__.attributes[attrName],
      ...attrDef,
    };
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const config =
    strapi.config.get<Partial<MediaFeedsSettings>>(`plugin::${PLUGIN_ID}`) ??
    {};
  const extensions = config.schemaExtensions ?? {};

  for (const [targetKey, extraAttributes] of Object.entries(extensions)) {
    if (!extraAttributes || typeof extraAttributes !== "object") continue;
    const resolvedUid = resolveExtensionUid(targetKey);
    const schema = strapi.contentTypes?.[resolvedUid] as
      | SchemaContainer
      | undefined;

    for (const [attrName, attrDef] of Object.entries(extraAttributes)) {
      if (!attrName || !attrDef || typeof attrDef !== "object") continue;
      applyAttributeToSchema(
        schema,
        attrName,
        attrDef as Record<string, unknown>
      );
    }
  }
};
