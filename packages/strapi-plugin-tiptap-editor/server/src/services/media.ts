import type { Core } from "@strapi/strapi";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fetch as undiciFetch } from "undici";

import {
  ALLOWED_REMOTE_MIMES,
  EXTENSION_MIME_MAP,
  MIME_ALIASES,
  assertSafeResolvedHost,
  createPinnedFetchDispatcher,
  inferMimeFromFilename,
  isPrivateIpAddress,
  isSsrfSafeUrl,
  matchesMagicBytes,
  type ResolvedHostRecord,
} from "./mediaSecurity";

export {
  ALLOWED_REMOTE_MIMES,
  EXTENSION_MIME_MAP,
  MIME_ALIASES,
  assertSafeResolvedHost,
  createPinnedFetchDispatcher,
  inferMimeFromFilename,
  isPrivateIpAddress,
  isSsrfSafeUrl,
  matchesMagicBytes,
  type ResolvedHostRecord,
};

export interface LinkPreviewMetadata {
  url: string;
  title: string;
  description: string;
  image: string | null;
  siteName: string | null;
}

export interface UploadedRemoteAsset {
  id: number | null;
  documentId: string | null;
  name: string;
  url: string;
  mime: string;
  size?: number;
  alternativeText?: string;
}

const MAX_PREVIEW_BYTES = 65_536; // 64 KB cap for HTML metadata inspection
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB cap for remote media downloads

/**
 * Reads up to `maxBytes` from a Fetch `Response` stream so large responses cannot exhaust memory.
 */
async function readBoundedResponseText(
  response: Response,
  maxBytes: number
): Promise<string> {
  const body = (
    response as {
      body?: { getReader?: () => ReadableStreamDefaultReader<Uint8Array> };
    }
  ).body;
  if (body && typeof body.getReader === "function") {
    const reader = body.getReader();
    const decoder = new TextDecoder("utf-8");
    let totalBytes = 0;
    let text = "";
    try {
      while (totalBytes < maxBytes) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        const remaining = maxBytes - totalBytes;
        const slice =
          value.byteLength > remaining ? value.subarray(0, remaining) : value;
        totalBytes += slice.byteLength;
        text += decoder.decode(slice, { stream: true });
        if (/<\/head>/i.test(text)) {
          break;
        }
      }
      text += decoder.decode();
    } finally {
      try {
        await reader.cancel();
      } catch {
        // Ignore stream cancel errors
      }
    }
    return text;
  }

  return (await response.text()).slice(0, maxBytes);
}

/**
 * Reads up to `maxBytes` of binary data from a Fetch `Response` stream, throwing if the
 * response exceeds `maxBytes`.
 */
async function readBoundedResponseBytes(
  response: Response,
  maxBytes: number
): Promise<Buffer> {
  const contentLength = response.headers?.get?.("content-length");
  if (contentLength) {
    const declaredLength = Number(contentLength);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      await (response.body as { cancel?: () => Promise<void> } | null)
        ?.cancel?.()
        .catch(() => undefined);
      throw new Error("Remote media file exceeds maximum allowed size");
    }
  }

  const body = (
    response as {
      body?: { getReader?: () => ReadableStreamDefaultReader<Uint8Array> };
    }
  ).body;
  if (body && typeof body.getReader === "function") {
    const reader = body.getReader();
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          throw new Error("Remote media file exceeds maximum allowed size");
        }
        chunks.push(
          Buffer.from(value.buffer, value.byteOffset, value.byteLength)
        );
      }
    } finally {
      try {
        await reader.cancel();
      } catch {
        // Ignore stream cancel errors
      }
    }
    return Buffer.concat(chunks, totalBytes);
  }

  if (typeof response.arrayBuffer === "function") {
    const ab = await response.arrayBuffer();
    if (ab.byteLength > maxBytes) {
      throw new Error("Remote media file exceeds maximum allowed size");
    }
    return Buffer.from(ab);
  }

  const text = await response.text();
  const buf = Buffer.from(text, "utf-8");
  if (buf.byteLength > maxBytes) {
    throw new Error("Remote media file exceeds maximum allowed size");
  }
  return buf;
}

const attrRegex = /\b(property|name|content)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

const asciiLower = (s: string): string =>
  s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));

/**
 * Collects OpenGraph or named `<meta>` tag values from HTML source using bounded indexOf scans.
 */
function collectMetaTags(html: string): Map<string, string> {
  const tags = new Map<string, string>();
  const lower = asciiLower(html);
  let cursor = 0;

  while (true) {
    const start = lower.indexOf("<meta", cursor);
    if (start === -1) break;
    const afterName = lower[start + 5];
    if (afterName && !/[\s/>]/.test(afterName)) {
      cursor = start + 5;
      continue;
    }

    const end = lower.indexOf(">", start + 5);
    if (end === -1) break;

    const rawTag = html.slice(start + 5, end);
    let key: string | null = null;
    let content: string | null = null;

    attrRegex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = attrRegex.exec(rawTag)) !== null) {
      const attrName = match[1].toLowerCase();
      const attrVal = (match[2] ?? match[3] ?? "").trim();
      if (attrName === "content") {
        content = attrVal;
      } else if (!key) {
        key = attrVal.toLowerCase();
      }
    }

    if (key && content && !tags.has(key)) {
      tags.set(key, content);
    }
    cursor = end + 1;
  }

  return tags;
}

/**
 * Extracts the `<title>` text from an HTML string using bounded indexOf scans.
 */
function extractHtmlTitle(html: string): string | null {
  const lower = asciiLower(html);
  const open = lower.indexOf("<title");
  if (open === -1) return null;
  const tagEnd = lower.indexOf(">", open + 6);
  if (tagEnd === -1) return null;
  const close = lower.indexOf("</title>", tagEnd + 1);
  if (close === -1) return null;
  const raw = html.slice(tagEnd + 1, close).trim();
  return raw.length > 0 && !raw.includes("<") ? raw : null;
}

/**
 * Creates the SSRF-safe media preview and remote upload service.
 */
const createMediaService = ({ strapi }: { strapi: Core.Strapi }) => ({
  isSsrfSafeUrl,

  /**
   * Fetches OpenGraph/Twitter preview metadata from an SSRF-validated URL with DNS verification,
   * pinned undici dispatcher, and a 64 KB response stream cap.
   */
  async getLinkPreview(rawUrl: string): Promise<LinkPreviewMetadata> {
    if (!isSsrfSafeUrl(rawUrl)) {
      throw new Error("URL is not allowed or failed SSRF safety validation");
    }

    const cleanUrl = rawUrl.trim();
    const parsedUrl = new URL(cleanUrl);
    const resolvedRecords = await assertSafeResolvedHost(parsedUrl.hostname);
    const dispatcher = createPinnedFetchDispatcher(resolvedRecords);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await undiciFetch(cleanUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "Accept": "text/html,application/xhtml+xml",
          "User-Agent": "StrapiTiptapLinkPreview/1.0",
        },
        dispatcher,
      });

      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        if (response.status >= 300 && response.status < 400) {
          throw new Error(
            "Remote preview URL redirects. Provide the final URL."
          );
        }
        return {
          url: cleanUrl,
          title: parsedUrl.hostname,
          description: "",
          image: null,
          siteName: parsedUrl.hostname,
        };
      }

      const html = await readBoundedResponseText(
        response as unknown as Response,
        MAX_PREVIEW_BYTES
      );
      const meta = collectMetaTags(html);
      const title =
        meta.get("og:title") ||
        meta.get("twitter:title") ||
        extractHtmlTitle(html) ||
        parsedUrl.hostname;
      const description =
        meta.get("og:description") ||
        meta.get("twitter:description") ||
        meta.get("description") ||
        "";
      const rawImage =
        meta.get("og:image") || meta.get("twitter:image") || null;
      const safeImage = rawImage && isSsrfSafeUrl(rawImage) ? rawImage : null;
      const siteName = meta.get("og:site_name") || parsedUrl.hostname;

      return {
        url: cleanUrl,
        title: title.slice(0, 300),
        description: description.slice(0, 600),
        image: safeImage,
        siteName: siteName.slice(0, 120),
      };
    } finally {
      clearTimeout(timeout);
      await dispatcher.destroy().catch(() => undefined);
    }
  },

  /**
   * Validates a remote media URL against SSRF, downloads the asset with a bounded size,
   * writes a temporary file, and creates the media record through Strapi's Upload service.
   */
  async uploadByUrl(
    rawUrl: string,
    customAlt?: string,
    user?: unknown
  ): Promise<UploadedRemoteAsset> {
    if (!isSsrfSafeUrl(rawUrl)) {
      throw new Error("URL is not allowed or failed SSRF safety validation");
    }

    const cleanUrl = rawUrl.trim();
    const parsedUrl = new URL(cleanUrl);
    const resolvedRecords = await assertSafeResolvedHost(parsedUrl.hostname);

    const pathnameParts = parsedUrl.pathname.split("/").filter(Boolean);
    const rawFilename =
      pathnameParts[pathnameParts.length - 1] || "remote-media";
    const strippedFilename = rawFilename
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/^\.+/, "");
    const extDotIdx = strippedFilename.lastIndexOf(".");
    if (extDotIdx === -1) {
      throw new Error("Unsupported or unsafe remote media file type");
    }
    const ext = strippedFilename.slice(extDotIdx).toLowerCase();
    let rawStem = strippedFilename.slice(0, extDotIdx);
    while (rawStem.startsWith(".")) rawStem = rawStem.slice(1);
    while (rawStem.endsWith(".")) rawStem = rawStem.slice(0, -1);
    const validStem = (
      /[a-zA-Z0-9]/.test(rawStem) ? rawStem : "remote-media"
    ).slice(0, 180);
    const safeFilename = `${validStem}${ext}`;
    const inferredMime = inferMimeFromFilename(safeFilename);
    if (!inferredMime || !ALLOWED_REMOTE_MIMES.has(inferredMime)) {
      throw new Error("Unsupported or unsafe remote media file type");
    }
    const altText = (customAlt || safeFilename).slice(0, 255);

    const uploadService = (
      strapi as unknown as {
        plugin?: (name: string) => {
          service?: (name: string) => {
            upload?: (
              payload: {
                data: {
                  fileInfo: {
                    name: string;
                    alternativeText: string;
                    caption: string;
                  };
                };
                files: {
                  filepath: string;
                  originalFilename: string;
                  mimetype: string;
                  size: number;
                };
              },
              options?: { user?: unknown }
            ) => Promise<unknown>;
          };
        };
      }
    )
      ?.plugin?.("upload")
      ?.service?.("upload");

    if (typeof uploadService?.upload !== "function") {
      throw new Error("Strapi upload service is unavailable");
    }

    const dispatcher = createPinnedFetchDispatcher(resolvedRecords);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let tempDir: string | null = null;

    try {
      const response = await undiciFetch(cleanUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "StrapiTiptapMediaImporter/1.0",
        },
        dispatcher,
      });

      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        const redirected = response.status >= 300 && response.status < 400;
        throw new Error(
          redirected
            ? "Remote media URL redirects. Provide the final URL."
            : `Failed to download remote media (HTTP ${response.status})`
        );
      }

      const headerContentType = response.headers
        ?.get?.("content-type")
        ?.split(";")[0]
        ?.trim()
        .toLowerCase();
      if (
        headerContentType &&
        headerContentType !== "application/octet-stream" &&
        headerContentType !== inferredMime &&
        !(MIME_ALIASES[inferredMime] ?? []).includes(headerContentType)
      ) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error(
          `Remote media Content-Type "${headerContentType}" does not match expected type "${inferredMime}"`
        );
      }

      const buffer = await readBoundedResponseBytes(
        response as unknown as Response,
        MAX_UPLOAD_BYTES
      );
      if (!matchesMagicBytes(buffer, inferredMime)) {
        throw new Error(
          "Remote media content does not match expected file signature"
        );
      }
      const resolvedMime = inferredMime;

      tempDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), "strapi-tiptap-upload-")
      );
      const tempFilePath = path.join(tempDir, safeFilename);
      await fs.promises.writeFile(tempFilePath, buffer);

      const uploadedResult = await uploadService.upload(
        {
          data: {
            fileInfo: {
              name: safeFilename,
              alternativeText: altText,
              caption: altText,
            },
          },
          files: {
            filepath: tempFilePath,
            originalFilename: safeFilename,
            mimetype: resolvedMime,
            size: buffer.byteLength,
          },
        },
        user ? { user } : undefined
      );

      const created = Array.isArray(uploadedResult)
        ? uploadedResult[0]
        : uploadedResult;
      if (!created || typeof created !== "object") {
        throw new Error("Upload service did not return a created file record");
      }

      const record = created as Record<string, unknown>;
      return {
        id: typeof record.id === "number" ? record.id : null,
        documentId:
          typeof record.documentId === "string" ? record.documentId : null,
        name: typeof record.name === "string" ? record.name : safeFilename,
        url: typeof record.url === "string" ? record.url : cleanUrl,
        mime: typeof record.mime === "string" ? record.mime : resolvedMime,
        size: typeof record.size === "number" ? record.size : buffer.byteLength,
        alternativeText:
          typeof record.alternativeText === "string"
            ? record.alternativeText
            : altText,
      };
    } finally {
      clearTimeout(timeout);
      await dispatcher.destroy().catch(() => undefined);
      if (tempDir) {
        await fs.promises
          .rm(tempDir, { recursive: true, force: true })
          .catch(() => undefined);
      }
    }
  },
});

export default createMediaService;
