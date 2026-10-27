import type { Core } from '@strapi/strapi';
import { CONTENT_TYPE_UID, PLUGIN_ID, SINGLE_URL_UID } from '../pluginId';

const toBool = (value: unknown): boolean => value === true || value === 'true';

const toCollectionType = (row: any) => ({
  type: row.type ?? '',
  langcode: row.langcode ?? '',
  pattern: row.pattern ?? '',
  priority: Number(row.priority ?? 0),
  frequency: row.frequency ?? '',
  lastModified: toBool(row.lastModified),
  thumbnail: row.thumbnail ?? '',
  populateLinkedModels: toBool(row.populateLinkedModels),
});

const fromCollectionType = (item: any) => ({
  type: item.type,
  langcode: item.langcode,
  pattern: item.pattern,
  priority: item.priority,
  frequency: item.frequency,
  lastModified: String(toBool(item.lastModified)),
  thumbnail: item.thumbnail,
  populateLinkedModels: String(toBool(item.populateLinkedModels)),
});

const toCustomUrl = (row: any) => ({
  url: String(row.slug ?? ''),
  priority: Number(row.priority ?? 0),
  frequency: row.frequency ?? '',
});

const fromCustomUrl = (item: any) => ({
  slug: item.url,
  priority: item.priority,
  frequency: item.frequency,
});

const settings = ({ strapi }: { strapi: Core.Strapi }) => {
  const sitemapService = () => strapi.plugin(PLUGIN_ID).service('service');

  /** Rows are matched to the submitted list by position (ordered by id) so ids stay stable. */
  const syncRows = async (uid: typeof CONTENT_TYPE_UID | typeof SINGLE_URL_UID, items: any[]) => {
    const query = strapi.db.query(uid);
    const rows = await query.findMany({ orderBy: { id: 'asc' } });
    for (let i = 0; i < items.length; i++) {
      if (rows[i]) {
        await query.update({ where: { id: rows[i].id }, data: items[i] });
      } else {
        await query.create({ data: items[i] });
      }
    }
    const surplus = rows.slice(items.length).map((row: any) => row.id);
    if (surplus.length > 0) {
      await query.deleteMany({ where: { id: { $in: surplus } } });
    }
  };

  return {
    async getSettings() {
      const [options, collectionRows, customRows] = await Promise.all([
        sitemapService().getOptions(),
        strapi.db.query(CONTENT_TYPE_UID).findMany({ orderBy: { id: 'asc' } }),
        strapi.db.query(SINGLE_URL_UID).findMany({ orderBy: { id: 'asc' } }),
      ]);
      return {
        baseUrl: options.baseUrl ?? '',
        excludedUrls: options.excludedUrls,
        useSitemapIndex: options.useSitemapIndex,
        sitemaps: options.sitemapDefinitions,
        collectionTypes: collectionRows.map(toCollectionType),
        customURLs: customRows.map(toCustomUrl),
      };
    },

    async updateSettings(data: any) {
      try {
        const collectionTypes = Array.isArray(data?.collectionTypes) ? data.collectionTypes : [];
        const customURLs = Array.isArray(data?.customURLs) ? data.customURLs : [];
        await syncRows(CONTENT_TYPE_UID, collectionTypes.map(fromCollectionType));
        await syncRows(SINGLE_URL_UID, customURLs.map(fromCustomUrl));
        await sitemapService().updateOptions({
          baseUrl: data?.baseUrl,
          excludedUrls: data?.excludedUrls,
          useSitemapIndex: data?.useSitemapIndex,
          sitemapDefinitions: data?.sitemaps,
        });
        return this.getSettings();
      } catch (error) {
        strapi.log.error('Error saving settings:', error);
        throw new Error('Failed to save settings');
      }
    },
  };
};

export default {
  settings,
};
