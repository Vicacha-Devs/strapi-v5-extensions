import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../../shared';

interface ControllerCtx {
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
  const getSettingsSvc = () => strapi.plugin(PLUGIN_ID).service('settings');
  const getCatalogSvc = () => strapi.plugin(PLUGIN_ID).service('catalogService');
  const getMediaSvc = () =>
    strapi.plugin(PLUGIN_ID).service('mediaLibraryService');

  return {
    async getHubOverview(ctx: ControllerCtx) {
      const locale = ctx.query?.locale;
      const [settings, publications, galleries, glossary, mediaFolders] =
        await Promise.all([
          getSettingsSvc().getPublicSummary(),
          getCatalogSvc().listPublications({ locale }),
          getCatalogSvc().listGalleryAlbums({ locale }),
          getCatalogSvc().listGlossaryTerms({ locale }),
          getMediaSvc().listMediaFolders(),
        ]);

      ctx.body = {
        data: {
          settings,
          publications,
          galleries,
          glossary,
          mediaFolders,
          counts: {
            publications: publications.length,
            galleries: galleries.length,
            glossary: glossary.length,
            mediaFolders: mediaFolders.length,
          },
        },
      };
    },

    async listPublications(ctx: ControllerCtx) {
      const locale = ctx.query?.locale;
      const category = ctx.query?.category;
      const featured =
        ctx.query?.featured === 'true'
          ? true
          : ctx.query?.featured === 'false'
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
      const slug = ctx.params?.slug || '';
      const locale = ctx.query?.locale;
      const item = await getCatalogSvc().getPublicationBySlug(slug, locale);
      if (!item) {
        return ctx.notFound('Publication not found');
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

    async downloadPublication(ctx: ControllerCtx) {
      try {
        const slug = ctx.params?.slug || '';
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
        ctx.query?.featured === 'true'
          ? true
          : ctx.query?.featured === 'false'
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
      const slug = ctx.params?.slug || '';
      const locale = ctx.query?.locale;
      const item = await getCatalogSvc().getGalleryAlbumBySlug(slug, locale);
      if (!item) {
        return ctx.notFound('Gallery album not found');
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

    async listMediaFolders(ctx: ControllerCtx) {
      const folders = await getMediaSvc().listMediaFolders();
      ctx.body = { data: folders };
    },

    async syncAlbumMediaFolder(ctx: ControllerCtx) {
      try {
        const documentId =
          ctx.params?.documentId ||
          (ctx.request?.body?.documentId as string | undefined) ||
          '';
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
