import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../shared";

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

interface SchemaContainer {
  attributes?: Record<string, Record<string, unknown>>;
  __schema__?: { attributes?: Record<string, Record<string, unknown>> };
}

function sanitizeAttributeDefinition(
  attrDef: Record<string, unknown>
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(attrDef)) {
    if (DANGEROUS_KEYS.has(key) || !Object.hasOwn(attrDef, key)) continue;
    safe[key] = val;
  }
  return safe;
}

function applyAttributeExtension(
  schema: SchemaContainer | undefined,
  attrName: string,
  attrDef: Record<string, unknown>
): void {
  if (!schema || DANGEROUS_KEYS.has(attrName)) return;
  const safeDef = sanitizeAttributeDefinition(attrDef);

  if (schema.attributes) {
    const prev = Object.hasOwn(schema.attributes, attrName)
      ? schema.attributes[attrName]
      : {};
    schema.attributes[attrName] = { ...prev, ...safeDef };
  }
  if (schema.__schema__?.attributes) {
    const prev = Object.hasOwn(schema.__schema__.attributes, attrName)
      ? schema.__schema__.attributes[attrName]
      : {};
    schema.__schema__.attributes[attrName] = { ...prev, ...safeDef };
  }
}

function extendContentTypeSchema(
  strapi: Core.Strapi,
  targetKey: string,
  extraAttributes: Record<string, Record<string, unknown>> | undefined
): void {
  if (
    !targetKey ||
    DANGEROUS_KEYS.has(targetKey) ||
    !extraAttributes ||
    typeof extraAttributes !== "object" ||
    Array.isArray(extraAttributes)
  ) {
    return;
  }

  const resolvedUid = targetKey.startsWith("plugin::")
    ? targetKey
    : `plugin::${PLUGIN_ID}.${targetKey}`;
  if (DANGEROUS_KEYS.has(resolvedUid)) return;

  const contentTypes = strapi.contentTypes;
  const schema =
    contentTypes && Object.hasOwn(contentTypes, resolvedUid)
      ? (contentTypes[resolvedUid] as SchemaContainer | undefined)
      : undefined;

  for (const [attrName, attrDef] of Object.entries(extraAttributes)) {
    if (
      !attrName ||
      DANGEROUS_KEYS.has(attrName) ||
      !Object.hasOwn(extraAttributes, attrName) ||
      !attrDef ||
      typeof attrDef !== "object" ||
      Array.isArray(attrDef)
    ) {
      continue;
    }
    applyAttributeExtension(schema, attrName, attrDef);
  }
}

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  const config = (strapi.config?.get?.(`plugin::${PLUGIN_ID}`) ?? {}) as {
    schemaExtensions?: Record<string, Record<string, Record<string, unknown>>>;
  };

  const extensions = config.schemaExtensions;
  if (
    extensions &&
    typeof extensions === "object" &&
    !Array.isArray(extensions)
  ) {
    for (const [targetKey, extraAttributes] of Object.entries(extensions)) {
      if (!Object.hasOwn(extensions, targetKey)) continue;
      extendContentTypeSchema(strapi, targetKey, extraAttributes);
    }
  }

  strapi.log.debug(
    "[@vicacha-devs/strapi-plugin-broadcasts] Registered omnichannel broadcasts plugin"
  );
};

export default register;
