import type { Editor } from "@tiptap/core";

import type { TiptapPresetConfig } from "../../../shared/src/types";

export type SlashCommandTranslator = (
  id: string,
  defaultMessage: string,
  values?: Record<string, string | number>
) => string;

export interface SlashCommandItem {
  id: string;
  featureKey: keyof TiptapPresetConfig;
  label: string;
  description: string;
  keywords: string[];
  isAvailable?: (editor: Editor) => boolean;
  action: (editor: Editor, t: SlashCommandTranslator) => void;
}

const createLayoutColumn = (t: SlashCommandTranslator, index: number) => ({
  type: "layoutColumn",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: t("tiptap-editor.structured.columnDefault", "Column {index}", {
            index,
          }),
        },
      ],
    },
  ],
});

const hasCommand = (ed: Editor, cmdName: string): boolean =>
  typeof (ed.commands as Record<string, unknown>)?.[cmdName] === "function";

export const SLASH_COMMAND_ITEMS: SlashCommandItem[] = [
  {
    id: "h1",
    featureKey: "heading",
    label: "Heading 1",
    description: "Large section heading",
    keywords: ["h1", "heading", "title"],
    isAvailable: (ed) => hasCommand(ed, "setHeading"),
    action: (ed) => ed.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    id: "h2",
    featureKey: "heading",
    label: "Heading 2",
    description: "Primary section heading",
    keywords: ["h2", "heading", "subtitle"],
    isAvailable: (ed) => hasCommand(ed, "setHeading"),
    action: (ed) => ed.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    id: "h3",
    featureKey: "heading",
    label: "Heading 3",
    description: "Medium subsection heading",
    keywords: ["h3", "heading"],
    isAvailable: (ed) => hasCommand(ed, "setHeading"),
    action: (ed) => ed.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    id: "h4",
    featureKey: "heading",
    label: "Heading 4",
    description: "Small subsection heading",
    keywords: ["h4", "heading"],
    isAvailable: (ed) => hasCommand(ed, "setHeading"),
    action: (ed) => ed.chain().focus().setHeading({ level: 4 }).run(),
  },
  {
    id: "infoPane",
    featureKey: "informationPane",
    label: "Information Pane / Callout",
    description: "Highlighted callout box (Info, Warning, Success, Danger)",
    keywords: ["info", "alert", "callout", "warning", "pane"],
    action: (ed, t) =>
      ed
        .chain()
        .focus()
        .insertContent({
          type: "informationPane",
          attrs: { variant: "info" },
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: t(
                    "tiptap-editor.infoPane.defaultContent",
                    "Enter callout details here..."
                  ),
                },
              ],
            },
          ],
        })
        .run(),
  },
  {
    id: "taskList",
    featureKey: "taskList",
    label: "Checklist / Task List",
    description: "Interactive to-do list with checkboxes",
    keywords: ["task", "todo", "checklist", "check"],
    action: (ed, t) =>
      ed
        .chain()
        .focus()
        .insertContent({
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: t(
                        "tiptap-editor.structured.taskItemDefault",
                        "To-do item"
                      ),
                    },
                  ],
                },
              ],
            },
          ],
        })
        .run(),
  },
  {
    id: "accordion",
    featureKey: "accordion",
    label: "Accordion (<details>)",
    description: "Collapsible details and summary block",
    keywords: ["accordion", "details", "collapse", "faq"],
    action: (ed, t) =>
      ed
        .chain()
        .focus()
        .insertContent({
          type: "details",
          attrs: { open: true },
          content: [
            {
              type: "detailsSummary",
              content: [
                {
                  type: "text",
                  text: t(
                    "tiptap-editor.structured.accordionSummaryDefault",
                    "Accordion Summary"
                  ),
                },
              ],
            },
            {
              type: "detailsContent",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: t(
                        "tiptap-editor.structured.accordionContentDefault",
                        "Collapsible content goes here..."
                      ),
                    },
                  ],
                },
              ],
            },
          ],
        })
        .run(),
  },
  {
    id: "columns2",
    featureKey: "columns",
    label: "2-Column Layout",
    description: "Side-by-side responsive 2-column grid",
    keywords: ["columns", "grid", "layout", "2"],
    action: (ed, t) =>
      ed
        .chain()
        .focus()
        .insertContent({
          type: "layoutContainer",
          attrs: { columns: "1:1" },
          content: [createLayoutColumn(t, 1), createLayoutColumn(t, 2)],
        })
        .run(),
  },
  {
    id: "columns3",
    featureKey: "columns",
    label: "3-Column Layout",
    description: "Equal 3-column responsive grid",
    keywords: ["columns", "grid", "layout", "3"],
    action: (ed, t) =>
      ed
        .chain()
        .focus()
        .insertContent({
          type: "layoutContainer",
          attrs: { columns: "1:1:1" },
          content: [
            createLayoutColumn(t, 1),
            createLayoutColumn(t, 2),
            createLayoutColumn(t, 3),
          ],
        })
        .run(),
  },
  {
    id: "codeBlock",
    featureKey: "codeBlock",
    label: "Code Block",
    description: "Preformatted code block",
    keywords: ["code", "snippet", "pre"],
    isAvailable: (ed) =>
      typeof (ed.commands as Record<string, unknown>)?.toggleCodeBlock ===
      "function",
    action: (ed) => ed.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "blockquote",
    featureKey: "blockquote",
    label: "Blockquote",
    description: "Quoted text passage",
    keywords: ["quote", "blockquote"],
    isAvailable: (ed) =>
      typeof (ed.commands as Record<string, unknown>)?.toggleBlockquote ===
      "function",
    action: (ed) => ed.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "table",
    featureKey: "table",
    label: "Table (3×3)",
    description: "Insert a 3×3 table with header row",
    keywords: ["table", "grid"],
    isAvailable: (ed) =>
      typeof (ed.commands as Record<string, unknown>)?.insertTable ===
      "function",
    action: (ed) =>
      ed
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    id: "toc",
    featureKey: "tableOfContents",
    label: "Table of Contents",
    description: "Auto-generated outline from document headings",
    keywords: ["toc", "outline", "contents"],
    action: (ed) =>
      ed
        .chain()
        .focus()
        .insertContent({ type: "tableOfContents" })
        .createParagraphNear()
        .run(),
  },
  {
    id: "pageBreak",
    featureKey: "pageBreak",
    label: "Page Break",
    description: "Print / pagination break marker",
    keywords: ["page", "break", "divider"],
    action: (ed) =>
      ed
        .chain()
        .focus()
        .insertContent({ type: "pageBreak" })
        .createParagraphNear()
        .run(),
  },
  {
    id: "hr",
    featureKey: "horizontalRule",
    label: "Horizontal Rule",
    description: "Visual horizontal divider line",
    keywords: ["hr", "line", "divider"],
    isAvailable: (ed) =>
      typeof (ed.commands as Record<string, unknown>)?.setHorizontalRule ===
      "function",
    action: (ed) => ed.chain().focus().setHorizontalRule().run(),
  },
];
