import { MAX_QUERY_LENGTH, SNIPPET_RADIUS } from "./constants";

/**
 * `$containsi` is compiled to `LIKE %value%` with the value bound as a parameter,
 * so there is no injection surface — but `%` is still a wildcard inside the bound
 * value and a lone `%` would match every row. Strip it and cap the length.
 */
const MAX_DOC_DEPTH = 32;
const MAX_STRUCTURED_CHARS = 500_000;

export const sanitizeQuery = (raw: unknown): string => {
  if (typeof raw !== "string") return "";
  const cleaned = raw.replace(/%/g, "").trim().slice(0, MAX_QUERY_LENGTH);
  return /^[_\s]+$/.test(cleaned) ? "" : cleaned;
};

const isProseMirrorRoot = (
  value: unknown
): value is Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  if (obj.type === "doc" && Array.isArray(obj.content)) return true;
  if (obj.doc && typeof obj.doc === "object" && !Array.isArray(obj.doc)) {
    const inner = obj.doc as Record<string, unknown>;
    return inner.type === "doc" && Array.isArray(inner.content);
  }
  return false;
};

const walkDocNodes = (
  node: unknown,
  chunks: string[],
  depth = 0,
  visited = new WeakSet<object>()
): void => {
  if (!node || depth > MAX_DOC_DEPTH) return;
  if (Array.isArray(node)) {
    if (visited.has(node)) return;
    visited.add(node);
    node.forEach((child) => walkDocNodes(child, chunks, depth + 1, visited));
    return;
  }
  if (typeof node !== "object") return;
  if (visited.has(node)) return;
  visited.add(node);

  const obj = node as Record<string, unknown>;
  if (typeof obj.text === "string" && obj.text.trim()) {
    chunks.push(obj.text);
  }
  if (obj.doc && typeof obj.doc === "object") {
    walkDocNodes(obj.doc, chunks, depth + 1, visited);
  }
  if (Array.isArray(obj.content)) {
    walkDocNodes(obj.content, chunks, depth + 1, visited);
  }
  if (Array.isArray(obj.children)) {
    walkDocNodes(obj.children, chunks, depth + 1, visited);
  }
};

/**
 * Extracts human-readable text from ProseMirror / Tiptap JSON documents
 * (`{ type: 'doc', content: [...] }` or `{ doc: { type: 'doc', content: [...] } }`),
 * whether passed as an object or a serialized JSON string. Returns `null` if
 * `value` is not a structured rich-text document.
 */
export const extractStructuredText = (value: unknown): string | null => {
  let candidate: unknown = value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.startsWith("{") || trimmed.length > MAX_STRUCTURED_CHARS) {
      return null;
    }
    try {
      candidate = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (!isProseMirrorRoot(candidate)) return null;

  const chunks: string[] = [];
  walkDocNodes(candidate, chunks);
  return chunks.join(" ").replace(/\s+/g, " ").trim();
};

/**
 * Linear O(N) HTML/XML tag stripper without regex backtracking.
 * Unclosed `<` characters are preserved without re-scanning the remainder.
 */
const stripHtmlTags = (input: string): string => {
  let out = "";
  let tagStart = -1;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === "<") {
      if (tagStart !== -1) {
        out += input.slice(tagStart, i);
      }
      tagStart = i;
    } else if (ch === ">" && tagStart !== -1) {
      out += " ";
      tagStart = -1;
    } else if (tagStart === -1) {
      out += ch;
    }
  }

  if (tagStart !== -1) {
    out += input.slice(tagStart);
  }

  return out;
};

/** Plain-text projection of richtext/HTML/Markdown/ProseMirror JSON, used for snippets. */
export const toPlainText = (value: unknown): string => {
  if (value === null || value === undefined) return "";

  const structured = extractStructuredText(value);
  if (structured !== null) return structured;

  return stripHtmlTags(String(value))
    .replace(/[#*_>`~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Walks a dotted path, transparently flattening arrays so repeatable components
 * yield every one of their values.
 */
export const collectValues = (node: unknown, parts: string[]): string[] => {
  if (node === null || node === undefined) return [];
  if (Array.isArray(node))
    return node.flatMap((item) => collectValues(item, parts));
  if (parts.length === 0) {
    const structured = extractStructuredText(node);
    if (structured !== null) return structured ? [structured] : [];
    if (typeof node === "string") return [node];
    if (typeof node === "number") return [String(node)];
    return [];
  }
  if (typeof node !== "object") return [];
  return collectValues(
    (node as Record<string, unknown>)[parts[0]],
    parts.slice(1)
  );
};

export const getValuesAtPath = (entry: unknown, path: string): string[] =>
  collectValues(entry, path.split("."));

/** Extracts a short excerpt centred on the match, for highlighting in the UI. */
export const buildSnippet = (value: unknown, query: string): string => {
  const text = toPlainText(value);
  const index = text.toLowerCase().indexOf(query.toLowerCase());

  if (index === -1) {
    return text.length > SNIPPET_RADIUS * 2
      ? `${text.slice(0, SNIPPET_RADIUS * 2)}…`
      : text;
  }

  const start = Math.max(0, index - SNIPPET_RADIUS);
  const end = Math.min(text.length, index + query.length + SNIPPET_RADIUS);

  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
};

export const humanizeFieldPath = (path: string): string =>
  path
    .split(".")
    .map((segment) =>
      segment
        .replace(/[_-]+/g, " ")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/^./, (c) => c.toUpperCase())
    )
    .join(" › ");
