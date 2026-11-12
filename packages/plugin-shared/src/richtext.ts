/**
 * Shared Rich Text normalizer and plain-text extractor supporting Strapi v5
 * Blocks, Tiptap / ProseMirror JSON (`{ type: "doc", content: [...] }` and
 * `{ doc: { type: "doc", content: [...] } }`), Markdown, and HTML.
 */

interface RichTextNode {
  type?: string;
  text?: string;
  content?: unknown[];
  children?: unknown[];
  doc?: unknown;
}

function getNodeChildren(node: RichTextNode): unknown[] {
  if (Array.isArray(node.content)) return node.content;
  if (Array.isArray(node.children)) return node.children;
  if (node.doc && typeof node.doc === "object") {
    return getNodeChildren(node.doc as RichTextNode);
  }
  return [];
}

function formatBlockNodeText(type: string | undefined, joined: string): string {
  if (type === "heading" || type === "paragraph" || type === "blockquote") {
    return `${joined}\n`;
  }
  if (type === "listItem" || type === "list-item") {
    return `• ${joined.trim()}\n`;
  }
  return joined;
}

function extractNodeText(node: unknown): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  const obj = node as RichTextNode;
  if (typeof obj.text === "string") return obj.text;
  const children = getNodeChildren(obj);
  const separator = obj.type === "doc" ? "\n\n" : "";
  const joined = children.map(extractNodeText).filter(Boolean).join(separator);
  return formatBlockNodeText(obj.type, joined);
}

export function normalizeRichTextValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as RichTextNode;
    if (
      (obj.type === "doc" && Array.isArray(obj.content)) ||
      (obj.doc && typeof obj.doc === "object")
    ) {
      return extractNodeText(obj).trim();
    }
    if (Array.isArray(value)) {
      return value.map(extractNodeText).join("\n").trim();
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function extractRichTextPlainText(value: unknown): string {
  const raw = normalizeRichTextValue(value).trim();
  if (!raw) return "";
  if (raw.startsWith("{") || raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw) as RichTextNode | unknown[];
      if (
        parsed &&
        (Array.isArray(parsed) ||
          (typeof parsed === "object" &&
            (parsed.type === "doc" || typeof parsed.doc === "object")))
      ) {
        return extractNodeText(parsed).trim();
      }
    } catch {
      // treat as regular string
    }
  }
  return raw
    .split("<")
    .map((part, idx) => {
      if (idx === 0) return part;
      const gt = part.indexOf(">");
      return gt >= 0 ? ` ${part.slice(gt + 1)}` : ` <${part}`;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
