import type { Extensions } from "@tiptap/core";
import HighlightExt from "@tiptap/extension-highlight";
import SubscriptExt from "@tiptap/extension-subscript";
import SuperscriptExt from "@tiptap/extension-superscript";
import { TableKit } from "@tiptap/extension-table";
import TextAlignExt from "@tiptap/extension-text-align";
import {
  TextStyle,
  Color,
  FontFamily,
  FontSize,
  LineHeight,
} from "@tiptap/extension-text-style";
import UnderlineExt from "@tiptap/extension-underline";
import { CharacterCount, Gapcursor, Placeholder } from "@tiptap/extensions";
import StarterKitExt from "@tiptap/starter-kit";

import type {
  TableConfig,
  TiptapPresetConfig,
} from "../../../shared/src/types";
import { isFeatureEnabled, getFeatureOptions } from "../../../shared/src/types";
import { StrapiAttachment } from "../extensions/Attachment";
import { StrapiAudio } from "../extensions/Audio";
import { createComponentExtension } from "../extensions/Components";
import { EmojiShortcodeExtension } from "../extensions/EmojiPicker";
import { BaseHeadingWithSEOTag } from "../extensions/Heading";
import { StrapiIframe } from "../extensions/Iframe";
import { StrapiImage } from "../extensions/Image";
import { InformationPane } from "../extensions/InformationPane";
import { StrapiLinker } from "../extensions/Linker";
import { MathematicsNode } from "../extensions/Mathematics";
import { PasteStripper } from "../extensions/PasteStripper";
import {
  LeadParagraph,
  LanguageMark,
  AbbrMark,
} from "../extensions/SemanticMarks";
import {
  DetailsNode,
  DetailsSummaryNode,
  DetailsContentNode,
  ConversationHistoryNode,
  LayoutContainerNode,
  LayoutColumnNode,
  TaskListNode,
  TaskItemNode,
  PageBreakNode,
  TableOfContentsNode,
} from "../extensions/StructuredBlocks";
import {
  TableCellWithBackground,
  TableHeaderWithBackground,
} from "../extensions/TableCellBackground";
import { SmartTypographyExtension } from "../extensions/TypographyControls";
import { StrapiVideo } from "../extensions/Video";
import { resolveRichTextComponents } from "../registry/richTextComponents";
import {
  getRegisteredTiptapExtensions,
  isCustomExtensionEnabledForPreset,
} from "./customExtensionRegistry";

const UNSAFE_OBJECT_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
  "toString",
  "valueOf",
  "hasOwnProperty",
]);

function sanitizeHtmlAttributesRecord(
  htmlAttrs: unknown
): Record<string, unknown> | undefined {
  if (!htmlAttrs || typeof htmlAttrs !== "object" || Array.isArray(htmlAttrs)) {
    return undefined;
  }
  const cleaned: Record<string, unknown> = {};
  for (const [attrKey, attrVal] of Object.entries(
    htmlAttrs as Record<string, unknown>
  )) {
    const trimmedKey = attrKey.trim().toLowerCase();
    if (
      !UNSAFE_OBJECT_KEYS.has(attrKey) &&
      !/^on/i.test(trimmedKey) &&
      trimmedKey !== "srcdoc" &&
      trimmedKey !== "formaction" &&
      trimmedKey !== "xlink:href"
    ) {
      cleaned[attrKey] = attrVal;
    }
  }
  return cleaned;
}

/**
 * Converts a preset feature value to StarterKit's expected configuration format
 * (`false` to disable the sub-extension, or an options object to enable with defaults).
 */
const starterKitFeatureValue = (
  value: TiptapPresetConfig[keyof TiptapPresetConfig]
): false | Record<string, unknown> => {
  if (!isFeatureEnabled(value)) {
    return false;
  }
  const raw = getFeatureOptions(value, {}) ?? {};
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (UNSAFE_OBJECT_KEYS.has(k)) continue;
    if (k === "HTMLAttributes") {
      const cleaned = sanitizeHtmlAttributesRecord(v);
      if (cleaned) result.HTMLAttributes = cleaned;
    } else {
      result[k] = v;
    }
  }
  return result;
};

export interface BuildExtensionsOptions {
  characterLimit?: number;
  placeholder?: string;
}

/**
 * Builds the array of TipTap extensions for a given preset configuration and field options.
 * Ensures Zero-Data-Loss schema preservation for custom blocks, media nodes, and semantic marks.
 */
export function buildExtensions(
  config: TiptapPresetConfig,
  options?: BuildExtensionsOptions
): Extensions {
  const starterKitConfig: Record<string, unknown> = {
    heading: false as const, // ALWAYS false — heading handled separately via BaseHeadingWithSEOTag
    underline: false as const, // Handled separately below via Underline extension
    gapcursor: false as const, // Handled separately below via Gapcursor extension
    bold: starterKitFeatureValue(config.bold),
    italic: starterKitFeatureValue(config.italic),
    strike: starterKitFeatureValue(config.strike),
    code: starterKitFeatureValue(config.code),
    codeBlock: starterKitFeatureValue(config.codeBlock),
    blockquote: starterKitFeatureValue(config.blockquote),
    bulletList: starterKitFeatureValue(config.bulletList),
    orderedList: starterKitFeatureValue(config.orderedList),
    hardBreak: starterKitFeatureValue(config.hardBreak),
    horizontalRule: starterKitFeatureValue(config.horizontalRule),
    history: starterKitFeatureValue(config.history),
    undoRedo: starterKitFeatureValue(config.history),
    link: !isFeatureEnabled(config.link)
      ? false
      : (() => {
          const linkOpts =
            (getFeatureOptions(config.link, {
              allowInternalLinks: true,
            }) as Record<string, unknown>) ?? {};
          const {
            allowInternalLinks,
            protocols: _protocols,
            isAllowedUri: _isAllowedUri,
            validate: _validate,
            HTMLAttributes,
            ...rest
          } = linkOpts;

          const safeRest: Record<string, unknown> = {};
          for (const [key, val] of Object.entries(rest)) {
            if (!UNSAFE_OBJECT_KEYS.has(key)) {
              safeRest[key] = val;
            }
          }

          const sanitizedHtmlAttrs =
            sanitizeHtmlAttributesRecord(HTMLAttributes);

          return {
            openOnClick: false,
            ...safeRest,
            ...(sanitizedHtmlAttrs !== undefined
              ? { HTMLAttributes: sanitizedHtmlAttrs }
              : {}),
            ...(allowInternalLinks
              ? { protocols: [{ scheme: "strapi", optionalSlashes: false }] }
              : {}),
          };
        })(),
  };

  const extensions: Extensions = [StarterKitExt.configure(starterKitConfig)];

  if (isFeatureEnabled(config.heading)) {
    const headingConfig = getFeatureOptions(config.heading, {
      levels: [1, 2, 3, 4, 5, 6] as const,
      autoSlugId: true,
    });
    const levels = headingConfig?.levels || [1, 2, 3, 4, 5, 6];
    const configureOpts: Record<string, unknown> = {
      levels,
      autoSlugId:
        (headingConfig as { autoSlugId?: boolean })?.autoSlugId ?? true,
    };
    extensions.push(
      BaseHeadingWithSEOTag.configure(
        configureOpts as Parameters<typeof BaseHeadingWithSEOTag.configure>[0]
      )
    );
  }

  if (isFeatureEnabled(config.underline)) {
    extensions.push(UnderlineExt);
  }

  if (isFeatureEnabled(config.superscript)) {
    extensions.push(SuperscriptExt);
  }

  if (isFeatureEnabled(config.subscript)) {
    extensions.push(SubscriptExt);
  }

  // Zero-Data-Loss Table schema (always registered so existing tables and cell colors are preserved).
  // cellBackground/allowCellBackgroundColor only gate the toolbar picker.
  const rawTableOptions = isFeatureEnabled(config.table)
    ? (getFeatureOptions<TableConfig>(config.table, {}) ?? {})
    : {};
  const {
    cellBackground: _cellBackground,
    allowCellBackgroundColor: _allowCellBackgroundColor,
    allowCaption: _allowCaption,
    ...tableOptions
  } = rawTableOptions;
  extensions.push(
    TableKit.configure({
      table: {
        resizable: isFeatureEnabled(config.table),
        ...tableOptions,
      },
      tableCell: false,
      tableHeader: false,
    }),
    TableCellWithBackground,
    TableHeaderWithBackground
  );

  if (isFeatureEnabled(config.textAlign)) {
    const textAlignConfig = getFeatureOptions(config.textAlign, {
      types: ["heading", "paragraph"],
      alignments: ["left", "center", "right", "justify"],
    });
    extensions.push(
      TextAlignExt.configure({
        types: textAlignConfig?.types || ["heading", "paragraph"],
        alignments: textAlignConfig?.alignments || [
          "left",
          "center",
          "right",
          "justify",
        ],
      })
    );
  }

  const needsTextStyle =
    isFeatureEnabled(config.textColor) ||
    isFeatureEnabled(config.highlightColor) ||
    isFeatureEnabled(config.fontFamily) ||
    isFeatureEnabled(config.fontSize) ||
    isFeatureEnabled(config.lineHeight);

  if (needsTextStyle) {
    extensions.push(PasteStripper);
  }
  // Schema-only: always registered so stored textStyle/highlight marks round-trip without data loss
  extensions.push(
    TextStyle,
    Color,
    HighlightExt.configure({ multicolor: true }),
    FontFamily,
    FontSize,
    LineHeight
  );

  // Zero-Data-Loss Media Library Image extension
  if (isFeatureEnabled(config.mediaLibrary)) {
    const mediaOpts = getFeatureOptions(config.mediaLibrary, {});
    extensions.push(StrapiImage.configure(mediaOpts ?? {}));
  } else {
    extensions.push(StrapiImage.configure({ enableContentCheck: true }));
  }

  // Every registered component joins the schema regardless of the preset: a document written under a
  // richer preset must still round-trip here, read-only, instead of losing its nodes on save.
  for (const resolved of resolveRichTextComponents(config)) {
    extensions.push(
      createComponentExtension(resolved.definition, {
        enabled: resolved.enabled,
        options: resolved.options,
      })
    );
  }

  // Zero-Data-Loss Edifice IO Multimedia & Rich Nodes
  if (isFeatureEnabled(config.video)) {
    extensions.push(StrapiVideo.configure({ enableContentCheck: false }));
  } else {
    extensions.push(StrapiVideo.configure({ enableContentCheck: true }));
  }

  if (isFeatureEnabled(config.audio)) {
    extensions.push(StrapiAudio.configure({ enableContentCheck: false }));
  } else {
    extensions.push(StrapiAudio.configure({ enableContentCheck: true }));
  }

  if (isFeatureEnabled(config.attachment)) {
    extensions.push(StrapiAttachment.configure({ enableContentCheck: false }));
  } else {
    extensions.push(StrapiAttachment.configure({ enableContentCheck: true }));
  }

  if (isFeatureEnabled(config.iframe)) {
    const iframeOpts = getFeatureOptions(config.iframe, { allowedDomains: [] });
    extensions.push(
      StrapiIframe.configure({
        enableContentCheck: false,
        allowedDomains: iframeOpts?.allowedDomains,
      })
    );
  } else {
    extensions.push(StrapiIframe.configure({ enableContentCheck: true }));
  }

  if (isFeatureEnabled(config.linker)) {
    extensions.push(StrapiLinker.configure({ enableContentCheck: false }));
  } else {
    extensions.push(StrapiLinker.configure({ enableContentCheck: true }));
  }

  if (isFeatureEnabled(config.informationPane)) {
    extensions.push(InformationPane.configure({ enableContentCheck: false }));
  } else {
    extensions.push(InformationPane.configure({ enableContentCheck: true }));
  }

  if (isFeatureEnabled(config.mathematics)) {
    extensions.push(MathematicsNode.configure({ enableContentCheck: false }));
  } else {
    extensions.push(MathematicsNode.configure({ enableContentCheck: true }));
  }

  // Schema-only: always registered so stored content round-trips without data loss
  extensions.push(
    LeadParagraph,
    LanguageMark,
    AbbrMark,
    DetailsNode,
    DetailsSummaryNode,
    DetailsContentNode,
    ConversationHistoryNode,
    LayoutContainerNode,
    LayoutColumnNode,
    TaskListNode,
    TaskItemNode,
    PageBreakNode,
    TableOfContentsNode
  );

  // Input-rule extensions: gated by preset config
  if (isFeatureEnabled(config.typography)) {
    extensions.push(SmartTypographyExtension);
  }
  if (isFeatureEnabled(config.emoji)) {
    extensions.push(EmojiShortcodeExtension);
  }

  const ccEnabled =
    config.characterCount === undefined ||
    isFeatureEnabled(config.characterCount);
  const ccOpts = ccEnabled
    ? getFeatureOptions(config.characterCount, { limit: null })
    : null;
  const effectiveCharLimit =
    options?.characterLimit && options.characterLimit > 0
      ? options.characterLimit
      : (ccOpts?.limit ?? null);

  if (ccEnabled || (effectiveCharLimit && effectiveCharLimit > 0)) {
    extensions.push(CharacterCount.configure({ limit: effectiveCharLimit }));
  }

  if (options?.placeholder && options.placeholder.trim()) {
    extensions.push(
      Placeholder.configure({ placeholder: options.placeholder.trim() })
    );
  }

  extensions.push(Gapcursor);

  // Registered custom extensions (e.g. scriptureEmbed, beforeAfterImage)
  for (const registration of getRegisteredTiptapExtensions()) {
    if (!isCustomExtensionEnabledForPreset(registration, config)) continue;
    const resolved =
      typeof registration.extensions === "function"
        ? registration.extensions({ config, enableContentCheck: true })
        : registration.extensions;
    if (Array.isArray(resolved)) {
      extensions.push(...resolved);
    } else if (resolved) {
      extensions.push(resolved);
    }
  }

  return extensions;
}
