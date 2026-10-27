const contentType = {
  schema: {
    kind: 'collectionType',
    collectionName: 'strapi_5_sitemap_plugin_content_types',
    info: {
      singularName: 'sitemap-content-type',
      pluralName: 'sitemap-content-types',
      displayName: 'Sitemap Content Type',
    },
    options: {
      comment: '',
    },
    pluginOptions: {
      'content-manager': {
        visible: false,
      },
      'content-type-builder': {
        visible: false,
      },
    },
    attributes: {
      type: {
        type: 'string',
      },
      langcode: {
        type: 'string',
      },
      pattern: {
        type: 'string',
      },
      priority: {
        type: 'float',
      },
      frequency: {
        type: 'string',
      },
      lastModified: {
        type: 'string',
      },
      thumbnail: {
        type: 'string',
      },
      populateLinkedModels: {
        type: 'string',
      },
    },
  },
};

const contentTypeSingle = {
  schema: {
    kind: 'collectionType',
    collectionName: 'strapi_5_sitemap_plugin_content_type_single_urls',
    info: {
      singularName: 'sitemap-content-type-single-url',
      pluralName: 'sitemap-content-type-single-urls',
      displayName: 'Sitemap Single URL',
    },
    options: {
      comment: '',
    },
    pluginOptions: {
      'content-manager': {
        visible: false,
      },
      'content-type-builder': {
        visible: false,
      },
    },
    attributes: {
      slug: {
        type: 'string',
      },
      priority: {
        type: 'float',
      },
      frequency: {
        type: 'string',
      },
    },
  },
};

const options = {
  schema: {
    kind: 'singleType',
    collectionName: 'strapi_5_sitemap_plugin_options',
    info: {
      singularName: 'sitemap-option',
      pluralName: 'sitemap-options',
      displayName: 'Sitemap Options',
    },
    options: {
      comment: '',
    },
    pluginOptions: {
      'content-manager': {
        visible: false,
      },
      'content-type-builder': {
        visible: false,
      },
    },
    attributes: {
      baseUrl: {
        type: 'string',
      },
      excludedUrls: {
        type: 'json',
        default: [],
      },
      useSitemapIndex: {
        type: 'boolean',
        default: false,
      },
      sitemapDefinitions: {
        type: 'json',
        default: [],
      },
    },
  },
};

export default {
  'sitemap-content-type': contentType,
  'sitemap-content-type-single-url': contentTypeSingle,
  'sitemap-option': options,
};
