import { parseStrapiLinkUri } from "../relations";
import {
  type ProseMirrorJSONNode,
  parseMdUrl,
  parseTextStyleAttr,
  toSafeCellBackgroundColor,
  unescapeHtmlEntities,
} from "./sanitizers";

function unescapeMdTitle(raw: string): string {
  return unescapeHtmlEntities(raw.replace(/\\(["'\\])/g, "$1"));
}

const MAX_INLINE_PARSE_DEPTH = 32;

const INLINE_TOKEN_RE = new RegExp(
  `(${[
    " {2,}\\n",
    "<br\\s*\\/?>",
    "\\$([^$\\n]+)\\$",
    "!\\[([^\\]]*)\\]\\(\\s*(<[^>]+>|[^\\s)]+)(?:\\s+(?:\"((?:\\\\.|[^\"\\\\])*)\"|'((?:\\\\.|[^'\\\\])*)'))?\\s*\\)",
    "\\[([^\\]]+)\\]\\(\\s*(<[^>]+>|[^\\s)]+)(?:\\s+(?:\"((?:\\\\.|[^\"\\\\])*)\"|'((?:\\\\.|[^'\\\\])*)'))?\\s*\\)",
    "`([^`]+)`",
    "\\*\\*\\*([^\\n*][\\s\\S]*?)\\*\\*\\*",
    "\\*\\*([\\s\\S]+?)\\*\\*",
    "~~([\\s\\S]+?)~~",
    "\\*([^*]+)\\*",
    "<u>([\\s\\S]*?)<\\/u>",
    "<sup>([\\s\\S]*?)<\\/sup>",
    "<sub>([\\s\\S]*?)<\\/sub>",
    '<abbr\\s+title="([^"]*)"\\s*>([\\s\\S]*?)<\\/abbr>',
    '<span\\s+lang="([^"]*)"(?:\\s+dir="([^"]*)")?\\s*>([\\s\\S]*?)<\\/span>',
    '<span\\s+style="([^"]*)"\\s*>([\\s\\S]*?)<\\/span>',
    '<mark(?:\\s+data-color="([^"]*)")?\\s*>([\\s\\S]*?)<\\/mark>',
  ].join("|")})`
);

/**
 * Parses inline Markdown and safe inline HTML marks into ProseMirror text/inline nodes.
 */
export function parseInlineMarkdown(
  input: string,
  inheritedMarks: Array<{ type: string; attrs?: Record<string, unknown> }> = [],
  depth = 0
): ProseMirrorJSONNode[] {
  if (!input) return [];
  if (depth > MAX_INLINE_PARSE_DEPTH) {
    const plain = unescapeHtmlEntities(input);
    return plain
      ? [
          {
            type: "text",
            text: plain,
            ...(inheritedMarks.length > 0 ? { marks: inheritedMarks } : {}),
          },
        ]
      : [];
  }

  const nodes: ProseMirrorJSONNode[] = [];
  let remaining = input;
  while (remaining.length > 0) {
    const match = INLINE_TOKEN_RE.exec(remaining);
    if (!match) {
      const plain = unescapeHtmlEntities(remaining);
      if (plain) {
        nodes.push({
          type: "text",
          text: plain,
          ...(inheritedMarks.length > 0 ? { marks: inheritedMarks } : {}),
        });
      }
      break;
    }

    if (match.index > 0) {
      const prefix = unescapeHtmlEntities(remaining.slice(0, match.index));
      if (prefix) {
        nodes.push({
          type: "text",
          text: prefix,
          ...(inheritedMarks.length > 0 ? { marks: inheritedMarks } : {}),
        });
      }
    }

    const [
      fullMatch,
      ,
      mathLatex,
      imgAlt,
      imgSrc,
      imgTitleDq,
      imgTitleSq,
      linkText,
      linkHref,
      linkTitleDq,
      linkTitleSq,
      codeText,
      boldItalicInner,
      boldInner,
      strikeInner,
      italicInner,
      uInner,
      supInner,
      subInner,
      abbrTitle,
      abbrInner,
      spanLang,
      spanDir,
      spanInner,
      styleAttr,
      styleInner,
      markColor,
      markInner,
    ] = match;

    if (/^(?: {2,}\n|<br\s*\/?>)$/i.test(fullMatch)) {
      nodes.push({ type: "hardBreak" });
    } else if (mathLatex !== undefined) {
      nodes.push({
        type: "mathematics",
        attrs: { latex: mathLatex, displayMode: "inline" },
      });
    } else if (imgSrc !== undefined) {
      const rawImgTitle = imgTitleDq ?? imgTitleSq;
      nodes.push({
        type: "image",
        attrs: {
          src: parseMdUrl(imgSrc),
          alt: unescapeHtmlEntities(imgAlt || ""),
          ...(rawImgTitle !== undefined
            ? { title: unescapeMdTitle(rawImgTitle) }
            : {}),
        },
      });
    } else if (linkText !== undefined && linkHref !== undefined) {
      const safeHref = parseMdUrl(linkHref);
      const rawLinkTitle = linkTitleDq ?? linkTitleSq;
      const parsedStrapi = parseStrapiLinkUri(safeHref);
      if (parsedStrapi) {
        nodes.push({
          type: "linker",
          attrs: {
            collectionName: parsedStrapi.collectionName,
            documentId: parsedStrapi.documentId,
            label: unescapeHtmlEntities(linkText),
            href: safeHref,
          },
        });
      } else {
        nodes.push(
          ...parseInlineMarkdown(
            linkText,
            [
              ...inheritedMarks,
              {
                type: "link",
                attrs: {
                  href: safeHref,
                  ...(rawLinkTitle !== undefined
                    ? { title: unescapeMdTitle(rawLinkTitle) }
                    : {}),
                },
              },
            ],
            depth + 1
          )
        );
      }
    } else if (codeText !== undefined) {
      const decodedCodeText = inheritedMarks.some((m) => m.type === "link")
        ? codeText.replace(/&#91;/g, "[").replace(/&#93;/g, "]")
        : codeText;
      nodes.push({
        type: "text",
        text: decodedCodeText,
        marks: [...inheritedMarks, { type: "code" }],
      });
    } else if (boldItalicInner !== undefined) {
      nodes.push(
        ...parseInlineMarkdown(
          boldItalicInner,
          [...inheritedMarks, { type: "bold" }, { type: "italic" }],
          depth + 1
        )
      );
    } else if (boldInner !== undefined) {
      nodes.push(
        ...parseInlineMarkdown(
          boldInner,
          [...inheritedMarks, { type: "bold" }],
          depth + 1
        )
      );
    } else if (strikeInner !== undefined) {
      nodes.push(
        ...parseInlineMarkdown(
          strikeInner,
          [...inheritedMarks, { type: "strike" }],
          depth + 1
        )
      );
    } else if (italicInner !== undefined) {
      nodes.push(
        ...parseInlineMarkdown(
          italicInner,
          [...inheritedMarks, { type: "italic" }],
          depth + 1
        )
      );
    } else if (uInner !== undefined) {
      nodes.push(
        ...parseInlineMarkdown(
          uInner,
          [...inheritedMarks, { type: "underline" }],
          depth + 1
        )
      );
    } else if (supInner !== undefined) {
      nodes.push(
        ...parseInlineMarkdown(
          supInner,
          [...inheritedMarks, { type: "superscript" }],
          depth + 1
        )
      );
    } else if (subInner !== undefined) {
      nodes.push(
        ...parseInlineMarkdown(
          subInner,
          [...inheritedMarks, { type: "subscript" }],
          depth + 1
        )
      );
    } else if (abbrTitle !== undefined && abbrInner !== undefined) {
      nodes.push(
        ...parseInlineMarkdown(
          abbrInner,
          [
            ...inheritedMarks,
            { type: "abbr", attrs: { title: unescapeHtmlEntities(abbrTitle) } },
          ],
          depth + 1
        )
      );
    } else if (spanLang !== undefined && spanInner !== undefined) {
      nodes.push(
        ...parseInlineMarkdown(
          spanInner,
          [
            ...inheritedMarks,
            {
              type: "language",
              attrs: {
                lang: unescapeHtmlEntities(spanLang),
                dir: unescapeHtmlEntities(spanDir || "ltr"),
              },
            },
          ],
          depth + 1
        )
      );
    } else if (styleAttr !== undefined && styleInner !== undefined) {
      const parsedStyle = parseTextStyleAttr(unescapeHtmlEntities(styleAttr));
      nodes.push(
        ...parseInlineMarkdown(
          styleInner,
          Object.keys(parsedStyle).length > 0
            ? [...inheritedMarks, { type: "textStyle", attrs: parsedStyle }]
            : inheritedMarks,
          depth + 1
        )
      );
    } else if (markInner !== undefined) {
      const rawColor = markColor ? unescapeHtmlEntities(markColor) : undefined;
      const safeColor = rawColor
        ? (toSafeCellBackgroundColor(rawColor) ?? undefined)
        : undefined;
      nodes.push(
        ...parseInlineMarkdown(
          markInner,
          [
            ...inheritedMarks,
            {
              type: "highlight",
              ...(safeColor ? { attrs: { color: safeColor } } : {}),
            },
          ],
          depth + 1
        )
      );
    }

    remaining = remaining.slice(match.index + fullMatch.length);
  }

  return nodes;
}
