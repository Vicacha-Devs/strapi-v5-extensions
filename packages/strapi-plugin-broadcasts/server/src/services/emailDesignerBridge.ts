import type { Core } from "@strapi/strapi";

import type { EmailDesignerTemplateSummary } from "../../../shared";

export const EMAIL_DESIGNER_TEMPLATE_UID =
  "plugin::email-designer-5.email-designer-template";

export interface EmailDesignerTemplateRow {
  id?: number;
  documentId?: string;
  templateReferenceId?: number;
  name?: string;
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  tags?: string[];
  updatedAt?: string;
}

const KNOWN_LOCALES = ["es", "en", "ar", "tr", "fr", "pt", "de", "it"];

function getNormalizedTags(row: EmailDesignerTemplateRow): string[] {
  if (!Array.isArray(row.tags)) return [];
  return row.tags.map((t) => String(t).toLowerCase());
}

export async function fetchRawEmailDesignerTemplates(
  strapi: Core.Strapi
): Promise<EmailDesignerTemplateRow[]> {
  try {
    const dbQuery = (
      strapi as unknown as {
        db?: {
          query?: (uid: string) => {
            findMany?: (
              params?: Record<string, unknown>
            ) => Promise<EmailDesignerTemplateRow[]>;
          };
        };
      }
    ).db?.query?.(EMAIL_DESIGNER_TEMPLATE_UID);

    if (dbQuery?.findMany) {
      const rows = await dbQuery.findMany({
        orderBy: { templateReferenceId: "asc" },
        limit: 200,
      });
      if (Array.isArray(rows)) return rows;
    }
  } catch {
    // Fall through to strapi.documents lookup
  }

  try {
    const docs = (await strapi
      .documents(
        EMAIL_DESIGNER_TEMPLATE_UID as Parameters<typeof strapi.documents>[0]
      )
      .findMany({ limit: 200 })) as unknown as EmailDesignerTemplateRow[];
    if (Array.isArray(docs)) return docs;
  } catch {
    // Email Designer 5 plugin is not installed or table not migrated
  }

  return [];
}

function toTemplateSummary(
  row: EmailDesignerTemplateRow
): EmailDesignerTemplateSummary | null {
  const refId = Number(row.templateReferenceId ?? row.id ?? 0);
  const name = String(row.name || "").trim();
  if (!refId && !name) return null;

  return {
    templateReferenceId: refId,
    name: name || `Template #${refId}`,
    subject: typeof row.subject === "string" ? row.subject : undefined,
    tags: Array.isArray(row.tags) ? row.tags.map((t) => String(t)) : undefined,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : undefined,
  };
}

export async function listEmailDesignerTemplatesFromDb(
  strapi: Core.Strapi
): Promise<EmailDesignerTemplateSummary[]> {
  const rows = await fetchRawEmailDesignerTemplates(strapi);
  const seen = new Set<string>();
  const summaries: EmailDesignerTemplateSummary[] = [];

  for (const row of rows) {
    const summary = toTemplateSummary(row);
    if (!summary) continue;
    const key = `${summary.templateReferenceId}:${summary.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    summaries.push(summary);
  }

  return summaries.sort(
    (a, b) => a.templateReferenceId - b.templateReferenceId
  );
}

function findDirectLocalizedTemplate(
  rows: EmailDesignerTemplateRow[],
  trimmedRef: string,
  normLocale: string
): EmailDesignerTemplateRow | undefined {
  const lowerRef = trimmedRef.toLowerCase();
  const expectedName = `${lowerRef}_${normLocale}`;
  const normalizedGroupTag = trimmedRef
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();

  return rows.find((r) => {
    const rowName = String(r.name || "").toLowerCase();
    if (rowName === expectedName) return true;
    const rowTags = getNormalizedTags(r);
    return (
      (rowTags.includes(lowerRef) || rowTags.includes(normalizedGroupTag)) &&
      rowTags.includes(normLocale)
    );
  });
}

function findSiblingBySuffix(
  rows: EmailDesignerTemplateRow[],
  primary: EmailDesignerTemplateRow,
  normLocale: string
): EmailDesignerTemplateRow | undefined {
  if (typeof primary.name !== "string") return undefined;
  const suffixMatch = primary.name.match(/^(.+)_([a-z]{2,3})$/i);
  if (!suffixMatch || suffixMatch[2].toLowerCase() === normLocale) {
    return undefined;
  }
  const targetSiblingName = `${suffixMatch[1]}_${normLocale}`.toLowerCase();
  return rows.find(
    (r) => String(r.name || "").toLowerCase() === targetSiblingName
  );
}

function findSiblingByCategoryTags(
  rows: EmailDesignerTemplateRow[],
  primary: EmailDesignerTemplateRow,
  normLocale: string
): EmailDesignerTemplateRow | undefined {
  const primaryTags = getNormalizedTags(primary);
  if (primaryTags.includes(normLocale)) return undefined;

  const categoryTags = primaryTags.filter(
    (t) => !KNOWN_LOCALES.includes(t) && t !== "visitor" && t !== "community"
  );
  if (categoryTags.length === 0) return undefined;

  return rows.find((r) => {
    const rTags = getNormalizedTags(r);
    return (
      rTags.includes(normLocale) &&
      categoryTags.some((cat) => rTags.includes(cat))
    );
  });
}

function findPrimaryTemplate(
  rows: EmailDesignerTemplateRow[],
  trimmed: string
): EmailDesignerTemplateRow | undefined {
  const numericRef = /^\d+$/.test(trimmed) ? Number(trimmed) : null;
  const lowerTrimmed = trimmed.toLowerCase();
  return rows.find(
    (r) =>
      (numericRef !== null && Number(r.templateReferenceId) === numericRef) ||
      String(r.name || "").toLowerCase() === lowerTrimmed
  );
}

function findSiblingTemplate(
  rows: EmailDesignerTemplateRow[],
  primary: EmailDesignerTemplateRow,
  normLocale: string | undefined
): EmailDesignerTemplateRow | undefined {
  if (!normLocale) return undefined;
  return (
    findSiblingBySuffix(rows, primary, normLocale) ??
    findSiblingByCategoryTags(rows, primary, normLocale)
  );
}

export async function resolveEmailDesignerTemplateFromDb(
  strapi: Core.Strapi,
  templateRef: string,
  locale?: string
): Promise<EmailDesignerTemplateRow | null> {
  const trimmed = String(templateRef || "").trim();
  if (!trimmed) return null;

  const rows = await fetchRawEmailDesignerTemplates(strapi);
  if (rows.length === 0) return null;

  const normLocale = locale ? locale.toLowerCase() : undefined;
  if (normLocale) {
    const localizedDirect = findDirectLocalizedTemplate(
      rows,
      trimmed,
      normLocale
    );
    if (localizedDirect) return localizedDirect;
  }

  const primary = findPrimaryTemplate(rows, trimmed);
  if (!primary) return null;

  return findSiblingTemplate(rows, primary, normLocale) ?? primary;
}

async function trySendViaPluginService(
  strapi: Core.Strapi,
  numericTemplateId: number | null,
  recipientEmail: string,
  fromAddress: string,
  replyToAddress: string,
  headers: Record<string, string>,
  subject: string,
  templateVars: Record<string, string | number | undefined>
): Promise<string | null> {
  if (!numericTemplateId) return null;
  try {
    const emailDesignerPlugin = strapi.plugin("email-designer-5");
    const emailDesignerService = emailDesignerPlugin?.service<{
      sendTemplatedEmail?: (
        emailOptions: Record<string, unknown>,
        emailTemplate: Record<string, unknown>,
        data: Record<string, unknown>
      ) => Promise<unknown>;
    }>("email");

    if (emailDesignerService?.sendTemplatedEmail) {
      await emailDesignerService.sendTemplatedEmail(
        {
          to: recipientEmail,
          from: fromAddress,
          replyTo: replyToAddress,
          headers,
        },
        {
          templateReferenceId: numericTemplateId,
          subject,
        },
        templateVars
      );
      return `ed5_${numericTemplateId}_${Date.now()}`;
    }
  } catch {
    // Fall through to direct template HTML interpolation
  }
  return null;
}

export async function trySendEmailViaDesigner5(params: {
  strapi: Core.Strapi;
  effectiveTemplateRef: string;
  locale: string;
  recipientEmail: string;
  fromAddress: string;
  replyToAddress: string;
  subject: string;
  text: string;
  headers: Record<string, string>;
  templateVars: Record<string, string | number | undefined>;
  interpolate: (
    tpl: string,
    vars: Record<string, string | number | undefined>
  ) => string;
}): Promise<string | null> {
  const {
    strapi,
    effectiveTemplateRef,
    locale,
    recipientEmail,
    fromAddress,
    replyToAddress,
    subject,
    text,
    headers,
    templateVars,
    interpolate,
  } = params;

  const resolvedTemplate = await resolveEmailDesignerTemplateFromDb(
    strapi,
    effectiveTemplateRef,
    locale
  );
  const numericTemplateId =
    resolvedTemplate?.templateReferenceId ??
    (/^\d+$/.test(effectiveTemplateRef) ? Number(effectiveTemplateRef) : null);

  const pluginSentId = await trySendViaPluginService(
    strapi,
    numericTemplateId,
    recipientEmail,
    fromAddress,
    replyToAddress,
    headers,
    subject,
    templateVars
  );
  if (pluginSentId) return pluginSentId;

  const emailService = strapi.plugin("email")?.service<{
    send?: (opts: Record<string, unknown>) => Promise<unknown>;
  }>("email");

  if (!resolvedTemplate?.bodyHtml || !emailService?.send) {
    return null;
  }

  const renderedHtml = interpolate(resolvedTemplate.bodyHtml, templateVars);
  const renderedText = resolvedTemplate.bodyText
    ? interpolate(resolvedTemplate.bodyText, {
        ...templateVars,
        subject,
        bodyText: text,
      })
    : text;
  const renderedSubject =
    subject ||
    (resolvedTemplate.subject
      ? interpolate(resolvedTemplate.subject, { ...templateVars, subject })
      : "");

  await emailService.send({
    to: recipientEmail,
    from: fromAddress,
    replyTo: replyToAddress,
    subject: renderedSubject,
    text: renderedText,
    html: renderedHtml,
    headers,
  });

  return `ed5_${resolvedTemplate.templateReferenceId || effectiveTemplateRef}_${Date.now()}`;
}
