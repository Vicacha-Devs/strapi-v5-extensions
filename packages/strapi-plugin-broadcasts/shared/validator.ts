import { SUPPORTED_CHANNELS, SUPPORTED_WHATSAPP_DRIVERS } from "./constants";
import type {
  AutomationRuleRecord,
  BroadcastChannel,
  CampaignRecord,
  PublicChannelLink,
  WhatsAppDriver,
} from "./types";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BLOCKED_HOSTNAMES = new Set([
  "metadata.google.internal",
  "metadata",
  "100.100.100.200",
]);

export interface ValidationOutcome {
  valid: boolean;
  errors: string[];
}

type Ipv4Quad = [number, number, number, number];

function parseIpv4Octets(host: string): Ipv4Quad | null {
  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return null;
  const octets = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
  ];
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return null;
  }
  return octets as Ipv4Quad;
}

function isBlockedIpv4(
  [a, b, c, d]: Ipv4Quad,
  allowLoopback: boolean
): boolean {
  if (a === 127) {
    return !(allowLoopback && b === 0 && c === 0 && d === 1);
  }
  if (a === 0 || a === 10 || a >= 224) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && c === 0) return true;
  return false;
}

function expandIpv6Groups(rawHost: string): number[] | null {
  if (!rawHost.includes(":") || rawHost.includes("%")) return null;
  let candidate = rawHost;
  const lastColon = candidate.lastIndexOf(":");
  const tail = candidate.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = parseIpv4Octets(tail);
    if (!v4) return null;
    const hi = ((v4[0] << 8) | v4[1]).toString(16);
    const lo = ((v4[2] << 8) | v4[3]).toString(16);
    candidate = `${candidate.slice(0, lastColon)}:${hi}:${lo}`;
  }

  const dblParts = candidate.split("::");
  if (dblParts.length > 2) return null;

  const parsePart = (part: string): number[] | null => {
    if (!part) return [];
    const tokens = part.split(":");
    const nums: number[] = [];
    for (const tok of tokens) {
      if (!/^[0-9a-f]{1,4}$/i.test(tok)) return null;
      nums.push(Number.parseInt(tok, 16));
    }
    return nums;
  };

  const left = parsePart(dblParts[0]);
  if (!left) return null;

  if (dblParts.length === 1) {
    return left.length === 8 ? left : null;
  }

  const right = parsePart(dblParts[1]);
  if (!right) return null;
  const missing = 8 - (left.length + right.length);
  if (missing < 1) return null;
  return [...left, ...Array.from({ length: missing }, () => 0), ...right];
}

function isBlockedIpv6(groups: number[], allowLoopback: boolean): boolean {
  const allZeroPrefix = groups.slice(0, 7).every((g) => g === 0);
  if (allZeroPrefix && groups[7] === 0) return true;
  if (allZeroPrefix && groups[7] === 1) return !allowLoopback;

  const first = groups[0];
  if ((first & 0xfe00) === 0xfc00) return true;
  if ((first & 0xffc0) === 0xfe80) return true;
  if ((first & 0xff00) === 0xff00) return true;

  if (first === 0x2002) {
    const embedded6to4: Ipv4Quad = [
      (groups[1] >> 8) & 0xff,
      groups[1] & 0xff,
      (groups[2] >> 8) & 0xff,
      groups[2] & 0xff,
    ];
    return isBlockedIpv4(embedded6to4, false);
  }

  const isMappedV4 =
    groups.slice(0, 5).every((g) => g === 0) &&
    (groups[5] === 0xffff || groups[5] === 0);
  const isNat64 =
    groups[0] === 0x0064 &&
    groups[1] === 0xff9b &&
    groups.slice(2, 6).every((g) => g === 0);

  if (isMappedV4 || isNat64) {
    const mappedQuad: Ipv4Quad = [
      (groups[6] >> 8) & 0xff,
      groups[6] & 0xff,
      (groups[7] >> 8) & 0xff,
      groups[7] & 0xff,
    ];
    return isBlockedIpv4(mappedQuad, false);
  }
  return false;
}

function normalizeUrlHostname(rawHostname: string): string {
  const lower = rawHostname.toLowerCase();
  let unbracketed =
    lower.startsWith("[") && lower.endsWith("]") ? lower.slice(1, -1) : lower;
  while (unbracketed.endsWith(".")) {
    unbracketed = unbracketed.slice(0, -1);
  }
  return unbracketed;
}

function evaluateGatewayHost(
  host: string,
  allowLocalhost: boolean
): { isExactLoopback: boolean; blockedError: string | null } {
  if (!host) {
    return { isExactLoopback: false, blockedError: "Invalid gateway hostname" };
  }
  const isExactLoopback =
    host === "localhost" || host === "127.0.0.1" || host === "::1";

  if (
    BLOCKED_HOSTNAMES.has(host) ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return {
      isExactLoopback: false,
      blockedError:
        "Private, loopback, and metadata hosts are forbidden (SSRF protection)",
    };
  }

  if (host === "localhost") {
    return {
      isExactLoopback: true,
      blockedError: allowLocalhost
        ? null
        : "Localhost gateway URLs are forbidden unless explicitly allowed",
    };
  }

  const v4 = parseIpv4Octets(host);
  if (v4) {
    return {
      isExactLoopback,
      blockedError: isBlockedIpv4(v4, allowLocalhost)
        ? "Private, loopback, CGNAT, and link-local IPv4 hosts are forbidden"
        : null,
    };
  }

  if (host.includes(":")) {
    const v6 = expandIpv6Groups(host);
    if (!v6 || isBlockedIpv6(v6, allowLocalhost)) {
      return {
        isExactLoopback,
        blockedError:
          "Private, loopback, link-local, and mapped IPv6 hosts are forbidden",
      };
    }
  }

  return { isExactLoopback, blockedError: null };
}

export function validateGatewayUrl(
  rawUrl: string,
  options: { allowLocalhost?: boolean } = {}
): ValidationOutcome {
  const errors: string[] = [];
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) {
    return { valid: false, errors: ["Gateway URL is required"] };
  }
  if (trimmed.includes("\\") || /[\u0000-\u001f\u007f]/.test(trimmed)) {
    return {
      valid: false,
      errors: ["Gateway URL must not contain backslashes or control chars"],
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, errors: ["Invalid URL format"] };
  }

  if (parsed.username || parsed.password) {
    errors.push("Gateway URL must not contain embedded credentials");
  }
  if (parsed.search || parsed.hash) {
    errors.push("Gateway URL must not contain query parameters or fragments");
  }

  const allowLocalhost = Boolean(options.allowLocalhost);
  const host = normalizeUrlHostname(parsed.hostname);
  const { isExactLoopback, blockedError } = evaluateGatewayHost(
    host,
    allowLocalhost
  );
  if (blockedError) errors.push(blockedError);

  if (parsed.protocol === "http:") {
    if (!allowLocalhost || !isExactLoopback) {
      errors.push("HTTPS protocol is required for external gateway URLs");
    }
  } else if (parsed.protocol !== "https:") {
    errors.push(
      "Only HTTPS (or explicitly allowed localhost HTTP) protocol is permitted"
    );
  }

  return { valid: errors.length === 0, errors };
}

export function isSafeHttpUrl(rawUrl: unknown): boolean {
  if (typeof rawUrl !== "string") return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || /[\u0000-\u001f\u007f<>\\]/.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.username || parsed.password) return false;
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function validatePublicChannelLinks(links: unknown): ValidationOutcome {
  const errors: string[] = [];
  if (!Array.isArray(links)) {
    return { valid: false, errors: ["publicChannelLinks must be an array"] };
  }
  for (let i = 0; i < links.length; i += 1) {
    const item = links[i] as Partial<PublicChannelLink> | null;
    if (!item || typeof item !== "object") {
      errors.push(`publicChannelLinks[${i}] must be an object`);
      continue;
    }
    if (!isSafeHttpUrl(item.inviteUrl)) {
      errors.push(
        `publicChannelLinks[${i}].inviteUrl must be a valid http(s) URL`
      );
    }
  }
  return { valid: errors.length === 0, errors };
}

export function normalizeChannels(
  rawChannels: unknown,
  fallback: BroadcastChannel[] = ["email"]
): BroadcastChannel[] {
  if (!Array.isArray(rawChannels)) {
    return [...fallback];
  }
  const filtered = rawChannels
    .map((c) => String(c).trim().toLowerCase() as BroadcastChannel)
    .filter((c): c is BroadcastChannel =>
      (SUPPORTED_CHANNELS as readonly string[]).includes(c)
    );
  return filtered.length > 0 ? Array.from(new Set(filtered)) : [...fallback];
}

export function isSupportedWhatsAppDriver(
  driver: unknown
): driver is WhatsAppDriver {
  return (SUPPORTED_WHATSAPP_DRIVERS as readonly string[]).includes(
    String(driver || "").trim()
  );
}

const GATEWAY_SESSION_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidGatewaySession(session: unknown): boolean {
  return typeof session === "string" && GATEWAY_SESSION_RE.test(session.trim());
}

function validateCampaignChannelsList(
  rawChannels: unknown,
  errors: string[]
): void {
  const channels = Array.isArray(rawChannels) ? rawChannels : [];
  if (channels.length === 0) {
    errors.push("At least one broadcast channel is required");
    return;
  }
  for (const ch of channels) {
    const normalized = String(ch).trim().toLowerCase();
    if (!(SUPPORTED_CHANNELS as readonly string[]).includes(normalized)) {
      errors.push(`Unsupported broadcast channel: ${String(ch)}`);
    }
  }
}

function validateOptionalHttpUrl(
  urlValue: string | undefined,
  fieldName: string,
  errors: string[]
): void {
  if (!urlValue) return;
  if (!isSafeHttpUrl(urlValue)) {
    errors.push(`${fieldName} must use http or https protocol`);
  }
}

export function validateCampaignInput(
  input: Partial<CampaignRecord>
): ValidationOutcome {
  const errors: string[] = [];
  const slug = String(input.slug || "").trim();
  const title = String(input.title || "").trim();
  const subject = String(input.subject || "").trim();
  const bodyText = String(input.bodyText || "").trim();

  if (!slug || !SLUG_REGEX.test(slug)) {
    errors.push("Campaign slug must be lowercase kebab-case");
  }
  if (title.length < 3) {
    errors.push("Campaign title must be at least 3 characters");
  }
  if (subject.length < 3) {
    errors.push("Campaign subject must be at least 3 characters");
  }
  if (bodyText.length < 5) {
    errors.push("Campaign bodyText must be at least 5 characters");
  }

  validateCampaignChannelsList(input.channels, errors);
  validateOptionalHttpUrl(input.ctaUrl, "ctaUrl", errors);
  validateOptionalHttpUrl(input.mediaUrl, "mediaUrl", errors);

  if (input.translations && typeof input.translations === "object") {
    for (const [locale, tr] of Object.entries(input.translations)) {
      if (tr && typeof tr === "object" && tr.ctaUrl) {
        validateOptionalHttpUrl(
          tr.ctaUrl,
          `translations.${locale}.ctaUrl`,
          errors
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function requireNonEmptyFields(
  fields: Array<[string | undefined, string]>,
  errors: string[]
): void {
  for (const [val, errMessage] of fields) {
    if (!String(val || "").trim()) {
      errors.push(errMessage);
    }
  }
}

function validateCtaUrlTemplate(
  rawTemplate: string | undefined,
  errors: string[]
): void {
  if (!rawTemplate) return;
  const trimmed = String(rawTemplate).trim();
  if (!trimmed) return;
  const resolvedProbe = trimmed
    .replace(/^\{\{\s*siteBaseUrl\s*\}\}/, "https://example.org")
    .replace(/\{\{\s*[a-zA-Z0-9_.-]+\s*\}\}/g, "segment");
  if (!isSafeHttpUrl(resolvedProbe)) {
    errors.push("ctaUrlTemplate must resolve to an http or https URL");
  }
}

export function validateAutomationRuleInput(
  input: Partial<AutomationRuleRecord>
): ValidationOutcome {
  const errors: string[] = [];
  const slug = String(input.slug || "").trim();
  const name = String(input.name || "").trim();
  const eventName = String(input.eventName || "").trim();
  const targetUid = String(input.targetContentType || "").trim();

  if (!slug || !SLUG_REGEX.test(slug)) {
    errors.push("Automation rule slug must be lowercase kebab-case");
  }
  if (name.length < 3) {
    errors.push("Automation rule name must be at least 3 characters");
  }

  requireNonEmptyFields(
    [
      [input.eventName, "eventName is required"],
      [input.subjectTemplate, "subjectTemplate is required"],
      [input.bodyTextTemplate, "bodyTextTemplate is required"],
    ],
    errors
  );

  if (eventName.toLowerCase().startsWith("broadcasts.")) {
    errors.push('eventName cannot start with "broadcasts." (loop protection)');
  }
  if (targetUid.toLowerCase().startsWith("plugin::broadcasts.")) {
    errors.push(
      'targetContentType cannot target "plugin::broadcasts.*" (loop protection)'
    );
  }
  if (input.channels !== undefined) {
    validateCampaignChannelsList(input.channels, errors);
  }
  validateCtaUrlTemplate(input.ctaUrlTemplate, errors);

  return { valid: errors.length === 0, errors };
}
