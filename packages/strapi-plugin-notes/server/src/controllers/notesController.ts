import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../../shared";
import type createNotesService from "../services/notesService";
import { NotesValidationError } from "../services/notesService";

type NotesServiceInstance = ReturnType<typeof createNotesService>;

export interface KoaContext {
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  request?: {
    body?: unknown;
  };
  state?: {
    user?: unknown;
  };
  status?: number;
  body?: unknown;
  badRequest?: (message: string, details?: unknown) => unknown;
  notFound?: (message?: string) => unknown;
  send?: (payload: unknown) => unknown;
}

function sendJson(ctx: KoaContext, payload: unknown, statusCode = 200) {
  ctx.status = statusCode;
  if (typeof ctx.send === "function" && statusCode === 200) {
    ctx.send(payload);
  }
  ctx.body = payload;
  return payload;
}

function sendBadRequest(ctx: KoaContext, message: string, details?: string[]) {
  if (typeof ctx.badRequest === "function") {
    return ctx.badRequest(message, { errors: details ?? [message] });
  }
  return sendJson(
    ctx,
    {
      data: null,
      error: {
        status: 400,
        name: "ValidationError",
        message,
        details: { errors: details ?? [message] },
      },
    },
    400
  );
}

function sendNotFound(ctx: KoaContext, message = "Note not found.") {
  if (typeof ctx.notFound === "function") {
    return ctx.notFound(message);
  }
  return sendJson(
    ctx,
    {
      data: null,
      error: {
        status: 404,
        name: "NotFoundError",
        message,
      },
    },
    404
  );
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getService = (): NotesServiceInstance =>
    strapi.plugin(PLUGIN_ID).service<NotesServiceInstance>("notesService");

  return {
    async find(ctx: KoaContext) {
      const query = ctx.query ?? {};
      const service = getService();
      const notes = await service.find(query);
      const summary = await service.getSummaryStats(query);
      return sendJson(ctx, {
        data: notes,
        meta: {
          total: notes.length,
          summary,
        },
      });
    },

    async stats(ctx: KoaContext) {
      const query = ctx.query ?? {};
      const summary = await getService().getSummaryStats(query);
      return sendJson(ctx, { data: summary });
    },

    async findOne(ctx: KoaContext) {
      const id = ctx.params?.id ?? "";
      if (!id) {
        return sendBadRequest(ctx, "Note identifier is required.");
      }
      const note = await getService().findOne(id);
      if (!note) {
        return sendNotFound(ctx);
      }
      return sendJson(ctx, { data: note });
    },

    async create(ctx: KoaContext) {
      try {
        const created = await getService().create(
          ctx.request?.body ?? {},
          ctx.state?.user
        );
        return sendJson(ctx, { data: created }, 201);
      } catch (err) {
        if (err instanceof NotesValidationError) {
          return sendBadRequest(ctx, err.message, err.details);
        }
        throw err;
      }
    },

    async update(ctx: KoaContext) {
      const id = ctx.params?.id ?? "";
      if (!id) {
        return sendBadRequest(ctx, "Note identifier is required.");
      }
      try {
        const updated = await getService().update(
          id,
          ctx.request?.body ?? {},
          ctx.state?.user
        );
        if (!updated) {
          return sendNotFound(ctx);
        }
        return sendJson(ctx, { data: updated });
      } catch (err) {
        if (err instanceof NotesValidationError) {
          return sendBadRequest(ctx, err.message, err.details);
        }
        throw err;
      }
    },

    async delete(ctx: KoaContext) {
      const id = ctx.params?.id ?? "";
      if (!id) {
        return sendBadRequest(ctx, "Note identifier is required.");
      }
      const deleted = await getService().delete(id);
      if (!deleted) {
        return sendNotFound(ctx);
      }
      return sendJson(ctx, { data: deleted });
    },
  };
};
