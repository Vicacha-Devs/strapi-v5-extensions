import {
  doesBookingOverlapSlot,
  selectAvailableHostsForSlot,
} from "../../../shared/slotEngine";
import type {
  AssignableHost,
  BookingRecord,
  BookingResource,
  BookingsPluginSettings,
} from "../../../shared/types";
import { BookingValidationError } from "../errors";
import { trimOrUndefined } from "./reservationHelpers";

function getValidResourceHosts(
  resource: BookingResource | null | undefined
): AssignableHost[] {
  if (!resource || !Array.isArray(resource.assignedHosts)) return [];
  return resource.assignedHosts.filter(
    (h): h is AssignableHost =>
      Boolean(h) &&
      typeof h.id === "string" &&
      h.id.trim().length > 0 &&
      typeof h.name === "string" &&
      h.name.trim().length > 0
  );
}

function findConfiguredHost(
  hosts: AssignableHost[],
  idOrName: string
): AssignableHost | undefined {
  const target = idOrName.trim().toLowerCase();
  return hosts.find(
    (h) =>
      h.id.trim().toLowerCase() === target ||
      h.name.trim().toLowerCase() === target
  );
}

function isHostBusy(host: AssignableHost, busySet: Set<string>): boolean {
  return (
    busySet.has(host.id.trim().toLowerCase()) ||
    busySet.has(host.name.trim().toLowerCase())
  );
}

export interface VerifyCapacityAndHostParams {
  existing: BookingRecord[];
  startMs: number;
  endMs: number;
  partySize: number;
  resource: BookingResource | null;
  settings: BookingsPluginSettings;
  preferredLanguage?: string;
  explicitHostRaw?: string;
  isAdmin?: boolean;
  hostResolutionMode?: "strict" | "reschedule";
  windowCapacityOverride?: number;
  excludeDocumentId?: string;
}

export function verifySlotCapacityAndResolveHost(
  params: VerifyCapacityAndHostParams
): string | undefined {
  const {
    existing,
    startMs,
    endMs,
    partySize,
    resource,
    settings,
    preferredLanguage,
    explicitHostRaw,
    isAdmin = false,
    hostResolutionMode = "strict",
    windowCapacityOverride,
    excludeDocumentId,
  } = params;

  const bufferBefore =
    resource?.bufferBeforeMinutes ?? settings.defaultBufferBeforeMinutes ?? 0;
  const bufferAfter =
    resource?.bufferAfterMinutes ?? settings.defaultBufferAfterMinutes ?? 0;

  const scopedBookings = existing.filter((b) => {
    if (excludeDocumentId && b.documentId === excludeDocumentId) return false;
    if (resource) return b.resourceDocumentId === resource.documentId;
    return !b.resourceDocumentId;
  });

  const overlapping = scopedBookings.filter((b) =>
    doesBookingOverlapSlot(b, startMs, endMs, bufferBefore, bufferAfter)
  );

  const capacity =
    windowCapacityOverride ??
    resource?.capacityPerSlot ??
    settings.defaultCapacityPerSlot ??
    1;
  const bookedCount = overlapping.reduce(
    (sum, b) => sum + Math.max(1, b.partySize),
    0
  );

  if (bookedCount + partySize > capacity) {
    throw new BookingValidationError(
      `Insufficient slot capacity: ${Math.max(0, capacity - bookedCount)} remaining, ${partySize} requested`
    );
  }

  const busyHosts = new Set(
    overlapping
      .map((b) => b.assignedHost?.trim().toLowerCase())
      .filter((v): v is string => Boolean(v))
  );
  const configuredHosts = getValidResourceHosts(resource);
  const explicitHost = trimOrUndefined(explicitHostRaw);

  if (hostResolutionMode === "reschedule") {
    if (explicitHost) {
      const configured = findConfiguredHost(configuredHosts, explicitHost);
      if (configured && !isHostBusy(configured, busyHosts)) {
        return configured.name;
      }
      if (
        isAdmin &&
        !configured &&
        configuredHosts.length === 0 &&
        !busyHosts.has(explicitHost.toLowerCase())
      ) {
        return explicitHost;
      }
    }
    if (!resource) return undefined;
    const fallback = selectAvailableHostsForSlot(
      resource,
      overlapping,
      preferredLanguage
    );
    return fallback[0]?.name;
  }

  if (explicitHost) {
    if (!isAdmin) {
      if (!resource) {
        throw new BookingValidationError(
          "Cannot request a specific host without a target resource"
        );
      }
      const freeHosts = selectAvailableHostsForSlot(resource, overlapping);
      const matched = findConfiguredHost(freeHosts, explicitHost);
      if (!matched) {
        throw new BookingValidationError(
          "Requested host is unavailable or not assigned to this resource"
        );
      }
      return matched.name;
    }

    const configured = findConfiguredHost(configuredHosts, explicitHost);
    if (configured) {
      if (isHostBusy(configured, busyHosts)) {
        throw new BookingValidationError(
          `Assigned host '${configured.name}' is already booked for this time slot`
        );
      }
      return configured.name;
    }
    if (busyHosts.has(explicitHost.toLowerCase())) {
      throw new BookingValidationError(
        `Assigned host '${explicitHost}' is already booked for this time slot`
      );
    }
    return explicitHost;
  }

  if (!resource) return undefined;
  const candidates = selectAvailableHostsForSlot(
    resource,
    overlapping,
    preferredLanguage
  );
  return candidates[0]?.name;
}
