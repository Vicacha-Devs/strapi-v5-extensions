import { escapeHtml } from "@vicacha-devs/plugin-shared";
import domPurifyLib from "isomorphic-dompurify";

import { toSafeCellBackgroundColor } from "../table";
import { isSafeIframeUrl, isSafeUrl } from "../urlSafety";
import {
  formatTextStyleAttr,
  isSafeCssColor,
  isSafeFontFamily,
  isSafeFontSize,
  parseTextStyleAttr,
  sanitizeRestoredNodeTree,
} from "./nodeTreeSanitizer";

export {
  formatTextStyleAttr,
  isSafeIframeUrl,
  isSafeUrl,
  parseTextStyleAttr,
  sanitizeRestoredNodeTree,
  toSafeCellBackgroundColor,
};

export interface ProseMirrorJSONNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: ProseMirrorJSONNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}

export interface SanitizeOptions {
  allowedIframeDomains?: string[];
}

const URL_ATTR_NAMES = new Set([
  "src",
  "href",
  "xlink:href",
  "poster",
  "action",
  "formaction",
]);

const DOMPURIFY_ALLOWED_URI_REGEXP = new RegExp(
  [
    "^(?:(?:https?|mailto|tel):|strapi:\\/\\/",
    "data:image\\/(?:png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=]+$",
    "data:audio\\/(?:mpeg|mp3|wav|x-wav|wave|ogg|webm|mp4|aac|flac)(?:;codecs=[a-z0-9.,_-]+)?;base64,[a-z0-9+/=]+$",
    "(?!\\/\\/|\\/\\\\|\\\\\\\\|\\\\\\/)[^a-z:\\\\]",
    "[a-z0-9+.-]+(?:[^a-z0-9+.\\-:\\\\]|$))",
  ].join("|"),
  "i"
);

const DOMPURIFY_ADD_TAGS = ["iframe", "details", "summary", "abbr", "mark"];

const DOMPURIFY_FORBID_TAGS = [
  "script",
  "style",
  "svg",
  "math",
  "form",
  "object",
  "embed",
  "applet",
  "base",
  "meta",
  "link",
];

const DOMPURIFY_ADD_ATTR = [
  "allowfullscreen",
  "sandbox",
  "loading",
  "data-asset-id",
  "data-document-id",
  "data-type",
  "data-align",
  "data-collection",
  "data-label",
  "data-variant",
  "data-title",
  "data-author",
  "data-columns",
  "data-latex",
  "data-display-mode",
  "data-lead",
  "data-caption",
  "data-checked",
  "data-background-color",
  "data-color",
  "target",
  "rel",
  "dir",
  "lang",
  "title",
  "open",
];

const SAFE_IFRAME_SANDBOX_TOKENS = new Set([
  "allow-scripts",
  "allow-same-origin",
  "allow-popups",
  "allow-presentation",
]);

const UNSAFE_CSS_SYNTAX_RE =
  /url\s*\(|expression\s*\(|javascript:|@import|[{}\\;<>]|\/\*/i;
const CSS_LENGTH_TOKEN_RE = /^(?:auto|0|\d+(?:\.\d+)?(?:px|rem|em|%))$/i;

function isSafeAllowedCssDeclaration(prop: string, val: string): boolean {
  if (!val || UNSAFE_CSS_SYNTAX_RE.test(val)) return false;
  switch (prop) {
    case "color":
    case "background-color":
      return isSafeCssColor(val);
    case "font-family":
      return isSafeFontFamily(val);
    case "font-size":
      return isSafeFontSize(val);
    case "line-height":
      return /^(?:\d+(?:\.\d+)?(?:px|rem|em|%)?|normal)$/i.test(val);
    case "text-align":
      return /^(?:left|right|center|justify|start|end)$/i.test(val);
    case "width":
    case "height":
    case "max-width":
      return /^(?:auto|fit-content|min-content|max-content|0|\d+(?:\.\d+)?(?:px|rem|em|%|vw|vh))$/i.test(
        val
      );
    case "aspect-ratio": {
      if (/^auto$/i.test(val)) return true;
      const parts = val.split("/").map((p) => p.trim());
      return (
        parts.length >= 1 &&
        parts.length <= 2 &&
        parts.every((p) => /^\d+(?:\.\d+)?$/.test(p))
      );
    }
    case "display":
      return /^(?:block|inline|inline-block|flex|inline-flex|grid|none)$/i.test(
        val
      );
    case "margin": {
      const tokens = val.trim().split(/\s+/);
      return (
        tokens.length >= 1 &&
        tokens.length <= 4 &&
        tokens.every((t) => CSS_LENGTH_TOKEN_RE.test(t))
      );
    }
    case "margin-top":
    case "margin-left":
    case "margin-right":
      return CSS_LENGTH_TOKEN_RE.test(val);
    default:
      return false;
  }
}

function sanitizeInlineStyleString(styleStr: string): string {
  const safeDecls: string[] = [];
  for (const decl of styleStr.split(";")) {
    const colonIdx = decl.indexOf(":");
    if (colonIdx === -1) continue;
    const prop = decl.slice(0, colonIdx).trim().toLowerCase();
    const val = decl.slice(colonIdx + 1).trim();
    if (isSafeAllowedCssDeclaration(prop, val)) {
      safeDecls.push(`${prop}: ${val}`);
    }
  }
  return safeDecls.join("; ");
}

/**
 * Escapes special HTML attribute characters (`&`, `<`, `>`, `"`, `'`).
 */
export function escAttr(value: unknown): string {
  return escapeHtml(value ?? "");
}

/**
 * Unescapes HTML entities in Markdown/HTML text segments.
 */
export function unescapeHtmlEntities(value: string): string {
  return value
    .replace(/&#91;|&#x5b;/gi, "[")
    .replace(/&#93;|&#x5d;/gi, "]")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Sanitizes an HTML string using DOMPurify (`isomorphic-dompurify`), stripping dangerous elements
 * (`<script>`, `<style>`, `<svg>`, `<math>`, `<form>`, `<object>`, `<embed>`), inline event handlers,
 * `srcdoc`, and unsafe URI schemes while preserving Tiptap editor nodes and data attributes.
 */
export function sanitizeHtmlString(
  html: string,
  options?: SanitizeOptions
): string {
  if (!html || typeof html !== "string") return "";

  const afterSanitizeAttributesHook = (node: Element) => {
    const tagName = node.tagName?.toUpperCase();

    if (tagName === "IFRAME") {
      const src = node.getAttribute("src") ?? "";
      if (!isSafeIframeUrl(src, options?.allowedIframeDomains)) {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        } else {
          node.remove?.();
        }
        return;
      }

      const rawSandbox = node.getAttribute("sandbox") ?? "";
      const filteredTokens: string[] = [];
      for (const token of rawSandbox.split(/\s+/)) {
        const clean = token.trim().toLowerCase();
        if (
          clean &&
          SAFE_IFRAME_SANDBOX_TOKENS.has(clean) &&
          !filteredTokens.includes(clean)
        ) {
          filteredTokens.push(clean);
        }
      }
      node.setAttribute(
        "sandbox",
        filteredTokens.length > 0
          ? filteredTokens.join(" ")
          : "allow-scripts allow-popups"
      );

      if (!node.hasAttribute("loading")) {
        node.setAttribute("loading", "lazy");
      }
    }

    if (
      tagName === "A" &&
      node.getAttribute("target")?.trim().toLowerCase() === "_blank"
    ) {
      const existingRel = node.getAttribute("rel") ?? "";
      const relTokens: string[] = [];
      for (const token of existingRel.split(/\s+/)) {
        const clean = token.trim();
        if (!clean || clean.toLowerCase() === "opener") continue;
        if (!relTokens.some((t) => t.toLowerCase() === clean.toLowerCase())) {
          relTokens.push(clean);
        }
      }
      if (!relTokens.some((t) => t.toLowerCase() === "noopener")) {
        relTokens.push("noopener");
      }
      if (!relTokens.some((t) => t.toLowerCase() === "noreferrer")) {
        relTokens.push("noreferrer");
      }
      node.setAttribute("rel", relTokens.join(" "));
    }

    if (node.attributes) {
      for (const attr of Array.from(node.attributes)) {
        const attrName = attr.name.toLowerCase();
        if (URL_ATTR_NAMES.has(attrName)) {
          if (!isSafeUrl(attr.value)) {
            node.removeAttribute(attr.name);
          }
          continue;
        }
        if (
          attrName.startsWith("data-") &&
          (attrName === "data-href" ||
            attrName === "data-url" ||
            attrName.endsWith("-src") ||
            attrName.endsWith("-url") ||
            attrName.endsWith("-href"))
        ) {
          if (attr.value !== "" && !isSafeUrl(attr.value)) {
            node.removeAttribute(attr.name);
          }
        }
      }
    }

    if (node.hasAttribute("style")) {
      const sanitizedStyle = sanitizeInlineStyleString(
        node.getAttribute("style") ?? ""
      );
      if (sanitizedStyle) {
        node.setAttribute("style", sanitizedStyle);
      } else {
        node.removeAttribute("style");
      }
    }
  };

  const purifier = domPurifyLib;
  purifier.addHook("afterSanitizeAttributes", afterSanitizeAttributesHook);
  try {
    return String(
      purifier.sanitize(html, {
        ADD_TAGS: DOMPURIFY_ADD_TAGS,
        FORBID_TAGS: DOMPURIFY_FORBID_TAGS,
        ADD_ATTR: DOMPURIFY_ADD_ATTR,
        ALLOW_DATA_ATTR: true,
        FORBID_ATTR: ["srcdoc"],
        ALLOWED_URI_REGEXP: DOMPURIFY_ALLOWED_URI_REGEXP,
      })
    );
  } finally {
    purifier.removeHook("afterSanitizeAttributes", afterSanitizeAttributesHook);
  }
}

/**
 * Formats and validates a URL for safe inclusion inside Markdown link/media syntax.
 */
export function mdUrl(raw: unknown): string {
  const str = String(raw ?? "").trim();
  if (!str || !isSafeUrl(str)) return "#";
  return /[\s()<>]/.test(str)
    ? `<${str.replace(/</g, "%3C").replace(/>/g, "%3E")}>`
    : str;
}

/**
 * Unwraps `<...>` around Markdown URLs and validates safety.
 */
export function parseMdUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const unwrapped =
    trimmed.startsWith("<") && trimmed.endsWith(">")
      ? trimmed.slice(1, -1).trim()
      : trimmed;
  return isSafeUrl(unwrapped) ? unwrapped : "#";
}
