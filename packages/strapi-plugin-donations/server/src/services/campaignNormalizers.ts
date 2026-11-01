import type { Core } from "@strapi/strapi";

import {
  computeCampaignProgress,
  computeSecondaryDates,
  normalizeRichTextValue,
  type CampaignEvidenceItem,
  type CampaignEvidenceType,
  type CampaignKind,
  type DonationCampaignItem,
  type DonationsSettings,
  type InvoiceStatus,
} from "../../../shared";

export function strVal(val: unknown, fallback = ""): string {
  return val ? String(val) : fallback;
}

export function strOrNull(val: unknown): string | null {
  return val ? String(val) : null;
}

export function numVal(val: unknown, fallback = 0): number {
  const n = Number(val);
  return Number.isFinite(n) && n !== 0 ? n : fallback;
}

export function resolveDocIdentifiers(raw: Record<string, unknown>): {
  id: string | number;
  documentId: string;
} {
  const rawId = raw.id;
  const rawDocId = raw.documentId;
  const id =
    typeof rawId === "string" || typeof rawId === "number"
      ? rawId
      : strVal(rawDocId);
  const documentId = strVal(rawDocId, strVal(rawId));
  return { id, documentId };
}

export function createFieldGetter(
  raw: Record<string, unknown>,
  mapping?: { enabled?: boolean; fields?: Record<string, string> }
): (key: string, fallback?: unknown) => unknown {
  const fields = mapping?.enabled && mapping.fields ? mapping.fields : {};
  return (key: string, fallback: unknown = null) => {
    const mappedKey = fields[key] || key;
    if (raw[mappedKey] !== undefined) return raw[mappedKey];
    return raw[key] !== undefined ? raw[key] : fallback;
  };
}

export function createFieldMapper(mapping?: {
  enabled?: boolean;
  fields?: Record<string, string>;
}): (key: string) => string {
  const fields = mapping?.enabled && mapping.fields ? mapping.fields : {};
  return (key: string) => fields[key] || key;
}

export function extractMediaUrl(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "string") return val.trim() || null;
  const obj = val as {
    url?: unknown;
    data?: { attributes?: { url?: unknown } };
  };
  if (typeof obj.url === "string") return obj.url;
  const nestedUrl = obj.data?.attributes?.url;
  return typeof nestedUrl === "string" ? nestedUrl : null;
}

export function slugifyTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `campaign-${Date.now()}`
  );
}

const VALID_EVIDENCE_TYPES: CampaignEvidenceType[] = [
  "paid_receipt",
  "photo_gallery",
  "delivery_report",
  "audit_document",
  "beneficiary_update",
];

function parseEvidenceMediaUrls(rawMedia: unknown): string[] {
  let items: unknown[] = [];
  if (Array.isArray(rawMedia)) {
    items = rawMedia;
  } else if (typeof rawMedia === "string" && rawMedia.trim()) {
    items = rawMedia.split(",").map((s) => s.trim());
  }
  return items.map(extractMediaUrl).filter((u): u is string => Boolean(u));
}

export function normalizeEvidenceItem(
  rawEv: Record<string, unknown>,
  index: number,
  defaultCurrency: string,
  secondaryCalendars: string[],
  locale: string
): CampaignEvidenceItem {
  const rawType = strVal(
    rawEv.evidenceType,
    "paid_receipt"
  ) as CampaignEvidenceType;
  const evidenceType: CampaignEvidenceType = VALID_EVIDENCE_TYPES.includes(
    rawType
  )
    ? rawType
    : "paid_receipt";
  const fallbackDate = strVal(
    rawEv.createdAt,
    new Date().toISOString().slice(0, 10)
  );
  const date = strVal(rawEv.date, fallbackDate);
  const rawBody = strVal(rawEv.body, strVal(rawEv.description));
  const rawDesc = strVal(rawEv.description, strVal(rawEv.body));

  return {
    id: strVal(rawEv.id, `ev-${index + 1}`),
    title: strVal(rawEv.title, "Impact Evidence"),
    evidenceType,
    description: normalizeRichTextValue(rawDesc),
    body: normalizeRichTextValue(rawBody),
    date,
    amountSpent: Math.max(0, numVal(rawEv.amountSpent, 0)),
    currency: strVal(rawEv.currency, defaultCurrency).toUpperCase(),
    mediaUrls: parseEvidenceMediaUrls(rawEv.mediaUrls),
    documentUrl: extractMediaUrl(rawEv.documentUrl),
    verifiedBy: strOrNull(rawEv.verifiedBy),
    createdAt: strVal(rawEv.createdAt, date),
    secondaryDates: computeSecondaryDates(date, secondaryCalendars, locale),
  };
}

function resolveSuggestedAmounts(
  rawSuggested: unknown,
  currency: string,
  settings: DonationsSettings
): number[] {
  if (Array.isArray(rawSuggested) && rawSuggested.length > 0) {
    return rawSuggested
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n > 0);
  }
  return settings.defaultSuggestedAmounts?.[currency] || [20000, 50000, 100000];
}

function resolveAvailableLocales(
  locale: string,
  rawLocalizations: unknown
): string[] {
  const localizations = Array.isArray(rawLocalizations) ? rawLocalizations : [];
  const extracted = localizations
    .map((l) => strVal((l as Record<string, unknown>)?.locale))
    .filter(Boolean);
  return Array.from(new Set([locale, ...extracted]));
}

function parseRawEvidencesList(
  rawEvidences: unknown
): Array<Record<string, unknown>> {
  if (Array.isArray(rawEvidences)) {
    return rawEvidences as Array<Record<string, unknown>>;
  }
  if (typeof rawEvidences === "string" && rawEvidences.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(rawEvidences);
      return Array.isArray(parsed)
        ? (parsed as Array<Record<string, unknown>>)
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizeCampaignRecord(
  raw: Record<string, unknown>,
  settings: DonationsSettings,
  requestedLocale?: string
): DonationCampaignItem {
  const get = createFieldGetter(raw, settings.campaignMapping);
  const currency = strVal(
    get("currency"),
    strVal(settings.baseCurrency, "COP")
  ).toUpperCase();
  const goalAmount = numVal(get("goalAmount"), 0);
  const raisedAmount = numVal(get("raisedAmount"), 0);
  const campaignKind = strVal(
    get("campaignKind"),
    "major_campaign"
  ) as CampaignKind;
  const dueDate = strOrNull(get("dueDate"));
  const rawStatus = strVal(get("invoiceStatus"), "open") as InvoiceStatus;

  const progress = computeCampaignProgress({
    goalAmount,
    raisedAmount,
    campaignKind,
    dueDate,
    currentStatus: rawStatus,
  });
  const isPaid = rawStatus === "paid";
  const finalStatus: InvoiceStatus = isPaid ? "paid" : progress.invoiceStatus;
  const locale = strVal(
    raw.locale,
    strVal(requestedLocale, strVal(settings.defaultLocale, "en"))
  );
  const refDate = strVal(
    dueDate,
    strVal(get("startDate"), strVal(raw.createdAt))
  );

  const evidences = parseRawEvidencesList(get("evidences", [])).map((ev, idx) =>
    normalizeEvidenceItem(
      ev,
      idx,
      currency,
      settings.secondaryCalendars,
      locale
    )
  );
  const accountedAmount = Number(
    evidences.reduce((sum, ev) => sum + numVal(ev.amountSpent, 0), 0).toFixed(2)
  );
  const ids = resolveDocIdentifiers(raw);

  return {
    id: ids.id,
    documentId: ids.documentId,
    title: strVal(get("title")),
    slug: strVal(get("slug")),
    description: normalizeRichTextValue(get("description", "")),
    body: normalizeRichTextValue(get("body", "")),
    campaignKind,
    categoryKey: strVal(get("categoryKey"), "general_fund"),
    goalAmount: progress.goalAmount,
    raisedAmount: progress.raisedAmount,
    remainingAmount: isPaid ? 0 : progress.remainingAmount,
    progressPercent: isPaid ? 100 : progress.progressPercent,
    currency,
    donorCount: numVal(get("donorCount"), 0),
    isUrgent: Boolean(get("isUrgent", false)),
    isActive: get("isActive", true) !== false,
    startDate: strOrNull(get("startDate")),
    endDate: strOrNull(get("endDate")),
    dueDate,
    billingPeriod: strOrNull(get("billingPeriod")),
    invoiceReference: strOrNull(get("invoiceReference")),
    invoiceProvider: strOrNull(get("invoiceProvider")),
    invoiceStatus: finalStatus,
    suggestedAmounts: resolveSuggestedAmounts(
      get("suggestedAmounts"),
      currency,
      settings
    ),
    allowCustomAmount: get("allowCustomAmount", true) !== false,
    allowFullBalancePayoff: get("allowFullBalancePayoff", true) !== false,
    coverUrl: extractMediaUrl(get("coverUrl")),
    invoiceDocumentUrl: extractMediaUrl(get("invoiceDocumentUrl")),
    paymentGatewayUrl: strOrNull(get("paymentGatewayUrl")),
    icon: strOrNull(get("icon")),
    evidences,
    evidenceCount: evidences.length,
    accountedAmount,
    locale,
    availableLocales: resolveAvailableLocales(locale, raw.localizations),
    secondaryDates: computeSecondaryDates(
      refDate,
      settings.secondaryCalendars,
      locale
    ),
  };
}

export async function queryRecords(
  strapi: Core.Strapi,
  uid: string,
  queryOpts: Core.DocumentQueryOptions = {}
): Promise<Array<Record<string, unknown>>> {
  try {
    const docs = await strapi.documents(uid).findMany(queryOpts);
    return Array.isArray(docs) ? docs : [];
  } catch {
    const entries = await strapi.entityService?.findMany(
      uid,
      queryOpts as Record<string, unknown>
    );
    if (Array.isArray(entries)) return entries;
    return entries ? [entries] : [];
  }
}

export async function persistCreatedRecord(
  strapi: Core.Strapi,
  uid: string,
  data: Record<string, unknown>,
  locale?: string
): Promise<Record<string, unknown>> {
  try {
    const created = await strapi.documents(uid).create({
      data,
      locale,
      status: "published",
    });
    return created || data;
  } catch {
    const created = await strapi.entityService?.create(uid, {
      data: locale
        ? { ...data, locale, publishedAt: new Date().toISOString() }
        : data,
    });
    return created || data;
  }
}

export async function persistUpdatedRecord(
  strapi: Core.Strapi,
  uid: string,
  existing: Record<string, unknown>,
  updateData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const docId = strVal(existing.documentId);
  try {
    if (docId) {
      const updated = await strapi.documents(uid).update({
        documentId: docId,
        data: updateData,
      });
      return updated || { ...existing, ...updateData };
    }
    const id = existing.id as string | number;
    const updated = await strapi.entityService?.update(uid, id, {
      data: updateData,
    });
    return updated || { ...existing, ...updateData };
  } catch {
    try {
      const id = existing.id as string | number;
      const updated = await strapi.entityService?.update(uid, id, {
        data: updateData,
      });
      return updated || { ...existing, ...updateData };
    } catch {
      return { ...existing, ...updateData };
    }
  }
}
