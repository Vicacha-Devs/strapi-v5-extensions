import type { Core } from "@strapi/strapi";
import _ from "lodash";

import type { ContentTypeSeoItem, ContentTypesResponse } from "../../../shared";
import openGraph from "../components/open-graph.json";
import seoContent from "../components/seo.json";

const BLACKLISTED_PLUGINS = [
  "upload",
  "i18n",
  "users-permissions",
  "content-releases",
  "review-workflows",
  "email",
  "seo",
  "email-designer-5",
];

const isContentManagerVisible = (ct: Core.ContentTypeSchema): boolean => {
  const pluginOptions = ct.__schema__?.pluginOptions ?? ct.pluginOptions;
  return pluginOptions?.["content-manager"]?.visible !== false;
};

const shouldIncludeContentType = (name: string, ct: Core.ContentTypeSchema): boolean => {
  if (name.startsWith("api::")) return true;
  return name.startsWith("plugin::") && isContentManagerVisible(ct);
};

const resolveGlobalId = (name: string, ct: Core.ContentTypeSchema): string => {
  if (ct.globalId) return ct.globalId;
  return ct.info?.displayName ?? name;
};

const buildContentTypeSeoItem = (name: string, ct: Core.ContentTypeSchema): ContentTypeSeoItem => ({
  seo: Boolean(_.get(ct, "attributes.seo.component", null)),
  uid: ct.uid ?? name,
  kind: ct.kind ?? "collectionType",
  globalId: resolveGlobalId(name, ct),
  attributes: ct.attributes ?? {},
});

const isAllowedPluginContentType = (name: string): boolean => {
  const pluginPrefix = name.replace("plugin::", "").split(".")[0];
  return !BLACKLISTED_PLUGINS.includes(pluginPrefix);
};

export const seoService = ({ strapi }: { strapi: Core.Strapi }) => ({
  getSeoComponent() {
    const seoComponent = strapi.components?.["shared.seo"];
    return seoComponent
      ? { attributes: seoComponent.attributes, category: seoComponent.category }
      : null;
  },

  getContentTypes(): ContentTypesResponse {
    const contentTypes = strapi.contentTypes || {};
    const keys = Object.keys(contentTypes);

    const collectionTypes: ContentTypeSeoItem[] = [];
    const singleTypes: ContentTypeSeoItem[] = [];
    const plugins: ContentTypeSeoItem[] = [];

    keys.forEach((name) => {
      const ct = contentTypes[name];
      if (!ct || !shouldIncludeContentType(name, ct)) return;

      const object = buildContentTypeSeoItem(name, ct);
      if (name.startsWith("api::")) {
        const targetList = ct.kind === "collectionType" ? collectionTypes : singleTypes;
        targetList.push(object);
      } else if (isAllowedPluginContentType(name)) {
        plugins.push(object);
      }
    });

    return { collectionTypes, singleTypes, plugins };
  },

  async createSeoComponent() {
    const seoComponent = await this.getSeoComponent();
    if (seoComponent) {
      return seoComponent;
    }

    if (!openGraph || !seoContent) {
      return null;
    }

    try {
      return await strapi.plugin("content-type-builder").services.components.createComponent({
        component: {
          category: "shared",
          displayName: seoContent.info.displayName,
          icon: seoContent.info.icon,
          attributes: seoContent.attributes,
        },
        components: [
          {
            tmpUID: "shared.open-graph",
            category: "shared",
            displayName: openGraph.info.displayName,
            icon: openGraph.info.icon,
            attributes: openGraph.attributes,
          },
        ],
      });
    } catch (error) {
      strapi.log?.error?.(String(error));
      return null;
    }
  },
});
