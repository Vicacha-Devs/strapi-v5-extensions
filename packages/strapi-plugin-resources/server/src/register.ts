import type { Core } from "@strapi/strapi";

import { isSafeObjectKey, PLUGIN_ID } from "../../shared";

interface MutableContentTypeSchema {
  attributes?: Record<string, Record<string, unknown>>;
  __schema__?: { attributes?: Record<string, Record<string, unknown>> };
}

function sanitizeAttributeDefinition(
  attrDef: Record<string, unknown>
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrDef)) {
    if (Object.hasOwn(attrDef, key) && isSafeObjectKey(key)) {
      safe[key] = value;
    }
  }
  return safe;
}

function mergeTargetAttributes(
  target: Record<string, Record<string, unknown>> | undefined,
  attrName: string,
  attrDef: Record<string, unknown>
): void {
  if (!target || !isSafeObjectKey(attrName)) return;
  const existing = Object.hasOwn(target, attrName) ? target[attrName] : {};
  target[attrName] = {
    ...(existing && typeof existing === "object" ? existing : {}),
    ...sanitizeAttributeDefinition(attrDef),
  };
}

function applyExtensionToSchema(
  schema: MutableContentTypeSchema | undefined,
  extraAttributes: Record<string, Record<string, unknown>>
): void {
  if (!schema) return;
  for (const [attrName, attrDef] of Object.entries(extraAttributes)) {
    if (
      !Object.hasOwn(extraAttributes, attrName) ||
      !isSafeObjectKey(attrName) ||
      !attrDef ||
      typeof attrDef !== "object" ||
      Array.isArray(attrDef)
    ) {
      continue;
    }
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

  if (
    extensions &&
    typeof extensions === "object" &&
    !Array.isArray(extensions)
  ) {
    for (const [targetKey, extraAttributes] of Object.entries(extensions)) {
      if (
        !Object.hasOwn(extensions, targetKey) ||
        !isSafeObjectKey(targetKey) ||
        !extraAttributes ||
        typeof extraAttributes !== "object" ||
        Array.isArray(extraAttributes)
      ) {
        continue;
      }
      const resolvedUid = targetKey.startsWith("plugin::")
        ? targetKey
        : `plugin::${PLUGIN_ID}.${targetKey}`;
      if (
        isSafeObjectKey(resolvedUid) &&
        contentTypes &&
        Object.hasOwn(contentTypes, resolvedUid)
      ) {
        applyExtensionToSchema(contentTypes[resolvedUid], extraAttributes);
      }
    }
  }

  strapi.log.info(
    "[strapi-plugin-resources] Registering Media Library & Digital Catalog plugin"
  );
};

export default register;
