import type { Core } from "@strapi/strapi";

import { MAX_SCAN_WINDOW } from "../services/catalogHelpers";
import {
  ResourceNotFoundError,
  ResourceValidationError,
} from "../services/errors";

export interface ControllerCtx {
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  request?: {
    body?: Record<string, unknown>;
  };
  body?: unknown;
  status?: number;
  set?: (key: string, value: string) => void;
  badRequest: (msg: string) => unknown;
  notFound: (msg: string) => unknown;
}

export function scalarString(val: unknown, maxLen = 120): string | undefined {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim();
  return trimmed ? trimmed.slice(0, maxLen) : undefined;
}

export function parseFeaturedParam(val: unknown): boolean | undefined {
  if (val === "true") return true;
  if (val === "false") return false;
  return undefined;
}

function parseClampedInt(
  val: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof val !== "string" && typeof val !== "number") return fallback;
  const trimmed = typeof val === "string" ? val.trim() : val;
  if (trimmed === "") return fallback;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(num)));
}

export function parsePaginationParams(query?: Record<string, unknown>): {
  page: number;
  pageSize: number;
} {
  const rawLimit = query?.limit !== undefined ? query.limit : query?.pageSize;
  const pageSize = parseClampedInt(rawLimit, 1, 100, 100);
  const maxPageForWindow = Math.floor(MAX_SCAN_WINDOW / pageSize) + 1;
  const page = parseClampedInt(
    query?.page,
    1,
    Math.max(2, maxPageForWindow),
    1
  );
  return { page, pageSize };
}

export function handleControllerError(
  strapi: Core.Strapi,
  ctx: ControllerCtx,
  err: unknown,
  fallbackMsg: string
): unknown {
  if (err instanceof ResourceNotFoundError) {
    return ctx.notFound(err.message);
  }
  if (err instanceof ResourceValidationError) {
    return ctx.badRequest(err.message);
  }
  const message = err instanceof Error ? err.message : String(err);
  strapi.log?.error?.(`[strapi-plugin-resources] ${fallbackMsg}: ${message}`);
  ctx.status = 500;
  ctx.body = {
    error: {
      status: 500,
      name: "InternalServerError",
      message: fallbackMsg,
    },
  };
  return ctx.body;
}
