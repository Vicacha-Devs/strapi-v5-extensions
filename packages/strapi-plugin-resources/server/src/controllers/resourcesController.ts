import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../../shared";
import type catalogServiceFactory from "../services/catalogService";
import type mediaLibraryServiceFactory from "../services/mediaLibraryService";
import type settingsFactory from "../services/settings";

export interface ControllerCtx {
  query?: Record<string, string | undefined>;
  params?: Record<string, string | undefined>;
  request?: {
    body?: Record<string, unknown>;
  };
  body?: unknown;
  status?: number;
  set?: (key: string, value: string) => void;
  badRequest: (msg: string) => unknown;
  notFound: (msg: string) => unknown;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
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
    async getHubOverview(ctx: ControllerCtx) {
      const locale = ctx.query?.locale;
      const [
        settings,
        publications,
        galleries,
        glossary,
        mediaFolders,
        mediaFiles,
      ] = await Promise.all([
        getSettingsSvc().getPublicSummary(),
        getCatalogSvc().listPublications({ locale }),
        getCatalogSvc().listGalleryAlbums({ locale }),
        getCatalogSvc().listGlossaryTerms({ locale }),
        getMediaSvc().listMediaFolders(),
        getMediaSvc().listMediaFiles
          ? getMediaSvc().listMediaFiles({ limit: 200 })
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
    },

    async listPublications(ctx: ControllerCtx) {
      const locale = ctx.query?.locale;
      const category = ctx.query?.category;
      const featured =
        ctx.query?.featured === "true"
          ? true
          : ctx.query?.featured === "false"
            ? false
            : undefined;
      const q = ctx.query?.q;

      const items = await getCatalogSvc().listPublications({
        locale,
        category,
        featured,
        q,
      });
      ctx.body = { data: items };
    },

    async getPublicationBySlug(ctx: ControllerCtx) {
      const slug = ctx.params?.slug || "";
      const locale = ctx.query?.locale;
      const item = await getCatalogSvc().getPublicationBySlug(slug, locale);
      if (!item) {
        return ctx.notFound("Publication not found");
      }
      ctx.body = { data: item };
    },

    async createPublication(ctx: ControllerCtx) {
      try {
        const locale = ctx.query?.locale;
        const created = await getCatalogSvc().createPublication(
          ctx.request?.body,
          locale
        );
        ctx.status = 201;
        ctx.body = { data: created };
      } catch (err) {
        return ctx.badRequest((err as Error).message);
      }
    },

    async updatePublication(ctx: ControllerCtx) {
      try {
        const documentId = ctx.params?.documentId || "";
        const locale = ctx.query?.locale;
        const updated = await getCatalogSvc().updatePublication(
          documentId,
          ctx.request?.body,
          locale
        );
        ctx.body = { data: updated };
      } catch (err) {
        return ctx.badRequest((err as Error).message);
      }
    },

    async deletePublication(ctx: ControllerCtx) {
      try {
        const documentId = ctx.params?.documentId || "";
        const result = await getCatalogSvc().deletePublication(documentId);
        ctx.body = { data: result };
      } catch (err) {
        return ctx.badRequest((err as Error).message);
      }
    },

    async downloadPublication(ctx: ControllerCtx) {
      try {
        const slug = ctx.params?.slug || "";
        const locale = ctx.query?.locale;
        const ticket = await getCatalogSvc().recordPublicationDownload(
          slug,
          locale
        );
        if (ctx.set && ticket.headers) {
          for (const [k, v] of Object.entries(ticket.headers)) {
            ctx.set(k, v as string);
          }
        }
        ctx.body = { data: ticket };
      } catch (err) {
        return ctx.badRequest((err as Error).message);
      }
    },

    async listGalleries(ctx: ControllerCtx) {
      const locale = ctx.query?.locale;
      const category = ctx.query?.category;
      const featured =
        ctx.query?.featured === "true"
          ? true
          : ctx.query?.featured === "false"
            ? false
            : undefined;
      const items = await getCatalogSvc().listGalleryAlbums({
        locale,
        category,
        featured,
      });
      ctx.body = { data: items };
    },

    async getGalleryBySlug(ctx: ControllerCtx) {
      const slug = ctx.params?.slug || "";
      const locale = ctx.query?.locale;
      const item = await getCatalogSvc().getGalleryAlbumBySlug(slug, locale);
      if (!item) {
        return ctx.notFound("Gallery album not found");
      }
      ctx.body = { data: item };
    },

    async createGalleryAlbum(ctx: ControllerCtx) {
      try {
        const locale = ctx.query?.locale;
        const created = await getCatalogSvc().createGalleryAlbum(
          ctx.request?.body,
          locale
        );
        ctx.status = 201;
        ctx.body = { data: created };
      } catch (err) {
        return ctx.badRequest((err as Error).message);
      }
    },

    async updateGalleryAlbum(ctx: ControllerCtx) {
      try {
        const documentId = ctx.params?.documentId || "";
        const locale = ctx.query?.locale;
        const updated = await getCatalogSvc().updateGalleryAlbum(
          documentId,
          ctx.request?.body,
          locale
        );
        ctx.body = { data: updated };
      } catch (err) {
        return ctx.badRequest((err as Error).message);
      }
    },

    async deleteGalleryAlbum(ctx: ControllerCtx) {
      try {
        const documentId = ctx.params?.documentId || "";
        const result = await getCatalogSvc().deleteGalleryAlbum(documentId);
        ctx.body = { data: result };
      } catch (err) {
        return ctx.badRequest((err as Error).message);
      }
    },

    async listGlossary(ctx: ControllerCtx) {
      const locale = ctx.query?.locale;
      const category = ctx.query?.category;
      const letterGroup = ctx.query?.letter;
      const q = ctx.query?.q;
      const items = await getCatalogSvc().listGlossaryTerms({
        locale,
        category,
        letterGroup,
        q,
      });
      ctx.body = { data: items };
    },

    async createGlossaryTerm(ctx: ControllerCtx) {
      try {
        const locale = ctx.query?.locale;
        const created = await getCatalogSvc().createGlossaryTerm(
          ctx.request?.body,
          locale
        );
        ctx.status = 201;
        ctx.body = { data: created };
      } catch (err) {
        return ctx.badRequest((err as Error).message);
      }
    },

    async updateGlossaryTerm(ctx: ControllerCtx) {
      try {
        const documentId = ctx.params?.documentId || "";
        const locale = ctx.query?.locale;
        const updated = await getCatalogSvc().updateGlossaryTerm(
          documentId,
          ctx.request?.body,
          locale
        );
        ctx.body = { data: updated };
      } catch (err) {
        return ctx.badRequest((err as Error).message);
      }
    },

    async deleteGlossaryTerm(ctx: ControllerCtx) {
      try {
        const documentId = ctx.params?.documentId || "";
        const result = await getCatalogSvc().deleteGlossaryTerm(documentId);
        ctx.body = { data: result };
      } catch (err) {
        return ctx.badRequest((err as Error).message);
      }
    },

    async listMediaFolders(ctx: ControllerCtx) {
      const folders = await getMediaSvc().listMediaFolders();
      ctx.body = { data: folders };
    },

    async listMediaFiles(ctx: ControllerCtx) {
      const mimePrefix = ctx.query?.mimePrefix;
      const files = getMediaSvc().listMediaFiles
        ? await getMediaSvc().listMediaFiles({ mimePrefix })
        : [];
      ctx.body = { data: files };
    },

    async syncAlbumMediaFolder(ctx: ControllerCtx) {
      try {
        const documentId =
          ctx.params?.documentId ||
          (ctx.request?.body?.documentId as string | undefined) ||
          "";
        const locale = ctx.query?.locale;
        const result = await getMediaSvc().syncAlbumFromMediaFolder(
          documentId,
          locale
        );
        ctx.body = { data: result };
      } catch (err) {
        return ctx.badRequest((err as Error).message);
      }
    },

    async getSettings(ctx: ControllerCtx) {
      const data = await getSettingsSvc().getSettings();
      ctx.body = { data };
    },

    async updateSettings(ctx: ControllerCtx) {
      try {
        const data = await getSettingsSvc().updateSettings(
          ctx.request?.body || {}
        );
        ctx.body = { data };
      } catch (err) {
        return ctx.badRequest((err as Error).message);
      }
    },
  };
};
