import type { Editor } from "@tiptap/react";
import type React from "react";

import {
  isFeatureEnabled,
  type TableConfig,
  type TiptapPresetConfig,
} from "../../../shared/src/types";
import type { useAttachment } from "../extensions/Attachment";
import type { useAudio } from "../extensions/Audio";
import type { useRichTextComponents } from "../extensions/Components";
import type { useEmojiPicker } from "../extensions/EmojiPicker";
import type { useHeading } from "../extensions/Heading";
import type { useHighlightColor } from "../extensions/HighlightColor";
import type { useIframe } from "../extensions/Iframe";
import type { useImage } from "../extensions/Image";
import type { useInformationPane } from "../extensions/InformationPane";
import type { useLink } from "../extensions/Link";
import type { useLinker } from "../extensions/Linker";
import type { useMathematics } from "../extensions/Mathematics";
import type { useScript } from "../extensions/Script";
import type { useSemanticMarks } from "../extensions/SemanticMarks";
import type { useSlashCommand } from "../extensions/SlashCommand";
import type { useSpeechTools } from "../extensions/SpeechTools";
import type { useStarterKit } from "../extensions/StarterKit";
import type { useStructuredBlocks } from "../extensions/StructuredBlocks";
import type { useTable } from "../extensions/Table";
import type { useTableCellBackground } from "../extensions/TableCellBackground";
import type { useTextAlign } from "../extensions/TextAlign";
import type { useTextColor } from "../extensions/TextColor";
import type { useTypographyControls } from "../extensions/TypographyControls";
import type { useVideo } from "../extensions/Video";
import {
  getRegisteredTiptapExtensions,
  isCustomExtensionEnabledForPreset,
} from "../utils/customExtensionRegistry";
import type { useEditorModes } from "./EditorFooterAndModes";
import type { ToolbarItem } from "./ResponsiveToolbar";
import { Spacer } from "./Spacer";
import { ToolbarButton } from "./ToolbarButton";

export interface BuildEditorToolbarItemsParams {
  editor: Editor | null;
  config: TiptapPresetConfig;
  disabled?: boolean;
  openCustomDialogId: string | null;
  setOpenCustomDialogId: (id: string | null) => void;
  starterKit: ReturnType<typeof useStarterKit>;
  heading: ReturnType<typeof useHeading>;
  link: ReturnType<typeof useLink>;
  image: ReturnType<typeof useImage>;
  video: ReturnType<typeof useVideo>;
  audio: ReturnType<typeof useAudio>;
  attachment: ReturnType<typeof useAttachment>;
  iframe: ReturnType<typeof useIframe>;
  linker: ReturnType<typeof useLinker>;
  script: ReturnType<typeof useScript>;
  table: ReturnType<typeof useTable>;
  tableOptions: TableConfig | null | undefined;
  cellBackground: ReturnType<typeof useTableCellBackground>;
  textAlign: ReturnType<typeof useTextAlign>;
  textColor: ReturnType<typeof useTextColor>;
  highlightColor: ReturnType<typeof useHighlightColor>;
  richTextComponents: ReturnType<typeof useRichTextComponents>;
  typography: ReturnType<typeof useTypographyControls>;
  semanticMarks: ReturnType<typeof useSemanticMarks>;
  informationPane: ReturnType<typeof useInformationPane>;
  structuredBlocks: ReturnType<typeof useStructuredBlocks>;
  mathematics: ReturnType<typeof useMathematics>;
  emoji: ReturnType<typeof useEmojiPicker>;
  slashCommand: ReturnType<typeof useSlashCommand>;
  speech: ReturnType<typeof useSpeechTools>;
  editorModes: ReturnType<typeof useEditorModes>;
}

/**
 * Type guard to check if a toolbar item is valid.
 */
const isToolbarItem = (
  item: ToolbarItem | false | undefined
): item is ToolbarItem => Boolean(item);

/**
 * Builds and sanitizes the ordered array of toolbar items for ResponsiveToolbar.
 */
export function buildEditorToolbarItems({
  editor,
  config,
  disabled,
  openCustomDialogId,
  setOpenCustomDialogId,
  starterKit,
  heading,
  link,
  image,
  video,
  audio,
  attachment,
  iframe,
  linker,
  script,
  table,
  tableOptions,
  cellBackground,
  textAlign,
  textColor,
  highlightColor,
  richTextComponents,
  typography,
  semanticMarks,
  informationPane,
  structuredBlocks,
  mathematics,
  emoji,
  slashCommand,
  speech,
  editorModes,
}: BuildEditorToolbarItemsParams): ToolbarItem[] {
  const handleCloseDialog = () => setOpenCustomDialogId(null);
  const customExtensionToolbarItems: ToolbarItem[] =
    getRegisteredTiptapExtensions()
      .filter(
        (ext) =>
          isCustomExtensionEnabledForPreset(ext, config) &&
          Boolean(
            ext.ToolbarComponent || ext.toolbarButton || ext.DialogComponent
          )
      )
      .map((ext) => {
        const isDialogOpen = openCustomDialogId === ext.id;
        const handleOpenDialog = () => setOpenCustomDialogId(ext.id);

        let contentNode: React.ReactNode = null;
        if (ext.ToolbarComponent) {
          const CustomToolbarComp = ext.ToolbarComponent;
          contentNode = (
            <CustomToolbarComp
              editor={editor}
              disabled={disabled}
              config={config}
              isDialogOpen={isDialogOpen}
              onOpenDialog={handleOpenDialog}
              onCloseDialog={handleCloseDialog}
            />
          );
        } else if (ext.toolbarButton) {
          contentNode = (
            <ToolbarButton
              onClick={() => {
                if (ext.toolbarButton?.onClick) {
                  ext.toolbarButton.onClick(editor, {
                    openDialog: handleOpenDialog,
                  });
                } else {
                  handleOpenDialog();
                }
              }}
              icon={ext.toolbarButton.icon}
              ariaLabel={ext.toolbarButton.label}
              tooltip={ext.toolbarButton.tooltip || ext.toolbarButton.label}
              active={
                ext.toolbarButton.isActive
                  ? ext.toolbarButton.isActive(editor)
                  : isDialogOpen
              }
              disabled={!editor || disabled}
            />
          );
        }

        const overlayNode = ext.DialogComponent ? (
          <ext.DialogComponent
            editor={editor}
            open={isDialogOpen}
            onClose={handleCloseDialog}
            config={config}
          />
        ) : undefined;

        return {
          id: `custom-${ext.id}`,
          content: contentNode,
          measureContent: contentNode ? (
            <div style={{ width: "32px", height: "32px" }} />
          ) : undefined,
          overlay: overlayNode,
          overflowOnly: ext.overflowOnly ?? false,
        };
      });

  const hasAny = (...keys: Array<keyof TiptapPresetConfig>) =>
    keys.some((key) => isFeatureEnabled(config?.[key]));

  const overflowItem = (
    id: Extract<keyof TiptapPresetConfig, string>,
    content: React.ReactNode,
    overlay?: React.ReactNode,
    measureContent?: React.ReactNode
  ): ToolbarItem | false =>
    isFeatureEnabled(config?.[id]) && {
      id,
      content,
      ...(overlay ? { overlay } : {}),
      ...(measureContent ? { measureContent } : {}),
      overflowOnly: true,
    };

  const toolbarItemCandidates: Array<ToolbarItem | false | undefined> = [
    // ─── 1. Primary Edifice Group: Pastel Media Action Pills ────────────────
    isFeatureEnabled(config?.mediaLibrary) && {
      id: "mediaLibrary",
      content: image.imageButton,
      overlay: image.imageDialog,
    },
    isFeatureEnabled(config?.video) && {
      id: "video",
      content: video.videoButton,
      overlay: video.videoDialog,
    },
    isFeatureEnabled(config?.audio) && {
      id: "audio",
      content: audio.audioButton,
      overlay: audio.audioDialog,
    },
    isFeatureEnabled(config?.attachment) && {
      id: "attachment",
      content: attachment.attachmentButton,
      overlay: attachment.attachmentDialog,
    },
    hasAny("mediaLibrary", "video", "audio", "attachment") && {
      id: "insertSpacer",
      content: <Spacer margin={1} />,
    },

    // ─── 2. Primary Edifice Group: Typography & Colors (T ▾, TT ▾, A, Marker) ─
    isFeatureEnabled(config?.heading) && {
      id: "heading",
      content: (
        <>
          {heading.headingSelect}
          {heading.headingTagSelect}
        </>
      ),
      measureContent: heading.headingTrigger,
    },
    isFeatureEnabled(config?.fontSize) && {
      id: "fontSize",
      content: typography.fontSizeSelect,
      measureContent: typography.fontSizeTrigger,
    },
    isFeatureEnabled(config?.textColor) && {
      id: "textColor",
      content: textColor.textColorButton,
      measureContent: textColor.textColorTrigger,
    },
    isFeatureEnabled(config?.highlightColor) && {
      id: "highlightColor",
      content: highlightColor.highlightColorButton,
      measureContent: highlightColor.highlightColorTrigger,
    },
    hasAny("heading", "fontSize", "textColor", "highlightColor") && {
      id: "headingSpacer",
      content: <Spacer margin={1} />,
    },

    // ─── 3. Primary Edifice Group: Basic Formatting (B, I, U) ───────────────
    isFeatureEnabled(config?.bold) && {
      id: "bold",
      content: starterKit.boldButton,
    },
    isFeatureEnabled(config?.italic) && {
      id: "italic",
      content: starterKit.italicButton,
    },
    isFeatureEnabled(config?.underline) && {
      id: "underline",
      content: starterKit.underlineButton,
    },
    hasAny("bold", "italic", "underline") && {
      id: "basicTextSpacer",
      content: <Spacer margin={1} />,
    },

    // ─── 4. Primary Edifice Group: Emoji & Links ────────────────────────────
    isFeatureEnabled(config?.emoji) && {
      id: "emoji",
      content: emoji.emojiButton,
      measureContent: emoji.emojiTrigger,
    },
    isFeatureEnabled(config?.link) && {
      id: "link",
      content: link.linkButton,
      overlay: link.linkDialog,
    },
    isFeatureEnabled(config?.linker) && {
      id: "linker",
      content: linker.linkerButton,
      overlay: linker.linkerDialog,
    },
    hasAny("emoji", "link", "linker") && {
      id: "linksSpacer",
      content: <Spacer margin={1} />,
    },

    // ─── 5. Primary Edifice Group: Lists & Compact Alignment ────────────────
    isFeatureEnabled(config?.bulletList) && {
      id: "bullet",
      content: starterKit.bulletButton,
    },
    isFeatureEnabled(config?.orderedList) && {
      id: "ordered",
      content: starterKit.orderedButton,
    },
    isFeatureEnabled(config?.textAlign) && {
      id: "textAlign",
      content: textAlign.textAlignDropdown ?? (
        <>
          {textAlign.textAlignLeftButton}
          {textAlign.textAlignCenterButton}
          {textAlign.textAlignRightButton}
          {textAlign.textAlignJustifyButton}
        </>
      ),
      measureContent: textAlign.textAlignTrigger,
    },
    hasAny("bulletList", "orderedList", "textAlign") && {
      id: "listSpacer",
      content: <Spacer margin={1} />,
    },

    // ─── 6. "Plus ▾" Overflow Groups: Extended Marks & Typography ───────────
    overflowItem("strike", starterKit.strikeButton),
    overflowItem("superscript", script.superscriptButton),
    overflowItem("subscript", script.subscriptButton),
    overflowItem("clearFormatting", typography.clearFormattingButton),
    overflowItem("leadParagraph", semanticMarks.leadParagraphButton),
    overflowItem("fontFamily", typography.fontFamilySelect),
    overflowItem("lineHeight", typography.lineHeightSelect),
    overflowItem("abbr", semanticMarks.abbrButton, semanticMarks.abbrDialog),
    overflowItem(
      "language",
      semanticMarks.languageButton,
      semanticMarks.languageDialog
    ),
    hasAny(
      "strike",
      "superscript",
      "subscript",
      "clearFormatting",
      "leadParagraph",
      "fontFamily",
      "lineHeight",
      "abbr",
      "language"
    ) && {
      id: "textDecorationSpacer",
      content: <Spacer margin={1} />,
      overflowOnly: true,
    },

    // ─── 7. "Plus ▾" Overflow Groups: Callouts, Code & Checklists ───────────
    overflowItem("taskList", structuredBlocks.taskListButton),
    overflowItem("code", starterKit.codeButton),
    overflowItem("blockquote", starterKit.blockquoteButton),
    overflowItem("informationPane", informationPane.informationPaneButton),
    overflowItem(
      "conversationHistory",
      structuredBlocks.conversationHistoryButton
    ),
    hasAny(
      "taskList",
      "code",
      "blockquote",
      "informationPane",
      "conversationHistory"
    ) && {
      id: "calloutSpacer",
      content: <Spacer margin={1} />,
      overflowOnly: true,
    },

    // ─── 8. "Plus ▾" Overflow Groups: Structured Layout & Embeds ────────────
    overflowItem("accordion", structuredBlocks.accordionButton),
    overflowItem("columns", structuredBlocks.columnsButton),
    overflowItem(
      "mathematics",
      mathematics.mathematicsButton,
      mathematics.mathematicsDialog
    ),
    overflowItem("pageBreak", structuredBlocks.pageBreakButton),
    overflowItem("tableOfContents", structuredBlocks.tableOfContentsButton),
    overflowItem(
      "slashCommands",
      slashCommand.slashCommandButton,
      undefined,
      slashCommand.slashCommandTrigger
    ),
    overflowItem("iframe", iframe.iframeButton, iframe.iframeDialog),
    hasAny(
      "accordion",
      "columns",
      "mathematics",
      "pageBreak",
      "tableOfContents",
      "slashCommands",
      "iframe"
    ) && {
      id: "structureSpacer",
      content: <Spacer margin={1} />,
      overflowOnly: true,
    },

    // ─── 8b. Registered Custom Extensions ───────────────────────────────────
    ...customExtensionToolbarItems,
    customExtensionToolbarItems.length > 0 && {
      id: "customExtensionsSpacer",
      content: <Spacer margin={1} />,
      overflowOnly: customExtensionToolbarItems.every(
        (item) => item.overflowOnly
      ),
    },

    // ─── 9. "Plus ▾" Overflow Groups: Tables ────────────────────────────────
    isFeatureEnabled(config?.table) && {
      id: "table",
      content: (
        <>
          {table.tableButton}
          {table.addColumnButton}
          {table.removeColumnButton}
          {table.addRowButton}
          {table.removeRowButton}
          {(tableOptions?.cellBackground ||
            tableOptions?.allowCellBackgroundColor) &&
            cellBackground.cellBackgroundButton}
          {table.mergeCellsButton}
          {table.splitCellButton}
        </>
      ),
      overlay: table.tableDialog,
      overflowOnly: true,
    },
    isFeatureEnabled(config?.table) && {
      id: "tableSpacer",
      content: <Spacer margin={1} />,
      overflowOnly: true,
    },

    // ─── 10. "Plus ▾" Overflow Groups: Speech & Editor Modes ────────────────
    overflowItem("speechToText", speech.speechToTextButton),
    overflowItem("textToSpeech", speech.textToSpeechButton),
    hasAny("speechToText", "textToSpeech") && {
      id: "speechSpacer",
      content: <Spacer margin={1} />,
      overflowOnly: true,
    },
    overflowItem(
      "fullscreen",
      <>
        {editorModes.previewButton}
        {editorModes.sourceButton}
        {editorModes.fullscreenButton}
      </>
    ),
    isFeatureEnabled(config?.fullscreen) && {
      id: "fullscreenSpacer",
      content: <Spacer margin={1} />,
      overflowOnly: true,
    },
    Boolean(richTextComponents.componentsMenu) && {
      id: "components",
      content: richTextComponents.componentsMenu,
    },
  ];

  const rawToolbarItems = toolbarItemCandidates.filter(isToolbarItem);

  return rawToolbarItems.filter((item, idx, arr) => {
    if (!item.id.toLowerCase().includes("spacer")) return true;
    if (idx === 0 || idx === arr.length - 1) return false;
    return !arr[idx - 1].id.toLowerCase().includes("spacer");
  });
}
