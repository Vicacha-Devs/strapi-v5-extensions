import { describe, it, expect, beforeEach } from "vitest";

import { MINIMAL_PRESET_CONFIG } from "../../shared/src/types";
import {
  RichTextInput,
  harnessState,
  resetRichTextInputHarness,
  shallowRender,
  findElements,
  mockUsePresetConfig,
  mockUseTiptapEditor,
  mockUseTextColor,
  mockUseHighlightColor,
} from "./richTextInputTestHarness";

describe("RichTextInput", () => {
  beforeEach(() => {
    resetRichTextInputHarness();
  });

  it("is exported as a function/component", () => {
    expect(typeof RichTextInput).toBe("function");
  });

  it("extracts preset name from attribute.options.preset", () => {
    const props = {
      name: "content",
      attribute: { options: { preset: "blog" } },
    };
    RichTextInput(props as any, null);
    expect(mockUsePresetConfig).toHaveBeenCalledWith("blog");
  });

  it("falls back to runtimeSettings.defaultPreset when no attribute.options.preset is set", () => {
    const props = { name: "content" };
    RichTextInput(props as any, null);
    expect(mockUsePresetConfig).toHaveBeenCalledWith("default");
  });

  it("falls back to runtimeSettings.defaultPreset when attribute has no options", () => {
    const props = { name: "content", attribute: {} };
    RichTextInput(props as any, null);
    expect(mockUsePresetConfig).toHaveBeenCalledWith("default");
  });

  it("returns a Box element (loading state) when isLoading is true — not EditorErrorBoundary", () => {
    mockUsePresetConfig.mockReturnValue({ config: null, isLoading: true });
    const props = {
      name: "content",
      attribute: { options: { preset: "blog" } },
    };
    const result = RichTextInput(props as any, null) as any;
    // When loading, should return a Box, NOT an EditorErrorBoundary
    expect(result).not.toBeNull();
    expect(result.type).toBe("Box");
    // Should NOT be wrapped in EditorErrorBoundary
    expect(result.type).not.toBe("EditorErrorBoundary");
  });

  it("returns a Box element (loading state) while runtime settings are loading before mounting InnerEditor", () => {
    harnessState.mockIsSettingsLoading = true;
    const props = { name: "content" };
    const result = RichTextInput(props as any, null) as any;
    expect(result).not.toBeNull();
    expect(result.type).toBe("Box");
    expect(mockUseTiptapEditor).not.toHaveBeenCalled();
  });

  it("passes noPresetConfigured=false to BaseTiptapInput when falling back to runtimeSettings.defaultPreset", () => {
    const props = { name: "content" };
    const result = RichTextInput(props as any, null) as any;
    const baseTiptapInputs = findElements(result, "BaseTiptapInput");
    expect(baseTiptapInputs.length).toBeGreaterThan(0);
    expect(baseTiptapInputs[0].props.noPresetConfigured).toBe(false);
  });

  it("passes noPresetConfigured=false to BaseTiptapInput when presetName is defined", () => {
    const props = {
      name: "content",
      attribute: { options: { preset: "blog" } },
    };
    const result = RichTextInput(props as any, null) as any;
    const baseTiptapInputs = findElements(result, "BaseTiptapInput");
    expect(baseTiptapInputs.length).toBeGreaterThan(0);
    expect(baseTiptapInputs[0].props.noPresetConfigured).toBe(false);
  });

  it("memoizes extensions on [config, characterLimit, placeholder] with fixed dependency length", () => {
    const props = {
      name: "content",
      attribute: { options: { preset: "blog" } },
    };
    // Render through InnerEditor so useMemo runs
    shallowRender(RichTextInput(props as any, null));
    expect(harnessState.capturedUseMemoDeps).not.toBeNull();
    expect(harnessState.capturedUseMemoDeps).toEqual([
      MINIMAL_PRESET_CONFIG,
      undefined,
      undefined,
    ]);
  });

  it("memoizes extensions with fixed 3-element dependency array when no presetName is provided", () => {
    const props = { name: "content" };
    // Render through InnerEditor so useMemo runs
    shallowRender(RichTextInput(props as any, null));
    expect(harnessState.capturedUseMemoDeps).toEqual([
      MINIMAL_PRESET_CONFIG,
      undefined,
      undefined,
    ]);
  });

  it("forwards attribute.options.placeholder to buildExtensions even when top-level placeholder is undefined", () => {
    const props = {
      name: "content",
      placeholder: undefined,
      attribute: {
        options: { preset: "blog", placeholder: "Write something..." },
      },
    };
    shallowRender(RichTextInput(props as any, null));
    expect(harnessState.capturedUseMemoDeps).toEqual([
      MINIMAL_PRESET_CONFIG,
      undefined,
      "Write something...",
    ]);
  });

  it("wraps output in EditorErrorBoundary (rendered through InnerEditor)", () => {
    const props = { name: "content" };
    const result = RichTextInput(props as any, null) as any;
    const rendered = shallowRender(result);
    expect(rendered.type).toBe("EditorErrorBoundary");
  });

  it("calls useTextColor and useHighlightColor unconditionally (React rules of hooks)", () => {
    const props = { name: "content" };
    shallowRender(RichTextInput(props as any, null));
    expect(mockUseTextColor).toHaveBeenCalledTimes(1);
    expect(mockUseHighlightColor).toHaveBeenCalledTimes(1);
  });

  it("passes toolbar items to ResponsiveToolbar based on enabled config options", () => {
    const config = {
      ...MINIMAL_PRESET_CONFIG,
      heading: true,
      bold: true,
      italic: true,
      underline: true,
      strike: true,
      superscript: true,
      subscript: true,
      textColor: true,
      highlightColor: true,
      textAlign: true,
      bulletList: true,
      orderedList: true,
      code: true,
      blockquote: true,
      slashCommands: true,
      link: true,
      mediaLibrary: true,
      table: true,
    };
    mockUsePresetConfig.mockReturnValue({ config, isLoading: false });
    const props = {
      name: "content",
      attribute: { options: { preset: "blog" } },
    };
    const result = RichTextInput(props as any, null) as any;
    const responsiveToolbars = findElements(result, "ResponsiveToolbar");
    expect(responsiveToolbars.length).toBe(1);
    const itemIds = responsiveToolbars[0].props.items.map((i: any) => i.id);
    expect(itemIds).toContain("heading");
    expect(itemIds).toContain("bold");
    expect(itemIds).toContain("italic");
    expect(itemIds).toContain("underline");
    expect(itemIds).toContain("strike");
    expect(itemIds).toContain("superscript");
    expect(itemIds).toContain("subscript");
    expect(itemIds).toContain("textColor");
    expect(itemIds).toContain("highlightColor");
    expect(itemIds).toContain("textAlign");
    expect(itemIds).toContain("bullet");
    expect(itemIds).toContain("ordered");
    expect(itemIds).toContain("code");
    expect(itemIds).toContain("blockquote");
    expect(itemIds).toContain("slashCommands");
    expect(itemIds).toContain("link");
    expect(itemIds).toContain("mediaLibrary");
    expect(itemIds).toContain("table");
  });

  it("sanitizes leading, trailing, and consecutive spacers", () => {
    // Enable only bold, italic (from minimal config) and code (bold creates basicTextSpacer after, code creates insertSpacer)
    const config = {
      ...MINIMAL_PRESET_CONFIG,
      heading: false,
      code: true,
    };
    mockUsePresetConfig.mockReturnValue({ config, isLoading: false });
    const props = {
      name: "content",
      attribute: { options: { preset: "blog" } },
    };
    const result = RichTextInput(props as any, null) as any;
    const responsiveToolbars = findElements(result, "ResponsiveToolbar");
    const items = responsiveToolbars[0].props.items;
    const itemIds = items.map((i: any) => i.id);

    // Should contain bold, spacer, code (no leading or trailing spacer)
    expect(itemIds[0]).not.toMatch(/spacer/i);
    expect(itemIds[itemIds.length - 1]).not.toMatch(/spacer/i);

    // Verify no consecutive spacers exist
    for (let i = 0; i < itemIds.length - 1; i++) {
      const currentIsSpacer = itemIds[i].toLowerCase().includes("spacer");
      const nextIsSpacer = itemIds[i + 1].toLowerCase().includes("spacer");
      expect(currentIsSpacer && nextIsSpacer).toBe(false);
    }
  });

  it("filters out feature toolbar items when feature config is falsy or { enabled: false }", () => {
    const config = {
      ...MINIMAL_PRESET_CONFIG,
      heading: { enabled: false, levels: [1, 2] },
      fontFamily: { enabled: false, fonts: ["Inter"] },
      textColor: false,
      highlightColor: false,
      slashCommands: false,
    };
    mockUsePresetConfig.mockReturnValue({ config, isLoading: false });
    const props = {
      name: "content",
      attribute: { options: { preset: "blog" } },
    };
    const result = RichTextInput(props as any, null) as any;
    const responsiveToolbars = findElements(result, "ResponsiveToolbar");
    expect(responsiveToolbars.length).toBe(1);
    const itemIds = responsiveToolbars[0].props.items.map((i: any) => i.id);
    expect(itemIds).not.toContain("heading");
    expect(itemIds).not.toContain("fontFamily");
    expect(itemIds).not.toContain("textColor");
    expect(itemIds).not.toContain("highlightColor");
    expect(itemIds).not.toContain("slashCommands");
  });
});
