import { describe, it, expect, vi, beforeEach } from "vitest";

import { MINIMAL_PRESET_CONFIG } from "../../shared/src/types";
import {
  RichTextInput,
  harnessState,
  resetRichTextInputHarness,
  shallowRender,
  findElements,
  mockUsePresetConfig,
  mockEditor,
  mockField,
  mockUseTiptapEditor,
  mockUseRichTextComponents,
  mockUseContentManagerContext,
  mockUseField,
  mockUseRelationalSync,
} from "./richTextInputTestHarness";

describe("RichTextInput", () => {
  beforeEach(() => {
    resetRichTextInputHarness();
  });

  it("resolves availableFields from unstable_useContentManagerContext and preserves undefined when unavailable", () => {
    mockUseRelationalSync.mockClear();
    mockUseContentManagerContext.mockReturnValueOnce({
      contentType: undefined,
    });
    shallowRender(RichTextInput({ name: "content" } as any, null));
    expect(mockUseRelationalSync).toHaveBeenLastCalledWith(
      "content",
      expect.objectContaining({ availableFields: undefined })
    );

    mockUseContentManagerContext.mockReturnValueOnce({
      contentType: {
        attributes: {
          content: { type: "customField" },
          contentMedia: { type: "media" },
          contentLinks: {
            type: "component",
            component: "shared.links",
            repeatable: true,
          },
        },
      },
      components: {
        "shared.links": {
          attributes: {
            articles: { type: "relation", target: "api::article.article" },
            pages: { type: "relation", targetModel: "api::page.page" },
          },
        },
      },
    } as any);
    shallowRender(RichTextInput({ name: "content" } as any, null));
    expect(mockUseRelationalSync).toHaveBeenLastCalledWith(
      "content",
      expect.objectContaining({
        availableFields: ["content", "contentMedia", "contentLinks"],
        targetUidToAttribute: {
          "api::article.article": "articles",
          "api::page.page": "pages",
        },
        linksFieldIsRepeatable: true,
        linksComponentUid: "shared.links",
      })
    );
  });

  it("merges existing non-repeatable Links component value when syncing relations while leaving repeatable and media fields unchanged", () => {
    mockField.onChange.mockClear();
    mockUseField.mockReturnValueOnce({
      value: { id: 77, customNote: "keep-me" },
      onChange: vi.fn(),
    });
    mockUseContentManagerContext.mockReturnValueOnce({
      contentType: {
        attributes: {
          content: { type: "customField" },
          contentMedia: { type: "media" },
          contentLinks: {
            type: "component",
            component: "shared.links",
            repeatable: false,
          },
        },
      },
    } as any);

    shallowRender(RichTextInput({ name: "content" } as any, null));
    const syncOptions = (mockUseRelationalSync.mock.lastCall as any)?.[1];
    expect(typeof syncOptions?.onSyncField).toBe("function");

    syncOptions.onSyncField("contentLinks", {
      articles: { connect: [{ id: 2, documentId: "doc-2" }], disconnect: [] },
    });
    expect(mockField.onChange).toHaveBeenLastCalledWith("contentLinks", {
      id: 77,
      customNote: "keep-me",
      articles: { connect: [{ id: 2, documentId: "doc-2" }], disconnect: [] },
    });

    syncOptions.onSyncField("contentMedia", [{ id: 5 }]);
    expect(mockField.onChange).toHaveBeenLastCalledWith("contentMedia", [
      { id: 5 },
    ]);

    // Repeatable Links component: merge into first entry and preserve remaining entries
    mockField.onChange.mockClear();
    mockUseField.mockReturnValueOnce({
      value: [
        { id: 101, customNote: "first-entry" },
        { id: 102, customNote: "second-entry" },
      ],
      onChange: vi.fn(),
    });
    mockUseContentManagerContext.mockReturnValueOnce({
      contentType: {
        attributes: {
          content: { type: "customField" },
          contentLinks: {
            type: "component",
            component: "shared.links",
            repeatable: true,
          },
        },
      },
    } as any);

    shallowRender(RichTextInput({ name: "content" } as any, null));
    const repeatableSyncOptions = (
      mockUseRelationalSync.mock.lastCall as any
    )?.[1];
    repeatableSyncOptions.onSyncField("contentLinks", [
      {
        articles: { connect: [{ id: 9, documentId: "doc-9" }], disconnect: [] },
      },
    ]);
    expect(mockField.onChange).toHaveBeenLastCalledWith("contentLinks", [
      {
        id: 101,
        customNote: "first-entry",
        articles: { connect: [{ id: 9, documentId: "doc-9" }], disconnect: [] },
      },
      { id: 102, customNote: "second-entry" },
    ]);
  });

  it("preserves json outputFormat for stored JSON entries when options.outputFormat is unset", () => {
    const elWithJsonString = (RichTextInput as any)(
      {
        name: "content",
        value: '{"type":"doc","content":[{"type":"paragraph"}]}',
        attribute: { options: {} },
      },
      null
    );
    expect(elWithJsonString.props.outputFormat).toBe("json");

    const elWithJsonObject = (RichTextInput as any)(
      {
        name: "content",
        value: { type: "doc", content: [] },
        attribute: { options: {} },
      },
      null
    );
    expect(elWithJsonObject.props.outputFormat).toBe("json");

    // When settings loading fails, infer markdown or html from non-JSON stored string
    harnessState.mockSettingsLoadFailed = true;
    try {
      const elWithMarkdown = (RichTextInput as any)(
        {
          name: "content",
          value: "# Heading in Markdown",
          attribute: { options: {} },
        },
        null
      );
      expect(elWithMarkdown.props.outputFormat).toBe("markdown");

      const elWithHtml = (RichTextInput as any)(
        {
          name: "content",
          value: "<p>Stored HTML paragraph</p>",
          attribute: { options: {} },
        },
        null
      );
      expect(elWithHtml.props.outputFormat).toBe("html");
    } finally {
      harnessState.mockSettingsLoadFailed = false;
    }
  });

  it.each([
    [true, false],
    [{ resizable: true }, false],
    [{ cellBackground: true }, true],
    [{ allowCellBackgroundColor: true }, true],
  ])(
    "with table %j renders the cell background picker: %s",
    (table, expected) => {
      const config = { table };
      mockUsePresetConfig.mockReturnValue({ config, isLoading: false });
      const props = {
        name: "content",
        attribute: { options: { preset: "blog" } },
      };
      const result = RichTextInput(props as any, null) as any;
      const tableItem = findElements(
        result,
        "ResponsiveToolbar"
      )[0].props.items.find((i: any) => i.id === "table");
      expect(tableItem.content.props.children.includes("CELL_BACKGROUND")).toBe(
        expected
      );
    }
  );

  it("passes the hook's contentError flag to BaseTiptapInput", () => {
    mockUseTiptapEditor.mockReturnValueOnce({
      editor: mockEditor,
      field: mockField,
      removedContent: null,
      contentError: true,
    } as any);
    const result = RichTextInput({ name: "content" } as any, null) as any;
    const [base] = findElements(result, "BaseTiptapInput");
    expect(base.props.contentError).toBe(true);
  });

  it("adds the components menu as a toolbar item and renders its dialog outside the toolbar", () => {
    const config = { ...MINIMAL_PRESET_CONFIG, components: { button: true } };
    mockUsePresetConfig.mockReturnValue({ config, isLoading: false });
    const props = {
      name: "content",
      attribute: { options: { preset: "blog" } },
    };
    const result = RichTextInput(props as any, null) as any;

    const items = findElements(result, "ResponsiveToolbar")[0].props.items;
    expect(items.find((i: any) => i.id === "components")?.content).toBe("MENU");

    const base = findElements(result, "BaseTiptapInput")[0];
    expect(base.props.children).toContain("DIALOG");

    expect(mockUseRichTextComponents).toHaveBeenCalledWith(mockEditor, {
      config,
      disabled: undefined,
    });
  });

  it("omits the components toolbar item when no component is enabled", () => {
    mockUseRichTextComponents.mockReturnValueOnce({
      componentsMenu: null,
      componentDialog: null,
    } as any);
    mockUsePresetConfig.mockReturnValue({
      config: MINIMAL_PRESET_CONFIG,
      isLoading: false,
    });
    const props = {
      name: "content",
      attribute: { options: { preset: "blog" } },
    };
    const result = RichTextInput(props as any, null) as any;

    const itemIds = findElements(
      result,
      "ResponsiveToolbar"
    )[0].props.items.map((i: any) => i.id);
    expect(itemIds).not.toContain("components");
  });

  it("forwards disabled prop to useTiptapEditor options", () => {
    mockUseTiptapEditor.mockClear();
    shallowRender(
      RichTextInput({ name: "content", disabled: true } as any, null)
    );
    expect(mockUseTiptapEditor).toHaveBeenCalledWith(
      "content",
      "",
      expect.anything(),
      expect.objectContaining({ disabled: true })
    );
  });

  it("detects pretty-printed JSON and jsonb reordered keys as stored ProseMirror JSON", () => {
    const prettyReordered =
      '{\n  "content": [{"type": "paragraph"}],\n  "type": "doc"\n}';
    const elPretty = (RichTextInput as any)(
      {
        name: "content",
        value: prettyReordered,
        attribute: { options: {} },
      },
      null
    );
    expect(elPretty.props.outputFormat).toBe("json");

    const elReorderedObj = (RichTextInput as any)(
      {
        name: "content",
        value: { content: [], type: "doc" },
        attribute: { options: {} },
      },
      null
    );
    expect(elReorderedObj.props.outputFormat).toBe("json");
  });

  it.each([
    [true, false],
    [{ resizable: true }, false],
    [{ cellBackground: true }, true],
  ])(
    "with table %j renders the cell background picker: %s",
    (table, expected) => {
      const config = { table };
      mockUsePresetConfig.mockReturnValue({ config, isLoading: false });
      const props = {
        name: "content",
        attribute: { options: { preset: "blog" } },
      };
      const result = RichTextInput(props as any, null) as any;
      const tableItem = findElements(
        result,
        "ResponsiveToolbar"
      )[0].props.items.find((i: any) => i.id === "table");
      expect(tableItem.content.props.children.includes("CELL_BACKGROUND")).toBe(
        expected
      );
    }
  );
});
