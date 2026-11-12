import { vi } from "vitest";

import { MINIMAL_PRESET_CONFIG } from "../../shared/src/types";

export const harnessState = {
  capturedUseMemoFactory: null as (() => any) | null,
  capturedUseMemoDeps: null as any[] | null,
  mockIsSettingsLoading: false,
  mockSettingsLoadFailed: false,
};

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useState: (init: any) => [
      init === true
        ? harnessState.mockIsSettingsLoading
        : init === false
          ? harnessState.mockSettingsLoadFailed
          : typeof init === "function"
            ? init()
            : init,
      vi.fn(),
    ],
    useEffect: (fn: () => void) => {
      fn();
    },
    useMemo: (fn: () => any, deps: any[]) => {
      harnessState.capturedUseMemoFactory = fn;
      harnessState.capturedUseMemoDeps = deps;
      return fn();
    },
    useRef: (init: any) => ({ current: init }),
    forwardRef: (fn: any) => fn,
    createElement: (type: any, props: any, ...children: any[]) => ({
      type,
      props: {
        ...props,
        children:
          children.length === 1
            ? children[0]
            : children.length > 1
              ? children
              : props?.children,
      },
    }),
  };
});

vi.mock("react-intl", () => ({
  useIntl: () => ({
    formatMessage: (d: { defaultMessage?: string }) => d.defaultMessage ?? "",
  }),
}));

export const mockUsePresetConfig = vi.fn();
vi.mock("../../admin/src/hooks/usePresetConfig", () => ({
  usePresetConfig: (presetName?: string) => mockUsePresetConfig(presetName),
}));

export const mockBuildExtensions = vi.fn(() => []);
vi.mock("../../admin/src/utils/buildExtensions", () => ({
  buildExtensions: (config: any, opts?: any) =>
    opts !== undefined
      ? mockBuildExtensions(config, opts)
      : mockBuildExtensions(config),
}));

export const mockEditor = { id: "mock-editor" };
export const mockField = {
  value: "",
  error: undefined,
  onChange: vi.fn(),
  initialValue: "",
};
export const mockUseTiptapEditor = vi.fn(() => ({
  editor: mockEditor,
  field: mockField,
  removedContent: null,
  contentError: false,
}));
vi.mock("../../admin/src/utils/tiptapUtils", () => ({
  useTiptapEditor: (...args: any[]) => mockUseTiptapEditor(...args),
}));

export const mockStarterKit = {
  boldButton: null as any,
  italicButton: null as any,
  underlineButton: null as any,
  strikeButton: null as any,
  bulletButton: null as any,
  orderedButton: null as any,
  codeButton: null as any,
  blockquoteButton: null as any,
};
export const mockHeading = {
  headingSelect: null as any,
  headingTagSelect: null as any,
};
export const mockLink = { linkButton: null as any, linkDialog: null as any };
export const mockScript = {
  superscriptButton: null as any,
  subscriptButton: null as any,
};
export const mockTable = {
  tableButton: null as any,
  addColumnButton: null as any,
  removeColumnButton: null as any,
  addRowButton: null as any,
  removeRowButton: null as any,
  mergeCellsButton: null as any,
  splitCellButton: null as any,
  tableDialog: null as any,
};
export const mockTextAlign = {
  textAlignLeftButton: null as any,
  textAlignCenterButton: null as any,
  textAlignRightButton: null as any,
  textAlignJustifyButton: null as any,
};

vi.mock("../../admin/src/extensions/StarterKit", () => ({
  useStarterKit: () => mockStarterKit,
}));
vi.mock("../../admin/src/extensions/Heading", () => ({
  useHeading: () => mockHeading,
  HeadingWithSEOTag: {},
}));
vi.mock("../../admin/src/extensions/Link", () => ({ useLink: () => mockLink }));
vi.mock("../../admin/src/extensions/Script", () => ({
  useScript: () => mockScript,
}));
vi.mock("../../admin/src/extensions/Table", () => ({
  useTable: () => mockTable,
}));
export const mockUseTableCellBackground = vi.fn(() => ({
  cellBackgroundButton: "CELL_BACKGROUND",
}));
vi.mock("../../admin/src/extensions/TableCellBackground", () => ({
  useTableCellBackground: (...args: any[]) =>
    mockUseTableCellBackground(...args),
}));
vi.mock("../../admin/src/extensions/TextAlign", () => ({
  useTextAlign: () => mockTextAlign,
}));

export const mockUseTextColor = vi.fn(() => ({ textColorButton: null as any }));
export const mockUseHighlightColor = vi.fn(() => ({
  highlightColorButton: null as any,
}));
vi.mock("../../admin/src/extensions/TextColor", () => ({
  useTextColor: (...args: any[]) => mockUseTextColor(...args),
}));
vi.mock("../../admin/src/extensions/HighlightColor", () => ({
  useHighlightColor: (...args: any[]) => mockUseHighlightColor(...args),
}));

export const mockImage = { imageButton: null as any, imageDialog: null as any };
vi.mock("../../admin/src/extensions/Image", () => ({
  useImage: () => mockImage,
  StrapiImage: { configure: vi.fn(() => ({})) },
}));

export const mockUseRichTextComponents = vi.fn(() => ({
  componentsMenu: "MENU",
  componentDialog: "DIALOG",
}));
vi.mock("../../admin/src/extensions/Components", () => ({
  useRichTextComponents: (...args: any[]) => mockUseRichTextComponents(...args),
}));
vi.mock("../../admin/src/extensions/Video", () => ({
  useVideo: () => ({ videoButton: null, videoDialog: null }),
  StrapiVideo: { configure: vi.fn(() => ({})) },
}));
vi.mock("../../admin/src/extensions/Audio", () => ({
  useAudio: () => ({ audioButton: null, audioDialog: null }),
  StrapiAudio: { configure: vi.fn(() => ({})) },
}));
vi.mock("../../admin/src/extensions/Attachment", () => ({
  useAttachment: () => ({ attachmentButton: null, attachmentDialog: null }),
  StrapiAttachment: { configure: vi.fn(() => ({})) },
}));
vi.mock("../../admin/src/extensions/Iframe", () => ({
  useIframe: () => ({ iframeButton: null, iframeDialog: null }),
  StrapiIframe: { configure: vi.fn(() => ({})) },
}));
vi.mock("../../admin/src/extensions/Linker", () => ({
  useLinker: () => ({ linkerButton: null, linkerDialog: null }),
  StrapiLinker: { configure: vi.fn(() => ({})) },
}));
vi.mock("../../admin/src/extensions/TypographyControls", () => ({
  useTypographyControls: () => ({
    fontFamilySelect: null,
    fontSizeSelect: null,
    lineHeightSelect: null,
    clearFormattingButton: null,
  }),
}));
vi.mock("../../admin/src/extensions/SemanticMarks", () => ({
  useSemanticMarks: () => ({
    leadParagraphButton: null,
    abbrButton: null,
    abbrDialog: null,
    languageButton: null,
    languageDialog: null,
  }),
}));
vi.mock("../../admin/src/extensions/InformationPane", () => ({
  useInformationPane: () => ({ informationPaneButton: null }),
}));
vi.mock("../../admin/src/extensions/StructuredBlocks", () => ({
  useStructuredBlocks: () => ({
    accordionButton: null,
    columnsButton: null,
    taskListButton: null,
    conversationHistoryButton: null,
    pageBreakButton: null,
    tableOfContentsButton: null,
  }),
}));
vi.mock("../../admin/src/extensions/Mathematics", () => ({
  useMathematics: () => ({ mathematicsButton: null, mathematicsDialog: null }),
}));
vi.mock("../../admin/src/extensions/EmojiPicker", () => ({
  useEmojiPicker: () => ({
    emojiTrigger: "EmojiTrigger",
    emojiButton: "EmojiButton",
  }),
}));
vi.mock("../../admin/src/extensions/SlashCommand", () => ({
  useSlashCommand: () => ({
    slashCommandTrigger: "SlashCommandTrigger",
    slashCommandButton: "SlashCommandButton",
  }),
}));
vi.mock("../../admin/src/extensions/SpeechTools", () => ({
  useSpeechTools: () => ({
    speechToTextButton: null,
    textToSpeechButton: null,
    speechLiveRegion: null,
  }),
}));
vi.mock("../../admin/src/components/EditorFooterAndModes", () => ({
  useEditorModes: () => ({
    isFullscreen: false,
    fullscreenButton: null,
    previewButton: null,
    sourceButton: null,
    inspectorDrawer: null,
    characterCountFooter: null,
  }),
}));
vi.mock("../../admin/src/hooks/useKeyboardNavigation", () => ({
  useKeyboardNavigation: () => ({
    toolbarRef: { current: null },
    handleToolbarKeyDown: vi.fn(),
  }),
}));

export const mockUseContentManagerContext = vi.fn(() => ({
  contentType: undefined as any,
}));
export const mockUseField = vi.fn(() => ({
  value: undefined as any,
  onChange: vi.fn(),
}));
vi.mock("@strapi/strapi/admin", () => ({
  unstable_useContentManagerContext: () => mockUseContentManagerContext(),
  useField: () => mockUseField(),
  getFetchClient: vi.fn(() => ({
    get: vi.fn(() => Promise.resolve({ data: {} })),
  })),
}));

export const mockUseRelationalSync = vi.fn(() => ({
  syncRelationsFromDoc: vi.fn(),
  seedSignature: vi.fn(),
}));
vi.mock("../../admin/src/hooks/useRelationalSync", () => ({
  useRelationalSync: (...args: any[]) => mockUseRelationalSync(...args),
}));
vi.mock("../../admin/src/components/BaseTiptapInput", () => ({
  default: "BaseTiptapInput",
}));
vi.mock("../../admin/src/components/EditorErrorBoundary", () => ({
  EditorErrorBoundary: "EditorErrorBoundary",
}));
vi.mock("../../admin/src/components/Spacer", () => ({ Spacer: "Spacer" }));
vi.mock("../../admin/src/components/ResponsiveToolbar", () => ({
  ResponsiveToolbar: "ResponsiveToolbar",
}));
vi.mock("@strapi/design-system", () => ({ Box: "Box", Loader: "Loader" }));
vi.mock("@tiptap/starter-kit", () => ({
  default: { configure: vi.fn(() => ({})) },
}));
vi.mock("@tiptap/extension-superscript", () => ({ default: {} }));
vi.mock("@tiptap/extension-subscript", () => ({ default: {} }));
vi.mock("@tiptap/extension-table", () => ({
  TableKit: { configure: vi.fn(() => ({})) },
}));
vi.mock("@tiptap/extensions", () => ({ Gapcursor: {} }));
vi.mock("@tiptap/extension-text-align", () => ({
  default: { configure: vi.fn(() => ({})) },
}));

const { default: RichTextInput } =
  await import("../../admin/src/components/RichTextInput");
export { RichTextInput, MINIMAL_PRESET_CONFIG };

export function shallowRender(element: any): any {
  if (!element || typeof element !== "object") return element;
  if (typeof element.type === "function")
    return shallowRender(element.type(element.props, null));
  return element;
}

export function findElements(element: any, type: any): any[] {
  if (!element || typeof element !== "object") return [];
  const rendered = shallowRender(element);
  if (!rendered || typeof rendered !== "object") return [];
  const results: any[] = [];
  if (rendered.type === type) results.push(rendered);
  const children = rendered.props?.children;
  if (children) {
    for (const child of Array.isArray(children) ? children : [children]) {
      results.push(...findElements(child, type));
    }
  }
  return results;
}

export function resetRichTextInputHarness() {
  vi.clearAllMocks();
  harnessState.capturedUseMemoFactory = null;
  harnessState.capturedUseMemoDeps = null;
  harnessState.mockIsSettingsLoading = false;
  harnessState.mockSettingsLoadFailed = false;
  mockUsePresetConfig.mockReturnValue({
    config: MINIMAL_PRESET_CONFIG,
    isLoading: false,
  });
  mockUseTextColor.mockReturnValue({ textColorButton: null });
  mockUseHighlightColor.mockReturnValue({ highlightColorButton: null });
}
