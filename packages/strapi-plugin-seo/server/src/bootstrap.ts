import type { Core } from "@strapi/strapi";

import {
  type SchemaAttribute,
  type SeoPluginConfig,
  findSeoAttributeName,
} from "../../shared";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  const actions = [
    {
      section: "plugins",
      displayName: "Access the SEO plugin",
      uid: "read",
      pluginName: "seo",
    },
    {
      section: "plugins",
      displayName: "Manage SEO plugin settings",
      uid: "settings.update",
      pluginName: "seo",
    },
  ];
  await strapi.admin.services.permission.actionProvider.registerMany(actions);

  const strapiAny = strapi as unknown as {
    config?: { get?: (key: string, defaultVal?: unknown) => unknown };
    documents?: {
      use?: (
        mw: (
          context: {
            action?: string;
            uid: string;
            params?: { data?: Record<string, unknown>; locale?: unknown };
          },
          next: () => Promise<unknown>
        ) => Promise<unknown>
      ) => void;
    };
  };

  const cfg =
    (strapiAny.config?.get?.("plugin::seo", {}) as
      | SeoPluginConfig
      | undefined) ?? {};

  if (cfg.autoCreateComponent) {
    try {
      const seoSvc = strapi.plugin("seo")?.service?.("seo") as
        | {
            getSeoComponent?: () => unknown;
            createSeoComponent?: () => Promise<unknown>;
          }
        | undefined;
      if (seoSvc?.getSeoComponent && !seoSvc.getSeoComponent()) {
        await seoSvc.createSeoComponent?.();
      }
    } catch {
      // Ignore if content-type-builder is unavailable
    }
  }

  if (
    cfg.autoPopulateOnSave &&
    typeof strapiAny.documents?.use === "function"
  ) {
    strapiAny.documents.use(async (context, next) => {
      if (context.action === "create" || context.action === "update") {
        const uid = context.uid;
        const ct = strapi.contentTypes?.[uid] as
          | { attributes?: Record<string, SchemaAttribute> }
          | undefined;
        const seoFieldName = findSeoAttributeName(ct?.attributes);
        const data = context.params?.data;
        if (seoFieldName && data) {
          const seoSvc = strapi.plugin("seo")?.service?.("seo") as
            | {
                autoPopulateSeoData?: (args: {
                  uid: string;
                  doc: Record<string, unknown>;
                  locale?: string | null;
                  seoFieldName: string;
                }) => Promise<Record<string, unknown> | null>;
              }
            | undefined;
          const populated = await seoSvc?.autoPopulateSeoData?.({
            uid,
            doc: data,
            locale:
              typeof context.params?.locale === "string"
                ? context.params.locale
                : null,
            seoFieldName,
          });
          if (populated) {
            data[seoFieldName] = populated;
          }
        }
      }
      return next();
    });
  }
};

export default bootstrap;
