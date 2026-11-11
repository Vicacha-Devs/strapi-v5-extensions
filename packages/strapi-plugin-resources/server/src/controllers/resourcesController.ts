import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../../shared";
import {
  sanitizePublicGalleryAlbum,
  sanitizePublicGlossaryTerm,
  sanitizePublicPublication,
} from "../services/catalogNormalizers";
import type catalogServiceFactory from "../services/catalogService";
import type settingsFactory from "../services/settings";
import { createAdminControllerActions } from "./adminControllerActions";
import {
  handleControllerError,
  parseFeaturedParam,
  parsePaginationParams,
  scalarString,
  type ControllerCtx,
} from "./controllerHelpers";

export type { ControllerCtx };

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsSvc = () =>
    strapi
      .plugin(PLUGIN_ID)
      .service<ReturnType<typeof settingsFactory>>("settings");
  const getCatalogSvc = () =>
    strapi
      .plugin(PLUGIN_ID)
      .service<ReturnType<typeof catalogServiceFactory>>("catalogService");

  const adminActions = createAdminControllerActions(strapi);

  return {
    /**
     * Public Content-API hub overview (`publishedOnly: true`, no Media Library
     * dump, internal fields & disabled/active-script download URLs redacted).
     */
    async getHubOverview(ctx: ControllerCtx) {
      try {
        const locale = scalarString(ctx.query?.locale, 35);
        const { pageSize } = parsePaginationParams(ctx.query);
        const [
          fullSettings,
          publicSummary,
          rawPublications,
          rawGalleries,
          rawGlossary,
        ] = await Promise.all([
          getSettingsSvc().getSettings(),
          getSettingsSvc().getPublicSummary(),
          getCatalogSvc().listPublications({
            locale,
            pageSize,
            publishedOnly: true,
          }),
          getCatalogSvc().listGalleryAlbums({
            locale,
            pageSize,
            publishedOnly: true,
          }),
          getCatalogSvc().listGlossaryTerms({
            locale,
            pageSize,
            publishedOnly: true,
          }),
        ]);

        const pubOpts = {
          allowedExtensions: fullSettings.allowedDownloadExtensions,
          allowedMimeTypes: fullSettings.allowedDownloadMimeTypes,
        };
        const publications = rawPublications.map((p) =>
          sanitizePublicPublication(p, pubOpts)
        );
        const galleries = rawGalleries.map((g) =>
          sanitizePublicGalleryAlbum(g)
        );
        const glossary = rawGlossary.map((t) => sanitizePublicGlossaryTerm(t));

        ctx.body = {
          data: {
            settings: publicSummary,
            publications,
            galleries,
            glossary,
            counts: {
              publications: publications.length,
              galleries: galleries.length,
              glossary: glossary.length,
            },
          },
        };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to load resources hub"
        );
      }
    },

    async listPublications(ctx: ControllerCtx) {
      try {
        const locale = scalarString(ctx.query?.locale, 35);
        const category = scalarString(ctx.query?.category, 40);
        const featured = parseFeaturedParam(ctx.query?.featured);
        const q = scalarString(ctx.query?.q, 120);
        const { page, pageSize } = parsePaginationParams(ctx.query);

        const [fullSettings, items] = await Promise.all([
          getSettingsSvc().getSettings(),
          getCatalogSvc().listPublications({
            locale,
            category,
            featured,
            q,
            page,
            pageSize,
            publishedOnly: true,
          }),
        ]);
        const pubOpts = {
          allowedExtensions: fullSettings.allowedDownloadExtensions,
          allowedMimeTypes: fullSettings.allowedDownloadMimeTypes,
        };
        ctx.body = {
          data: items.map((p) => sanitizePublicPublication(p, pubOpts)),
        };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to list publications"
        );
      }
    },

    async getPublicationBySlug(ctx: ControllerCtx) {
      try {
        const slug = scalarString(ctx.params?.slug, 120) || "";
        if (!slug) {
          return ctx.notFound("Publication not found");
        }
        const locale = scalarString(ctx.query?.locale, 35);
        const [fullSettings, item] = await Promise.all([
          getSettingsSvc().getSettings(),
          getCatalogSvc().getPublicationBySlug(slug, locale, {
            publishedOnly: true,
          }),
        ]);
        if (!item) {
          return ctx.notFound("Publication not found");
        }
        ctx.body = {
          data: sanitizePublicPublication(item, {
            allowedExtensions: fullSettings.allowedDownloadExtensions,
            allowedMimeTypes: fullSettings.allowedDownloadMimeTypes,
          }),
        };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to load publication"
        );
      }
    },

    async downloadPublication(ctx: ControllerCtx) {
      try {
        const slug = scalarString(ctx.params?.slug, 120) || "";
        if (!slug) {
          return ctx.notFound("Publication not found");
        }
        const locale = scalarString(ctx.query?.locale, 35);
        const ticket = await getCatalogSvc().recordPublicationDownload(
          slug,
          locale
        );
        if (ctx.set) {
          ctx.set("X-Content-Type-Options", "nosniff");
          ctx.set("Cache-Control", "private, no-store");
        }
        ctx.body = { data: ticket };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to issue download ticket"
        );
      }
    },

    async listGalleries(ctx: ControllerCtx) {
      try {
        const locale = scalarString(ctx.query?.locale, 35);
        const category = scalarString(ctx.query?.category, 40);
        const featured = parseFeaturedParam(ctx.query?.featured);
        const { page, pageSize } = parsePaginationParams(ctx.query);

        const items = await getCatalogSvc().listGalleryAlbums({
          locale,
          category,
          featured,
          page,
          pageSize,
          publishedOnly: true,
        });
        ctx.body = { data: items.map((g) => sanitizePublicGalleryAlbum(g)) };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to list gallery albums"
        );
      }
    },

    async getGalleryBySlug(ctx: ControllerCtx) {
      try {
        const slug = scalarString(ctx.params?.slug, 120) || "";
        if (!slug) {
          return ctx.notFound("Gallery album not found");
        }
        const locale = scalarString(ctx.query?.locale, 35);
        const item = await getCatalogSvc().getGalleryAlbumBySlug(slug, locale, {
          publishedOnly: true,
        });
        if (!item) {
          return ctx.notFound("Gallery album not found");
        }
        ctx.body = { data: sanitizePublicGalleryAlbum(item) };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to load gallery album"
        );
      }
    },

    async listGlossary(ctx: ControllerCtx) {
      try {
        const locale = scalarString(ctx.query?.locale, 35);
        const category = scalarString(ctx.query?.category, 40);
        const letterGroup = scalarString(ctx.query?.letter, 4);
        const q = scalarString(ctx.query?.q, 120);
        const { page, pageSize } = parsePaginationParams(ctx.query);

        const items = await getCatalogSvc().listGlossaryTerms({
          locale,
          category,
          letterGroup,
          q,
          page,
          pageSize,
          publishedOnly: true,
        });
        ctx.body = { data: items.map((t) => sanitizePublicGlossaryTerm(t)) };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to list glossary terms"
        );
      }
    },

    ...adminActions,
  };
};
