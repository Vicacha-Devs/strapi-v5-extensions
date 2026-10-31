import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../shared";

interface SchemaContainer {
  attributes?: Record<string, Record<string, unknown>>;
  __schema__?: { attributes?: Record<string, Record<string, unknown>> };
}

function applyAttributeExtension(
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

function extendContentTypeSchema(
  strapi: Core.Strapi,
  targetKey: string,
  extraAttributes: Record<string, Record<string, unknown>> | undefined
): void {
  if (!extraAttributes || typeof extraAttributes !== "object") return;
  const resolvedUid = targetKey.startsWith("plugin::")
    ? targetKey
    : `plugin::${PLUGIN_ID}.${targetKey}`;

  const schema = strapi.contentTypes?.[resolvedUid] as SchemaContainer | undefined;

  for (const [attrName, attrDef] of Object.entries(extraAttributes)) {
    if (!attrName || !attrDef || typeof attrDef !== "object") continue;
    applyAttributeExtension(schema, attrName, attrDef);
  }
}

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  const config = (strapi.config?.get?.(`plugin::${PLUGIN_ID}`) ?? {}) as {
    schemaExtensions?: Record<string, Record<string, Record<string, unknown>>>;
  };

  for (const [targetKey, extraAttributes] of Object.entries(config.schemaExtensions ?? {})) {
    extendContentTypeSchema(strapi, targetKey, extraAttributes);
  }

  strapi.log.debug(
    "[@vicacha-devs/strapi-plugin-broadcasts] Registered omnichannel broadcasts plugin"
  );
};

export default register;
