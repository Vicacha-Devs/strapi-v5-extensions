import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../shared/pluginId";
import { isSafeObjectKey, sanitizePlainRecord } from "./errors";
import type { BookingsPluginConfig } from "./types";

function mergeAttributeIntoTarget(
  attributes: Record<string, Record<string, unknown>> | undefined,
  attrName: string,
  attrDef: Record<string, unknown>
): void {
  if (!attributes || !isSafeObjectKey(attrName)) return;
  const existing = Object.hasOwn(attributes, attrName)
    ? attributes[attrName]
    : undefined;
  attributes[attrName] = {
    ...(existing && typeof existing === "object" ? existing : {}),
    ...attrDef,
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const pluginConfig = (strapi.config.get(`plugin::${PLUGIN_ID}`) ??
    {}) as BookingsPluginConfig;

  if (Array.isArray(pluginConfig.customFields)) {
    for (const field of pluginConfig.customFields) {
      if (field?.name && isSafeObjectKey(field.name) && field?.type) {
        strapi.customFields.register({
          name: field.name,
          plugin: PLUGIN_ID,
          type: field.type,
        });
      }
    }
  }

  const contentTypes = (strapi.contentTypes ?? {}) as Record<
    string,
    {
      attributes?: Record<string, Record<string, unknown>>;
      __schema__?: { attributes?: Record<string, Record<string, unknown>> };
    }
  >;

  const applyExtensions = (uid: string, extra?: Record<string, unknown>) => {
    const schema =
      extra && typeof extra === "object" && Object.hasOwn(contentTypes, uid)
        ? contentTypes[uid]
        : undefined;
    if (!schema || !extra) return;
    for (const [attrName, attrDef] of Object.entries(extra)) {
      if (!isSafeObjectKey(attrName) || !Object.hasOwn(extra, attrName)) {
        continue;
      }
      const cleanDef = sanitizePlainRecord(attrDef);
      if (!cleanDef) continue;
      mergeAttributeIntoTarget(schema.attributes, attrName, cleanDef);
      mergeAttributeIntoTarget(
        schema.__schema__?.attributes,
        attrName,
        cleanDef
      );
    }
  };

  applyExtensions(
    "plugin::bookings.resource",
    pluginConfig.schemaExtensions?.resource
  );
  applyExtensions(
    "plugin::bookings.booking",
    pluginConfig.schemaExtensions?.booking
  );
};
