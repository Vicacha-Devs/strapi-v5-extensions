import type { Core } from "@strapi/strapi";

import {
  type ContentTypeSeoItem,
  type ContentTypesResponse,
  type GeneratedSeoMetadata,
  type SchemaAttribute,
  type SeoGeneratorContext,
  type SeoPluginConfig,
  findSeoAttributeName,
} from "../../../shared";
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

const shouldIncludeContentType = (
  name: string,
  ct: Core.ContentTypeSchema
): boolean => {
  if (name.startsWith("api::")) return true;
  return name.startsWith("plugin::") && isContentManagerVisible(ct);
};

const resolveGlobalId = (name: string, ct: Core.ContentTypeSchema): string => {
  if (ct.globalId) return ct.globalId;
  return ct.info?.displayName ?? name;
};

const hasSeoComponentAttribute = (ct: Core.ContentTypeSchema): boolean =>
  findSeoAttributeName(
    ct.attributes as Record<string, SchemaAttribute> | undefined
  ) !== null;

const buildContentTypeSeoItem = (
  name: string,
  ct: Core.ContentTypeSchema
): ContentTypeSeoItem => ({
  seo: hasSeoComponentAttribute(ct),
  uid: ct.uid ?? name,
  kind: ct.kind ?? "collectionType",
  globalId: resolveGlobalId(name, ct),
  attributes: ct.attributes ?? {},
});

const isAllowedPluginContentType = (name: string): boolean => {
  const pluginPrefix = name.replace("plugin::", "").split(".")[0];
  return !BLACKLISTED_PLUGINS.includes(pluginPrefix);
};

const pickString = (val: unknown, maxLen?: number): string | null => {
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  if (maxLen && trimmed.length > maxLen) {
    return `${trimmed.slice(0, maxLen - 1).trimEnd()}…`;
  }
  return trimmed;
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
        const targetList =
          ct.kind === "collectionType" ? collectionTypes : singleTypes;
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

    const hasOpenGraph = Boolean(strapi.components?.["shared.open-graph"]);

    try {
      return await strapi
        .plugin("content-type-builder")
        .services.components.createComponent({
          component: {
            category: "shared",
            displayName: seoContent.info.displayName,
            icon: seoContent.info.icon,
            attributes: seoContent.attributes,
          },
          components: hasOpenGraph
            ? []
            : [
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

  getPluginConfig(): SeoPluginConfig {
    try {
      const s = strapi as unknown as {
        config?: { get?: (key: string, defaultVal?: unknown) => unknown };
      };
      return (s.config?.get?.("plugin::seo", {}) as SeoPluginConfig) ?? {};
    } catch {
      return {};
    }
  },

  async generateSeoMetadata(
    params: Omit<SeoGeneratorContext, "strapi">
  ): Promise<GeneratedSeoMetadata> {
    const cfg = this.getPluginConfig();
    const ctx: SeoGeneratorContext = {
      uid: params.uid,
      doc: params.doc ?? {},
      locale: params.locale ?? null,
      strapi,
    };

    const rawTitle = cfg.generateTitle
      ? await cfg.generateTitle(ctx)
      : (ctx.doc.title ?? ctx.doc.name ?? ctx.doc.heading);
    const rawDesc = cfg.generateDescription
      ? await cfg.generateDescription(ctx)
      : (ctx.doc.excerpt ?? ctx.doc.summary ?? ctx.doc.description);
    const rawImage = cfg.generateImage
      ? await cfg.generateImage(ctx)
      : (ctx.doc.coverImage ?? ctx.doc.image ?? ctx.doc.thumbnail ?? null);
    const rawUrl = cfg.generateURL
      ? await cfg.generateURL(ctx)
      : ((ctx.doc.seo as Record<string, unknown> | undefined)?.canonicalURL ??
        null);

    return {
      metaTitle: pickString(rawTitle, 60),
      metaDescription: pickString(rawDesc, 160),
      metaImage: rawImage ?? null,
      canonicalURL: pickString(rawUrl),
    };
  },

  async autoPopulateSeoData(
    params: Omit<SeoGeneratorContext, "strapi"> & {
      seoFieldName: string;
    }
  ): Promise<Record<string, unknown> | null> {
    const generated = await this.generateSeoMetadata(params);
    const existing =
      params.doc[params.seoFieldName] &&
      typeof params.doc[params.seoFieldName] === "object"
        ? { ...(params.doc[params.seoFieldName] as Record<string, unknown>) }
        : {};

    let changed = false;
    if (!existing.metaTitle && generated.metaTitle) {
      existing.metaTitle = generated.metaTitle;
      changed = true;
    }
    if (!existing.metaDescription && generated.metaDescription) {
      existing.metaDescription = generated.metaDescription;
      changed = true;
    }
    if (!existing.metaImage && generated.metaImage) {
      existing.metaImage = generated.metaImage;
      changed = true;
    }
    if (!existing.canonicalURL && generated.canonicalURL) {
      existing.canonicalURL = generated.canonicalURL;
      changed = true;
    }
    return changed ? existing : null;
  },
});
