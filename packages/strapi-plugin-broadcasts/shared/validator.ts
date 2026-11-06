import { SUPPORTED_CHANNELS, SUPPORTED_WHATSAPP_DRIVERS } from "./constants";
import type {
  AutomationRuleRecord,
  BroadcastChannel,
  CampaignRecord,
  WhatsAppDriver,
} from "./types";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BLOCKED_PRIVATE_HOSTS = new Set([
  "169.254.169.254",
  "100.100.100.200",
  "metadata.google.internal",
  "0.0.0.0",
]);

export interface ValidationOutcome {
  valid: boolean;
  errors: string[];
}

function checkGatewayProtocol(
  protocol: string,
  hostname: string,
  allowLocalhost?: boolean
): string | null {
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  if (protocol === "http:") {
    return !isLocalhost || !allowLocalhost
      ? "HTTPS protocol is required for external gateway URLs"
      : null;
  }
  if (protocol !== "https:") {
    return "Only HTTPS (or explicitly allowed localhost HTTP) protocol is permitted";
  }
  return null;
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

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, errors: ["Invalid URL format"] };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_PRIVATE_HOSTS.has(hostname) || hostname.startsWith("169.254.")) {
    errors.push(
      "Cloud metadata and link-local hosts are forbidden (SSRF protection)"
    );
  }

  const protoErr = checkGatewayProtocol(
    parsed.protocol,
    hostname,
    options.allowLocalhost
  );
  if (protoErr) errors.push(protoErr);

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function normalizeChannels(rawChannels: unknown): BroadcastChannel[] {
  if (!Array.isArray(rawChannels)) {
    return ["email"];
  }
  const filtered = rawChannels
    .map((c) => String(c).trim().toLowerCase() as BroadcastChannel)
    .filter((c): c is BroadcastChannel =>
      (SUPPORTED_CHANNELS as readonly string[]).includes(c)
    );
  return filtered.length > 0 ? Array.from(new Set(filtered)) : ["email"];
}

export function isSupportedWhatsAppDriver(
  driver: unknown
): driver is WhatsAppDriver {
  return (SUPPORTED_WHATSAPP_DRIVERS as readonly string[]).includes(
    String(driver || "").trim()
  );
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
    if (!(SUPPORTED_CHANNELS as readonly string[]).includes(String(ch))) {
      errors.push(`Unsupported broadcast channel: ${String(ch)}`);
    }
  }
}

function validateOptionalCtaUrl(
  ctaUrl: string | undefined,
  errors: string[]
): void {
  if (!ctaUrl) return;
  try {
    const parsed = new URL(ctaUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      errors.push("ctaUrl must use http or https protocol");
    }
  } catch {
    errors.push("ctaUrl must be a valid URL");
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
  validateOptionalCtaUrl(input.ctaUrl, errors);

  return {
    valid: errors.length === 0,
    errors,
  };
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

export function validateAutomationRuleInput(
  input: Partial<AutomationRuleRecord>
): ValidationOutcome {
  const errors: string[] = [];
  const slug = String(input.slug || "").trim();
  const name = String(input.name || "").trim();

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

  return {
    valid: errors.length === 0,
    errors,
  };
}
