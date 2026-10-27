import type { Core } from '@strapi/strapi';
import _ from 'lodash';
import type { ContentTypeSeoItem, ContentTypesResponse } from '../../../shared';
import openGraph from '../components/open-graph.json';
import seoContent from '../components/seo.json';

export const seoService = ({ strapi }: { strapi: Core.Strapi }) => ({
  getSeoComponent() {
    const seoComponent = strapi.components?.['shared.seo'];
    return seoComponent
      ? { attributes: seoComponent.attributes, category: seoComponent.category }
      : null;
  },

  getContentTypes(): ContentTypesResponse {
    const contentTypes = strapi.contentTypes || {};
    const keys = Object.keys(contentTypes);

    const blackListedPlugins = [
      'upload',
      'i18n',
      'users-permissions',
      'content-releases',
      'review-workflows',
      'email',
      'seo',
      'email-designer-5',
    ];

    const collectionTypes: ContentTypeSeoItem[] = [];
    const singleTypes: ContentTypeSeoItem[] = [];
    const plugins: ContentTypeSeoItem[] = [];

    keys.forEach((name) => {
      const ct = contentTypes[name];
      if (!ct) return;
      const hasSharedSeoComponent = _.get(ct, 'attributes.seo.component', null);
      const pluginOptions = ct?.__schema__?.pluginOptions ?? ct?.pluginOptions ?? {};
      const cmVisible = pluginOptions?.['content-manager']?.visible;

      if (
        name.startsWith('api::') ||
        (name.startsWith('plugin::') && cmVisible !== false)
      ) {
        const object: ContentTypeSeoItem = {
          seo: Boolean(hasSharedSeoComponent),
          uid: ct?.uid ?? name,
          kind: ct?.kind ?? 'collectionType',
          globalId: ct?.globalId ?? ct?.info?.displayName ?? name,
          attributes: ct?.attributes ?? {},
        };

        if (name.startsWith('api::')) {
          if (ct?.kind === 'collectionType') {
            collectionTypes.push(object);
          } else {
            singleTypes.push(object);
          }
        } else {
          const pluginPrefix = name.replace('plugin::', '').split('.')[0];
          if (!blackListedPlugins.includes(pluginPrefix)) {
            plugins.push(object);
          }
        }
      }
    });

    return { collectionTypes, singleTypes, plugins };
  },

  async createSeoComponent() {
    const seoComponent = await this.getSeoComponent();

    if (!seoComponent) {
      if (openGraph && seoContent) {
        try {
          const res = await strapi
            .plugin('content-type-builder')
            .services.components.createComponent({
              component: {
                category: 'shared',
                displayName: seoContent.info.displayName,
                icon: seoContent.info.icon,
                attributes: seoContent.attributes,
              },
              components: [
                {
                  tmpUID: 'shared.open-graph',
                  category: 'shared',
                  displayName: openGraph.info.displayName,
                  icon: openGraph.info.icon,
                  attributes: openGraph.attributes,
                },
              ],
            });
          return res;
        } catch (error) {
          strapi.log?.error?.(String(error));
          return null;
        }
      } else {
        return null;
      }
    }

    return seoComponent;
  },
});
