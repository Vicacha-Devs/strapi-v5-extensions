import type { Core } from '@strapi/strapi';
import {
  MEDIA_ITEM_UID,
  MEDIA_SERIES_UID,
  PLUGIN_ID,
  type MediaFeedsSettings,
} from '../../shared';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const config =
    strapi.config.get<Partial<MediaFeedsSettings>>(`plugin::${PLUGIN_ID}`) ?? {};

  const extensions = config.schemaExtensions ?? {};

  for (const [targetKey, extraAttributes] of Object.entries(extensions)) {
    if (!extraAttributes || typeof extraAttributes !== 'object') continue;

    const resolvedUid =
      targetKey === 'media-item' || targetKey === 'mediaItem'
        ? MEDIA_ITEM_UID
        : targetKey === 'media-series' || targetKey === 'mediaSeries'
          ? MEDIA_SERIES_UID
          : targetKey;

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
          ...(attrDef as Record<string, unknown>),
        };
      }
      if (schema?.__schema__?.attributes) {
        schema.__schema__.attributes[attrName] = {
          ...(schema.__schema__.attributes[attrName] ?? {}),
          ...(attrDef as Record<string, unknown>),
        };
      }
    }
  }
};
