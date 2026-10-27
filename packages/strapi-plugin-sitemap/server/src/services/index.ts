import type { Core } from '@strapi/strapi';
import { CONTENT_TYPE_UID, OPTION_UID, PLUGIN_ID, SINGLE_URL_UID } from '../pluginId';

const EXCLUDED_PLUGIN_PREFIXES = [
  'plugin::upload.',
  'plugin::users-permissions.',
  'plugin::i18n.',
  'plugin::content-releases.',
  'plugin::review-workflows.',
  `plugin::${PLUGIN_ID}.`,
  'plugin::strapi-5-sitemap-plugin.',
];

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  getNestedValue(obj: any, path: string) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  },

  parseTableReferences(pattern: string) {
    const populate: Record<string, any> = {};
    const placeholders = pattern.match(/\[([^\]]+)]/g) || [];
    for (const placeholder of placeholders) {
      const content = placeholder.replace(/[\[\]]/g, '');
      if (content.includes('.')) {
        const parts = content.split('.');
        parts.pop();
        if (parts.length === 1) {
          const table = parts[0];
          populate[table] = true;
        } else if (parts.length > 1) {
          let current = populate;
          for (let i = 0; i < parts.length; i++) {
            const tableName = parts[i];
            if (i === parts.length - 1) {
              current[tableName] = true;
            } else {
              if (!current[tableName] || current[tableName] === true) {
                current[tableName] = { populate: {} };
              }
              current = current[tableName].populate;
            }
          }
        }
      }
    }
    return Object.keys(populate).length > 0 ? { populate } : {};
  },

  async getSitemap(slug?: string) {
    const baseURLObject: any = await (strapi.documents as any)(OPTION_UID).findFirst();
    if (!baseURLObject) return this.generateUrlsetXml([]);
    const baseURL = baseURLObject.baseUrl || '';
    const excludedUrls = Array.isArray(baseURLObject.excludedUrls)
      ? baseURLObject.excludedUrls
      : [];
    const useSitemapIndex = Boolean(baseURLObject.useSitemapIndex);
    const sitemapDefinitions = Array.isArray(baseURLObject.sitemapDefinitions)
      ? baseURLObject.sitemapDefinitions
      : [];
    const allSitemapEntries = await strapi.db.query(CONTENT_TYPE_UID).findMany();
    const allCustomURLs = await strapi.db.query(SINGLE_URL_UID).findMany();

    if (useSitemapIndex && sitemapDefinitions.length > 0) {
      if (slug === undefined) {
        return this.generateSitemapIndexXml(baseURL, sitemapDefinitions);
      }
      const def = sitemapDefinitions.find(
        (d: any) => (d.name || '').trim() === String(slug).trim()
      );
      if (!def) return this.generateUrlsetXml([]);
      const configIds = Array.isArray(def.collectionTypeConfigIds)
        ? def.collectionTypeConfigIds
        : [];
      const sitemapEntries = allSitemapEntries.filter((e: any) =>
        configIds.includes(e.id)
      );
      const customURLs = def.includeCustomUrls ? allCustomURLs : [];
      return this.buildAndReturnSitemapXml(
        baseURL,
        excludedUrls,
        sitemapEntries,
        customURLs
      );
    }

    return this.buildAndReturnSitemapXml(
      baseURL,
      excludedUrls,
      allSitemapEntries,
      allCustomURLs
    );
  },

  generateSitemapIndexXml(baseURL: string, definitions: any[]) {
    const base = baseURL.replace(/\/$/, '');
    const prefix = `/api/${PLUGIN_ID}`;
    const sitemaps = definitions
      .filter((d) => (d.name || '').trim() !== '')
      .map(
        (d) =>
          `<sitemap><loc>${base}${prefix}/sitemap-${encodeURIComponent(String(d.name).trim())}.xml</loc></sitemap>`
      )
      .join('');
    return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemaps}</sitemapindex>`;
  },

  generateUrlsetXml(sitemap: any[]) {
    const urlSet = sitemap
      .map(
        (entry) => `
      <url>
        <loc>${entry.url}</loc>
        <priority>${entry.priority}</priority>
        <changefreq>${entry.frequency}</changefreq>
        ${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}
        ${entry.thumbnail ? `<image:image><image:loc>${entry.thumbnail}</image:loc><image:title>${entry.thumbnailTitle || ''}</image:title></image:image>` : ''}
      </url>`
      )
      .join('');
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urlSet}</urlset>`;
  },

  resolveContentTypeUid(typeName: string): string | undefined {
    const allContentTypes = (strapi.contentTypes || {}) as Record<string, any>;
    return Object.keys(allContentTypes).find(
      (uid) =>
        uid === typeName || allContentTypes[uid]?.info?.singularName === typeName
    );
  },

  async buildAndReturnSitemapXml(
    baseURL: string,
    excludedUrls: string[],
    sitemapEntries: any[],
    customURLs: any[]
  ) {
    try {
      const collections: any[] = [];
      const sitemap: any[] = [];

      for (const sitemapEntry of sitemapEntries) {
        const targetUid =
          this.resolveContentTypeUid(sitemapEntry.type) ||
          `api::${sitemapEntry.type}.${sitemapEntry.type}`;
        if (!(strapi.contentTypes as Record<string, any>)?.[targetUid]) {
          continue;
        }

        const isValidThumbnail =
          sitemapEntry.thumbnail && sitemapEntry.thumbnail !== '-';
        let populate: Record<string, any> | undefined = isValidThumbnail
          ? { [sitemapEntry.thumbnail]: true }
          : undefined;
        if (sitemapEntry.populateLinkedModels === 'true') {
          const linkedModels = this.parseTableReferences(sitemapEntry.pattern);
          if (linkedModels.populate) {
            populate = {
              ...populate,
              ...linkedModels.populate,
            };
          }
        }

        const entries = await (strapi.documents as any)(targetUid).findMany({
          locale:
            sitemapEntry.langcode === '-' ? undefined : sitemapEntry.langcode,
          status: 'published',
          populate,
        });
        collections.push({ ...sitemapEntry, entries });
      }

      collections.forEach((collection) => {
        const {
          pattern,
          priority,
          frequency,
          entries,
          lastModified,
          thumbnail,
          populateLinkedModels,
        } = collection;

        for (const entry of entries) {
          let url = pattern;
          const placeholders = pattern.match(/\[([^\]]+)]/g) || [];
          let hasInvalidPlaceholder = false;

          for (const placeholder of placeholders) {
            const key = placeholder.replace(/[\[\]]/g, '');
            let value: any;
            if (key.includes('.')) {
              value = this.getNestedValue(entry, key);
            } else {
              value = entry[key];
            }
            if (value !== null && value !== undefined) {
              url = url.replace(placeholder, String(value));
            } else if (key.includes('.')) {
              url = url.replace(placeholder, '');
            } else {
              hasInvalidPlaceholder = true;
              break;
            }
          }

          if (hasInvalidPlaceholder) {
            continue;
          }

          url = url.replace(/\/+/g, '/');
          url = baseURL.replace(/\/$/, '') + (url.startsWith('/') ? url : `/${url}`);

          const sitemapEntry: Record<string, any> = {
            url,
            priority,
            frequency,
            lastmod: undefined,
            thumbnail: undefined,
            thumbnailTitle: undefined,
            populateLinkedModels: undefined,
          };

          if (lastModified === 'true') {
            sitemapEntry.lastmod = entry.updatedAt;
          }
          if (populateLinkedModels === 'true') {
            sitemapEntry.populateLinkedModels = true;
          }
          if (thumbnail && thumbnail !== '-') {
            const media = Array.isArray(entry[thumbnail])
              ? entry[thumbnail][0]
              : entry[thumbnail];
            if (media?.url) {
              sitemapEntry.thumbnail = media.url;
              sitemapEntry.thumbnailTitle = media.name;
            }
          }
          sitemap.push(sitemapEntry);
        }
      });

      const normalizedBase = baseURL.replace(/\/$/, '');
      const customSitemapEntries = customURLs.map((customURL) => ({
        url: `${normalizedBase}${String(customURL.slug || '').startsWith('/') ? customURL.slug : `/${customURL.slug || ''}`}`,
        priority: customURL.priority,
        frequency: customURL.frequency,
      }));
      sitemap.push(...customSitemapEntries);

      const normalizedExcluded = excludedUrls
        .map((path) => String(path).trim())
        .filter(Boolean)
        .map((p) => (p.startsWith('/') ? p : `/${p}`).replace(/\/$/, '') || '/');

      const getPathFromUrl = (url: string) => {
        try {
          const pathname = new URL(url).pathname;
          return pathname.replace(/\/$/, '') || '/';
        } catch {
          return '/';
        }
      };

      const filteredSitemap = sitemap.filter((entry) => {
        const path = getPathFromUrl(entry.url);
        return !normalizedExcluded.some((ex) => path === ex);
      });

      return this.generateUrlsetXml(filteredSitemap);
    } catch (error) {
      strapi.log.error('Error fetching entries:', error);
      throw new Error('Failed to fetch entries for types');
    }
  },

  async saveAdminData(data: any) {
    try {
      const result = await strapi.db.query(CONTENT_TYPE_UID).create({
        data,
      });
      return {
        message: 'Data saved successfully',
        savedData: result,
      };
    } catch (error) {
      strapi.log.error('Error saving data:', error);
      throw new Error('Failed to save data');
    }
  },

  async getAdminData() {
    try {
      const results = await strapi.db.query(CONTENT_TYPE_UID).findMany();
      return {
        results,
      };
    } catch (error) {
      strapi.log.error('Error fetching data:', error);
      throw new Error('Failed to fetch data');
    }
  },

  async getContentTypes() {
    try {
      const contentTypes = (strapi.contentTypes || {}) as Record<string, any>;
      const collectionTypes = Object.keys(contentTypes)
        .filter((key) => {
          const ct = contentTypes[key];
          if (!ct || ct.kind !== 'collectionType') return false;
          if (key.startsWith('api::')) return true;
          if (
            key.startsWith('plugin::') &&
            !EXCLUDED_PLUGIN_PREFIXES.some((prefix) => key.startsWith(prefix)) &&
            ct.pluginOptions?.['content-manager']?.visible !== false
          ) {
            return true;
          }
          return false;
        })
        .map((key) => ({
          uid: key,
          singularName: contentTypes[key].info.singularName,
          pluralName: contentTypes[key].info.pluralName,
          displayName: contentTypes[key].info.displayName,
        }));
      return { collectionTypes };
    } catch (error) {
      strapi.log.error('Error fetching content types:', error);
      throw new Error('Failed to fetch content types');
    }
  },

  async getLocales() {
    try {
      return await strapi.plugin('i18n').service('locales').find();
    } catch (error) {
      strapi.log.error('Error fetching locales:', error);
      throw new Error('Failed to fetch locales');
    }
  },

  async getAllowedFields(contentTypeSingularName: string) {
    const systemFields = [
      'createdAt',
      'updatedAt',
      'publishedAt',
      'createdBy',
      'updatedBy',
      'locale',
    ];
    const targetUid = this.resolveContentTypeUid(contentTypeSingularName);
    const contentType = targetUid
      ? (strapi.contentTypes as Record<string, any>)[targetUid]
      : undefined;
    if (!contentType) {
      return {
        allowedFields: ['id'],
        slug: contentTypeSingularName,
      };
    }

    const fields: string[] = [];
    Object.entries(contentType.attributes || {}).forEach(
      ([fieldName, field]: [string, any]) => {
        if (
          !systemFields.includes(fieldName) &&
          field.type !== 'relation' &&
          field.type !== 'component'
        ) {
          fields.push(fieldName);
        } else if (
          field.type === 'relation' &&
          typeof field.relation === 'string' &&
          field.relation.endsWith('ToOne') &&
          !['createdBy', 'updatedBy'].includes(fieldName)
        ) {
          fields.push(`${fieldName}.id`);
        } else if (field.type === 'component' && !field.repeatable) {
          const component = (strapi.components as Record<string, any>)?.[
            field.component
          ];
          if (component?.attributes) {
            Object.keys(component.attributes).forEach((subFieldName) => {
              fields.push(`${fieldName}.${subFieldName}`);
            });
          }
        }
      }
    );
    if (!fields.includes('id')) {
      fields.push('id');
    }
    return {
      allowedFields: fields,
      slug: contentType.info.pluralName,
    };
  },

  async updateAdminData(data: any) {
    try {
      const result = await strapi.db.query(CONTENT_TYPE_UID).update({
        where: { id: data.id },
        data: {
          type: data.type,
          langcode: data.langcode,
          pattern: data.pattern,
          priority: data.priority,
          frequency: data.frequency,
          lastModified: data.lastModified,
          thumbnail: data.thumbnail,
          populateLinkedModels: data.populateLinkedModels,
        },
      });
      return {
        message: 'Data saved successfully',
        savedData: result,
      };
    } catch (error) {
      strapi.log.error('Error saving data:', error);
      throw new Error('Failed to save data');
    }
  },

  async deleteAdminData(id: any) {
    try {
      const result = await strapi.db.query(CONTENT_TYPE_UID).delete({
        where: {
          id,
        },
      });
      return {
        message: 'Data deleted successfully',
        deletedData: result,
      };
    } catch (error) {
      strapi.log.error('Error deleting data:', error);
      throw new Error('Failed to delete data');
    }
  },

  async getOptions() {
    try {
      const results: any = await (strapi.documents as any)(OPTION_UID).findFirst();
      if (results) {
        const excludedUrls = Array.isArray(results.excludedUrls)
          ? results.excludedUrls
          : [];
        const useSitemapIndex = Boolean(results.useSitemapIndex);
        const sitemapDefinitions = Array.isArray(results.sitemapDefinitions)
          ? results.sitemapDefinitions
          : [];
        return {
          baseUrl: results.baseUrl,
          excludedUrls,
          useSitemapIndex,
          sitemapDefinitions,
        };
      } else {
        return {
          baseUrl: '',
          excludedUrls: [],
          useSitemapIndex: false,
          sitemapDefinitions: [],
        };
      }
    } catch (error) {
      strapi.log.error('Error fetching options:', error);
      throw new Error('Failed to fetch options');
    }
  },

  async updateOptions(data: any) {
    try {
      const results: any = await (strapi.documents as any)(OPTION_UID).findFirst();
      const excludedUrls = Array.isArray(data.excludedUrls)
        ? data.excludedUrls
        : [];
      const useSitemapIndex = Boolean(data.useSitemapIndex);
      const sitemapDefinitions = Array.isArray(data.sitemapDefinitions)
        ? data.sitemapDefinitions
        : [];
      const updateData = {
        baseUrl: data.baseURL != null ? String(data.baseURL) : '',
        excludedUrls,
        useSitemapIndex,
        sitemapDefinitions,
      };
      let response;
      if (results) {
        const rows = await strapi.db.query(OPTION_UID).findMany({ limit: 1 });
        const row = rows[0];
        if (row && row.id != null) {
          response = await strapi.db.query(OPTION_UID).update({
            where: { id: row.id },
            data: updateData,
          });
        } else {
          response = await (strapi.documents as any)(OPTION_UID).update({
            documentId: results.documentId,
            data: updateData,
          });
        }
      } else {
        response = await strapi.db.query(OPTION_UID).create({
          data: updateData,
        });
      }
      return { message: 'Data saved successfully', savedData: response };
    } catch (error) {
      strapi.log.error('Error saving data:', error);
      throw new Error('Failed to save data');
    }
  },

  async getCustomURLs() {
    try {
      const results = await (strapi.documents as any)(SINGLE_URL_UID).findMany();
      return {
        results,
      };
    } catch (error) {
      strapi.log.error('Error fetching data:', error);
      throw new Error('Failed to fetch data');
    }
  },

  async postCustomURLs(data: any) {
    try {
      const result = await (strapi.documents as any)(SINGLE_URL_UID).create({
        data,
      });
      return {
        message: 'Data saved successfully',
        savedData: result,
      };
    } catch (error) {
      strapi.log.error('Error saving data:', error);
      throw new Error('Failed to save data');
    }
  },

  async putCustomURLs(data: any) {
    try {
      const result = await strapi.db.query(SINGLE_URL_UID).update({
        where: { id: data.id },
        data: {
          slug: data.slug,
          priority: data.priority,
          frequency: data.frequency,
        },
      });
      return {
        message: 'Data saved successfully',
        savedData: result,
      };
    } catch (error) {
      strapi.log.error('Error saving data:', error);
      throw new Error('Failed to save data');
    }
  },

  async deleteCustomURLs(id: any) {
    try {
      const result = await strapi.db.query(SINGLE_URL_UID).delete({
        where: {
          id,
        },
      });
      return {
        message: 'Data deleted successfully',
        deletedData: result,
      };
    } catch (error) {
      strapi.log.error('Error deleting data:', error);
      throw new Error('Failed to delete data');
    }
  },
});

export default {
  service,
};
