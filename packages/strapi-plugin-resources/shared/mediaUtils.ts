import {
  BLOCKED_DOWNLOAD_EXTENSIONS,
  BLOCKED_DOWNLOAD_MIME_TYPES,
  DEFAULT_ALLOWED_DOWNLOAD_EXTENSIONS,
  DEFAULT_ALLOWED_DOWNLOAD_MIME_TYPES,
} from "./constants";
import type { MediaLibraryAsset, MediaLibraryFormatVariant } from "./types";

const CONTROL_CHAR_REGEX = /[\u0000-\u001f\u007f]/;

/**
 * Validates and normalizes a URL for safe use in `href`, `src`, or download
 * redirects. Permits only `https:`, `http:`, or safe root-relative `/...`
 * paths without `//`, `\`, or `..` traversal segments.
 */
export function toSafeHref(rawUrl: unknown): string | null {
  if (typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || CONTROL_CHAR_REGEX.test(trimmed) || trimmed.includes("\\")) {
    return null;
  }

  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//")) return null;
    const [pathAndQuery, hashPart] = trimmed.split("#", 2);
    const [rawPath, queryPart] = pathAndQuery.split("?", 2);
    if (rawPath.includes("..")) return null;
    try {
      const decoded = decodeURIComponent(rawPath);
      if (
        decoded.includes("..") ||
        decoded.includes("\\") ||
        CONTROL_CHAR_REGEX.test(decoded)
      ) {
        return null;
      }
    } catch {
      return null;
    }
    const normalizedPath = rawPath.replace(/\/+/g, "/");
    const withQuery =
      queryPart !== undefined
        ? `${normalizedPath}?${queryPart}`
        : normalizedPath;
    return hashPart !== undefined ? `${withQuery}#${hashPart}` : withQuery;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Extracts the lowercased file extension (e.g. `.pdf`) from a URL pathname.
 */
export function extractUrlExtension(rawUrl: unknown): string {
  const safeUrl = toSafeHref(rawUrl);
  if (!safeUrl) return "";
  try {
    const parsed = new URL(safeUrl, "https://resources.local");
    const decodedPath = decodeURIComponent(parsed.pathname);
    if (decodedPath.includes("..") || decodedPath.includes("\\")) return "";
    const fileName = decodedPath.split("/").pop() || "";
    const dotIdx = fileName.lastIndexOf(".");
    if (dotIdx <= 0 || dotIdx === fileName.length - 1) return "";
    return fileName.slice(dotIdx).toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Wraps `toSafeHref` and additionally rejects URLs whose pathname extension is
 * in `BLOCKED_DOWNLOAD_EXTENSIONS` (`.svg`, `.html`, `.js`, `.exe`, etc.) so
 * active-script files are never rendered as clickable `<a href>` links.
 */
export function toSafeOpenableHref(rawUrl: unknown): string | null {
  const safeHref = toSafeHref(rawUrl);
  if (!safeHref) return null;
  const ext = extractUrlExtension(safeHref);
  if (ext && BLOCKED_DOWNLOAD_EXTENSIONS.includes(ext)) {
    return null;
  }
  return safeHref;
}

/**
 * Checks whether an asset's extension or MIME type is in the active-script /
 * executable blocklist.
 */
export function isBlockedAssetType(ext: unknown, mime: unknown): boolean {
  const normalizedExt =
    typeof ext === "string" && ext.trim()
      ? (ext.trim().startsWith(".")
          ? ext.trim()
          : `.${ext.trim()}`
        ).toLowerCase()
      : "";
  const normalizedMime =
    typeof mime === "string" ? mime.trim().toLowerCase() : "";
  return (
    (normalizedExt.length > 0 &&
      BLOCKED_DOWNLOAD_EXTENSIONS.includes(normalizedExt)) ||
    (normalizedMime.length > 0 &&
      BLOCKED_DOWNLOAD_MIME_TYPES.includes(normalizedMime))
  );
}

/**
 * Strips path traversal sequences (`../`, `..\\`), directory separators,
 * quotes, and control characters from a filename before use in HTTP headers.
 */
export function sanitizeFilename(
  rawName: unknown,
  fallbackExt = ".pdf"
): string {
  const input = typeof rawName === "string" ? rawName.trim() : "";
  const base = input.replace(/\\/g, "/").split("/").pop() || "";
  const normalized = base
    .replace(/\.\.+/g, ".")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+/, "");
  let end = normalized.length;
  while (
    end > 0 &&
    (normalized[end - 1] === "-" || normalized[end - 1] === ".")
  ) {
    end -= 1;
  }
  const cleaned = normalized.slice(0, end).slice(0, 120);

  if (!cleaned) {
    const ext = fallbackExt.startsWith(".") ? fallbackExt : `.${fallbackExt}`;
    return `resource${ext}`;
  }
  return cleaned;
}

/**
 * Validates that a Strapi Media Library asset matches the configured extension
 * and MIME allow-list while unconditionally blocking active-script types.
 */
export function isAllowedDownloadAsset(
  ext: unknown,
  mime: unknown,
  allowedExtensions: string[] = DEFAULT_ALLOWED_DOWNLOAD_EXTENSIONS,
  allowedMimeTypes: string[] = DEFAULT_ALLOWED_DOWNLOAD_MIME_TYPES
): boolean {
  const normalizedExt =
    typeof ext === "string" && ext.trim()
      ? (ext.trim().startsWith(".")
          ? ext.trim()
          : `.${ext.trim()}`
        ).toLowerCase()
      : "";
  const normalizedMime =
    typeof mime === "string" ? mime.trim().toLowerCase() : "";

  if (
    !normalizedExt ||
    !normalizedMime ||
    isBlockedAssetType(normalizedExt, normalizedMime)
  ) {
    return false;
  }

  const extAllowed = allowedExtensions.some(
    (item) => item.toLowerCase() === normalizedExt
  );
  const mimeAllowed = allowedMimeTypes.some(
    (item) => item.toLowerCase() === normalizedMime
  );

  return extAllowed && mimeAllowed;
}

/**
 * Validates that an external/relative download URL uses a safe scheme and an
 * allowed file extension.
 */
export function isAllowedExternalDownloadUrl(
  rawUrl: unknown,
  allowedExtensions: string[] = DEFAULT_ALLOWED_DOWNLOAD_EXTENSIONS
): boolean {
  const ext = extractUrlExtension(rawUrl);
  if (!ext || BLOCKED_DOWNLOAD_EXTENSIONS.includes(ext)) {
    return false;
  }
  return allowedExtensions.some((item) => item.toLowerCase() === ext);
}

/**
 * Builds hardened HTTP headers recommended for serving binary downloads.
 */
export function buildAttachmentHeaders(
  fileName: string,
  mime = "application/pdf"
): Record<string, string> {
  const safeName = sanitizeFilename(fileName);
  const normalizedMime =
    typeof mime === "string" ? mime.trim().toLowerCase() : "";
  const safeMime =
    normalizedMime &&
    /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(normalizedMime) &&
    !BLOCKED_DOWNLOAD_MIME_TYPES.includes(normalizedMime)
      ? normalizedMime
      : "application/octet-stream";

  return {
    "Content-Disposition": `attachment; filename="${safeName}"`,
    "X-Content-Type-Options": "nosniff",
    "Content-Type": safeMime,
    "Cache-Control": "private, no-store",
  };
}

/**
 * Optimizes Cloudinary URLs generated by `@strapi/provider-upload-cloudinary`
 * with `f_auto,q_auto` and optional width transformations.
 */
export function optimizeCloudinaryMediaUrl(
  rawUrl: unknown,
  enableOptimization = true,
  width?: number
): string {
  const safeUrl = toSafeHref(rawUrl);
  if (!safeUrl) return "";
  if (
    !enableOptimization ||
    !safeUrl.includes("res.cloudinary.com") ||
    !safeUrl.includes("/upload/")
  ) {
    return safeUrl;
  }

  const transform =
    typeof width === "number" && Number.isFinite(width) && width > 0
      ? `f_auto,q_auto,w_${Math.round(width)}`
      : "f_auto,q_auto";

  if (safeUrl.includes(`/upload/${transform}/`)) {
    return safeUrl;
  }
  return safeUrl.replace("/upload/", `/upload/${transform}/`);
}

/**
 * Formats Strapi Media Library `size` (stored in KB by `@strapi/upload`) into
 * a human-readable label.
 */
export function formatMediaSizeFromKB(sizeInKB: unknown): string {
  const kb = Number(sizeInKB);
  if (!Number.isFinite(kb) || kb <= 0) return "0 KB";
  if (kb < 1024) {
    return `${Math.max(1, Math.round(kb))} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function optNumber(val: unknown): number | undefined {
  return typeof val === "number" && Number.isFinite(val) ? val : undefined;
}

function optString(val: unknown): string | undefined {
  return typeof val === "string" ? val : undefined;
}

function normalizeFormatVariants(
  rawFormats: unknown,
  enableCloudinaryOptimization: boolean
): Record<string, MediaLibraryFormatVariant> {
  if (!rawFormats || typeof rawFormats !== "object") return {};
  const formats: Record<string, MediaLibraryFormatVariant> = {};
  for (const [key, variant] of Object.entries(
    rawFormats as Record<string, Record<string, unknown>>
  )) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue;
    }
    const safeVariantUrl = toSafeHref(variant?.url);
    if (variant && safeVariantUrl) {
      formats[key] = {
        url: optimizeCloudinaryMediaUrl(
          safeVariantUrl,
          enableCloudinaryOptimization
        ),
        width: optNumber(variant.width),
        height: optNumber(variant.height),
        mime: optString(variant.mime),
        sizeInKB: optNumber(variant.size),
      };
    }
  }
  return formats;
}

function resolveThumbnailUrl(
  formats: Record<string, MediaLibraryFormatVariant>,
  rawUrl: string,
  enableCloudinaryOptimization: boolean
): string {
  const candidate =
    formats.medium?.url ?? formats.small?.url ?? formats.thumbnail?.url;
  return (
    candidate ??
    optimizeCloudinaryMediaUrl(rawUrl, enableCloudinaryOptimization, 640)
  );
}

function resolveAssetId(val: unknown): number | string | undefined {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string" && val.trim()) return val.trim();
  return undefined;
}

function resolveAltText(val: unknown, fallback: string): string {
  return typeof val === "string" && val.trim() ? val.trim() : fallback;
}

function resolveFiniteSizeKB(val: unknown): number {
  return typeof val === "number" && Number.isFinite(val) && val >= 0 ? val : 0;
}

/**
 * Normalizes a raw `plugin::upload.file` record from Strapi v5 Media Library
 * into `MediaLibraryAsset`.
 */
export function normalizeUploadFile(
  rawFile: unknown,
  enableCloudinaryOptimization = true
): MediaLibraryAsset | null {
  if (!rawFile || typeof rawFile !== "object") return null;
  const f = rawFile as Record<string, unknown>;
  const safeRawUrl = toSafeHref(f.url);
  if (!safeRawUrl) return null;

  const formats = normalizeFormatVariants(
    f.formats,
    enableCloudinaryOptimization
  );
  const sizeInKB = resolveFiniteSizeKB(f.size);
  const ext = optString(f.ext) ?? "";
  const name = sanitizeFilename(f.name || safeRawUrl, ext || ".bin");

  return {
    id: resolveAssetId(f.id),
    documentId: optString(f.documentId),
    name,
    alternativeText: resolveAltText(f.alternativeText, name),
    caption: typeof f.caption === "string" ? f.caption.trim() : "",
    url: safeRawUrl,
    optimizedUrl: optimizeCloudinaryMediaUrl(
      safeRawUrl,
      enableCloudinaryOptimization
    ),
    thumbnailUrl: resolveThumbnailUrl(
      formats,
      safeRawUrl,
      enableCloudinaryOptimization
    ),
    mime: optString(f.mime) ?? "application/octet-stream",
    ext,
    sizeInKB,
    formattedSize: formatMediaSizeFromKB(sizeInKB),
    width: optNumber(f.width),
    height: optNumber(f.height),
    folderPath: optString(f.folderPath),
    formats,
  };
}

/**
 * Computes the normalized alphabetical letter group (`A`..`Z` or `#`) for
 * glossary indexing.
 */
export function computeLetterGroup(term: unknown): string {
  if (typeof term !== "string" || !term.trim()) return "#";
  const normalized = term
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const firstChar = normalized.charAt(0).toUpperCase();
  return /^[A-Z]$/.test(firstChar) ? firstChar : "#";
}
