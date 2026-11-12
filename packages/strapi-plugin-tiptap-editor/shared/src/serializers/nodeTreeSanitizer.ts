import {
  FORBIDDEN_OBJECT_KEYS,
  isPlainObject,
} from "@vicacha-devs/plugin-shared";

import { toSafeCellBackgroundColor } from "../table";
import { isSafeIframeUrl, isSafeUrl } from "../urlSafety";
import type { ProseMirrorJSONNode, SanitizeOptions } from "./sanitizers";

const MAX_NODE_TREE_DEPTH = 64;

const UNSAFE_ATTR_KEYS = new Set([
  ...FORBIDDEN_OBJECT_KEYS,
  "toString",
  "valueOf",
  "hasOwnProperty",
  "isPrototypeOf",
  "propertyIsEnumerable",
  "toLocaleString",
]);

const UNSAFE_CSS_SYNTAX_RE =
  /url\s*\(|expression\s*\(|javascript:|@import|[{}\\;<>]|\/\*/i;
const SAFE_FONT_FAMILY_RE = /^[a-zA-Z0-9\s,"'-]+$/;
const SAFE_FONT_SIZE_RE = /^\d+(?:\.\d+)?(?:px|rem|em|%|pt)$/i;
const SAFE_LINE_HEIGHT_RE = /^\d+(?:\.\d+)?(?:px|rem|em|%)?$/i;

export function isSafeCssColor(raw: unknown): raw is string {
  return (
    typeof raw === "string" &&
    !UNSAFE_CSS_SYNTAX_RE.test(raw) &&
    Boolean(toSafeCellBackgroundColor(raw))
  );
}

export function isSafeFontFamily(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  return (
    trimmed.length > 0 &&
    !UNSAFE_CSS_SYNTAX_RE.test(trimmed) &&
    SAFE_FONT_FAMILY_RE.test(trimmed)
  );
}

export function isSafeFontSize(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  return trimmed.length > 0 && SAFE_FONT_SIZE_RE.test(trimmed);
}

export function isSafeLineHeight(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  return trimmed.length > 0 && SAFE_LINE_HEIGHT_RE.test(trimmed);
}

function sanitizeNestedAttrValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_NODE_TREE_DEPTH) return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeNestedAttrValue(item, depth + 1));
  }
  if (isPlainObject(value)) {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (UNSAFE_ATTR_KEYS.has(k)) continue;
      clean[k] = sanitizeNestedAttrValue(v, depth + 1);
    }
    return clean;
  }
  return value;
}

/**
 * Formats `textStyle` mark attributes into a CSS inline style string.
 */
export function formatTextStyleAttr(attrs?: Record<string, unknown>): string {
  if (!attrs) return "";
  const parts: string[] = [];
  if (isSafeCssColor(attrs.color)) parts.push(`color: ${attrs.color.trim()}`);
  if (isSafeFontFamily(attrs.fontFamily))
    parts.push(`font-family: ${attrs.fontFamily.trim()}`);
  if (isSafeFontSize(attrs.fontSize))
    parts.push(`font-size: ${attrs.fontSize.trim()}`);
  if (isSafeLineHeight(attrs.lineHeight))
    parts.push(`line-height: ${attrs.lineHeight.trim()}`);
  return parts.join("; ");
}

/**
 * Parses an inline CSS style string from a `<span style="...">` tag into `textStyle` mark attributes.
 */
export function parseTextStyleAttr(styleStr: string): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  for (const decl of styleStr.split(";")) {
    const colonIdx = decl.indexOf(":");
    if (colonIdx === -1) continue;
    const prop = decl.slice(0, colonIdx).trim().toLowerCase();
    const val = decl.slice(colonIdx + 1).trim();
    if (!val) continue;
    if (prop === "color" && isSafeCssColor(val)) attrs.color = val;
    else if (prop === "font-family" && isSafeFontFamily(val))
      attrs.fontFamily = val;
    else if (prop === "font-size" && isSafeFontSize(val)) attrs.fontSize = val;
    else if (prop === "line-height" && isSafeLineHeight(val))
      attrs.lineHeight = val;
  }
  return attrs;
}

function isUrlLikeAttrKey(key: string): boolean {
  return (
    key === "href" ||
    key === "url" ||
    key === "data-href" ||
    key === "data-url" ||
    key === "data-src" ||
    key.endsWith("Src") ||
    key.endsWith("Url") ||
    key.endsWith("Href") ||
    key.endsWith("-src") ||
    key.endsWith("-url") ||
    key.endsWith("-href")
  );
}

/**
 * Sanitizes URL and style attributes inside a restored ProseMirror JSON node tree so metadata comments
 * or untrusted JSON payloads cannot bypass URL/CSS validation.
 */
export function sanitizeRestoredNodeTree(
  node: ProseMirrorJSONNode,
  options?: SanitizeOptions,
  depth = 0
): ProseMirrorJSONNode {
  if (depth > MAX_NODE_TREE_DEPTH) {
    return { type: typeof node?.type === "string" ? node.type : "paragraph" };
  }
  const copy: ProseMirrorJSONNode = { ...node };
  if (isPlainObject(copy.attrs)) {
    const attrs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(copy.attrs)) {
      if (UNSAFE_ATTR_KEYS.has(key)) continue;
      if (
        (copy.type === "tableCell" || copy.type === "tableHeader") &&
        key === "backgroundColor"
      ) {
        attrs[key] = value === null ? null : toSafeCellBackgroundColor(value);
        continue;
      }
      if (typeof value !== "string") {
        attrs[key] = sanitizeNestedAttrValue(value, depth + 1);
        continue;
      }
      if (key === "src") {
        attrs[key] =
          copy.type === "iframe"
            ? value && isSafeIframeUrl(value, options?.allowedIframeDomains)
              ? value
              : ""
            : value
              ? isSafeUrl(value)
                ? value
                : "#"
              : "";
      } else if (key === "embedUrl" || key === "iframeSrc") {
        attrs[key] =
          value && isSafeIframeUrl(value, options?.allowedIframeDomains)
            ? value
            : "";
      } else if (isUrlLikeAttrKey(key)) {
        attrs[key] = value ? (isSafeUrl(value) ? value : "#") : "";
      } else {
        attrs[key] = value;
      }
    }
    copy.attrs = attrs;
  }
  if (Array.isArray(copy.marks)) {
    copy.marks = copy.marks.map((m) => {
      if (!isPlainObject(m.attrs)) return m;
      const nextAttrs: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(m.attrs)) {
        if (UNSAFE_ATTR_KEYS.has(key)) continue;
        if (m.type === "textStyle") {
          if (key === "color") {
            if (val === null) nextAttrs.color = null;
            else if (isSafeCssColor(val)) nextAttrs.color = val.trim();
          } else if (key === "fontFamily") {
            if (val === null) nextAttrs.fontFamily = null;
            else if (isSafeFontFamily(val)) nextAttrs.fontFamily = val.trim();
          } else if (key === "fontSize") {
            if (val === null) nextAttrs.fontSize = null;
            else if (isSafeFontSize(val)) nextAttrs.fontSize = val.trim();
          } else if (key === "lineHeight") {
            if (val === null) nextAttrs.lineHeight = null;
            else if (isSafeLineHeight(val)) nextAttrs.lineHeight = val.trim();
          }
        } else if (m.type === "highlight" && key === "color") {
          if (val === null) nextAttrs.color = null;
          else {
            const safeColor = toSafeCellBackgroundColor(val);
            if (safeColor) nextAttrs.color = safeColor;
          }
        } else if (key === "href" && typeof val === "string") {
          nextAttrs.href = isSafeUrl(val) ? val : "#";
        } else {
          nextAttrs[key] = sanitizeNestedAttrValue(val, depth + 1);
        }
      }
      return { ...m, attrs: nextAttrs };
    });
  }
  if (Array.isArray(copy.content)) {
    copy.content =
      depth >= MAX_NODE_TREE_DEPTH
        ? []
        : copy.content.map((child) =>
            sanitizeRestoredNodeTree(child, options, depth + 1)
          );
  }
  return copy;
}
