import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../shared";

interface MutableContentTypeSchema {
  attributes?: Record<string, Record<string, unknown>>;
  __schema__?: { attributes?: Record<string, Record<string, unknown>> };
}

function mergeTargetAttributes(
  target: Record<string, Record<string, unknown>> | undefined,
  attrName: string,
  attrDef: Record<string, unknown>
): void {
  if (!target) return;
  target[attrName] = {
    ...target[attrName],
    ...attrDef,
  };
}

function applyExtensionToSchema(
  schema: MutableContentTypeSchema | undefined,
  extraAttributes: Record<string, Record<string, unknown>>
): void {
  if (!schema) return;
  for (const [attrName, attrDef] of Object.entries(extraAttributes)) {
    if (!attrName || !attrDef || typeof attrDef !== "object") continue;
    mergeTargetAttributes(schema.attributes, attrName, attrDef);
    mergeTargetAttributes(schema.__schema__?.attributes, attrName, attrDef);
  }
}

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  const config = (strapi.config?.get?.(`plugin::${PLUGIN_ID}`) ?? {}) as {
    schemaExtensions?: Record<string, Record<string, Record<string, unknown>>>;
  };

  const extensions = config.schemaExtensions ?? {};
  const contentTypes = strapi.contentTypes as
    | Record<string, MutableContentTypeSchema>
    | undefined;

  for (const [targetKey, extraAttributes] of Object.entries(extensions)) {
    if (!extraAttributes || typeof extraAttributes !== "object") continue;
    const resolvedUid = targetKey.startsWith("plugin::")
      ? targetKey
      : `plugin::${PLUGIN_ID}.${targetKey}`;
    applyExtensionToSchema(contentTypes?.[resolvedUid], extraAttributes);
  }

  strapi.log.info(
    "[strapi-plugin-resources] Registering Media Library & Digital Catalog plugin"
  );
};

export default register;
