export type TrustedUpstreamService = "quran" | "islamic_api" | "any";

function isDisallowedIpv4Octets(
  a: number,
  b: number,
  c: number,
  d: number
): boolean {
  const octets = [a, b, c, d];
  if (
    octets.some(
      (o) => !Number.isInteger(o) || !Number.isFinite(o) || o < 0 || o > 255
    )
  ) {
    return true;
  }
  if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  return false;
}

function parseDottedIpv4(
  text: string
): [number, number, number, number] | null {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(text)) return null;
  const parts = text.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
  ) {
    return null;
  }
  return [parts[0], parts[1], parts[2], parts[3]];
}

function parseHexWord(segment: string): number | null {
  if (!/^[0-9a-f]{1,4}$/i.test(segment)) return null;
  const val = Number.parseInt(segment, 16);
  return Number.isInteger(val) && val >= 0 && val <= 0xffff ? val : null;
}

function normalizeIpv6DottedSuffix(addr: string): string | null {
  const lastColon = addr.lastIndexOf(":");
  if (lastColon < 0 || !addr.slice(lastColon + 1).includes(".")) {
    return addr;
  }
  const ipv4 = parseDottedIpv4(addr.slice(lastColon + 1));
  if (!ipv4) return null;
  const high = ((ipv4[0] << 8) | ipv4[1]).toString(16);
  const low = ((ipv4[2] << 8) | ipv4[3]).toString(16);
  return `${addr.slice(0, lastColon + 1)}${high}:${low}`;
}

function parseIpv6Words(rawAddr: string): number[] | null {
  if (!rawAddr || rawAddr.includes("%")) return null;
  const normalized = normalizeIpv6DottedSuffix(rawAddr.toLowerCase());
  if (!normalized) return null;

  const halves = normalized.split("::");
  if (halves.length > 2) return null;

  const leftRaw = halves[0] ? halves[0].split(":") : [];
  const rightRaw = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  if (halves.length === 1 && leftRaw.length !== 8) return null;
  if (halves.length === 2 && leftRaw.length + rightRaw.length >= 8) return null;

  const leftWords: number[] = [];
  for (const seg of leftRaw) {
    const w = parseHexWord(seg);
    if (w === null) return null;
    leftWords.push(w);
  }
  const rightWords: number[] = [];
  for (const seg of rightRaw) {
    const w = parseHexWord(seg);
    if (w === null) return null;
    rightWords.push(w);
  }

  const zeroCount =
    halves.length === 2 ? 8 - leftWords.length - rightWords.length : 0;
  const words = [
    ...leftWords,
    ...Array.from({ length: zeroCount }, () => 0),
    ...rightWords,
  ];
  return words.length === 8 ? words : null;
}

function checkEmbeddedIpv4Words(hiWord: number, loWord: number): boolean {
  const a = (hiWord >> 8) & 0xff;
  const b = hiWord & 0xff;
  const c = (loWord >> 8) & 0xff;
  const d = loWord & 0xff;
  return isDisallowedIpv4Octets(a, b, c, d);
}

function isDisallowedIpv6Words(w: number[]): boolean {
  const allZeroPrefix5 =
    w[0] === 0 && w[1] === 0 && w[2] === 0 && w[3] === 0 && w[4] === 0;
  if (
    allZeroPrefix5 &&
    w[5] === 0 &&
    w[6] === 0 &&
    (w[7] === 0 || w[7] === 1)
  ) {
    return true;
  }
  if (allZeroPrefix5 && (w[5] === 0xffff || w[5] === 0)) {
    return checkEmbeddedIpv4Words(w[6], w[7]);
  }
  if (
    w[0] === 0 &&
    w[1] === 0 &&
    w[2] === 0 &&
    w[3] === 0 &&
    w[4] === 0xffff &&
    w[5] === 0
  ) {
    return checkEmbeddedIpv4Words(w[6], w[7]);
  }
  if (w[0] === 0x0064 && w[1] === 0xff9b) {
    return checkEmbeddedIpv4Words(w[6], w[7]);
  }
  if (w[0] === 0x2002) {
    return checkEmbeddedIpv4Words(w[1], w[2]);
  }
  if ((w[0] & 0xfe00) === 0xfc00) return true;
  if ((w[0] & 0xffc0) === 0xfe80) return true;
  if ((w[0] & 0xffc0) === 0xfec0) return true;
  if ((w[0] & 0xff00) === 0xff00) return true;
  if (w[0] === 0x2001 && w[1] === 0x0db8) return true;
  return false;
}

function trimTrailingDots(value: string): string {
  let out = value;
  while (out.endsWith(".")) {
    out = out.slice(0, -1);
  }
  return out;
}

export function isDisallowedHostname(rawHostname: string): boolean {
  const host = trimTrailingDots(rawHostname.trim().toLowerCase());
  if (!host) return true;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }
  if (host.startsWith("[") || host.includes(":")) {
    const inner =
      host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
    const words = parseIpv6Words(inner);
    return words === null || isDisallowedIpv6Words(words);
  }
  const ipv4 = parseDottedIpv4(host);
  if (ipv4) {
    return isDisallowedIpv4Octets(ipv4[0], ipv4[1], ipv4[2], ipv4[3]);
  }
  if (/^\d+(?:\.\d+)*$/.test(host)) {
    return true;
  }
  return false;
}

export function isTrustedUpstreamHost(
  rawHostname: string,
  service: TrustedUpstreamService = "any"
): boolean {
  const host = trimTrailingDots(rawHostname.trim().toLowerCase());
  if (isDisallowedHostname(host)) return false;

  const isQuranHost =
    host === "api.quran.com" ||
    host === "quran.foundation" ||
    (host.endsWith(".quran.foundation") &&
      host.length > ".quran.foundation".length);
  const isIslamicApiHost = host === "islamicapi.com";

  if (service === "quran") return isQuranHost;
  if (service === "islamic_api") return isIslamicApiHost;
  return isQuranHost || isIslamicApiHost;
}

export function validateSafeHttpsBaseUrl(
  rawUrl: unknown,
  options?: {
    service?: TrustedUpstreamService;
    requireTrustedHost?: boolean;
  }
): string | null {
  if (typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2048) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    return null;
  }
  if (isDisallowedHostname(parsed.hostname)) return null;

  const requireTrusted = options?.requireTrustedHost ?? true;
  if (
    requireTrusted &&
    !isTrustedUpstreamHost(parsed.hostname, options?.service ?? "any")
  ) {
    return null;
  }

  return parsed.toString();
}

export function sanitizeUpstreamBaseUrl(
  rawUrl: unknown,
  fallbackUrl: string,
  service: TrustedUpstreamService = "any"
): string {
  return (
    validateSafeHttpsBaseUrl(rawUrl, {
      service,
      requireTrustedHost: true,
    }) ?? fallbackUrl
  );
}

export function buildSafeQueryUrl(
  base: string,
  subPath: string,
  queryParams: Record<string, string | number | boolean | undefined>,
  options?: {
    service?: TrustedUpstreamService;
    requireTrustedHost?: boolean;
  }
): string | null {
  const safeBase = validateSafeHttpsBaseUrl(base, options);
  if (!safeBase) return null;
  if (subPath.includes("..") || subPath.includes("\\")) return null;

  const normalizedBase = safeBase.endsWith("/") ? safeBase : `${safeBase}/`;
  try {
    const baseParsed = new URL(normalizedBase);
    const url = new URL(subPath.replace(/^\/+/, ""), baseParsed);
    if (
      url.origin !== baseParsed.origin ||
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.hash ||
      !url.pathname.startsWith(baseParsed.pathname)
    ) {
      return null;
    }
    for (const [k, v] of Object.entries(queryParams)) {
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  } catch {
    return null;
  }
}
