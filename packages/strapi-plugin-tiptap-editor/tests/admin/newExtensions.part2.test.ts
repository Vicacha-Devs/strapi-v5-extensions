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

import { useRelationalSync } from "../../admin/src/hooks/useRelationalSync";

describe("admin/extensions & utilities", () => {
  describe("useRelationalSync connect & disconnect diffing", () => {
    it("computes cumulative connect and disconnect diffs against the persisted baseline and re-seeds after save", async () => {
      mockRelationsFetchGet.mockImplementation(async () => ({
        data: {
          results: [
            {
              id: 11,
              documentId: "doc-1",
              title: "Article 1",
              status: "published",
            },
            {
              id: 22,
              documentId: "doc-2",
              title: "Article 2",
              status: "published",
            },
          ],
        },
      }));

      const initialDoc = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "linker",
                attrs: {
                  collectionName: "api::article.article",
                  documentId: "doc-1",
                  label: "Article 1",
                },
              },
            ],
          },
        ],
      };

      const onSyncField = vi.fn();
      const { syncRelationsFromDoc, seedSignature } = useRelationalSync(
        "content",
        {
          onSyncField,
          availableFields: ["content", "contentLinks"],
          targetUidToAttribute: {
            "api::article.article": "articles",
            "api::page.page": "pages",
          },
          linksComponentUid: "shared.links",
          initialDocument: initialDoc,
        }
      );

      const docWithOneAndTwo = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "linker",
                attrs: {
                  collectionName: "api::article.article",
                  documentId: "doc-1",
                  label: "Article 1",
                },
              },
              {
                type: "linker",
                attrs: {
                  collectionName: "api::article.article",
                  documentId: "doc-2",
                  label: "Article 2",
                },
              },
            ],
          },
        ],
      };

      // Step 1: Add doc-2 while keeping doc-1 -> only doc-2 should be in connect, disconnect should be empty
      syncRelationsFromDoc(docWithOneAndTwo);

      await vi.waitFor(() =>
        expect(onSyncField).toHaveBeenLastCalledWith("contentLinks", {
          articles: {
            connect: [expect.objectContaining({ id: 22, documentId: "doc-2" })],
            disconnect: [],
          },
          pages: {
            connect: [],
            disconnect: [],
          },
        })
      );

      // Step 2: Remove all links before saving -> only persisted doc-1 (id: 11) is in disconnect (unsaved doc-2 is excluded)
      syncRelationsFromDoc({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "No links left" }],
          },
        ],
      });

      await vi.waitFor(() =>
        expect(onSyncField).toHaveBeenLastCalledWith("contentLinks", {
          articles: {
            connect: [],
            disconnect: [{ id: 11 }],
          },
          pages: {
            connect: [],
            disconnect: [],
          },
        })
      );

      // Step 3: Re-seed after saving docWithOneAndTwo, then remove all links -> both persisted doc-1 and doc-2 disconnect
      seedSignature(docWithOneAndTwo);
      syncRelationsFromDoc({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "No links left" }],
          },
        ],
      });

      await vi.waitFor(() =>
        expect(onSyncField).toHaveBeenLastCalledWith("contentLinks", {
          articles: {
            connect: [],
            disconnect: [{ id: 11 }, { id: 22 }],
          },
          pages: {
            connect: [],
            disconnect: [],
          },
        })
      );
    });

    it("deduplicates mediaPayload by asset ID while preserving first entry order", () => {
      const onSyncField = vi.fn();
      const { syncRelationsFromDoc } = useRelationalSync("content", {
        onSyncField,
        availableFields: ["content", "contentMedia"],
      });

      syncRelationsFromDoc({
        type: "doc",
        content: [
          {
            type: "image",
            attrs: {
              "src": "https://example.com/one.jpg",
              "data-asset-id": 42,
              "data-document-id": "media-42",
            },
          },
          {
            type: "image",
            attrs: {
              "src": "https://example.com/one-copy.jpg",
              "data-asset-id": 42,
              "data-document-id": "media-42",
            },
          },
          {
            type: "image",
            attrs: {
              "src": "https://example.com/two.jpg",
              "data-asset-id": 99,
              "data-document-id": "media-99",
            },
          },
        ],
      });

      expect(onSyncField).toHaveBeenCalledWith("contentMedia", [
        {
          id: 42,
          documentId: "media-42",
          url: "https://example.com/one.jpg",
          type: "image",
        },
        {
          id: 99,
          documentId: "media-99",
          url: "https://example.com/two.jpg",
          type: "image",
        },
      ]);
    });

    it("syncs Strapi v5 media assets referenced by documentId when numeric assetId is null", () => {
      const onSyncField = vi.fn();
      const { syncRelationsFromDoc } = useRelationalSync("content", {
        onSyncField,
        availableFields: ["content", "contentMedia"],
      });

      syncRelationsFromDoc({
        type: "doc",
        content: [
          {
            type: "image",
            attrs: {
              "src": "https://example.com/v5.jpg",
              "data-asset-id": null,
              "data-document-id": "doc-only-v5",
            },
          },
          {
            type: "image",
            attrs: {
              "src": "https://example.com/v5-dup.jpg",
              "data-asset-id": null,
              "data-document-id": "doc-only-v5",
            },
          },
        ],
      });

      expect(onSyncField).toHaveBeenCalledWith("contentMedia", [
        {
          id: null,
          documentId: "doc-only-v5",
          url: "https://example.com/v5.jpg",
          type: "image",
        },
      ]);
    });
  });
});
