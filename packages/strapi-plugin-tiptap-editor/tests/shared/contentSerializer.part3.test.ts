import { describe, it, expect } from "vitest";

import {
  jsonToMarkdown,
  markdownToJson,
} from "../../shared/src/contentSerializer";
import {
  encodeNodeMetaComment,
  serializeBlockToMarkdown,
} from "../../shared/src/serializers/markdownSerializer";

describe("shared/contentSerializer", () => {
  describe("security & round-trip regressions (part 2)", () => {
    it("escapes brackets in Markdown link/media labels and supports CommonMark titles on images and links", () => {
      const parsedImg = markdownToJson(
        '![Hero &#91;1&#93;](https://example.com/a.jpg "Credit")'
      );
      expect(parsedImg.content?.[0]).toEqual({
        type: "image",
        attrs: {
          alt: "Hero [1]",
          src: "https://example.com/a.jpg",
          title: "Credit",
        },
      });
      expect(jsonToMarkdown(parsedImg)).toBe(
        '![Hero &#91;1&#93;](https://example.com/a.jpg "Credit")'
      );

      const parsedSingleQuoteLink = markdownToJson(
        "Read [Guide &#91;v2&#93;](https://example.com/guide 'Docs Title') and ![Inline](https://example.com/i.png 'Inline Title')"
      );
      expect(parsedSingleQuoteLink.content?.[0]?.content?.[1]).toEqual({
        type: "text",
        text: "Guide [v2]",
        marks: [
          {
            type: "link",
            attrs: { href: "https://example.com/guide", title: "Docs Title" },
          },
        ],
      });
      expect(parsedSingleQuoteLink.content?.[0]?.content?.[3]).toEqual({
        type: "image",
        attrs: {
          src: "https://example.com/i.png",
          alt: "Inline",
          title: "Inline Title",
        },
      });

      const mediaBracketDoc = {
        type: "doc",
        content: [
          {
            type: "video",
            attrs: { title: "Clip [HD]", src: "https://example.com/v.mp4" },
          },
          {
            type: "audio",
            attrs: { title: "Track [1]", src: "https://example.com/a.mp3" },
          },
          {
            type: "attachment",
            attrs: {
              filename: "spec[final].pdf",
              title: "spec[final].pdf",
              href: "https://example.com/spec.pdf",
              src: "https://example.com/spec.pdf",
            },
          },
          {
            type: "iframe",
            attrs: {
              title: "Map [Live]",
              src: "https://www.youtube.com/embed/1",
            },
          },
          {
            type: "paragraph",
            content: [
              {
                type: "linker",
                attrs: {
                  collectionName: "api::article.article",
                  documentId: "doc-1",
                  label: "Ref [A]",
                  href: "strapi://api::article.article/doc-1",
                },
              },
              { type: "text", text: " " },
              {
                type: "text",
                text: "Link [B]",
                marks: [
                  { type: "link", attrs: { href: "https://example.com/b" } },
                ],
              },
            ],
          },
        ],
      };

      const md = jsonToMarkdown(mediaBracketDoc);
      expect(markdownToJson(md)).toEqual(mediaBracketDoc);
    });

    it("strips fence/newline injections in codeBlock/informationPane/conversationHistory and escapes -- in metadata comments", () => {
      const commentStr = encodeNodeMetaComment({
        type: "paragraph",
        attrs: { textAlign: "center" },
        content: [{ type: "text", text: "Breakout --> attempt --!> here" }],
      });
      expect(
        commentStr.slice("<!-- tiptap-node:".length, -" -->".length)
      ).not.toContain("--");

      const doc = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { textAlign: "center" },
            content: [{ type: "text", text: "Breakout --> attempt --!> here" }],
          },
          {
            type: "codeBlock",
            attrs: { language: "ts`\n```\nInjected" },
            content: [{ type: "text", text: "const safe = true;" }],
          },
          {
            type: "informationPane",
            attrs: { variant: "info", title: "Header\nInjected paragraph" },
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Body" }] },
            ],
          },
          {
            type: "conversationHistory",
            attrs: { author: "Alice\nBob", timestamp: "2026-11-02\n12:00" },
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Note" }] },
            ],
          },
        ],
      };

      const md = jsonToMarkdown(doc);
      expect(markdownToJson(md)).toEqual(doc);
    });

    it("escapes pipes in table cells, unescapes on parse, and preserves cell-level attrs when a table is edited in Markdown", () => {
      const pipeTableDoc = {
        type: "doc",
        content: [
          {
            type: "table",
            content: [
              {
                type: "tableRow",
                content: [
                  {
                    type: "tableHeader",
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "Expr A | B" }],
                      },
                    ],
                  },
                  {
                    type: "tableHeader",
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "Result" }],
                      },
                    ],
                  },
                ],
              },
              {
                type: "tableRow",
                content: [
                  {
                    type: "tableCell",
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "x | y" }],
                      },
                    ],
                  },
                  {
                    type: "tableCell",
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "true" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const pipeMd = jsonToMarkdown(pipeTableDoc);
      expect(pipeMd).toContain("Expr A \\| B");
      expect(pipeMd).toContain("x \\| y");
      expect(markdownToJson(pipeMd)).toEqual(pipeTableDoc);

      const richTableNode = {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableHeader",
                attrs: {
                  colspan: 1,
                  rowspan: 1,
                  colwidth: [200],
                  backgroundColor: "#EDF2F7",
                },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Header" }],
                  },
                ],
              },
            ],
          },
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                attrs: {
                  colspan: 1,
                  rowspan: 1,
                  colwidth: [200],
                  backgroundColor: "#FEFCBF",
                },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Old Value" }],
                  },
                ],
              },
            ],
          },
        ],
      };

      const editedTableMd = [
        "| Header |",
        "| --- |",
        "| Updated Value |",
        encodeNodeMetaComment(richTableNode),
      ].join("\n");

      const reparsedEdited = markdownToJson(editedTableMd);
      const editedHeader =
        reparsedEdited.content?.[0]?.content?.[0]?.content?.[0];
      const editedCell =
        reparsedEdited.content?.[0]?.content?.[1]?.content?.[0];
      expect(editedHeader?.attrs).toEqual({
        colspan: 1,
        rowspan: 1,
        colwidth: [200],
        backgroundColor: "#EDF2F7",
      });
      expect(editedCell?.attrs).toEqual({
        colspan: 1,
        rowspan: 1,
        colwidth: [200],
        backgroundColor: "#FEFCBF",
      });
      expect(editedCell?.content?.[0]?.content?.[0]?.text).toBe(
        "Updated Value"
      );
    });

    it("serializes custom container blocks with jsonToMarkdownPure instead of merging paragraphs inline and threads allowedIframeDomains", () => {
      const customCallout = {
        type: "callout",
        attrs: { tone: "warning" },
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "First block" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Second block" }],
          },
        ],
      };
      expect(serializeBlockToMarkdown(customCallout)).toBe(
        "First block\n\nSecond block"
      );

      const docWithCallout = { type: "doc", content: [customCallout] };
      expect(markdownToJson(jsonToMarkdown(docWithCallout))).toEqual(
        docWithCallout
      );

      const iframeDoc = {
        type: "doc",
        content: [
          {
            type: "iframe",
            attrs: {
              title: "Blocked Embed",
              src: "https://evil.example.com/embed",
            },
          },
        ],
      };
      const mdRestricted = jsonToMarkdown(iframeDoc, {
        allowedIframeDomains: ["youtube.com"],
      });
      expect(mdRestricted).not.toContain("evil.example.com");
      const parsedRestricted = markdownToJson(
        "[Embed: Blocked Embed](https://evil.example.com/embed)",
        { allowedIframeDomains: ["youtube.com"] }
      );
      expect(parsedRestricted.content?.[0]?.attrs?.src).toBe("");
    });

    it("round-trips links and images whose URLs contain apostrophes alongside CommonMark titles", () => {
      const doc = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Conway",
                marks: [
                  {
                    type: "link",
                    attrs: {
                      href: "https://en.wikipedia.org/wiki/Conway's_Game_of_Life",
                      title: "Wiki",
                    },
                  },
                ],
              },
            ],
          },
          {
            type: "image",
            attrs: {
              src: "https://cdn.example.com/chef's.jpg",
              alt: "Chef",
              title: "Photo",
            },
          },
        ],
      };

      const md = jsonToMarkdown(doc);
      expect(markdownToJson(md)).toEqual(doc);
      expect(
        markdownToJson("![Chef](https://cdn.example.com/chef's.jpg 'Photo')")
          .content?.[0]
      ).toEqual({
        type: "image",
        attrs: {
          src: "https://cdn.example.com/chef's.jpg",
          alt: "Chef",
          title: "Photo",
        },
      });
    });
  });
});
