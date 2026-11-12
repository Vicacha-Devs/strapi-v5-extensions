/**
 * Shared output-encoding & injection-prevention escapers for HTML, XML 1.0,
 * RFC 4180 CSV (with OWASP spreadsheet formula-injection neutralization),
 * and RFC 5545 iCalendar (ICS) text values.
 */

const INVALID_XML_10_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

const CSV_FORMULA_PREFIX_RE = /^[\s\u0085\u2028\u2029]*[=+\-@|]|^[\t\r\n]/;

export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function stripInvalidXmlChars(value?: string | null): string {
  if (!value) return "";
  return String(value).replace(INVALID_XML_10_CHARS, "");
}

export function escapeXml(value?: string | null): string {
  const cleaned = stripInvalidXmlChars(value);
  if (!cleaned) return "";
  return cleaned
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function wrapCdata(value?: string | null): string {
  const cleaned = stripInvalidXmlChars(value).replace(
    /]]>/g,
    "]]]]><![CDATA[>"
  );
  return `<![CDATA[${cleaned}]]>`;
}

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = typeof value === "object" ? JSON.stringify(value) : String(value);

  const sanitized =
    raw.length > 0 && CSV_FORMULA_PREFIX_RE.test(raw) ? `'${raw}` : raw;

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

export function escapeIcsText(value: string | undefined | null): string {
  if (!value) return "";
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
