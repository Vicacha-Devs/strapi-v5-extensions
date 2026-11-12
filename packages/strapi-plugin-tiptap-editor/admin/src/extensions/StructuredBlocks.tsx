import { Check } from "@strapi/icons";
import { Node, mergeAttributes, type Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import React from "react";
import { useIntl } from "react-intl";

import { ToolbarButton } from "../components/ToolbarButton";

export {
  TaskItemNodeView,
  TaskItemNode,
  TaskListNode,
  PageBreakNode,
  type TocHeadingEntry,
  TableOfContentsNodeView,
  TableOfContentsNode,
} from "./StructuredBlocksToc";

// ─── 1. Accordion / Collapsible (<details> + <summary>) ─────────────────────

export const DetailsSummaryNode = Node.create({
  name: "detailsSummary",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [{ tag: "summary" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "summary",
      mergeAttributes(HTMLAttributes, { class: "tiptap-details-summary" }),
      0,
    ];
  },
});

export const DetailsContentNode = Node.create({
  name: "detailsContent",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="details-content"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "details-content",
        "class": "tiptap-details-content",
      }),
      0,
    ];
  },
});

export const DetailsNode = Node.create({
  name: "details",
  group: "block",
  content: "detailsSummary detailsContent",
  defining: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (el: HTMLElement) => el.hasAttribute("open"),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.open ? { open: "open" } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "details" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(HTMLAttributes, { class: "tiptap-details" }),
      0,
    ];
  },
});

// ─── 2. Edifice IO Conversation History Block ────────────────────────────────

export const ConversationHistoryNode = Node.create({
  name: "conversationHistory",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      author: {
        default: null,
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-author") ?? el.getAttribute("author") ?? null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.author ? { "data-author": String(attrs.author) } : {},
      },
      timestamp: {
        default: null,
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-timestamp") ??
          el.getAttribute("timestamp") ??
          null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.timestamp ? { "data-timestamp": String(attrs.timestamp) } : {},
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="conversation-history"]' },
      { tag: 'blockquote[data-type="conversation-history"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "conversation-history",
        "class": "tiptap-conversation-history",
      }),
      0,
    ];
  },
});

// ─── 3. Hashbite Multi-Column Grid Layout (2-Col / 3-Col) ───────────────────

export const LayoutColumnNode = Node.create({
  name: "layoutColumn",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="layout-column"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "layout-column",
        "class": "tiptap-layout-column",
      }),
      0,
    ];
  },
});

export const LayoutContainerNode = Node.create({
  name: "layoutContainer",
  group: "block",
  content: "layoutColumn+",
  defining: true,

  addAttributes() {
    return {
      columns: {
        default: "1:1",
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-columns") ?? "1:1",
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-columns": String(attrs.columns || "1:1"),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="layout-container"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "layout-container",
        "class": "tiptap-layout-container",
      }),
      0,
    ];
  },
});

/**
 * React hook providing toolbar buttons for inserting structured content blocks
 * (accordion, multi-column grid, checklist, conversation history, page break, and TOC).
 */
export function useStructuredBlocks(
  editor: Editor | null,
  props: { disabled?: boolean } = { disabled: false }
) {
  const { formatMessage } = useIntl();
  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      isTaskList: ctx.editor?.isActive("taskList") ?? false,
      isAccordion: ctx.editor?.isActive("details") ?? false,
      isColumns: ctx.editor?.isActive("layoutContainer") ?? false,
      isConversation: ctx.editor?.isActive("conversationHistory") ?? false,
      isInCodeBlock: ctx.editor?.isActive("codeBlock") ?? false,
    }),
  });

  const isDisabled =
    props.disabled || !editor || (editorState?.isInCodeBlock ?? false);

  const insertAccordion = () => {
    editor
      ?.chain()
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
                text: formatMessage({
                  id: "tiptap-editor.structured.accordionSummaryDefault",
                  defaultMessage: "Accordion Summary",
                }),
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
                    text: formatMessage({
                      id: "tiptap-editor.structured.accordionContentDefault",
                      defaultMessage: "Collapsible content goes here...",
                    }),
                  },
                ],
              },
            ],
          },
        ],
      })
      .run();
  };

  const insertColumns = (cols: "1:1" | "1:1:1" = "1:1") => {
    const count = cols === "1:1:1" ? 3 : 2;
    editor
      ?.chain()
      .focus()
      .insertContent({
        type: "layoutContainer",
        attrs: { columns: cols },
        content: Array.from({ length: count }, (_, idx) => ({
          type: "layoutColumn",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: formatMessage(
                    {
                      id: "tiptap-editor.structured.columnDefault",
                      defaultMessage: "Column {index}",
                    },
                    { index: idx + 1 }
                  ),
                },
              ],
            },
          ],
        })),
      })
      .run();
  };

  const insertTaskList = () => {
    editor
      ?.chain()
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
                    text: formatMessage({
                      id: "tiptap-editor.structured.taskItemDefault",
                      defaultMessage: "To-do item",
                    }),
                  },
                ],
              },
            ],
          },
        ],
      })
      .run();
  };

  const insertConversationHistory = () => {
    editor
      ?.chain()
      .focus()
      .insertContent({
        type: "conversationHistory",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: formatMessage({
                  id: "tiptap-editor.structured.conversationDefault",
                  defaultMessage: "Previous message in thread...",
                }),
              },
            ],
          },
        ],
      })
      .run();
  };

  const insertPageBreak = () => {
    editor
      ?.chain()
      .focus()
      .insertContent({ type: "pageBreak" })
      .createParagraphNear()
      .run();
  };

  const insertTableOfContents = () => {
    editor
      ?.chain()
      .focus()
      .insertContent({ type: "tableOfContents" })
      .createParagraphNear()
      .run();
  };

  return {
    accordionButton: (
      <ToolbarButton
        onClick={insertAccordion}
        icon={
          <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>▸ Details</span>
        }
        active={editorState?.isAccordion ?? false}
        toggle
        disabled={isDisabled}
        tooltip={formatMessage({
          id: "tiptap-editor.toolbar.accordion",
          defaultMessage: "Insert collapsible accordion ('<details>')",
        })}
      />
    ),
    columnsButton: (
      <ToolbarButton
        onClick={() => insertColumns("1:1")}
        icon={
          <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>▥ 2-Col</span>
        }
        active={editorState?.isColumns ?? false}
        toggle
        disabled={isDisabled}
        tooltip={formatMessage({
          id: "tiptap-editor.toolbar.columns",
          defaultMessage: "Insert multi-column layout",
        })}
      />
    ),
    taskListButton: (
      <ToolbarButton
        onClick={insertTaskList}
        icon={<Check />}
        active={editorState?.isTaskList ?? false}
        toggle
        disabled={isDisabled}
        tooltip={formatMessage({
          id: "tiptap-editor.toolbar.taskList",
          defaultMessage: "Insert interactive checklist",
        })}
      />
    ),
    conversationHistoryButton: (
      <ToolbarButton
        onClick={insertConversationHistory}
        icon={
          <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>💬 Thread</span>
        }
        active={editorState?.isConversation ?? false}
        toggle
        disabled={isDisabled}
        tooltip={formatMessage({
          id: "tiptap-editor.toolbar.conversationHistory",
          defaultMessage: "Insert conversation history block",
        })}
      />
    ),
    pageBreakButton: (
      <ToolbarButton
        onClick={insertPageBreak}
        icon={
          <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>⎯ Page</span>
        }
        active={false}
        disabled={isDisabled}
        tooltip={formatMessage({
          id: "tiptap-editor.toolbar.pageBreak",
          defaultMessage: "Insert page break",
        })}
      />
    ),
    tableOfContentsButton: (
      <ToolbarButton
        onClick={insertTableOfContents}
        icon={
          <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>📑 TOC</span>
        }
        active={false}
        disabled={isDisabled}
        tooltip={formatMessage({
          id: "tiptap-editor.toolbar.tableOfContents",
          defaultMessage: "Insert Table of Contents",
        })}
      />
    ),
  };
}
