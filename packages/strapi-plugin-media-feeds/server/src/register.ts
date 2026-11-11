import type { Core } from "@strapi/strapi";

import {
  ALLOWED_SOURCE_API_UID_REGEX,
  MEDIA_ITEM_UID,
  PLUGIN_ID,
  type MediaFeedsSettings,
} from "../../shared";

interface SchemaContainer {
  attributes?: Record<string, Record<string, unknown>>;
  __schema__?: { attributes?: Record<string, Record<string, unknown>> };
}

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function resolveExtensionUid(targetKey: string): string | null {
  if (
    targetKey === "media-item" ||
    targetKey === "mediaItem" ||
    targetKey === MEDIA_ITEM_UID
  ) {
    return MEDIA_ITEM_UID;
  }
  if (ALLOWED_SOURCE_API_UID_REGEX.test(targetKey)) {
    return targetKey;
  }
  return null;
}

function applyAttributeToSchema(
  schema: SchemaContainer | undefined,
  attrName: string,
  attrDef: Record<string, unknown>
): void {
  if (!schema || FORBIDDEN_KEYS.has(attrName)) return;
  if (schema.attributes) {
    const prev = Object.hasOwn(schema.attributes, attrName)
      ? schema.attributes[attrName]
      : undefined;
    schema.attributes[attrName] = {
      ...prev,
      ...attrDef,
    };
  }
  if (schema.__schema__?.attributes) {
    const prev = Object.hasOwn(schema.__schema__.attributes, attrName)
      ? schema.__schema__.attributes[attrName]
      : undefined;
    schema.__schema__.attributes[attrName] = {
      ...prev,
      ...attrDef,
    };
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const config =
    strapi.config.get<Partial<MediaFeedsSettings>>(`plugin::${PLUGIN_ID}`) ??
    {};
  const extensions = isPlainRecord(config.schemaExtensions)
    ? config.schemaExtensions
    : {};

  for (const targetKey of Object.keys(extensions)) {
    if (FORBIDDEN_KEYS.has(targetKey)) continue;
    const extraAttributes = extensions[targetKey];
    if (!isPlainRecord(extraAttributes)) continue;

    const resolvedUid = resolveExtensionUid(targetKey);
    if (!resolvedUid) {
      strapi.log.warn(
        `[${PLUGIN_ID}] Ignoring disallowed schemaExtensions UID: ${targetKey}`
      );
      continue;
    }

    const schema = Object.hasOwn(strapi.contentTypes ?? {}, resolvedUid)
      ? (strapi.contentTypes[resolvedUid] as SchemaContainer | undefined)
      : undefined;

    for (const attrName of Object.keys(extraAttributes)) {
      if (!attrName || FORBIDDEN_KEYS.has(attrName)) continue;
      const attrDef = extraAttributes[attrName];
      if (!isPlainRecord(attrDef)) continue;
      applyAttributeToSchema(schema, attrName, attrDef);
    }
  }
};
