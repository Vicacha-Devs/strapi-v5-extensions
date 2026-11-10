import type { Core } from "@strapi/strapi";

import { PLUGIN_ID } from "../../../shared/pluginId";
import type {
  AssignableHost,
  AvailableSlot,
  BookingRecord,
  BookingResource,
  CancelBookingInput,
  CreateReservationInput,
  RescheduleBookingInput,
} from "../../../shared/types";
import {
  BookingForbiddenError,
  BookingNotFoundError,
  BookingValidationError,
} from "../errors";
import {
  parseBoundaryMs,
  verifySecretToken,
} from "../services/reservationHelpers";
import type {
  AvailabilityService,
  BookingsPluginConfig,
  ReservationService,
  SettingsService,
} from "../types";

export interface ContentApiContext {
  query: Record<string, string | undefined>;
  params: Record<string, string | undefined>;
  request: {
    body?: Record<string, unknown>;
    headers?: Record<string, string | undefined>;
  };
  body: unknown;
  status: number;
  set(header: string, value: string): void;
  badRequest(message: string): unknown;
  notFound?(message: string): unknown;
  forbidden?(message: string): unknown;
}

const MAX_PUBLIC_SLOTS_RANGE_MS = 90 * 86_400_000;
const MAX_PUBLIC_FEED_RANGE_MS = 366 * 86_400_000;

export function sanitizePublicHost(host: AssignableHost): AssignableHost {
  return {
    id: host.id,
    name: host.name,
    ...(Array.isArray(host.languages) ? { languages: host.languages } : {}),
    ...(host.role !== undefined ? { role: host.role } : {}),
  };
}

export function sanitizePublicResource(
  resource: BookingResource
): Omit<BookingResource, "metadata"> {
  const hosts = Array.isArray(resource.assignedHosts)
    ? resource.assignedHosts
        .filter(
          (h): h is AssignableHost =>
            Boolean(h) && typeof h.id === "string" && typeof h.name === "string"
        )
        .map(sanitizePublicHost)
    : [];

  return {
    documentId: resource.documentId,
    name: resource.name,
    slug: resource.slug,
    resourceType: resource.resourceType,
    ...(resource.description !== undefined
      ? { description: resource.description }
      : {}),
    color: resource.color,
    timezone: resource.timezone,
    slotDurationMinutes: resource.slotDurationMinutes,
    bufferBeforeMinutes: resource.bufferBeforeMinutes,
    bufferAfterMinutes: resource.bufferAfterMinutes,
    capacityPerSlot: resource.capacityPerSlot,
    maxPartySize: resource.maxPartySize,
    minLeadTimeHours: resource.minLeadTimeHours,
    maxAdvanceDays: resource.maxAdvanceDays,
    requiresApproval: resource.requiresApproval,
    weeklySchedule: resource.weeklySchedule,
    ...(resource.seasonalSchedules !== undefined
      ? { seasonalSchedules: resource.seasonalSchedules }
      : {}),
    ...(resource.holidayRules !== undefined
      ? { holidayRules: resource.holidayRules }
      : {}),
    blackoutDates: resource.blackoutDates,
    ...(resource.recurrenceRule !== undefined
      ? { recurrenceRule: resource.recurrenceRule }
      : {}),
    supportedLanguages: resource.supportedLanguages,
    assignedHosts: hosts,
    ...(resource.location !== undefined ? { location: resource.location } : {}),
    ...(resource.price !== undefined ? { price: resource.price } : {}),
    ...(resource.currency !== undefined ? { currency: resource.currency } : {}),
    isActive: resource.isActive,
  };
}

export function sanitizePublicSlot(slot: AvailableSlot): AvailableSlot {
  return {
    ...slot,
    availableHosts: (slot.availableHosts ?? []).map(sanitizePublicHost),
  };
}

export type PublicBookingResponse = Omit<
  BookingRecord,
  "internalNotes" | "sourceCollection" | "metadata"
>;

export function sanitizePublicBooking(
  booking: BookingRecord
): PublicBookingResponse {
  return {
    documentId: booking.documentId,
    bookingCode: booking.bookingCode,
    title: booking.title,
    ...(booking.resourceDocumentId !== undefined
      ? { resourceDocumentId: booking.resourceDocumentId }
      : {}),
    ...(booking.resourceName !== undefined
      ? { resourceName: booking.resourceName }
      : {}),
    ...(booking.resourceColor !== undefined
      ? { resourceColor: booking.resourceColor }
      : {}),
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    ...(booking.customerPhone !== undefined
      ? { customerPhone: booking.customerPhone }
      : {}),
    ...(booking.organization !== undefined
      ? { organization: booking.organization }
      : {}),
    startDate: booking.startDate,
    endDate: booking.endDate,
    ...(booking.slotLabel !== undefined
      ? { slotLabel: booking.slotLabel }
      : {}),
    timezone: booking.timezone,
    partySize: booking.partySize,
    status: booking.status,
    ...(booking.preferredLanguage !== undefined
      ? { preferredLanguage: booking.preferredLanguage }
      : {}),
    ...(booking.assignedHost !== undefined
      ? { assignedHost: booking.assignedHost }
      : {}),
    ...(booking.notes !== undefined ? { notes: booking.notes } : {}),
    ...(booking.secondaryDates !== undefined
      ? { secondaryDates: booking.secondaryDates }
      : {}),
    ...(booking.createdAt !== undefined
      ? { createdAt: booking.createdAt }
      : {}),
    ...(booking.updatedAt !== undefined
      ? { updatedAt: booking.updatedAt }
      : {}),
  };
}

function clampQueryLimit(
  raw: string | undefined,
  fallback: number,
  max: number
): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(max, parsed);
}

function respondPublicError(
  ctx: ContentApiContext,
  strapi: Core.Strapi,
  err: unknown,
  fallbackMessage: string
): unknown {
  if (err instanceof BookingNotFoundError) {
    if (typeof ctx.notFound === "function") {
      return ctx.notFound(err.message);
    }
    ctx.status = 404;
    ctx.body = {
      error: { status: 404, name: "NotFoundError", message: err.message },
    };
    return undefined;
  }
  if (err instanceof BookingForbiddenError) {
    if (typeof ctx.forbidden === "function") {
      return ctx.forbidden(err.message);
    }
    ctx.status = 403;
    ctx.body = {
      error: { status: 403, name: "ForbiddenError", message: err.message },
    };
    return undefined;
  }
  if (err instanceof BookingValidationError) {
    return ctx.badRequest(err.message);
  }
  strapi.log?.error?.(
    `[bookings] ${fallbackMessage}: ${err instanceof Error ? err.message : "unknown error"}`
  );
  return ctx.badRequest(fallbackMessage);
}

function extractFeedTokenFromContext(
  ctx: ContentApiContext
): string | undefined {
  if (typeof ctx.query.token === "string" && ctx.query.token.trim()) {
    return ctx.query.token.trim();
  }
  const authHeader =
    ctx.request?.headers?.authorization ?? ctx.request?.headers?.Authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim() || undefined;
  }
  return undefined;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getAvailabilityService = () =>
    strapi.plugin(PLUGIN_ID).service<AvailabilityService>("availability");
  const getReservationService = () =>
    strapi.plugin(PLUGIN_ID).service<ReservationService>("reservation");
  const getSettingsService = () =>
    strapi.plugin(PLUGIN_ID).service<SettingsService>("settings");

  return {
    async listPublicResources(ctx: ContentApiContext) {
      const limit = clampQueryLimit(ctx.query.limit, 100, 100);
      const resources = await getAvailabilityService().listResources(
        true,
        limit
      );
      ctx.body = { data: resources.map(sanitizePublicResource) };
    },

    async getAvailableSlots(ctx: ContentApiContext) {
      const now = new Date();
      const fromRaw = ctx.query.from || now.toISOString().slice(0, 10);
      const defaultTo = new Date(now.getTime() + 14 * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const toRaw = ctx.query.to || defaultTo;

      const fromMs = parseBoundaryMs(fromRaw, false);
      const toMs = parseBoundaryMs(toRaw, true);
      if (fromMs === null || toMs === null || toMs < fromMs) {
        return ctx.badRequest("Invalid from or to date range");
      }

      const clampedTo =
        toMs - fromMs > MAX_PUBLIC_SLOTS_RANGE_MS
          ? new Date(fromMs + MAX_PUBLIC_SLOTS_RANGE_MS)
              .toISOString()
              .slice(0, 10)
          : toRaw;

      let partySize = 1;
      if (ctx.query.partySize !== undefined && ctx.query.partySize !== "") {
        const rawParty = ctx.query.partySize.trim();
        if (!/^[1-9]\d*$/.test(rawParty)) {
          return ctx.badRequest(
            "partySize must be an integer greater than or equal to 1"
          );
        }
        const parsed = Number(rawParty);
        if (!Number.isSafeInteger(parsed) || parsed < 1) {
          return ctx.badRequest(
            "partySize must be an integer greater than or equal to 1"
          );
        }
        partySize = parsed;
      }

      const limit = clampQueryLimit(ctx.query.limit, 500, 500);
      const slots = await getAvailabilityService().getAvailableSlots({
        resourceDocumentId: ctx.query.resourceDocumentId,
        resourceSlug: ctx.query.resourceSlug,
        from: fromRaw,
        to: clampedTo,
        partySize,
        preferredLanguage: ctx.query.preferredLanguage,
        referenceNow: now,
      });

      ctx.body = { data: slots.slice(0, limit).map(sanitizePublicSlot) };
    },

    async createReservation(ctx: ContentApiContext) {
      try {
        const body = (ctx.request.body ??
          {}) as unknown as CreateReservationInput;
        const result = await getReservationService().createReservation(body, {
          isAdmin: false,
          referenceNow: new Date(),
        });
        ctx.body = {
          data: {
            booking: sanitizePublicBooking(result.booking),
            cancelToken: result.cancelToken,
            waitlisted: result.waitlisted,
          },
        };
      } catch (err) {
        return respondPublicError(
          ctx,
          strapi,
          err,
          "Unable to complete reservation"
        );
      }
    },

    async rescheduleReservation(ctx: ContentApiContext) {
      try {
        const body = (ctx.request.body ??
          {}) as unknown as RescheduleBookingInput;
        const updated = await getReservationService().rescheduleBooking(body, {
          isAdmin: false,
          referenceNow: new Date(),
        });
        ctx.body = { data: sanitizePublicBooking(updated) };
      } catch (err) {
        return respondPublicError(
          ctx,
          strapi,
          err,
          "Unable to reschedule booking"
        );
      }
    },

    async cancelReservation(ctx: ContentApiContext) {
      try {
        const body = (ctx.request.body ?? {}) as unknown as CancelBookingInput;
        const cancelled = await getReservationService().cancelBooking(body, {
          isAdmin: false,
          referenceNow: new Date(),
        });
        ctx.body = { data: sanitizePublicBooking(cancelled) };
      } catch (err) {
        return respondPublicError(ctx, strapi, err, "Unable to cancel booking");
      }
    },

    async getICalFeed(ctx: ContentApiContext) {
      const now = new Date();
      const defaultFrom = new Date(now.getTime() - 30 * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const defaultTo = new Date(now.getTime() + 180 * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const fromRaw = ctx.query.from || defaultFrom;
      const toRaw = ctx.query.to || defaultTo;
      const fromMs = parseBoundaryMs(fromRaw, false);
      const toMs = parseBoundaryMs(toRaw, true);
      if (fromMs === null || toMs === null || toMs < fromMs) {
        return ctx.badRequest("Invalid from or to date range");
      }
      const clampedTo =
        toMs - fromMs > MAX_PUBLIC_FEED_RANGE_MS
          ? new Date(fromMs + MAX_PUBLIC_FEED_RANGE_MS)
              .toISOString()
              .slice(0, 10)
          : toRaw;
      const limit = clampQueryLimit(ctx.query.limit, 250, 500);

      const settings = await getSettingsService().getSettings();
      const pluginConfig = (strapi.config.get(`plugin::${PLUGIN_ID}`) ??
        {}) as BookingsPluginConfig;
      const configuredToken =
        settings.icalFeedToken ?? pluginConfig.icalFeedToken;
      const providedToken = extractFeedTokenFromContext(ctx);
      const authorizedFullFeed = verifySecretToken(
        providedToken,
        configuredToken
      );

      const ics = await getReservationService().exportICal(
        {
          from: fromRaw,
          to: clampedTo,
          resourceDocumentId: ctx.query.resourceDocumentId,
          resourceSlug: ctx.query.resourceSlug,
          status: "confirmed",
          limit,
        },
        { anonymize: !authorizedFullFeed }
      );
      ctx.set("Content-Type", "text/calendar; charset=utf-8");
      ctx.set("Content-Disposition", 'inline; filename="bookings.ics"');
      ctx.set("X-Content-Type-Options", "nosniff");
      ctx.body = ics;
    },
  };
};
