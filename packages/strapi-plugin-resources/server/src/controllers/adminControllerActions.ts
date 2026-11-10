import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../../shared";
import type catalogServiceFactory from "../services/catalogService";
import type mediaLibraryServiceFactory from "../services/mediaLibraryService";
import type settingsFactory from "../services/settings";
import {
  handleControllerError,
  parseFeaturedParam,
  parsePaginationParams,
  scalarString,
  type ControllerCtx,
} from "./controllerHelpers";

export function createAdminControllerActions(strapi: Core.Strapi) {
  const getSettingsSvc = () =>
    strapi
      .plugin(PLUGIN_ID)
      .service<ReturnType<typeof settingsFactory>>("settings");
  const getCatalogSvc = () =>
    strapi
      .plugin(PLUGIN_ID)
      .service<ReturnType<typeof catalogServiceFactory>>("catalogService");
  const getMediaSvc = () =>
    strapi
      .plugin(PLUGIN_ID)
      .service<ReturnType<typeof mediaLibraryServiceFactory>>(
        "mediaLibraryService"
      );

  return {
    async getAdminHubOverview(ctx: ControllerCtx) {
      try {
        const locale = scalarString(ctx.query?.locale, 35);
        const [
          settings,
          publications,
          galleries,
          glossary,
          mediaFolders,
          mediaFiles,
        ] = await Promise.all([
          getSettingsSvc().getSettings(),
          getCatalogSvc().listPublications({ locale, publishedOnly: false }),
          getCatalogSvc().listGalleryAlbums({ locale, publishedOnly: false }),
          getCatalogSvc().listGlossaryTerms({ locale, publishedOnly: false }),
          getMediaSvc().listMediaFolders(),
          getMediaSvc().listMediaFiles
            ? getMediaSvc().listMediaFiles({ limit: 100 })
            : Promise.resolve([]),
        ]);

        ctx.body = {
          data: {
            settings,
            publications,
            galleries,
            glossary,
            mediaFolders,
            mediaFiles,
            counts: {
              publications: publications.length,
              galleries: galleries.length,
              glossary: glossary.length,
              mediaFolders: mediaFolders.length,
              mediaFiles: mediaFiles.length,
            },
          },
        };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to load admin resources hub"
        );
      }
    },

    async listAdminPublications(ctx: ControllerCtx) {
      try {
        const locale = scalarString(ctx.query?.locale, 35);
        const category = scalarString(ctx.query?.category, 40);
        const featured = parseFeaturedParam(ctx.query?.featured);
        const q = scalarString(ctx.query?.q, 120);
        const { page, pageSize } = parsePaginationParams(ctx.query);

        const items = await getCatalogSvc().listPublications({
          locale,
          category,
          featured,
          q,
          page,
          pageSize,
          publishedOnly: false,
        });
        ctx.body = { data: items };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to list publications"
        );
      }
    },

    async createPublication(ctx: ControllerCtx) {
      try {
        const locale = scalarString(ctx.query?.locale, 35);
        const created = await getCatalogSvc().createPublication(
          ctx.request?.body,
          locale
        );
        ctx.status = 201;
        ctx.body = { data: created };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to create publication"
        );
      }
    },

    async updatePublication(ctx: ControllerCtx) {
      try {
        const documentId = scalarString(ctx.params?.documentId, 120) || "";
        const locale = scalarString(ctx.query?.locale, 35);
        const updated = await getCatalogSvc().updatePublication(
          documentId,
          ctx.request?.body,
          locale
        );
        ctx.body = { data: updated };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to update publication"
        );
      }
    },

    async deletePublication(ctx: ControllerCtx) {
      try {
        const documentId = scalarString(ctx.params?.documentId, 120) || "";
        const result = await getCatalogSvc().deletePublication(documentId);
        ctx.body = { data: result };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to delete publication"
        );
      }
    },

    async listAdminGalleries(ctx: ControllerCtx) {
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
          publishedOnly: false,
        });
        ctx.body = { data: items };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to list gallery albums"
        );
      }
    },

    async createGalleryAlbum(ctx: ControllerCtx) {
      try {
        const locale = scalarString(ctx.query?.locale, 35);
        const created = await getCatalogSvc().createGalleryAlbum(
          ctx.request?.body,
          locale
        );
        ctx.status = 201;
        ctx.body = { data: created };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to create gallery album"
        );
      }
    },

    async updateGalleryAlbum(ctx: ControllerCtx) {
      try {
        const documentId = scalarString(ctx.params?.documentId, 120) || "";
        const locale = scalarString(ctx.query?.locale, 35);
        const updated = await getCatalogSvc().updateGalleryAlbum(
          documentId,
          ctx.request?.body,
          locale
        );
        ctx.body = { data: updated };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to update gallery album"
        );
      }
    },

    async deleteGalleryAlbum(ctx: ControllerCtx) {
      try {
        const documentId = scalarString(ctx.params?.documentId, 120) || "";
        const result = await getCatalogSvc().deleteGalleryAlbum(documentId);
        ctx.body = { data: result };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to delete gallery album"
        );
      }
    },

    async listAdminGlossary(ctx: ControllerCtx) {
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
          publishedOnly: false,
        });
        ctx.body = { data: items };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to list glossary terms"
        );
      }
    },

    async createGlossaryTerm(ctx: ControllerCtx) {
      try {
        const locale = scalarString(ctx.query?.locale, 35);
        const created = await getCatalogSvc().createGlossaryTerm(
          ctx.request?.body,
          locale
        );
        ctx.status = 201;
        ctx.body = { data: created };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to create glossary term"
        );
      }
    },

    async updateGlossaryTerm(ctx: ControllerCtx) {
      try {
        const documentId = scalarString(ctx.params?.documentId, 120) || "";
        const locale = scalarString(ctx.query?.locale, 35);
        const updated = await getCatalogSvc().updateGlossaryTerm(
          documentId,
          ctx.request?.body,
          locale
        );
        ctx.body = { data: updated };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to update glossary term"
        );
      }
    },

    async deleteGlossaryTerm(ctx: ControllerCtx) {
      try {
        const documentId = scalarString(ctx.params?.documentId, 120) || "";
        const result = await getCatalogSvc().deleteGlossaryTerm(documentId);
        ctx.body = { data: result };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to delete glossary term"
        );
      }
    },

    async listMediaFolders(ctx: ControllerCtx) {
      try {
        const folders = await getMediaSvc().listMediaFolders();
        ctx.body = { data: folders };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to list media folders"
        );
      }
    },

    async listMediaFiles(ctx: ControllerCtx) {
      try {
        const mimePrefix = scalarString(ctx.query?.mimePrefix, 40);
        const { pageSize } = parsePaginationParams(ctx.query);
        const files = getMediaSvc().listMediaFiles
          ? await getMediaSvc().listMediaFiles({
              mimePrefix,
              limit: pageSize,
            })
          : [];
        ctx.body = { data: files };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to list media files"
        );
      }
    },

    async syncAlbumMediaFolder(ctx: ControllerCtx) {
      try {
        const documentId =
          scalarString(ctx.params?.documentId, 120) ||
          scalarString(ctx.request?.body?.documentId, 120) ||
          "";
        const locale = scalarString(ctx.query?.locale, 35);
        const force = ctx.request?.body?.force === true;
        const result = await getMediaSvc().syncAlbumFromMediaFolder(
          documentId,
          locale,
          { force }
        );
        ctx.body = { data: result };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to synchronize media folder"
        );
      }
    },

    async getSettings(ctx: ControllerCtx) {
      try {
        const data = await getSettingsSvc().getSettings();
        ctx.body = { data };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to load settings"
        );
      }
    },

    async updateSettings(ctx: ControllerCtx) {
      try {
        const data = await getSettingsSvc().updateSettings(
          ctx.request?.body || {}
        );
        ctx.body = { data };
      } catch (err) {
        return handleControllerError(
          strapi,
          ctx,
          err,
          "Failed to update settings"
        );
      }
    },
  };
}
