import {
  isFeatureEnabled,
  type PresetFeatureKey,
  type TiptapPresetConfig,
} from "../../../shared/src/types";

export interface FeatureCategoryDefinition {
  id: string;
  defaultTitle: string;
  features: PresetFeatureKey[];
}

export const FEATURE_DEFAULT_LABELS: Record<PresetFeatureKey, string> = {
  bold: "Bold",
  italic: "Italic",
  strike: "Strikethrough",
  underline: "Underline",
  code: "Inline Code",
  codeBlock: "Code Block",
  blockquote: "Blockquote",
  bulletList: "Bullet List",
  orderedList: "Numbered List",
  hardBreak: "Line Break (Hard Break)",
  horizontalRule: "Horizontal Rule",
  history: "Undo / Redo History",
  heading: "Headings (H1–H6)",
  link: "External / URL Link",
  table: "Tables",
  textAlign: "Text Alignment",
  superscript: "Superscript",
  subscript: "Subscript",
  textColor: "Text Color",
  highlightColor: "Highlight Color",
  mediaLibrary: "Strapi Media Library (Images)",
  fontFamily: "Font Family",
  fontSize: "Font Size",
  lineHeight: "Line Height",
  clearFormatting: "Clear Formatting",
  typography: "Smart Typography",
  leadParagraph: "Lead Paragraph",
  language: "Language & Text Direction (WCAG)",
  abbr: "Abbreviation (<abbr>)",
  video: "Video Embed",
  audio: "Audio & Voice Recorder",
  attachment: "File Attachment",
  iframe: "Sandboxed Iframe Embed",
  linker: "Strapi Internal Entry Linker",
  informationPane: "Information / Callout Pane",
  accordion: "Collapsible Accordion (<details>)",
  conversationHistory: "Conversation Thread Block",
  columns: "Multi-Column Layout",
  taskList: "Interactive Task Checklist",
  mathematics: "Mathematical Formulas (LaTeX)",
  emoji: "Emoji Picker",
  slashCommands: "Slash Commands (/ Menu)",
  pageBreak: "Page Break",
  tableOfContents: "Table of Contents",
  speechToText: "Voice Dictation (Speech-to-Text)",
  textToSpeech: "Read Aloud (Text-to-Speech)",
  characterCount: "Word & Character Counter",
  fullscreen: "Fullscreen Mode",
  components: "Custom Components (Button & Registered)",
};

export const PRESET_DEFAULT_LABELS: Record<string, string> = {
  default: "Default",
  minimal: "Minimal",
  standard: "Standard",
  editorial: "Editorial",
  full: "Full",
  edifice: "Edifice",
};

export const FEATURE_CATEGORIES: FeatureCategoryDefinition[] = [
  {
    id: "formatting",
    defaultTitle: "Text Formatting & Script",
    features: [
      "bold",
      "italic",
      "underline",
      "strike",
      "code",
      "superscript",
      "subscript",
      "clearFormatting",
    ],
  },
  {
    id: "structure",
    defaultTitle: "Headings, Paragraphs & Lists",
    features: [
      "heading",
      "leadParagraph",
      "blockquote",
      "codeBlock",
      "bulletList",
      "orderedList",
      "taskList",
      "horizontalRule",
      "hardBreak",
      "pageBreak",
    ],
  },
  {
    id: "typography",
    defaultTitle: "Typography, Colors & Accessibility",
    features: [
      "textAlign",
      "textColor",
      "highlightColor",
      "fontFamily",
      "fontSize",
      "lineHeight",
      "typography",
      "language",
      "abbr",
    ],
  },
  {
    id: "media",
    defaultTitle: "Links & Rich Media",
    features: [
      "link",
      "linker",
      "mediaLibrary",
      "video",
      "audio",
      "attachment",
      "iframe",
    ],
  },
  {
    id: "blocks",
    defaultTitle: "Structured & Interactive Blocks",
    features: [
      "table",
      "columns",
      "accordion",
      "informationPane",
      "tableOfContents",
      "mathematics",
      "conversationHistory",
      "components",
    ],
  },
  {
    id: "productivity",
    defaultTitle: "Editor Tools, Voice & Productivity",
    features: [
      "history",
      "slashCommands",
      "emoji",
      "characterCount",
      "speechToText",
      "textToSpeech",
      "fullscreen",
    ],
  },
];

export function isPresetFeatureKeyEnabled(
  presetConfig: Record<string, unknown>,
  key: PresetFeatureKey
): boolean {
  if (key === "components") {
    const compMap = presetConfig.components;
    if (!compMap || typeof compMap !== "object" || Array.isArray(compMap)) {
      return false;
    }
    return Object.values(compMap as Record<string, unknown>).some((val) =>
      isFeatureEnabled(val)
    );
  }
  return isFeatureEnabled(presetConfig[key]);
}

export const UNSAFE_CONFIG_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
  "toString",
  "valueOf",
  "hasOwnProperty",
]);

export const isPlainRecord = (val: unknown): val is Record<string, unknown> =>
  Boolean(val) && typeof val === "object" && !Array.isArray(val);

export function buildNextFeatureOverrideValue<K extends PresetFeatureKey>(
  featureKey: K,
  enabled: boolean,
  baseValue: unknown,
  currentOverrideValue?: unknown,
  builtInValue?: unknown
): TiptapPresetConfig[K] {
  if (featureKey === "components") {
    const mergedComponents: Record<string, unknown> = {};
    for (const source of [builtInValue, baseValue, currentOverrideValue]) {
      if (!isPlainRecord(source)) continue;
      for (const [compName, compVal] of Object.entries(source)) {
        if (UNSAFE_CONFIG_KEYS.has(compName)) continue;
        if (
          isPlainRecord(compVal) &&
          isPlainRecord(mergedComponents[compName])
        ) {
          mergedComponents[compName] = {
            ...(mergedComponents[compName] as Record<string, unknown>),
            ...compVal,
          };
        } else {
          mergedComponents[compName] = compVal;
        }
      }
    }

    const compEntries = Object.entries(mergedComponents);
    if (!enabled) {
      if (compEntries.length === 0) {
        return {} as TiptapPresetConfig[K];
      }
      const disabledMap: Record<string, boolean | Record<string, unknown>> = {};
      for (const [compName, compVal] of compEntries) {
        if (isPlainRecord(compVal)) {
          const { disabled: _d, ...restComp } = compVal;
          disabledMap[compName] = { ...restComp, enabled: false };
        } else {
          disabledMap[compName] = false;
        }
      }
      return disabledMap as TiptapPresetConfig[K];
    }

    if (compEntries.length > 0) {
      const nextMap: Record<string, boolean | Record<string, unknown>> = {};
      for (const [compName, compVal] of compEntries) {
        if (isPlainRecord(compVal)) {
          const { disabled: _d, ...restComp } = compVal;
          nextMap[compName] = { ...restComp, enabled: true };
        } else {
          nextMap[compName] = true;
        }
      }
      return nextMap as TiptapPresetConfig[K];
    }
    return { button: true } as TiptapPresetConfig[K];
  }

  const hasObjectConfig =
    isPlainRecord(builtInValue) ||
    isPlainRecord(baseValue) ||
    isPlainRecord(currentOverrideValue);
  if (hasObjectConfig) {
    const mergedObj: Record<string, unknown> = {};
    for (const source of [builtInValue, baseValue, currentOverrideValue]) {
      if (!isPlainRecord(source)) continue;
      for (const [optKey, optVal] of Object.entries(source)) {
        if (UNSAFE_CONFIG_KEYS.has(optKey) || optKey === "disabled") continue;
        mergedObj[optKey] = optVal;
      }
    }
    return { ...mergedObj, enabled } as TiptapPresetConfig[K];
  }

  return enabled as TiptapPresetConfig[K];
}

export function formatFallbackPresetName(name: string): string {
  if (Object.prototype.hasOwnProperty.call(PRESET_DEFAULT_LABELS, name)) {
    return PRESET_DEFAULT_LABELS[name];
  }
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
