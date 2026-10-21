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

    const schema = strapi.contentTypes?.[resolvedUid];
    if (schema?.attributes) {
      Object.assign(schema.attributes, extraAttributes);
    }
  }
};
