import { DECORATIVE_FIELD_TYPES } from "./constants";
import type { FormField, SubmissionRecord } from "./types";

const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = typeof value === "object" ? JSON.stringify(value) : String(value);

  const sanitized =
    raw.length > 0 && FORMULA_PREFIXES.includes(raw[0]) ? `'${raw}` : raw;

  if (
    sanitized.includes('"') ||
    sanitized.includes(",") ||
    sanitized.includes("\n") ||
    sanitized.includes("\r")
  ) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

function collectDataFieldNames(
  submissions: SubmissionRecord[],
  fields: FormField[]
): string[] {
  const dataFieldNames: string[] = [];
  const seen = new Set<string>();

  for (const field of fields) {
    if (!DECORATIVE_FIELD_TYPES.includes(field.type) && !seen.has(field.name)) {
      seen.add(field.name);
      dataFieldNames.push(field.name);
    }
  }

  for (const sub of submissions) {
    for (const key of Object.keys(sub.data || {})) {
      if (!seen.has(key)) {
        seen.add(key);
        dataFieldNames.push(key);
      }
    }
  }
  return dataFieldNames;
}

function getBaseSubmissionValues(sub: SubmissionRecord): string[] {
  return [
    sub.referenceCode,
    sub.formSlug,
    sub.status,
    sub.priority,
    sub.department ?? "",
    sub.locale,
    sub.applicantName ?? "",
    sub.applicantEmail ?? "",
    sub.applicantPhone ?? "",
    sub.submittedAt,
    sub.secondaryDate?.formatted ?? "",
    sub.linkedBookingId ?? "",
    sub.linkedCertificateNumber ?? "",
  ];
}

const BASE_CSV_HEADERS = [
  "referenceCode",
  "formSlug",
  "status",
  "priority",
  "department",
  "locale",
  "applicantName",
  "applicantEmail",
  "applicantPhone",
  "submittedAt",
  "secondaryDate",
  "linkedBookingId",
  "linkedCertificateNumber",
];

export function submissionsToCsv(
  submissions: SubmissionRecord[],
  fields: FormField[] = []
): string {
  const dataFieldNames = collectDataFieldNames(submissions, fields);
  const headers = [...BASE_CSV_HEADERS, ...dataFieldNames];
  const rows: string[] = [headers.map(escapeCsvCell).join(",")];

  for (const sub of submissions) {
    const baseValues = getBaseSubmissionValues(sub);
    const dynamicValues = dataFieldNames.map((name) => sub.data?.[name] ?? "");
    rows.push([...baseValues, ...dynamicValues].map(escapeCsvCell).join(","));
  }

  return rows.join("\n");
}
