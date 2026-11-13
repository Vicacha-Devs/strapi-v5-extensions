const MAX_MESSAGE_LENGTH = 1000;

const SENSITIVE_QUERY_KEYS =
  /(^|[?&])(token|access_token|refresh_token|id_token|api_key|apikey|key|secret|password|passwd|auth|signature|sig|code)=([^&\s]+)/gi;

const BEARER_PATTERN = /\b(Bearer|Basic)\s+[A-Z0-9\-._~+/]+=*/gi;
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

/**
 * Input is bounded before the redaction patterns run so that pathological
 * error text cannot trigger quadratic regex scans; the output is truncated to
 * MAX_MESSAGE_LENGTH anyway.
 */
const MAX_INPUT_LENGTH = MAX_MESSAGE_LENGTH * 4;

const isAlpha = (c: number) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
const isSchemeChar = (c: number) =>
  isAlpha(c) || (c >= 48 && c <= 57) || c === 43 || c === 46 || c === 45;
const isWhitespace = (c: number) =>
  c === 32 ||
  (c >= 9 && c <= 13) ||
  c === 160 ||
  c === 0x1680 ||
  (c >= 0x2000 && c <= 0x200a) ||
  c === 0x2028 ||
  c === 0x2029 ||
  c === 0x202f ||
  c === 0x205f ||
  c === 0x3000 ||
  c === 0xfeff;

/**
 * Linear-time equivalent of replacing
 * /([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)([^:@\s]+:[^@\s]+@)/g with "$1[REDACTED]@"
 * (that pattern rescans long scheme-like runs from every start position).
 */
export function redactUrlCredentials(input: string): string {
  let out = "";
  let from = 0;
  let pos = 0;
  for (;;) {
    const idx = input.indexOf("://", pos);
    if (idx === -1) break;
    let start = idx;
    while (start > from && isSchemeChar(input.charCodeAt(start - 1))) start--;
    while (start < idx && !isAlpha(input.charCodeAt(start))) start++;
    let end = -1;
    if (start < idx) {
      let i = idx + 3;
      const userStart = i;
      while (i < input.length) {
        const c = input.charCodeAt(i);
        if (c === 58 || c === 64 || isWhitespace(c)) break;
        i++;
      }
      if (i > userStart && input.charCodeAt(i) === 58) {
        i++;
        const passStart = i;
        while (i < input.length) {
          const c = input.charCodeAt(i);
          if (c === 64 || isWhitespace(c)) break;
          i++;
        }
        if (i > passStart && input.charCodeAt(i) === 64) end = i + 1;
      }
    }
    if (end === -1) {
      pos = idx + 3;
    } else {
      out += `${input.slice(from, idx + 3)}[REDACTED]@`;
      from = end;
      pos = end;
    }
  }
  return out + input.slice(from);
}

/**
 * Redacts common secrets, credentials, tokens, and email addresses from telemetry text.
 */
export function sanitizeTelemetryText(input: string): string {
  if (!input) return "";

  let sanitized = redactUrlCredentials(
    input.slice(0, MAX_INPUT_LENGTH).replace(BEARER_PATTERN, "$1 [REDACTED]")
  )
    .replace(SENSITIVE_QUERY_KEYS, "$1$2=[REDACTED]")
    .replace(EMAIL_PATTERN, "[REDACTED_EMAIL]");

  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    sanitized = `${sanitized.slice(0, MAX_MESSAGE_LENGTH)}...[truncated]`;
  }

  return sanitized;
}

/**
 * Normalizes and sanitizes an unknown thrown value into a safe Error instance for span recording.
 */
export function sanitizeError(err: unknown): Error {
  const raw = err instanceof Error ? err : new Error(String(err));
  const safeMessage = sanitizeTelemetryText(raw.message);
  const safeError = new Error(safeMessage);
  safeError.name = raw.name || "Error";
  if (raw.stack) {
    safeError.stack = sanitizeTelemetryText(raw.stack);
  }
  return safeError;
}

/**
 * Extracts a Strapi plugin name from a content-type UID (e.g. `plugin::bookings.booking`)
 * or a route path (e.g. `/api/bookings/slots`).
 */
export function extractPluginName(input: {
  uid?: string;
  route?: string;
}): string | undefined {
  if (input.uid?.startsWith("plugin::")) {
    const rest = input.uid.slice("plugin::".length);
    const dotIdx = rest.indexOf(".");
    return dotIdx > 0 ? rest.slice(0, dotIdx) : rest || undefined;
  }

  if (input.route) {
    const match = /^\/(?:api\/)?([a-z0-9-]+)(?:\/|$)/i.exec(input.route);
    if (match?.[1] && match[1] !== "api" && match[1] !== "admin") {
      return match[1];
    }
  }

  return undefined;
}
