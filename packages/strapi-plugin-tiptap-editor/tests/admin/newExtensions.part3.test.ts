import { describe, it, expect, vi } from "vitest";

vi.mock("@strapi/design-system", () => ({
  Box: "Box",
  Button: "Button",
  Dialog: {
    Root: "DialogRoot",
    Content: "DialogContent",
    Header: "DialogHeader",
    Body: "DialogBody",
    Footer: "DialogFooter",
    Cancel: "DialogCancel",
    Action: "DialogAction",
  },
  Field: {
    Root: "FieldRoot",
    Label: "FieldLabel",
    Hint: "FieldHint",
    Error: "FieldError",
  },
  Flex: "Flex",
  IconButton: "IconButton",
  Popover: {
    Root: "PopoverRoot",
    Trigger: "PopoverTrigger",
    Content: "PopoverContent",
  },
  SingleSelect: "SingleSelect",
  SingleSelectOption: "SingleSelectOption",
  TextInput: "TextInput",
  Textarea: "Textarea",
  Tooltip: "Tooltip",
  Typography: "Typography",
}));

vi.mock("@strapi/icons", () => ({
  Bold: "Bold",
  Italic: "Italic",
  Underline: "Underline",
  StrikeThrough: "StrikeThrough",
  Code: "Code",
  Quotes: "Quotes",
  BulletList: "BulletList",
  NumberList: "NumberList",
  Link: "Link",
  Image: "Image",
  Play: "Play",
  VolumeUp: "VolumeUp",
  Microphone: "Microphone",
  Paperclip: "Paperclip",
  CodeBlock: "CodeBlock",
  EmotionHappy: "EmotionHappy",
  Cross: "Cross",
  Check: "Check",
  Trash: "Trash",
  Pencil: "Pencil",
  Expand: "Expand",
  Collapse: "Collapse",
  Eye: "Eye",
  Information: "Information",
  Plus: "Plus",
  Minus: "Minus",
  PaintBrush: "PaintBrush",
}));

const mockRelationsFetchGet = vi.fn();

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useRef: (init: any) => ({ current: init }),
    useEffect: (fn: () => void) => {
      fn();
    },
    useCallback: (fn: any) => fn,
  };
});

vi.mock("@strapi/strapi/admin", () => ({
  useField: vi.fn(() => ({ value: "", onChange: vi.fn(), error: undefined })),
  useFetchClient: vi.fn(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() })),
  getFetchClient: vi.fn(() => ({ get: mockRelationsFetchGet })),
}));

import { buildExtensions } from "../../admin/src/utils/buildExtensions";
import { parseJSONContent } from "../../admin/src/utils/tiptapUtils";
import { FULL_PRESET_CONFIG } from "../../shared/src/types";

describe("admin/extensions & utilities", () => {
  describe("HTML data-* attribute persistence & multi-format hardening", () => {
    it("round-trips Attachment, Video, Audio, ConversationHistory, and Heading SEO tag through sanitized HTML without attribute loss", async () => {
      const { generateJSON, generateHTML } = await import("@tiptap/core");
      const { sanitizeHtmlString } =
        await import("../../shared/src/contentSerializer");
      const { JSDOM } = await import("jsdom");
      const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
      const prevWindow = (globalThis as any).window;
      const prevDocument = (globalThis as any).document;
      (globalThis as any).window = dom.window;
      (globalThis as any).document = dom.window.document;

      try {
        const extensions = buildExtensions(FULL_PRESET_CONFIG);
        const doc = {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 2, tag: "h3", id: "seo-heading" },
              content: [{ type: "text", text: "SEO Heading" }],
            },
            {
              type: "attachment",
              attrs: {
                "href": "https://example.com/manual.pdf",
                "src": "https://example.com/manual.pdf",
                "filename": "manual.pdf",
                "title": "User Manual",
                "mime": "application/pdf",
                "size": 512,
                "ext": ".pdf",
                "data-asset-id": 7,
                "data-document-id": "att-7",
              },
            },
            {
              type: "video",
              attrs: {
                "src": "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
                "title": "Demo Video",
                "caption": "Walkthrough clip",
                "embedType": "embed",
                "data-asset-id": 8,
              },
            },
            {
              type: "audio",
              attrs: {
                "src": "https://example.com/clip.mp3",
                "title": "Episode 1",
                "caption": "Podcast intro",
                "mime": "audio/mpeg",
                "data-asset-id": 9,
              },
            },
            {
              type: "conversationHistory",
              attrs: {
                author: "Alice",
                timestamp: "2026-11-02T12:00:00Z",
              },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Prior reply" }],
                },
              ],
            },
          ],
        };

        const rawHtml = generateHTML(doc, extensions);
        const cleanHtml = sanitizeHtmlString(rawHtml);
        const restored = generateJSON(cleanHtml, extensions);

        expect(restored.content?.[0]).toMatchObject({
          type: "heading",
          attrs: { level: 2, tag: "h3", id: "seo-heading" },
        });
        expect(restored.content?.[1]).toMatchObject({
          type: "attachment",
          attrs: {
            "href": "https://example.com/manual.pdf",
            "src": "https://example.com/manual.pdf",
            "filename": "manual.pdf",
            "title": "User Manual",
            "mime": "application/pdf",
            "size": 512,
            "ext": ".pdf",
            "data-asset-id": 7,
            "data-document-id": "att-7",
          },
        });
        expect(restored.content?.[2]).toMatchObject({
          type: "video",
          attrs: {
            "src": "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
            "title": "Demo Video",
            "caption": "Walkthrough clip",
            "embedType": "embed",
            "data-asset-id": 8,
          },
        });
        expect(restored.content?.[3]).toMatchObject({
          type: "audio",
          attrs: {
            "src": "https://example.com/clip.mp3",
            "title": "Episode 1",
            "caption": "Podcast intro",
            "mime": "audio/mpeg",
            "data-asset-id": 9,
          },
        });
        expect(restored.content?.[4]).toMatchObject({
          type: "conversationHistory",
          attrs: {
            author: "Alice",
            timestamp: "2026-11-02T12:00:00Z",
          },
        });
      } finally {
        (globalThis as any).window = prevWindow;
        (globalThis as any).document = prevDocument;
      }
    });

    it("routes legacy block HTML strings to sanitizeHtmlString when outputFormat is markdown without breaking metadata comments", () => {
      const legacyHtml =
        '<p onclick="evil()">Legacy <strong>HTML</strong> paragraph</p>';
      expect(parseJSONContent(legacyHtml, "", "markdown")).toBe(
        "<p>Legacy <strong>HTML</strong> paragraph</p>"
      );
    });

    it("preserves object options and component keys across disable and re-enable in SettingsPage", async () => {
      const { buildNextFeatureOverrideValue } =
        await import("../../admin/src/pages/SettingsPage");

      const disabledTable = buildNextFeatureOverrideValue("table", false, {
        resizable: true,
        cellBackground: true,
      });
      expect(disabledTable).toEqual({
        resizable: true,
        cellBackground: true,
        enabled: false,
      });
      const reenabledTable = buildNextFeatureOverrideValue(
        "table",
        true,
        undefined,
        disabledTable
      );
      expect(reenabledTable).toEqual({
        resizable: true,
        cellBackground: true,
        enabled: true,
      });

      const disabledHeading = buildNextFeatureOverrideValue("heading", false, {
        levels: [2, 3, 4],
        autoSlugId: false,
      });
      expect(disabledHeading).toEqual({
        levels: [2, 3, 4],
        autoSlugId: false,
        enabled: false,
      });
      expect(
        buildNextFeatureOverrideValue(
          "heading",
          true,
          undefined,
          disabledHeading
        )
      ).toEqual({
        levels: [2, 3, 4],
        autoSlugId: false,
        enabled: true,
      });

      const disabledComponents = buildNextFeatureOverrideValue(
        "components",
        false,
        {
          button: { variants: ["primary"] },
          callout: true,
        }
      );
      expect(disabledComponents).toEqual({
        button: { variants: ["primary"], enabled: false },
        callout: false,
      });
      expect(
        buildNextFeatureOverrideValue(
          "components",
          true,
          undefined,
          disabledComponents
        )
      ).toEqual({
        button: { variants: ["primary"], enabled: true },
        callout: true,
      });
    });

    it("validates external stylesheet URLs in Initializer to allow only https:// or safe root-relative paths", async () => {
      const { isSafeStylesheetUrl } =
        await import("../../admin/src/components/Initializer");
      expect(isSafeStylesheetUrl("https://cdn.example.com/theme.css")).toBe(
        true
      );
      expect(isSafeStylesheetUrl("/assets/theme.css")).toBe(true);
      expect(isSafeStylesheetUrl("http://cdn.example.com/theme.css")).toBe(
        false
      );
      expect(isSafeStylesheetUrl("//evil.example.com/theme.css")).toBe(false);
      expect(isSafeStylesheetUrl("/\\evil.example.com/theme.css")).toBe(false);
      expect(isSafeStylesheetUrl("javascript:alert(1)")).toBe(false);
    });
  });
});
