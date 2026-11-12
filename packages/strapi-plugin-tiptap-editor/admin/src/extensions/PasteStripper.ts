import { Extension } from "@tiptap/core";

const SAFE_HEX_OR_VAR_COLOR_RE =
  /^(?:#[0-9a-fA-F]{3,8}|var\(--[a-zA-Z0-9_-]+\)|[a-zA-Z]{2,25})$/;
const SAFE_FONT_FAMILY_RE = /^[a-zA-Z0-9\s,'"-]{1,120}$/;
const SAFE_FONT_SIZE_RE = /^\d+(?:\.\d+)?(?:px|rem|em|pt|%)$/i;
const SAFE_LINE_HEIGHT_RE = /^(?:normal|\d+(?:\.\d+)?(?:px|rem|em|%)?)$/i;
const SAFE_TEXT_ALIGN_RE = /^(?:left|center|right|justify|start|end)$/i;
const DANGEROUS_CSS_TOKEN_RE =
  /url\s*\(|expression\s*\(|javascript:|@import|\\|\/\*|[<>{}]/i;
const ALPHA_CHANNEL_RE = /^(?:0|1|0?\.\d+)$/;

function isSafeFuncColor(val: string): boolean {
  const openIdx = val.indexOf("(");
  if (openIdx === -1 || !val.endsWith(")")) return false;
  const fn = val.slice(0, openIdx).trim().toLowerCase();
  const args = val
    .slice(openIdx + 1, -1)
    .split(",")
    .map((p) => p.trim());
  if (fn === "rgb" || fn === "rgba") {
    if (args.length !== 3 && args.length !== 4) return false;
    const rgbOk = args.slice(0, 3).every((c) => /^\d{1,3}$/.test(c));
    return rgbOk && (args.length === 3 || ALPHA_CHANNEL_RE.test(args[3]));
  }
  if (fn === "hsl" || fn === "hsla") {
    if (args.length !== 3 && args.length !== 4) return false;
    const hslOk =
      /^\d{1,3}(?:deg)?$/i.test(args[0]) &&
      /^\d{1,3}%$/.test(args[1]) &&
      /^\d{1,3}%$/.test(args[2]);
    return hslOk && (args.length === 3 || ALPHA_CHANNEL_RE.test(args[3]));
  }
  return false;
}

const isSafeColorValue = (val: string): boolean =>
  SAFE_HEX_OR_VAR_COLOR_RE.test(val) || isSafeFuncColor(val);

function sanitizeInternalProseMirrorStyle(rawStyle: string): string {
  const safeDeclarations: string[] = [];
  for (const part of rawStyle.split(";")) {
    const colonIdx = part.indexOf(":");
    if (colonIdx === -1) continue;
    const prop = part.slice(0, colonIdx).trim().toLowerCase();
    const rawVal = part.slice(colonIdx + 1).trim();
    if (!rawVal || DANGEROUS_CSS_TOKEN_RE.test(rawVal)) continue;

    if (prop === "color" || prop === "background-color") {
      if (isSafeColorValue(rawVal)) {
        safeDeclarations.push(`${prop}: ${rawVal}`);
      }
    } else if (prop === "font-family") {
      if (SAFE_FONT_FAMILY_RE.test(rawVal)) {
        safeDeclarations.push(`${prop}: ${rawVal.replace(/"/g, "'")}`);
      }
    } else if (prop === "font-size") {
      if (SAFE_FONT_SIZE_RE.test(rawVal)) {
        safeDeclarations.push(`${prop}: ${rawVal}`);
      }
    } else if (prop === "line-height") {
      if (SAFE_LINE_HEIGHT_RE.test(rawVal)) {
        safeDeclarations.push(`${prop}: ${rawVal}`);
      }
    } else if (prop === "text-align") {
      if (SAFE_TEXT_ALIGN_RE.test(rawVal)) {
        safeDeclarations.push(`${prop}: ${rawVal.toLowerCase()}`);
      }
    }
  }
  return safeDeclarations.join("; ");
}

export const PasteStripper = Extension.create({
  name: "pasteStripper",

  transformPastedHTML(html: string): string {
    if (!html) return html;

    if (/\bdata-pm-slice\s*=/i.test(html)) {
      return html.replace(
        /(?<!\s)\s+style\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/gi,
        (
          _match,
          dq: string | undefined,
          sq: string | undefined,
          uq: string | undefined
        ) => {
          const cleaned = sanitizeInternalProseMirrorStyle(
            dq ?? sq ?? uq ?? ""
          );
          return cleaned ? ` style="${cleaned}"` : "";
        }
      );
    }

    return html.replace(
      /(?<!\s)\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+)/gi,
      ""
    );
  },
});
