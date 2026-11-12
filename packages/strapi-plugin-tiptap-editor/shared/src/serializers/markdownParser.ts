import { parseInlineMarkdown } from "./inlineMarkdownParser";
import {
  extractTiptapNodeComment,
  mergeEditedTableWithStored,
  parseStructuredLineBlock,
  splitMarkdownBlocks,
} from "./markdownBlockHelpers";
import { serializeBlockToMarkdown } from "./markdownSerializer";
import {
  type ProseMirrorJSONNode,
  type SanitizeOptions,
  isSafeIframeUrl,
  parseMdUrl,
  sanitizeRestoredNodeTree,
  unescapeHtmlEntities,
} from "./sanitizers";

export { splitMarkdownBlocks };

const MAX_MARKDOWN_PARSE_DEPTH = 32;

function parseTargetAndTitle(
  inner: string
): { target: string; title?: string } | null {
  const s = inner.trim();
  if (!s) return null;
  let target: string;
  let rest = "";
  if (s.startsWith("<")) {
    const gt = s.indexOf(">");
    if (gt === -1) return null;
    target = s.slice(0, gt + 1);
    rest = s.slice(gt + 1).trim();
  } else {
    const sp = s.search(/\s/);
    if (sp === -1) {
      target = s;
    } else {
      target = s.slice(0, sp);
      rest = s.slice(sp).trim();
    }
  }
  if (!target) return null;
  if (!rest) return { target };
  const q = rest[0];
  if ((q === '"' || q === "'") && rest.endsWith(q) && rest.length >= 2) {
    return { target, title: rest.slice(1, -1) };
  }
  return null;
}

function matchFenceBlock(
  trimmed: string
): { language: string | null; code: string } | null {
  const firstNl = trimmed.indexOf("\n");
  if (firstNl === -1) return null;
  const openLine = trimmed.slice(0, firstNl);
  const ch = openLine[0];
  if (ch !== "`" && ch !== "~") return null;
  let fenceLen = 0;
  while (fenceLen < openLine.length && openLine[fenceLen] === ch) {
    fenceLen += 1;
  }
  if (fenceLen < 3) return null;
  const lastNl = trimmed.lastIndexOf("\n");
  if (lastNl < firstNl) return null;
  const closeLine = trimmed.slice(lastNl + 1);
  if (closeLine.length < fenceLen || ![...closeLine].every((c) => c === ch)) {
    return null;
  }
  return {
    language: openLine.slice(fenceLen).trim() || null,
    code: trimmed.slice(firstNl + 1, lastNl),
  };
}

function matchHeadingLine(
  trimmed: string
): { level: number; text: string } | null {
  if (!trimmed.startsWith("#") || trimmed.includes("\n")) return null;
  let level = 0;
  while (level < trimmed.length && trimmed[level] === "#") level += 1;
  if (level < 1 || level > 6 || !/^\s/.test(trimmed.slice(level))) return null;
  const text = trimmed.slice(level).trimStart();
  return text ? { level, text } : null;
}

function matchStandaloneMedia(
  trimmed: string
): { kind: string; label: string; target: string } | null {
  if (
    !trimmed.startsWith("[") ||
    !trimmed.endsWith(")") ||
    trimmed.includes("\n")
  )
    return null;
  const closeBracket = trimmed.indexOf("](");
  if (closeBracket === -1) return null;
  const bracketContent = trimmed.slice(1, closeBracket);
  const colonIdx = bracketContent.indexOf(":");
  if (colonIdx === -1) return null;
  const kind = bracketContent.slice(0, colonIdx).toLowerCase();
  if (
    kind !== "video" &&
    kind !== "audio" &&
    kind !== "attachment" &&
    kind !== "embed"
  ) {
    return null;
  }
  const parsed = parseTargetAndTitle(trimmed.slice(closeBracket + 2, -1));
  if (!parsed) return null;
  return {
    kind,
    label: bracketContent.slice(colonIdx + 1).trim(),
    target: parsed.target,
  };
}

function matchStandaloneImage(
  trimmed: string
): { alt: string; target: string; title?: string } | null {
  if (
    !trimmed.startsWith("![") ||
    !trimmed.endsWith(")") ||
    trimmed.includes("\n")
  ) {
    return null;
  }
  const closeBracket = trimmed.indexOf("](");
  if (closeBracket === -1) return null;
  const parsed = parseTargetAndTitle(trimmed.slice(closeBracket + 2, -1));
  if (!parsed) return null;
  return {
    alt: trimmed.slice(2, closeBracket),
    target: parsed.target,
    title: parsed.title,
  };
}

/**
 * Parses a single pure Markdown block (without metadata comments) into a ProseMirror JSON node.
 */
export function parseSingleMarkdownBlock(
  rawBlock: string,
  options?: SanitizeOptions,
  depth = 0
): ProseMirrorJSONNode | null {
  const trimmed = rawBlock.trim();
  if (!trimmed) return null;
  if (depth > MAX_MARKDOWN_PARSE_DEPTH) {
    return {
      type: "paragraph",
      content: [{ type: "text", text: unescapeHtmlEntities(trimmed) }],
    };
  }

  // Fenced code block
  const fenceBlock = matchFenceBlock(trimmed);
  if (fenceBlock) {
    return {
      type: "codeBlock",
      attrs: { language: fenceBlock.language },
      content: fenceBlock.code ? [{ type: "text", text: fenceBlock.code }] : [],
    };
  }

  // Display math block $$ ... $$
  if (
    trimmed.startsWith("$$") &&
    trimmed.endsWith("$$") &&
    trimmed.length >= 4
  ) {
    const latex = trimmed.slice(2, -2).trim();
    return {
      type: "paragraph",
      content: [
        { type: "mathematics", attrs: { latex, displayMode: "block" } },
      ],
    };
  }

  // Multi-column layout container
  const layoutMatch =
    /^<div\s+data-type="layout-container"(?:\s+data-columns="([^"]*)")?\s*>([\s\S]*?)<\/div>$/i.exec(
      trimmed
    );
  if (layoutMatch) {
    const columns = unescapeHtmlEntities(layoutMatch[1] || "1:1");
    const inner = layoutMatch[2];
    const colRegex = /<div\s+data-type="layout-column"\s*>([\s\S]*?)<\/div>/gi;
    const colNodes: ProseMirrorJSONNode[] = [];
    let colMatch: RegExpExecArray | null;
    while ((colMatch = colRegex.exec(inner)) !== null) {
      const colDoc = markdownToJson(colMatch[1].trim(), options, depth + 1);
      colNodes.push({
        type: "layoutColumn",
        content:
          colDoc.content && colDoc.content.length > 0
            ? colDoc.content
            : [{ type: "paragraph" }],
      });
    }
    if (colNodes.length > 0) {
      return { type: "layoutContainer", attrs: { columns }, content: colNodes };
    }
  }

  // Collapsible <details> block (linear index scan without super-linear regex backtracking)
  const detailsPrefix = /^<details>\s*<summary>/i.exec(trimmed);
  if (detailsPrefix && /<\/details>$/i.test(trimmed)) {
    const inner = trimmed.slice(detailsPrefix[0].length, -10);
    const summaryCloseIdx = inner.toLowerCase().indexOf("</summary>");
    if (summaryCloseIdx !== -1) {
      const summaryInline = parseInlineMarkdown(
        inner.slice(0, summaryCloseIdx).trim()
      );
      const bodyDoc = markdownToJson(
        inner.slice(summaryCloseIdx + 10).trim(),
        options,
        depth + 1
      );
      return {
        type: "details",
        attrs: { open: true },
        content: [
          {
            type: "detailsSummary",
            content:
              summaryInline.length > 0
                ? summaryInline
                : [{ type: "text", text: "Details" }],
          },
          {
            type: "detailsContent",
            content:
              bodyDoc.content && bodyDoc.content.length > 0
                ? bodyDoc.content
                : [{ type: "paragraph" }],
          },
        ],
      };
    }
  }

  if (/^<!--\s*pagebreak\s*-->$/i.test(trimmed)) return { type: "pageBreak" };
  if (/^<!--\s*toc\s*-->$/i.test(trimmed)) {
    return { type: "tableOfContents", attrs: { headings: [] } };
  }
  if (/^(-{3,}|\*{3,})$/.test(trimmed)) return { type: "horizontalRule" };

  // Heading
  const headingMatch = matchHeadingLine(trimmed);
  if (headingMatch) {
    return {
      type: "heading",
      attrs: { level: headingMatch.level },
      content: parseInlineMarkdown(headingMatch.text),
    };
  }

  // Standalone media / embed lines
  const mediaMatch = matchStandaloneMedia(trimmed);
  if (mediaMatch) {
    const { kind, label: rawLabel, target: rawTarget } = mediaMatch;
    if (kind === "video") {
      return {
        type: "video",
        attrs: {
          title: unescapeHtmlEntities(rawLabel || "Video"),
          src: parseMdUrl(rawTarget),
        },
      };
    }
    if (kind === "audio") {
      return {
        type: "audio",
        attrs: {
          title: unescapeHtmlEntities(rawLabel || "Audio"),
          src: parseMdUrl(rawTarget),
        },
      };
    }
    if (kind === "attachment") {
      const href = parseMdUrl(rawTarget);
      const filename = unescapeHtmlEntities(rawLabel || "Attachment");
      return {
        type: "attachment",
        attrs: { href, src: href, filename, title: filename },
      };
    }
    const trimmedUrl = rawTarget.trim();
    const unwrapped =
      trimmedUrl.startsWith("<") && trimmedUrl.endsWith(">")
        ? trimmedUrl.slice(1, -1).trim()
        : trimmedUrl;
    return {
      type: "iframe",
      attrs: {
        title: unescapeHtmlEntities(rawLabel || "Embed"),
        src: isSafeIframeUrl(unwrapped, options?.allowedIframeDomains)
          ? unwrapped
          : "",
      },
    };
  }

  const standaloneImgMatch = matchStandaloneImage(trimmed);
  if (standaloneImgMatch) {
    const rawTitle = standaloneImgMatch.title;
    return {
      type: "image",
      attrs: {
        alt: unescapeHtmlEntities(standaloneImgMatch.alt),
        src: parseMdUrl(standaloneImgMatch.target),
        ...(rawTitle !== undefined
          ? {
              title: unescapeHtmlEntities(
                rawTitle.replace(/\\(["'\\])/g, "$1")
              ),
            }
          : {}),
      },
    };
  }

  const lines = trimmed.split("\n");
  const structured = parseStructuredLineBlock(lines);
  if (structured) return structured;

  return { type: "paragraph", content: parseInlineMarkdown(trimmed) };
}

/**
 * Parses a Markdown string into a ProseMirror JSON document tree with full fidelity for
 * inline formatting, lists, tables, custom blocks, and rich node attributes.
 */
export function markdownToJson(
  markdown: string,
  options?: SanitizeOptions,
  depth = 0
): ProseMirrorJSONNode {
  if (
    !markdown ||
    typeof markdown !== "string" ||
    depth > MAX_MARKDOWN_PARSE_DEPTH
  ) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }

  const normalized = markdown.replace(/\r\n/g, "\n");
  const blocks = splitMarkdownBlocks(normalized);
  const content: ProseMirrorJSONNode[] = [];

  for (const rawBlock of blocks) {
    const trimmed = rawBlock.trim();
    if (!trimmed) continue;

    const meta = extractTiptapNodeComment(trimmed);
    if (meta) {
      const { mdPart, rawJson } = meta;
      try {
        const storedNode = sanitizeRestoredNodeTree(
          JSON.parse(rawJson) as ProseMirrorJSONNode,
          options
        );
        const expectedMd = serializeBlockToMarkdown(storedNode, options).trim();
        if (!mdPart || mdPart === expectedMd) {
          content.push(storedNode);
          continue;
        }
        const parsedEdited = parseSingleMarkdownBlock(mdPart, options, depth);
        if (parsedEdited) {
          if (
            parsedEdited.type === storedNode.type &&
            (storedNode.attrs || parsedEdited.attrs)
          ) {
            parsedEdited.attrs = {
              ...storedNode.attrs,
              ...parsedEdited.attrs,
            };
          }
          mergeEditedTableWithStored(parsedEdited, storedNode);
          content.push(parsedEdited);
          continue;
        }
      } catch {
        // Fall through to normal Markdown parsing if metadata comment is malformed
      }
      if (mdPart) {
        const fallbackNode = parseSingleMarkdownBlock(mdPart, options, depth);
        if (fallbackNode) content.push(fallbackNode);
      }
      continue;
    }

    const parsedBlock = parseSingleMarkdownBlock(trimmed, options, depth);
    if (parsedBlock) {
      content.push(parsedBlock);
    }
  }

  return {
    type: "doc",
    content: content.length > 0 ? content : [{ type: "paragraph" }],
  };
}
