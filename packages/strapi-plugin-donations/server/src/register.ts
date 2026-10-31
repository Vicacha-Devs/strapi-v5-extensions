import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../shared";

interface MutableSchema {
  attributes?: Record<string, Record<string, unknown>>;
  __schema__?: { attributes?: Record<string, Record<string, unknown>> };
}

function mergeTargetAttrs(
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
  schema: MutableSchema | undefined,
  extraAttributes: Record<string, Record<string, unknown>>
): void {
  if (!schema) return;
  for (const [attrName, attrDef] of Object.entries(extraAttributes)) {
    if (!attrName || !attrDef || typeof attrDef !== "object") continue;
    mergeTargetAttrs(schema.attributes, attrName, attrDef);
    mergeTargetAttrs(schema.__schema__?.attributes, attrName, attrDef);
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.customFields?.register?.({
    name: "currency",
    plugin: PLUGIN_ID,
    type: "string",
    inputSize: {
      default: 4,
      isResizable: true,
    },
  });

  strapi.customFields?.register?.({
    name: "country",
    plugin: PLUGIN_ID,
    type: "string",
    inputSize: {
      default: 4,
      isResizable: true,
    },
  });

  const config = (strapi.config?.get?.(`plugin::${PLUGIN_ID}`) ?? {}) as {
    schemaExtensions?: Record<string, Record<string, Record<string, unknown>>>;
  };

  for (const [targetKey, extraAttributes] of Object.entries(config.schemaExtensions ?? {})) {
    if (!extraAttributes || typeof extraAttributes !== "object") continue;
    const resolvedUid = targetKey.startsWith("plugin::")
      ? targetKey
      : `plugin::${PLUGIN_ID}.${targetKey}`;

    const schema = strapi.contentTypes?.[resolvedUid] as MutableSchema | undefined;
    applyExtensionToSchema(schema, extraAttributes);
  }

  strapi.log.debug(
    "[vicacha:donations] Registered generic donations, campaigns & utility bills plugin."
  );
};
