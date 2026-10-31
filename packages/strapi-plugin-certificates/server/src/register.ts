import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../shared";

type AttributeMap = Record<string, Record<string, unknown>>;

type ContentTypeSchema = {
  attributes?: AttributeMap;
  __schema__?: { attributes?: AttributeMap };
};

function mergeAttributesIntoTarget(
  target: AttributeMap | undefined,
  attrName: string,
  attrDef: Record<string, unknown>
): void {
  if (!target) return;
  target[attrName] = {
    ...target[attrName],
    ...attrDef,
  };
}

function applyExtraAttributesToSchema(
  schema: ContentTypeSchema | undefined,
  extraAttributes: AttributeMap
): void {
  for (const [attrName, attrDef] of Object.entries(extraAttributes)) {
    if (!attrName || !attrDef || typeof attrDef !== "object") continue;
    mergeAttributesIntoTarget(schema?.attributes, attrName, attrDef);
    mergeAttributesIntoTarget(schema?.__schema__?.attributes, attrName, attrDef);
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const config = (strapi.config?.get?.(`plugin::${PLUGIN_ID}`) ?? {}) as {
    schemaExtensions?: Record<string, AttributeMap>;
  };

  for (const [targetKey, extraAttributes] of Object.entries(config.schemaExtensions ?? {})) {
    if (!extraAttributes || typeof extraAttributes !== "object") continue;
    const resolvedUid = targetKey.startsWith("plugin::")
      ? targetKey
      : `plugin::${PLUGIN_ID}.${targetKey}`;

    const schema = strapi.contentTypes?.[resolvedUid] as ContentTypeSchema | undefined;
    applyExtraAttributesToSchema(schema, extraAttributes);
  }

  strapi.log.debug(`[${PLUGIN_ID}] Registering official certificates plugin`);
};
