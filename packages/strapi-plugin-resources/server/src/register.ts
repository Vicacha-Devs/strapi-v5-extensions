import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../shared';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  const config = (strapi.config?.get?.(`plugin::${PLUGIN_ID}`) ?? {}) as {
    schemaExtensions?: Record<string, Record<string, Record<string, unknown>>>;
  };

  const extensions = config.schemaExtensions ?? {};
  for (const [targetKey, extraAttributes] of Object.entries(extensions)) {
    if (!extraAttributes || typeof extraAttributes !== 'object') continue;

    const resolvedUid = targetKey.startsWith('plugin::')
      ? targetKey
      : `plugin::${PLUGIN_ID}.${targetKey}`;

    const schema = strapi.contentTypes?.[resolvedUid] as
      | {
          attributes?: Record<string, Record<string, unknown>>;
          __schema__?: { attributes?: Record<string, Record<string, unknown>> };
        }
      | undefined;

    for (const [attrName, attrDef] of Object.entries(extraAttributes)) {
      if (!attrName || !attrDef || typeof attrDef !== 'object') continue;
      if (schema?.attributes) {
        schema.attributes[attrName] = {
          ...(schema.attributes[attrName] ?? {}),
          ...attrDef,
        };
      }
      if (schema?.__schema__?.attributes) {
        schema.__schema__.attributes[attrName] = {
          ...(schema.__schema__.attributes[attrName] ?? {}),
          ...attrDef,
        };
      }
    }
  }

  strapi.log.info('[strapi-plugin-resources] Registering Media Library & Digital Catalog plugin');
};

export default register;
