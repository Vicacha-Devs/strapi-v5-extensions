import type { Core } from "@strapi/strapi";
import { isValidEmail } from "@vicacha-devs/plugin-shared";
import { randomBytes } from "node:crypto";

import {
  PLUGIN_ID,
  SUBSCRIBER_UID,
  type InboxSettings,
  type SubscriberRecord,
  type SubscriberStatus,
} from "../../../shared";
import { getDocuments } from "./docHelper";

function normalizeSubscriberTopics(topics?: string[]): string[] {
  return Array.isArray(topics) && topics.length > 0
    ? Array.from(new Set(topics))
    : ["announcements"];
}

function pickSubscriberStr(
  ...values: Array<string | undefined | null>
): string {
  for (const val of values) {
    if (val && val.trim().length > 0) return val;
  }
  return "";
}

function buildSubscriberPayload(
  email: string,
  input: {
    fullName?: string;
    phone?: string;
    locale?: string;
    topics?: string[];
    sourceFormSlug?: string;
  },
  existing: SubscriberRecord | null,
  settings: InboxSettings
): Omit<SubscriberRecord, "documentId"> {
  const doubleOptIn = settings.enableDoubleOptIn !== false;
  const nowIso = new Date().toISOString();
  const alreadyConfirmed = existing?.status === "confirmed";
  const status: SubscriberStatus =
    alreadyConfirmed || !doubleOptIn ? "confirmed" : "pending";

  return {
    email,
    fullName: pickSubscriberStr(input.fullName, existing?.fullName),
    phone: pickSubscriberStr(input.phone, existing?.phone),
    locale: pickSubscriberStr(input.locale, settings.defaultLocale, "es"),
    topics: normalizeSubscriberTopics(input.topics),
    status,
    confirmToken:
      alreadyConfirmed || !doubleOptIn ? null : randomBytes(20).toString("hex"),
    unsubscribeToken: pickSubscriberStr(
      existing?.unsubscribeToken,
      randomBytes(20).toString("hex")
    ),
    confirmedAt: alreadyConfirmed
      ? existing.confirmedAt || nowIso
      : doubleOptIn
        ? null
        : nowIso,
    unsubscribedAt: null,
    sourceFormSlug: pickSubscriberStr(
      input.sourceFormSlug,
      existing?.sourceFormSlug,
      "newsletter"
    ),
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async subscribe(input: {
    email: string;
    fullName?: string;
    phone?: string;
    locale?: string;
    topics?: string[];
    sourceFormSlug?: string;
  }): Promise<SubscriberRecord> {
    const email = (input.email || "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      const err = new Error("A valid email address is required to subscribe");
      err.name = "ValidationError";
      throw err;
    }

    const settingsService = strapi.plugin(PLUGIN_ID).service<{
      getSettings(): Promise<InboxSettings>;
    }>("settings");
    const settings = await settingsService.getSettings();

    const existingDocs = (await getDocuments(strapi, SUBSCRIBER_UID).findMany({
      filters: { email },
      limit: 1,
    })) as unknown as SubscriberRecord[];

    const existing = existingDocs[0] || null;
    const payload = buildSubscriberPayload(email, input, existing, settings);

    if (existing?.documentId) {
      const updated = (await getDocuments(strapi, SUBSCRIBER_UID).update({
        documentId: existing.documentId,
        data: payload as unknown as Record<string, unknown>,
      })) as unknown as SubscriberRecord;
      return updated;
    }

    const created = (await getDocuments(strapi, SUBSCRIBER_UID).create({
      data: payload as unknown as Record<string, unknown>,
    })) as unknown as SubscriberRecord;

    strapi.eventHub?.emit("inbox.subscriber.created", {
      subscriber: created,
    });

    return created;
  },

  async confirmSubscription(token: string): Promise<SubscriberRecord> {
    const trimmed = (token || "").trim();
    if (!trimmed) {
      throw new Error("Confirmation token is required");
    }

    const docs = (await getDocuments(strapi, SUBSCRIBER_UID).findMany({
      filters: { confirmToken: trimmed },
      limit: 1,
    })) as unknown as SubscriberRecord[];

    const subscriber = docs[0];
    if (!subscriber || !subscriber.documentId) {
      const err = new Error("Invalid or expired confirmation token");
      err.name = "NotFoundError";
      throw err;
    }

    const updated = (await getDocuments(strapi, SUBSCRIBER_UID).update({
      documentId: subscriber.documentId,
      data: {
        status: "confirmed",
        confirmToken: null,
        confirmedAt: new Date().toISOString(),
        unsubscribedAt: null,
      },
    })) as unknown as SubscriberRecord;

    strapi.eventHub?.emit("inbox.subscriber.confirmed", {
      subscriber: updated,
    });

    return updated;
  },

  async unsubscribe(token: string): Promise<SubscriberRecord> {
    const trimmed = (token || "").trim();
    if (!trimmed) {
      throw new Error("Unsubscribe token is required");
    }

    const docs = (await getDocuments(strapi, SUBSCRIBER_UID).findMany({
      filters: { unsubscribeToken: trimmed },
      limit: 1,
    })) as unknown as SubscriberRecord[];

    const subscriber = docs[0];
    if (!subscriber || !subscriber.documentId) {
      const err = new Error("Invalid unsubscribe token");
      err.name = "NotFoundError";
      throw err;
    }

    const updated = (await getDocuments(strapi, SUBSCRIBER_UID).update({
      documentId: subscriber.documentId,
      data: {
        status: "unsubscribed",
        unsubscribedAt: new Date().toISOString(),
      },
    })) as unknown as SubscriberRecord;

    strapi.eventHub?.emit("inbox.subscriber.unsubscribed", {
      subscriber: updated,
    });

    return updated;
  },

  async listSubscribers(filters?: {
    status?: SubscriberStatus;
    topic?: string;
    locale?: string;
  }): Promise<SubscriberRecord[]> {
    const queryFilters: Record<string, unknown> = {};
    if (filters?.status) queryFilters.status = filters.status;
    if (filters?.locale) queryFilters.locale = filters.locale;

    const docs = (await getDocuments(strapi, SUBSCRIBER_UID).findMany({
      filters: queryFilters,
      limit: 500,
    })) as unknown as SubscriberRecord[];

    if (filters?.topic) {
      return docs.filter((sub) => (sub.topics || []).includes(filters.topic!));
    }
    return docs;
  },
});
