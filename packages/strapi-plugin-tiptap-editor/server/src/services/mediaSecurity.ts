import dns from "node:dns";
import net from "node:net";
import { Agent } from "undici";

export interface ResolvedHostRecord {
  address: string;
  family: 4 | 6;
}

export const EXTENSION_MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
};

export const ALLOWED_REMOTE_MIMES = new Set<string>(
  Object.values(EXTENSION_MIME_MAP)
);

export const MIME_ALIASES: Record<string, string[]> = {
  "image/jpeg": ["image/jpg", "image/pjpeg"],
  "audio/wav": ["audio/x-wav", "audio/wave", "audio/vnd.wave"],
  "audio/mp4": ["audio/x-m4a", "audio/m4a"],
  "audio/ogg": ["application/ogg", "video/ogg"],
  "audio/mpeg": ["audio/mp3"],
  "application/zip": ["application/x-zip-compressed"],
};

/**
 * Checks whether an IPv4 dotted-quad address belongs to a loopback, private, link-local,
 * CGNAT, cloud metadata, multicast, or reserved range.
 */
function isPrivateIpv4Octets(
  octets: [number, number, number, number]
): boolean {
  const [a, b, c] = octets;
  if (a === 0) return true; // 0.0.0.0/8 (unspecified / local network)
  if (a === 10) return true; // 10.0.0.0/8 (RFC1918)
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT & Alibaba 100.100.100.200)
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local & cloud metadata 169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 (RFC1918)
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // 192.0.0.0/24 & TEST-NET-1
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 (RFC1918)
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 (benchmarking)
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // Multicast & reserved (224.0.0.0/4+)
  return false;
}

/**
 * Parses a standard dotted-quad IPv4 string into four octets, or returns null.
 */
function parseIpv4Octets(ip: string): [number, number, number, number] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : NaN));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return [nums[0], nums[1], nums[2], nums[3]];
}

const ALLOWED_REMOTE_PORTS = new Set(["", "80", "443", "8080", "8443"]);

function stripTrailingDots(host: string): string {
  let end = host.length;
  while (end > 0 && host.charCodeAt(end - 1) === 46) {
    end -= 1;
  }
  return end === host.length ? host : host.slice(0, end);
}

const v6Subnet = (prefix: string) => `${prefix}::`;

const BLOCKED_IPV6 = new net.BlockList();
for (const [prefix, bits] of [
  ["::", 96],
  [`${v6Subnet("")}ffff:0:0:0`, 96], // RFC 2765 SIIT IPv4-translated IPv6 (0:0:0:0:ffff:0:w.x.y.z)
  [v6Subnet("64:ff9b"), 96],
  [v6Subnet("64:ff9b:1"), 48],
  [v6Subnet("100"), 64], // RFC 6666 discard prefix
  [v6Subnet("2001"), 23], // IANA special-purpose & benchmarking (2001:2::/48)
  [v6Subnet("2001"), 32],
  [v6Subnet("2001:db8"), 32],
  [v6Subnet("2002"), 16],
  [v6Subnet("fc00"), 7],
  [v6Subnet("fe80"), 10],
  [v6Subnet("ff00"), 8],
] as const) {
  BLOCKED_IPV6.addSubnet(prefix, bits, "ipv6");
}

/**
 * Checks whether an IPv4 or IPv6 address (including IPv4-mapped IPv6 `::ffff:...`)
 * belongs to a loopback, private, link-local, CGNAT, or metadata range.
 */
export function isPrivateIpAddress(rawIp: string): boolean {
  const clean = rawIp
    .trim()
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
  if (!clean) return true;

  const v4 = parseIpv4Octets(clean);
  if (v4) {
    return isPrivateIpv4Octets(v4);
  }

  // IPv6 checks
  const zoneStripped = clean.split("%")[0];
  if (
    zoneStripped === "::" ||
    zoneStripped === "::1" ||
    zoneStripped === "0:0:0:0:0:0:0:1" ||
    zoneStripped === "0:0:0:0:0:0:0:0"
  ) {
    return true;
  }

  // IPv4-mapped IPv6 dotted-quad: ::ffff:127.0.0.1
  const mappedDottedMatch = /^(?:0*:){0,5}0*ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(
    zoneStripped
  );
  if (mappedDottedMatch) {
    const mappedV4 = parseIpv4Octets(mappedDottedMatch[1]);
    return mappedV4 ? isPrivateIpv4Octets(mappedV4) : true;
  }

  // IPv4-mapped IPv6 hex words (Node URL normalizes http://[::ffff:127.0.0.1] to [::ffff:7f00:1])
  const mappedHexMatch =
    /^(?:0*:){0,5}0*ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(zoneStripped);
  if (mappedHexMatch) {
    const hi = parseInt(mappedHexMatch[1], 16);
    const lo = parseInt(mappedHexMatch[2], 16);
    return isPrivateIpv4Octets([
      (hi >> 8) & 0xff,
      hi & 0xff,
      (lo >> 8) & 0xff,
      lo & 0xff,
    ]);
  }

  // RFC 5214 ISATAP tunnel addresses (:5efe:a.b.c.d or :5efe:xxxx:xxxx)
  if (
    /(?:^|:)0*5efe:(?:\d+\.\d+\.\d+\.\d+|[0-9a-f]{1,4}:[0-9a-f]{1,4})$/i.test(
      zoneStripped
    )
  ) {
    return true;
  }

  if (net.isIP(zoneStripped) !== 6) {
    return true;
  }

  return BLOCKED_IPV6.check(zoneStripped, "ipv6");
}

/**
 * Validates that a remote URL is safe against SSRF (blocks loopback, private subnets,
 * CGNAT, cloud metadata endpoints, IPv6 private/mapped ranges, disallowed ports, trailing-dot hostnames, and non-HTTP(S) schemes).
 */
export function isSsrfSafeUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }
    if (!ALLOWED_REMOTE_PORTS.has(parsed.port)) {
      return false;
    }

    const rawHost = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const normalizedHost = stripTrailingDots(rawHost);
    if (!normalizedHost) {
      return false;
    }

    if (
      normalizedHost === "localhost" ||
      normalizedHost.endsWith(".localhost") ||
      normalizedHost.endsWith(".local") ||
      normalizedHost.endsWith(".internal") ||
      normalizedHost === "metadata.google.internal"
    ) {
      return false;
    }

    // Reject obfuscated integer/hex/octal IPv4 hostnames (e.g. 2130706433 or 0x7f000001)
    if (/^(0x[0-9a-f]+|\d+)$/i.test(normalizedHost)) {
      return false;
    }

    if (net.isIP(normalizedHost) !== 0 || normalizedHost.includes(":")) {
      if (isPrivateIpAddress(normalizedHost)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves a hostname via DNS, fails closed on lookup errors, and verifies that none of the
 * resolved IPv4/IPv6 addresses point to a private, loopback, link-local, or metadata network.
 * Returns the validated DNS records so callers can pin the connection to the validated IP.
 */
export async function assertSafeResolvedHost(
  hostname: string
): Promise<ResolvedHostRecord[]> {
  const cleanHost = stripTrailingDots(
    hostname.toLowerCase().replace(/^\[|\]$/g, "")
  );
  if (!cleanHost) {
    throw new Error("Failed to resolve URL host");
  }

  const literalFamily = net.isIP(cleanHost);
  if (literalFamily === 4 || literalFamily === 6) {
    if (isPrivateIpAddress(cleanHost)) {
      throw new Error(
        "URL resolved to a disallowed private or internal IP address"
      );
    }
    return [{ address: cleanHost, family: literalFamily }];
  }

  if (typeof dns?.promises?.lookup !== "function") {
    throw new Error("Failed to resolve URL host");
  }

  try {
    const records = await dns.promises.lookup(cleanHost, { all: true });
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error("Failed to resolve URL host");
    }
    const validated: ResolvedHostRecord[] = [];
    for (const record of records) {
      if (!record?.address || isPrivateIpAddress(record.address)) {
        throw new Error(
          "URL resolved to a disallowed private or internal IP address"
        );
      }
      const family: 4 | 6 =
        record.family === 6 || net.isIP(record.address) === 6 ? 6 : 4;
      validated.push({ address: record.address, family });
    }
    return validated;
  } catch (err) {
    if (err instanceof Error && err.message.includes("disallowed private")) {
      throw err;
    }
    throw new Error("Failed to resolve URL host", { cause: err });
  }
}

/**
 * Creates an undici `Agent` dispatcher whose `connect.lookup` callback is pinned to the
 * pre-validated DNS records, preventing DNS-rebinding TOCTOU between validation and `fetch`.
 * Fails closed by throwing when no resolved records are available or dispatcher creation fails.
 */
export function createPinnedFetchDispatcher(
  records: ResolvedHostRecord[]
): Agent {
  if (
    !records.length ||
    records.some((r) => !r.address || isPrivateIpAddress(r.address))
  ) {
    throw new Error("Failed to resolve URL host");
  }
  const primary = records[0];
  return new Agent({
    connect: {
      lookup: (
        _hostname: string,
        options:
          | { all?: boolean }
          | ((err: Error | null, address: string, family: number) => void),
        callback?: (
          err: Error | null,
          addressOrRecords: string | ResolvedHostRecord[],
          family?: number
        ) => void
      ) => {
        const cb = typeof options === "function" ? options : callback;
        const wantAll =
          typeof options === "object" &&
          options !== null &&
          Boolean(options.all);
        if (typeof cb !== "function") return;
        if (records.some((r) => !r.address || isPrivateIpAddress(r.address))) {
          cb(
            new Error(
              "URL resolved to a disallowed private or internal IP address"
            ),
            "",
            4
          );
          return;
        }
        if (wantAll) {
          (
            cb as unknown as (
              err: Error | null,
              records: ResolvedHostRecord[]
            ) => void
          )(null, records);
        } else {
          (cb as (err: Error | null, address: string, family: number) => void)(
            null,
            primary.address,
            primary.family
          );
        }
      },
    },
  });
}

/**
 * Infers an allowlisted MIME type from a filename extension, or returns `null` if unsupported.
 */
export function inferMimeFromFilename(filename: string): string | null {
  const dotIdx = filename.lastIndexOf(".");
  if (dotIdx <= 0) return null;
  const ext = filename.slice(dotIdx).toLowerCase();
  return EXTENSION_MIME_MAP[ext] ?? null;
}

/**
 * Verifies that downloaded binary bytes match the expected file signature (magic bytes)
 * for an allowlisted MIME type.
 */
export function matchesMagicBytes(buffer: Buffer, mime: string): boolean {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return false;
  }

  switch (mime) {
    case "image/jpeg":
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );

    case "image/png":
      return (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );

    case "image/gif": {
      if (buffer.length < 6) return false;
      const sig = buffer.subarray(0, 6).toString("ascii");
      return sig === "GIF87a" || sig === "GIF89a";
    }

    case "image/webp":
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );

    case "image/avif":
    case "video/mp4":
    case "audio/mp4": {
      if (
        buffer.length < 12 ||
        buffer.subarray(4, 8).toString("ascii") !== "ftyp"
      ) {
        return false;
      }
      const boxSize = buffer.readUInt32BE(0);
      const majorBrand = buffer.subarray(8, 12).toString("ascii");
      return (
        (boxSize === 1 || (boxSize >= 8 && boxSize <= 4096)) &&
        /^[a-zA-Z0-9 ]{4}$/.test(majorBrand)
      );
    }

    case "video/webm":
      return (
        buffer.length >= 4 &&
        buffer[0] === 0x1a &&
        buffer[1] === 0x45 &&
        buffer[2] === 0xdf &&
        buffer[3] === 0xa3
      );

    case "audio/ogg":
      return (
        buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "OggS"
      );

    case "audio/mpeg":
      return (
        (buffer.length >= 3 &&
          buffer.subarray(0, 3).toString("ascii") === "ID3") ||
        (buffer.length >= 4 &&
          buffer[0] === 0xff &&
          (buffer[1] & 0xe0) === 0xe0 &&
          (buffer[1] & 0x18) !== 0x08 &&
          (buffer[1] & 0x06) !== 0x00 &&
          (buffer[2] & 0xf0) !== 0xf0 &&
          (buffer[2] & 0x0c) !== 0x0c)
      );

    case "audio/wav":
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WAVE"
      );

    case "application/pdf":
      return (
        buffer.length >= 5 &&
        buffer.subarray(0, 5).toString("ascii") === "%PDF-"
      );

    case "application/zip":
      return (
        buffer.length >= 4 &&
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        ((buffer[2] === 0x03 && buffer[3] === 0x04) ||
          (buffer[2] === 0x05 && buffer[3] === 0x06) ||
          (buffer[2] === 0x07 && buffer[3] === 0x08))
      );

    default:
      return false;
  }
}
