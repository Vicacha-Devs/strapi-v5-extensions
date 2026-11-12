import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Strapi design system and React hooks used by Heading.tsx (not needed for buildExtensions)
vi.mock("@strapi/strapi/admin", () => ({
  useField: vi.fn(() => ({ value: "", onChange: vi.fn(), error: undefined })),
  useFetchClient: vi.fn(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() })),
}));
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
    Anchor: "PopoverAnchor",
    Trigger: "PopoverTrigger",
    Content: "PopoverContent",
  },
  SingleSelect: "SingleSelect",
  SingleSelectOption: "SingleSelectOption",
  SimpleMenu: "SimpleMenu",
  MenuItem: "MenuItem",
  Status: "Status",
  TextInput: "TextInput",
  Textarea: "Textarea",
  Tooltip: "Tooltip",
  Typography: "Typography",
}));
vi.mock("@strapi/icons", () => ({
  PuzzlePiece: "PuzzlePiece",
  Pencil: "Pencil",
  Trash: "Trash",
  Image: "Image",
  ArrowClockwise: "ArrowClockwise",
  Cross: "Cross",
  Link: "Link",
}));
vi.mock("react-intl", () => ({
  useIntl: () => ({
    formatMessage: ({
      defaultMessage,
    }: {
      id: string;
      defaultMessage: string;
    }) => defaultMessage,
  }),
}));
vi.mock("@tiptap/react", () => ({
  useEditorState: vi.fn(),
  ReactNodeViewRenderer: vi.fn(() => "nodeview"),
  NodeViewWrapper: "div",
  NodeViewContent: "div",
}));

// The component dialog and node view are React-only; buildExtensions just needs them to resolve.
vi.mock("../../admin/src/components/ComponentDialog", () => ({
  default: "ComponentDialog",
}));
vi.mock("../../admin/src/components/ComponentNodeView", () => ({
  GenericComponentNodeView: "GenericComponentNodeView",
}));

import { getSchema } from "@tiptap/core";

import { buttonComponent } from "../../admin/src/builtins/button";
import {
  clearRichTextComponents,
  defineRichTextComponent,
  registerRichTextComponent,
} from "../../admin/src/registry/richTextComponents";
import { buildExtensions } from "../../admin/src/utils/buildExtensions";
import {
  BUILT_IN_COMPONENT_SCHEMAS,
  RESERVED_NODE_NAMES,
} from "../../shared/src/components";
import { FULL_PRESET_CONFIG } from "../../shared/src/types";

describe("buildExtensions", () => {
  beforeEach(() => {
    clearRichTextComponents();
  });

  it("includes TextStyle, Color, and pasteStripper when textColor is true", () => {
    const extensions = buildExtensions({ textColor: true });
    const names = extensions.map((ext: any) => ext.name);

    expect(names).toContain("textStyle");
    expect(names).toContain("color");
    expect(names).toContain("pasteStripper");
  });

  it("includes TextStyle, Highlight, and pasteStripper when highlightColor is true", () => {
    const extensions = buildExtensions({ highlightColor: true });
    const names = extensions.map((ext: any) => ext.name);

    expect(names).toContain("textStyle");
    expect(names).toContain("highlight");
    expect(names).toContain("pasteStripper");
  });

  it("includes TextStyle only once when both textColor and highlightColor are true", () => {
    const extensions = buildExtensions({
      textColor: true,
      highlightColor: true,
    });
    const names = extensions.map((ext: any) => ext.name);

    const textStyleCount = names.filter((name) => name === "textStyle").length;
    expect(textStyleCount).toBe(1);

    const pasteStripperCount = names.filter(
      (name) => name === "pasteStripper"
    ).length;
    expect(pasteStripperCount).toBe(1);
  });

  it("always registers TextStyle, Color, Highlight, FontFamily, FontSize, and LineHeight for schema preservation while omitting PasteStripper when disabled", () => {
    const extensions = buildExtensions({});
    const names = extensions.map((ext: any) => ext.name);

    expect(names).toContain("textStyle");
    expect(names).toContain("color");
    expect(names).toContain("highlight");
    expect(names).toContain("fontFamily");
    expect(names).toContain("fontSize");
    expect(names).toContain("lineHeight");
    expect(names).not.toContain("pasteStripper");
  });

  it("Highlight is configured with multicolor: true", () => {
    const extensions = buildExtensions({ highlightColor: true });
    const highlight = extensions.find((ext: any) => ext.name === "highlight");

    expect(highlight).toBeDefined();
    expect((highlight as any).options.multicolor).toBe(true);
  });

  it("textColor only still registers Highlight schema for Zero-Data-Loss", () => {
    const extensions = buildExtensions({ textColor: true });
    const names = extensions.map((ext: any) => ext.name);

    expect(names).toContain("color");
    expect(names).toContain("highlight");
  });

  it("highlightColor only still registers Color schema for Zero-Data-Loss", () => {
    const extensions = buildExtensions({ highlightColor: true });
    const names = extensions.map((ext: any) => ext.name);

    expect(names).toContain("highlight");
    expect(names).toContain("color");
  });

  it("does not include characterCount when characterCount is { enabled: false, limit: 500 } and no field characterLimit is set", () => {
    const extensions = buildExtensions({
      characterCount: { enabled: false, limit: 500 },
    });
    const names = extensions.map((ext: any) => ext.name);

    expect(names).not.toContain("characterCount");
  });

  it("registers the strapi protocol on StarterKit link when allowInternalLinks is true", () => {
    const extensions = buildExtensions({
      link: { openOnClick: false, allowInternalLinks: true },
    });
    const starterKit = extensions.find(
      (ext: any) => ext.name === "starterKit"
    ) as any;
    expect(starterKit).toBeDefined();
    expect(starterKit.options.link).toEqual({
      openOnClick: false,
      protocols: [{ scheme: "strapi", optionalSlashes: false }],
    });
  });

  it("validates TableCellWithBackground and TableHeaderWithBackground backgroundColor so unsafe CSS is dropped while #eaf5ff remains valid", () => {
    const extensions = buildExtensions({ table: true });
    const tableCell = extensions.find(
      (ext: any) => ext.name === "tableCell"
    ) as any;
    const tableHeader = extensions.find(
      (ext: any) => ext.name === "tableHeader"
    ) as any;
    expect(tableCell).toBeDefined();
    expect(tableHeader).toBeDefined();

    for (const ext of [tableCell, tableHeader]) {
      const attrs = ext.config.addAttributes.call({ parent: () => ({}) });
      expect(
        attrs.backgroundColor.renderHTML({
          backgroundColor: "red; position:fixed",
        })
      ).toEqual({});
      expect(
        attrs.backgroundColor.renderHTML({ backgroundColor: "#eaf5ff" })
      ).toEqual({
        style: "background-color: #eaf5ff",
      });
    }
  });

  // rich-text component nodes

  it("adds a node for a registered component even when the preset does not enable it", () => {
    registerRichTextComponent(
      defineRichTextComponent({
        name: "callout",
        label: "Callout",
        content: "block+",
        attributes: {},
      })
    );
    const ext = buildExtensions({}).find(
      (e: any) => e.name === "callout"
    ) as any;
    expect(ext).toBeDefined();
    expect(ext.config.addOptions().enabled).toBe(false);
  });

  it("marks the node enabled when the preset enables it", () => {
    registerRichTextComponent(
      defineRichTextComponent({
        name: "callout",
        label: "Callout",
        content: "block+",
        attributes: {},
      })
    );
    const ext = buildExtensions({
      components: { callout: { tones: ["info"] } },
    }).find((e: any) => e.name === "callout") as any;
    expect(ext.config.addOptions()).toStrictEqual({
      enabled: true,
      component: { tones: ["info"] },
    });
  });

  it("ignores enabled-but-unregistered names", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(
      buildExtensions({ components: { ghost: true } }).some(
        (e: any) => e.name === "ghost"
      )
    ).toBe(false);
  });

  it("registers the built-in button component from BUILT_IN_COMPONENT_SCHEMAS when enabled without warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warn.mockClear();
    registerRichTextComponent(buttonComponent);
    const extensions = buildExtensions({ components: { button: true } });
    expect(extensions.some((e: any) => e.name === "button")).toBe(true);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("strips unsafe protocols, isAllowedUri, validate, and on* HTMLAttributes from StarterKit link config", () => {
    const extensions = buildExtensions({
      link: {
        allowInternalLinks: true,
        protocols: ["javascript"],
        isAllowedUri: () => true,
        validate: () => true,
        HTMLAttributes: {
          class: "safe-link",
          onclick: "alert(1)",
          OnMouseOver: "evil()",
        },
      } as any,
    });
    const starterKit = extensions.find(
      (ext: any) => ext.name === "starterKit"
    ) as any;
    expect(starterKit.options.link).toEqual({
      openOnClick: false,
      HTMLAttributes: { class: "safe-link" },
      protocols: [{ scheme: "strapi", optionalSlashes: false }],
    });
  });

  it("ensures every node and mark in FULL_PRESET_CONFIG schema (except built-in components) is in RESERVED_NODE_NAMES", () => {
    const schema = getSchema(buildExtensions(FULL_PRESET_CONFIG));
    const builtInNames = new Set(BUILT_IN_COMPONENT_SCHEMAS.map((s) => s.name));
    const allSchemaNames = [
      ...Object.keys(schema.nodes),
      ...Object.keys(schema.marks),
    ].filter((name) => !builtInNames.has(name));

    const missing = allSchemaNames.filter(
      (name) => !RESERVED_NODE_NAMES.has(name)
    );
    expect(missing).toEqual([]);
  });
});
