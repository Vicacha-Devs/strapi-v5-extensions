import { describe, it, expect } from "vitest";

import {
  isSafeUrl,
  sanitizeHtmlString,
  sanitizeRestoredNodeTree,
  extractTextFromJsonNode,
  computeDocumentStats,
  buildExportedJsonDocument,
  serializeEditorContent,
} from "../../shared/src/contentSerializer";
import {
  formatTextStyleAttr,
  parseTextStyleAttr,
} from "../../shared/src/serializers/sanitizers";

describe("shared/contentSerializer", () => {
  describe("serializeEditorContent", () => {
    const mockEditor = {
      getJSON: () => ({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Serialized content" }],
          },
        ],
      }),
      getHTML: () => '<p onclick="evil()">Serialized content</p>',
    };

    it("serializes to JSON string by default and exports words, characters, and reading time", () => {
      const out = serializeEditorContent(mockEditor, "json");
      const parsed = JSON.parse(out);
      expect(parsed.type).toBe("doc");
      expect(parsed.words).toBe(2);
      expect(parsed.characters).toBe(18);
      expect(parsed.readingTimeMinutes).toBe(1);
      expect(parsed.readingTime).toBe("1 min read");
      expect(parsed.stats).toEqual({
        words: 2,
        characters: 18,
        readingTimeMinutes: 1,
        readingTime: "1 min read",
        wordsPerMinute: 200,
      });
    });

    it("serializes to sanitized HTML when outputFormat is html", () => {
      const out = serializeEditorContent(mockEditor, "html");
      expect(out).toBe("<p>Serialized content</p>");
    });

    it("serializes to Markdown when outputFormat is markdown", () => {
      const out = serializeEditorContent(mockEditor, "markdown");
      expect(out).toBe("Serialized content");
    });

    it("sanitizes unsafe links, iframes, and CSS injections in buildExportedJsonDocument while preserving empty doc shape", () => {
      const emptyExport = buildExportedJsonDocument({ getJSON: () => null });
      expect(emptyExport.type).toBe("doc");
      expect(emptyExport.content).toEqual([]);
      expect(emptyExport.words).toBe(0);
      expect(emptyExport.characters).toBe(0);

      const dirtyExport = buildExportedJsonDocument(
        {
          getJSON: () => ({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Click me",
                    marks: [
                      { type: "link", attrs: { href: "javascript:alert(1)" } },
                      {
                        type: "textStyle",
                        attrs: {
                          color: "red; background: url(https://evil.test)",
                          fontFamily: "Georgia, serif",
                          fontSize: "18px",
                        },
                      },
                    ],
                  },
                ],
              },
              {
                type: "iframe",
                attrs: {
                  src: "https://evil.example.com/embed",
                  title: "Untrusted",
                },
              },
            ],
          }),
        },
        { allowedIframeDomains: ["youtube.com"] }
      );

      const content = dirtyExport.content as any[];
      expect(content[0].content[0].marks[0].attrs.href).toBe("#");
      expect(content[0].content[0].marks[1].attrs).toEqual({
        fontFamily: "Georgia, serif",
        fontSize: "18px",
      });
      expect(content[1].attrs.src).toBe("");
    });

    it("includes button/atom labels and custom container blocks cleanly in extractTextFromJsonNode and computeDocumentStats", () => {
      const doc = {
        type: "doc",
        content: [
          {
            type: "callout",
            attrs: { tone: "info" },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "First paragraph" }],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: "Second paragraph" }],
              },
            ],
          },
          {
            type: "button",
            attrs: { label: "Start free trial", href: "https://example.com" },
          },
          {
            type: "badge",
            attrs: { label: "Beta" },
          },
        ],
      };

      const extracted = extractTextFromJsonNode(doc);
      expect(extracted).toBe(
        "First paragraph\nSecond paragraph\nStart free trial\nBeta"
      );
      const stats = computeDocumentStats(doc);
      expect(stats.words).toBe(8);
    });
  });

  describe("security & round-trip regressions", () => {
    it("rejects backslash-leading URLs and enforces strict base64 MIME allowlists for data:image/* and data:audio/*", () => {
      expect(isSafeUrl("\\evil.com/xss")).toBe(false);
      expect(isSafeUrl("\\\\evil.com/xss")).toBe(false);
      expect(isSafeUrl("\\/evil.com/xss")).toBe(false);
      expect(isSafeUrl("/\\evil.com/xss")).toBe(false);

      expect(isSafeUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==")).toBe(
        true
      );
      expect(isSafeUrl("data:image/webp;base64, UklGRhIAAABX\nRUJQVlA4 ")).toBe(
        true
      );
      expect(
        isSafeUrl("data:audio/webm;codecs=opus;base64,GkXfo59ChoEBQveBAULygQRC")
      ).toBe(true);
      expect(isSafeUrl("data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0U=")).toBe(
        true
      );

      expect(isSafeUrl("data:image/html,<script>alert(1)</script>")).toBe(
        false
      );
      expect(
        isSafeUrl("data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIj4=")
      ).toBe(false);
      expect(
        isSafeUrl(
          "data:image/svg%2bxml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIj4="
        )
      ).toBe(false);
      expect(isSafeUrl("data:image/png,<script>alert(1)</script>")).toBe(false);
      expect(isSafeUrl("data:audio/html,<script>alert(1)</script>")).toBe(
        false
      );
      expect(isSafeUrl("data:audio/mpeg,<script>alert(1)</script>")).toBe(
        false
      );
    });

    it("enforces iframe domain/HTTPS/sandbox rules, target=_blank rel hardening, data-href/url/src checks, backslash URI rejection, and style allowlisting in sanitizeHtmlString", () => {
      // Disallowed / non-HTTPS iframes removed
      expect(
        sanitizeHtmlString(
          '<p>Before</p><iframe src="http://www.youtube.com/embed/abc"></iframe>'
        )
      ).toBe("<p>Before</p>");
      expect(
        sanitizeHtmlString(
          '<iframe src="https://evil.example.com/embed"></iframe>',
          {
            allowedIframeDomains: ["youtube.com"],
          }
        )
      ).toBe("");

      // Valid iframe gets unsafe sandbox tokens stripped and default sandbox/loading applied
      const sandboxed = sanitizeHtmlString(
        '<iframe src="https://www.youtube.com/embed/abc" sandbox="allow-top-navigation allow-forms"></iframe>',
        { allowedIframeDomains: ["youtube.com"] }
      );
      expect(sandboxed).toContain('sandbox="allow-scripts allow-popups"');
      expect(sandboxed).toContain('loading="lazy"');

      // Hook does not leak to subsequent calls without options
      const unrestrictedNextCall = sanitizeHtmlString(
        '<iframe src="https://example.org/widget" loading="eager"></iframe>'
      );
      expect(unrestrictedNextCall).toContain(
        'src="https://example.org/widget"'
      );
      expect(unrestrictedNextCall).toContain('loading="eager"');

      // <a target="_blank"> strips opener and enforces noopener noreferrer
      const targetBlankHtml = sanitizeHtmlString(
        '<a href="https://example.com" target="_blank" rel="opener nofollow">External</a>'
      );
      expect(targetBlankHtml).not.toContain('"opener');
      expect(targetBlankHtml).not.toContain(" opener");
      expect(targetBlankHtml).toContain("nofollow");
      expect(targetBlankHtml).toContain("noopener");
      expect(targetBlankHtml).toContain("noreferrer");

      // Backslash-leading URLs and unsafe data:audio / data:image/svg+xml rejected in HTML
      const backslashHtml = sanitizeHtmlString(
        '<a href="\\\\evil.com">A</a><a href="\\/evil.com">B</a><img src="data:image/svg+xml;base64,PHN2Zz4="><img src="data:image/png;base64,iVBORw0KGgo="><audio src="data:audio/html,evil"></audio><audio src="data:audio/webm;codecs=opus;base64,GkXf=="></audio>'
      );
      expect(backslashHtml).not.toContain("evil.com");
      expect(backslashHtml).not.toContain("data:image/svg");
      expect(backslashHtml).toContain("data:image/png;base64,iVBORw0KGgo=");
      expect(backslashHtml).not.toContain("data:audio/html");
      expect(backslashHtml).toContain(
        "data:audio/webm;codecs=opus;base64,GkXf=="
      );

      // data-href / data-url / *-src / *-url sanitized on custom component elements
      const customCompHtml = sanitizeHtmlString(
        '<div data-component="button" data-href="javascript:alert(1)" data-url="https://strapi.io" data-before-src="vbscript:evil" data-empty-url=""></div>'
      );
      expect(customCompHtml).not.toContain("javascript:");
      expect(customCompHtml).not.toContain("vbscript:");
      expect(customCompHtml).toContain('data-url="https://strapi.io"');
      expect(customCompHtml).toContain('data-empty-url=""');

      // Inline style sanitization: blocks position:fixed / z-index / url() while keeping safe Tiptap styles
      const styledHtml = sanitizeHtmlString(
        '<div style="position: fixed; z-index: 99999; background: url(https://evil.test)">Overlay</div>' +
          '<span style="color: #0052cc; font-family: Georgia, serif; font-size: 18px; line-height: 1.75; position: fixed">Text</span>'
      );
      expect(styledHtml).toContain("<div>Overlay</div>");
      expect(styledHtml).not.toContain("position");
      expect(styledHtml).not.toContain("z-index");
      expect(styledHtml).not.toContain("url(");
      expect(styledHtml).toContain(
        'style="color: #0052cc; font-family: Georgia, serif; font-size: 18px; line-height: 1.75"'
      );
    });

    it("validates CSS values in formatTextStyleAttr, parseTextStyleAttr, and sanitizeRestoredNodeTree", () => {
      expect(
        formatTextStyleAttr({
          color: "#0052cc",
          fontFamily: "Georgia, serif",
          fontSize: "18px",
          lineHeight: "1.75",
        })
      ).toBe(
        "color: #0052cc; font-family: Georgia, serif; font-size: 18px; line-height: 1.75"
      );

      expect(
        formatTextStyleAttr({
          color: "red; position: fixed",
          fontFamily: "Arial; background: url(evil)",
          fontSize: "calc(100vw)",
          lineHeight: "expression(1)",
        })
      ).toBe("");

      expect(
        parseTextStyleAttr(
          "color: rgb(10, 20, 30); font-family: Georgia, serif; font-size: 1.25rem; line-height: 1.5; position: fixed"
        )
      ).toEqual({
        color: "rgb(10, 20, 30)",
        fontFamily: "Georgia, serif",
        fontSize: "1.25rem",
        lineHeight: "1.5",
      });

      expect(
        parseTextStyleAttr(
          "color: url(evil); font-family: Arial}; font-size: 10px\\9; line-height: 1;bad"
        )
      ).toEqual({ lineHeight: "1" });

      const restored = sanitizeRestoredNodeTree(
        {
          type: "doc",
          content: [
            { type: "image", attrs: { src: "", alt: "Empty src kept" } },
            {
              type: "image",
              attrs: { src: "javascript:alert(1)", alt: "Unsafe src replaced" },
            },
            { type: "iframe", attrs: { src: "https://evil.com/x" } },
            {
              type: "table",
              content: [
                {
                  type: "tableRow",
                  content: [
                    {
                      type: "tableCell",
                      attrs: {
                        backgroundColor: "red; background-image: url(x)",
                      },
                      content: [
                        {
                          type: "paragraph",
                          content: [
                            {
                              type: "text",
                              text: "Cell",
                              marks: [
                                {
                                  type: "highlight",
                                  attrs: { color: "yellow; position: fixed" },
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        { allowedIframeDomains: ["youtube.com"] }
      );

      expect(restored.content?.[0]?.attrs?.src).toBe("");
      expect(restored.content?.[1]?.attrs?.src).toBe("#");
      expect(restored.content?.[2]?.attrs?.src).toBe("");
      const cell = restored.content?.[3]?.content?.[0]?.content?.[0];
      expect(cell?.attrs?.backgroundColor).toBeNull();
      expect(cell?.content?.[0]?.content?.[0]?.marks?.[0]?.attrs).toEqual({});
    });
  });
});
