import { Box } from "@strapi/design-system";
import {
  getFetchClient,
  unstable_useContentManagerContext,
  useField,
} from "@strapi/strapi/admin";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useIntl } from "react-intl";

import {
  MINIMAL_PRESET_CONFIG,
  DEFAULT_RUNTIME_SETTINGS,
  getFeatureOptions,
  isFeatureEnabled,
  type TableConfig,
  type TiptapPresetConfig,
  type FontFamilyConfig,
  type FontSizeConfig,
  type LineHeightConfig,
  type TiptapOutputFormat,
  type TiptapRuntimeSettings,
} from "../../../shared/src/types";
import { useAttachment } from "../extensions/Attachment";
import { useAudio } from "../extensions/Audio";
import { useRichTextComponents } from "../extensions/Components";
import { useEmojiPicker } from "../extensions/EmojiPicker";
import { useHeading } from "../extensions/Heading";
import { useHighlightColor } from "../extensions/HighlightColor";
import { useIframe } from "../extensions/Iframe";
import { useImage } from "../extensions/Image";
import { useInformationPane } from "../extensions/InformationPane";
import { useLink } from "../extensions/Link";
import { useLinker } from "../extensions/Linker";
import { useMathematics } from "../extensions/Mathematics";
import { useScript } from "../extensions/Script";
import { useSemanticMarks } from "../extensions/SemanticMarks";
import { useSlashCommand } from "../extensions/SlashCommand";
import { useSpeechTools } from "../extensions/SpeechTools";
import { useStarterKit } from "../extensions/StarterKit";
import { useStructuredBlocks } from "../extensions/StructuredBlocks";
import { useTable } from "../extensions/Table";
import { useTableCellBackground } from "../extensions/TableCellBackground";
import { useTextAlign } from "../extensions/TextAlign";
import { useTextColor } from "../extensions/TextColor";
import { useTypographyControls } from "../extensions/TypographyControls";
import { useVideo } from "../extensions/Video";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
import { usePresetConfig } from "../hooks/usePresetConfig";
import { useRelationalSync } from "../hooks/useRelationalSync";
import { buildExtensions } from "../utils/buildExtensions";
import type { TiptapInputProps } from "../utils/tiptapUtils";
import { useTiptapEditor } from "../utils/tiptapUtils";
import BaseTiptapInput from "./BaseTiptapInput";
import { EditorErrorBoundary } from "./EditorErrorBoundary";
import { useEditorModes } from "./EditorFooterAndModes";
import { ResponsiveToolbar } from "./ResponsiveToolbar";
import {
  isStoredProseMirrorJson,
  mergeSyncedLinksValue,
  parseLoadedRuntimeSettings,
  resolveLinksSchemaContext,
} from "./richTextInputHelpers";
import { buildEditorToolbarItems } from "./RichTextToolbarItems";

export { isStoredProseMirrorJson };

type InnerEditorProps = TiptapInputProps & {
  config: TiptapPresetConfig;
  presetName: string | undefined;
  outputFormat?: TiptapOutputFormat;
  relationalSyncEnabled?: boolean;
  characterLimit?: number;
  placeholder?: string;
};

/**
 * Inner TipTap editor component rendered once the preset configuration and runtime settings are loaded.
 */
const InnerEditor = forwardRef<HTMLDivElement, InnerEditorProps>(
  (
    {
      config,
      presetName,
      outputFormat,
      relationalSyncEnabled,
      characterLimit,
      placeholder,
      ...props
    },
    forwardedRef
  ) => {
    const { contentType, components } = unstable_useContentManagerContext() as {
      contentType?: { attributes?: Record<string, Record<string, unknown>> };
      components?: Record<
        string,
        { attributes?: Record<string, Record<string, unknown>> }
      >;
    };
    const schemaAttributes = contentType?.attributes;
    const linksFieldName = `${props.name}Links`;
    const linksFieldSchema = schemaAttributes?.[linksFieldName];
    const linksFieldIsRepeatable = Boolean(linksFieldSchema?.repeatable);
    const linksField = useField<
      Record<string, unknown> | Array<Record<string, unknown>> | null
    >(linksFieldName);

    const { availableFields, targetUidToAttribute, linksComponentUid } =
      useMemo(
        () =>
          resolveLinksSchemaContext(
            schemaAttributes,
            components,
            linksFieldSchema?.component
          ),
        [schemaAttributes, components, linksFieldSchema?.component]
      );

    // Memoize on [config, characterLimit, placeholder] with a fixed-length dependency array
    const extensions = useMemo(() => {
      if (characterLimit !== undefined || placeholder !== undefined) {
        return buildExtensions(config, { characterLimit, placeholder });
      }
      return buildExtensions(config);
    }, [config, characterLimit, placeholder]);

    const onFormChangeRef = useRef<
      ((fieldName: string, value: unknown) => void) | undefined
    >(undefined);

    const { syncRelationsFromDoc, seedSignature } = useRelationalSync(
      props.name,
      {
        enabled:
          relationalSyncEnabled ??
          DEFAULT_RUNTIME_SETTINGS.enableRelationalSync,
        availableFields,
        targetUidToAttribute,
        linksComponentUid,
        linksFieldIsRepeatable,
        initialDocument: (props as { value?: unknown }).value,
        onSyncField: (fieldName, value) => {
          const nextValue = mergeSyncedLinksValue(
            fieldName,
            linksFieldName,
            linksFieldIsRepeatable,
            linksField?.value,
            value
          );
          onFormChangeRef.current?.(fieldName, nextValue);
        },
      }
    );

    const charCountEnabled =
      config?.characterCount === undefined ||
      isFeatureEnabled(config?.characterCount);
    const charCountOpts = charCountEnabled
      ? getFeatureOptions(config.characterCount, {
          limit: characterLimit,
          wordsPerMinute: 200,
        })
      : null;

    const { editor, field, removedContent, contentError } = useTiptapEditor(
      props.name,
      "",
      extensions,
      {
        outputFormat:
          outputFormat ?? DEFAULT_RUNTIME_SETTINGS.defaultOutputFormat,
        wordsPerMinute: charCountOpts?.wordsPerMinute,
        onDocUpdate: syncRelationsFromDoc,
        disabled: props.disabled,
      }
    );

    onFormChangeRef.current = field?.onChange as
      | ((fieldName: string, value: unknown) => void)
      | undefined;

    useEffect(() => {
      if (
        editor &&
        typeof (editor as { getJSON?: () => unknown }).getJSON === "function"
      ) {
        seedSignature?.((editor as { getJSON: () => unknown }).getJSON());
      }
    }, [editor, seedSignature, field?.initialValue]);

    useEffect(() => {
      onFormChangeRef.current = field?.onChange as
        | ((fieldName: string, value: unknown) => void)
        | undefined;
    }, [field?.onChange]);

    const { toolbarRef, handleToolbarKeyDown } = useKeyboardNavigation(editor);

    const starterKit = useStarterKit(editor, { disabled: props.disabled });
    const headingOptions = getFeatureOptions(config.heading, {
      levels: [1, 2, 3, 4, 5, 6],
    });
    const heading = useHeading(editor, {
      disabled: props.disabled,
      levels: headingOptions?.levels,
    });
    const link = useLink(editor, { disabled: props.disabled });
    const image = useImage(editor, { disabled: props.disabled });
    const video = useVideo(editor, { disabled: props.disabled });
    const audio = useAudio(editor, { disabled: props.disabled });
    const attachment = useAttachment(editor, { disabled: props.disabled });
    const iframeOpts = getFeatureOptions(config.iframe, {
      allowedDomains: [] as string[],
    });
    const iframe = useIframe(editor, {
      disabled: props.disabled,
      allowedDomains: iframeOpts?.allowedDomains,
    });
    const linker = useLinker(editor, { disabled: props.disabled });
    const script = useScript(editor, { disabled: props.disabled });
    const table = useTable(editor, { disabled: props.disabled });
    const tableOptions = getFeatureOptions<TableConfig>(config.table, {});
    const cellBackground = useTableCellBackground(editor, {
      disabled: props.disabled,
    });
    const textAlign = useTextAlign(editor, { disabled: props.disabled });
    const textColor = useTextColor(editor, {
      disabled: props.disabled,
      config: config.textColor,
    });
    const highlightColor = useHighlightColor(editor, {
      disabled: props.disabled,
      config: config.highlightColor,
    });
    const richTextComponents = useRichTextComponents(editor, {
      config,
      disabled: props.disabled,
    });
    const typography = useTypographyControls(editor, {
      disabled: props.disabled,
      fonts: getFeatureOptions(config.fontFamily, {} as FontFamilyConfig)
        ?.fonts,
      sizes: getFeatureOptions(config.fontSize, {} as FontSizeConfig)?.sizes,
      heights: getFeatureOptions(config.lineHeight, {} as LineHeightConfig)
        ?.heights,
    });
    const semanticMarks = useSemanticMarks(editor, {
      disabled: props.disabled,
    });
    const informationPane = useInformationPane(editor, {
      disabled: props.disabled,
    });
    const [openCustomDialogId, setOpenCustomDialogId] = useState<string | null>(
      null
    );
    const structuredBlocks = useStructuredBlocks(editor, {
      disabled: props.disabled,
    });
    const mathematics = useMathematics(editor, { disabled: props.disabled });
    const emoji = useEmojiPicker(editor, { disabled: props.disabled });
    const slashCommand = useSlashCommand(editor, {
      disabled: props.disabled,
      config,
      onOpenCustomDialog: (extId: string) => setOpenCustomDialogId(extId),
    });
    const speech = useSpeechTools(editor, { disabled: props.disabled });

    const editorModes = useEditorModes(editor, {
      disabled: props.disabled,
      characterLimit:
        characterLimit && characterLimit > 0
          ? characterLimit
          : (charCountOpts?.limit ?? null),
      wordsPerMinute: charCountOpts?.wordsPerMinute,
      showCharacterCount:
        charCountEnabled || Boolean(characterLimit && characterLimit > 0),
    });

    const toolbarItems = buildEditorToolbarItems({
      editor,
      config,
      disabled: props.disabled,
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
    });

    if (!editor) return null;

    return (
      <EditorErrorBoundary>
        <BaseTiptapInput
          editor={editor}
          field={field}
          {...props}
          ref={forwardedRef}
          noPresetConfigured={!presetName}
          removedContent={removedContent}
          contentError={contentError}
          isFullscreen={editorModes.isFullscreen}
          toolbarRef={toolbarRef}
          onToolbarKeyDown={handleToolbarKeyDown}
          footer={
            <>
              {editorModes.inspectorDrawer}
              {editorModes.characterCountFooter}
              {speech.speechLiveRegion}
            </>
          }
        >
          <ResponsiveToolbar items={toolbarItems} />
          {richTextComponents.componentDialog}
        </BaseTiptapInput>
      </EditorErrorBoundary>
    );
  }
);

type RichTextInputProps = TiptapInputProps & {
  value?: unknown;
  attribute?: {
    options?: {
      preset?: string;
      outputFormat?: TiptapOutputFormat;
      characterLimit?: number;
      placeholder?: string;
    };
  };
};

/**
 * Top-level Strapi custom field wrapper that resolves the field's preset configuration
 * and runtime settings before mounting the inner TipTap editor.
 */
const RichTextInput = forwardRef<HTMLDivElement, RichTextInputProps>(
  (props, forwardedRef) => {
    const { formatMessage } = useIntl();
    const rawPresetName = props.attribute?.options?.preset;
    const normalizedPresetName = rawPresetName?.trim() || undefined;
    const outputFormat = props.attribute?.options?.outputFormat;
    const characterLimit = props.attribute?.options?.characterLimit;
    const placeholder =
      props.attribute?.options?.placeholder ??
      (typeof (props as { placeholder?: unknown }).placeholder === "string"
        ? (props as { placeholder?: string }).placeholder
        : undefined);

    const [runtimeSettings, setRuntimeSettings] =
      useState<TiptapRuntimeSettings>(DEFAULT_RUNTIME_SETTINGS);
    const [isSettingsLoading, setIsSettingsLoading] = useState<boolean>(true);
    const [settingsLoadFailed, setSettingsLoadFailed] =
      useState<boolean>(false);
    const effectivePresetName =
      normalizedPresetName ?? runtimeSettings.defaultPreset;
    const { config, isLoading } = usePresetConfig(
      isSettingsLoading && !normalizedPresetName
        ? undefined
        : effectivePresetName
    );

    useEffect(() => {
      let mounted = true;
      Promise.resolve()
        .then(() => {
          if (typeof getFetchClient !== "function") return undefined;
          return getFetchClient().get("/tiptap-editor/settings");
        })
        .then(
          (
            res:
              | {
                  data?: {
                    defaultPreset?: string;
                    enableRelationalSync?: boolean;
                    defaultOutputFormat?: TiptapOutputFormat;
                  };
                }
              | undefined
          ) => {
            if (!mounted) return;
            setRuntimeSettings(parseLoadedRuntimeSettings(res?.data));
            setSettingsLoadFailed(false);
            setIsSettingsLoading(false);
          }
        )
        .catch(() => {
          if (mounted) {
            setRuntimeSettings(DEFAULT_RUNTIME_SETTINGS);
            setSettingsLoadFailed(true);
            setIsSettingsLoading(false);
          }
        });
      return () => {
        mounted = false;
      };
    }, []);

    if (isLoading || isSettingsLoading) {
      return (
        <Box padding={4}>
          {formatMessage({
            id: "tiptap-editor.loading",
            defaultMessage: "Loading editor...",
          })}
        </Box>
      );
    }

    const storedLooksJson = isStoredProseMirrorJson(props.value);
    const storedString =
      typeof props.value === "string" ? props.value.trim() : "";
    const inferredFormat: TiptapOutputFormat | undefined =
      !settingsLoadFailed || !storedString
        ? undefined
        : storedString.startsWith("<")
          ? "html"
          : "markdown";
    const resolvedFormat =
      outputFormat ??
      (storedLooksJson
        ? "json"
        : (inferredFormat ?? runtimeSettings.defaultOutputFormat));

    return (
      <InnerEditor
        {...props}
        ref={forwardedRef}
        config={config ?? MINIMAL_PRESET_CONFIG}
        presetName={effectivePresetName}
        outputFormat={resolvedFormat}
        relationalSyncEnabled={runtimeSettings.enableRelationalSync}
        characterLimit={characterLimit}
        placeholder={placeholder}
      />
    );
  }
);

export default RichTextInput;
