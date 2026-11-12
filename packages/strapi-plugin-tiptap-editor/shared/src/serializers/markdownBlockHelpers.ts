import { parseInlineMarkdown } from "./inlineMarkdownParser";
import { type ProseMirrorJSONNode, unescapeHtmlEntities } from "./sanitizers";

function matchFenceLine(line: string): [string, string, string] | null {
  let i = 0;
  const ch = line[0];
  if (ch !== "`" && ch !== "~") return null;
  while (i < line.length && line[i] === ch) i += 1;
  if (i < 3) return null;
  return [line, line.slice(0, i), line.slice(i)];
}

function matchLeadLine(line: string): string | null {
  if (!/^\*\*lead:\*\*/i.test(line)) return null;
  const rest = line.slice(9).trimStart();
  return rest.length > 0 ? rest : null;
}

const INFO_VARIANTS = new Set([
  "INFO",
  "SUCCESS",
  "WARNING",
  "DANGER",
  "NEUTRAL",
  "TIP",
]);
function matchInfoPaneLine(line: string): [string, string] | null {
  if (!line.startsWith("[!")) return null;
  const closeIdx = line.indexOf("]");
  if (closeIdx === -1) return null;
  const tag = line.slice(2, closeIdx).toUpperCase();
  if (!INFO_VARIANTS.has(tag)) return null;
  return [tag, line.slice(closeIdx + 1).trimStart()];
}

const parseCells = (line: string): string[] =>
  line
    .trim()
    .slice(1, -1)
    .split(/(?<!\\)\|/g)
    .map((c) => c.trim().replace(/\\\|/g, "|"));

/**
 * Splits a normalized Markdown document into top-level block chunks while keeping
 * multi-paragraph `<details>`, `<div data-type="layout-container">`, fenced code blocks,
 * and display math blocks intact across blank lines.
 */
export function splitMarkdownBlocks(normalized: string): string[] {
  const lines = normalized.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let fence: string | null = null;
  let inMath = false;
  let detailsDepth = 0;
  let layoutDivDepth = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    const fenceMatch = matchFenceLine(trimmedLine);
    if (fence) {
      if (
        fenceMatch &&
        fenceMatch[1][0] === fence[0] &&
        fenceMatch[1].length >= fence.length &&
        fenceMatch[2].trim() === ""
      ) {
        fence = null;
      }
    } else if (fenceMatch) {
      fence = fenceMatch[1];
    } else if (trimmedLine === "$$") {
      inMath = !inMath;
    } else if (!inMath) {
      const detailsOpens = (line.match(/<details\b[^>]*>/gi) || []).length;
      const detailsCloses = (line.match(/<\/details\s*>/gi) || []).length;
      detailsDepth = Math.max(0, detailsDepth + detailsOpens - detailsCloses);

      if (
        layoutDivDepth > 0 ||
        /<div\s+data-type="layout-container"/i.test(line)
      ) {
        const divOpens = (line.match(/<div\b[^>]*>/gi) || []).length;
        const divCloses = (line.match(/<\/div\s*>/gi) || []).length;
        layoutDivDepth = Math.max(0, layoutDivDepth + divOpens - divCloses);
      }
    }

    const insideContainer =
      fence !== null || inMath || detailsDepth > 0 || layoutDivDepth > 0;
    if (!insideContainer && trimmedLine === "") {
      if (current.length > 0) {
        blocks.push(current.join("\n"));
        current = [];
      }
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) {
    blocks.push(current.join("\n"));
  }

  return blocks;
}

export function extractTiptapNodeComment(
  trimmed: string
): { mdPart: string; rawJson: string } | null {
  if (!trimmed.endsWith("-->")) return null;
  const match = /(?:^|\n)<!--\s*tiptap-node:/.exec(trimmed);
  if (!match) return null;
  const mdPart = trimmed.slice(0, match.index).trim();
  const jsonPart = trimmed.slice(match.index + match[0].length, -3).trim();
  if (!jsonPart) return null;
  return { mdPart, rawJson: jsonPart.replace(/--\\u003e/g, "-->") };
}

export function mergeEditedTableWithStored(
  parsedEdited: ProseMirrorJSONNode,
  storedNode: ProseMirrorJSONNode
): void {
  if (
    parsedEdited.type !== "table" ||
    storedNode.type !== "table" ||
    !Array.isArray(parsedEdited.content) ||
    !Array.isArray(storedNode.content)
  ) {
    return;
  }
  parsedEdited.content = parsedEdited.content.map((row, rowIdx) => {
    const storedRow = storedNode.content?.[rowIdx];
    if (!Array.isArray(row.content) || !Array.isArray(storedRow?.content))
      return row;
    return {
      ...row,
      ...(storedRow.attrs || row.attrs
        ? { attrs: { ...storedRow.attrs, ...row.attrs } }
        : {}),
      content: row.content.map((cell, cellIdx) => {
        const storedCell = storedRow.content?.[cellIdx];
        if (!storedCell?.attrs) return cell;
        const preserved: Record<string, unknown> = {};
        for (const key of [
          "colspan",
          "rowspan",
          "colwidth",
          "backgroundColor",
        ] as const) {
          if (key in storedCell.attrs) preserved[key] = storedCell.attrs[key];
        }
        if (Object.keys(preserved).length === 0 && !cell.attrs) return cell;
        return { ...cell, attrs: { ...preserved, ...cell.attrs } };
      }),
    };
  });
}

export function parseStructuredLineBlock(
  lines: string[]
): ProseMirrorJSONNode | null {
  if (
    lines.length >= 2 &&
    lines.every((l) => {
      const t = l.trim();
      return t.startsWith("|") && t.endsWith("|") && !t.endsWith("\\|");
    }) &&
    /^\|[\s:-]+(\|[\s:-]+)*\|$/.test(lines[1].trim())
  ) {
    const headerCells = parseCells(lines[0]);
    const bodyLines = lines.slice(2);
    return {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: headerCells.map((cellText) => ({
            type: "tableHeader",
            content: [
              { type: "paragraph", content: parseInlineMarkdown(cellText) },
            ],
          })),
        },
        ...bodyLines.map((rowLine) => ({
          type: "tableRow",
          content: parseCells(rowLine).map((cellText) => ({
            type: "tableCell",
            content: [
              { type: "paragraph", content: parseInlineMarkdown(cellText) },
            ],
          })),
        })),
      ],
    };
  }

  if (lines.every((l) => /^-\s+\[([ xX])\]\s+/.test(l))) {
    return {
      type: "taskList",
      content: lines.map((l) => ({
        type: "taskItem",
        attrs: { checked: /^-\s+\[[xX]\]/.test(l) },
        content: [
          {
            type: "paragraph",
            content: parseInlineMarkdown(l.replace(/^-\s+\[[ xX]\]\s+/, "")),
          },
        ],
      })),
    };
  }

  if (lines.every((l) => /^[-*]\s+/.test(l))) {
    return {
      type: "bulletList",
      content: lines.map((l) => ({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: parseInlineMarkdown(l.replace(/^[-*]\s+/, "")),
          },
        ],
      })),
    };
  }

  if (lines.every((l) => /^\d+\.\s+/.test(l))) {
    const firstMatch = /^(\d+)\.\s+/.exec(lines[0]);
    const start = firstMatch ? Number(firstMatch[1]) || 1 : 1;
    return {
      type: "orderedList",
      attrs: { start },
      content: lines.map((l) => ({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: parseInlineMarkdown(l.replace(/^\d+\.\s+/, "")),
          },
        ],
      })),
    };
  }

  if (lines.every((l) => /^>\s?/.test(l))) {
    const strippedLines = lines.map((l) => l.replace(/^>\s?/, ""));
    const firstLine = strippedLines[0] || "";

    const leadContent = matchLeadLine(firstLine);
    if (leadContent !== null && strippedLines.length === 1) {
      return {
        type: "leadParagraph",
        content: parseInlineMarkdown(leadContent),
      };
    }

    const infoMatch = matchInfoPaneLine(firstLine);
    if (infoMatch) {
      const variant = infoMatch[0].toLowerCase();
      const title = infoMatch[1].trim() || infoMatch[0];
      const bodyText = strippedLines.slice(1).join("\n").trim();
      return {
        type: "informationPane",
        attrs: { variant, title },
        content: [
          {
            type: "paragraph",
            content: bodyText ? parseInlineMarkdown(bodyText) : [],
          },
        ],
      };
    }

    const convMatch =
      /^\*\*Conversation History\*\*\s*\*\((.*?)\)\*(?:\s*\[([^\]]*)\])?$/i.exec(
        firstLine
      );
    if (convMatch) {
      const author = convMatch[1].trim() || "Comment";
      const timestamp =
        convMatch[2] !== undefined
          ? unescapeHtmlEntities(convMatch[2].trim())
          : undefined;
      const bodyText = strippedLines.slice(1).join("\n").trim();
      return {
        type: "conversationHistory",
        attrs: { author, ...(timestamp ? { timestamp } : {}) },
        content: [
          {
            type: "paragraph",
            content: bodyText ? parseInlineMarkdown(bodyText) : [],
          },
        ],
      };
    }

    return {
      type: "blockquote",
      content: strippedLines.map((line) => ({
        type: "paragraph",
        content: parseInlineMarkdown(line),
      })),
    };
  }

  return null;
}
