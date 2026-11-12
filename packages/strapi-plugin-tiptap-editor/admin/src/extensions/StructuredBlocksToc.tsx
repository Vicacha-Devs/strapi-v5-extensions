import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditorState,
  type NodeViewProps,
} from "@tiptap/react";
import React from "react";
import { useIntl } from "react-intl";

import { slugifyHeadingText } from "./Heading";

// ─── Interactive Task List / Checklist ──────────────────────────────────────

/**
 * Interactive checklist item node view with accessible checkbox control.
 */
export function TaskItemNodeView({
  node,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const { formatMessage } = useIntl();
  const checked = Boolean(node.attrs.checked);
  const isEditable = editor?.isEditable !== false;
  return (
    <NodeViewWrapper
      as="li"
      data-type="taskItem"
      data-checked={checked ? "true" : "false"}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        listStyle: "none",
        margin: "4px 0",
      }}
    >
      <label
        contentEditable={false}
        style={{ display: "flex", alignItems: "center", marginTop: "3px" }}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={!isEditable}
          onChange={(e) => updateAttributes({ checked: e.target.checked })}
          aria-label={formatMessage({
            id: "tiptap-editor.taskList.checkboxAria",
            defaultMessage: "Task item checkbox",
          })}
        />
      </label>
      <NodeViewContent style={{ flexGrow: 1 }} />
    </NodeViewWrapper>
  );
}

export const TaskItemNode = Node.create({
  name: "taskItem",
  content: "paragraph block*",
  defining: true,

  addAttributes() {
    return {
      checked: {
        default: false,
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-checked") === "true",
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-checked": attrs.checked ? "true" : "false",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'li[data-type="taskItem"]', priority: 51 }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "li",
      mergeAttributes(HTMLAttributes, { "data-type": "taskItem" }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      "Enter": () =>
        this.editor.commands.splitListItem(this.name, { checked: false }),
      "Tab": () => this.editor.commands.sinkListItem(this.name),
      "Shift-Tab": () => this.editor.commands.liftListItem(this.name),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(TaskItemNodeView);
  },
});

export const TaskListNode = Node.create({
  name: "taskList",
  group: "block list",
  content: "taskItem+",

  parseHTML() {
    return [{ tag: 'ul[data-type="taskList"]', priority: 51 }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "ul",
      mergeAttributes(HTMLAttributes, {
        "data-type": "taskList",
        "class": "tiptap-task-list",
      }),
      0,
    ];
  },
});

// ─── Page Break & Live Table of Contents ────────────────────────────────────

export const PageBreakNode = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,

  parseHTML() {
    return [{ tag: 'div[data-type="page-break"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "page-break",
        "class": "tiptap-page-break",
        "role": "separator",
        "aria-label": "Page break",
      }),
      "--- Page Break ---",
    ];
  },
});

export interface TocHeadingEntry {
  level: number;
  text: string;
  id: string;
}

/**
 * Live Table of Contents node view that subscribes to editor document updates via `useEditorState`.
 */
export function TableOfContentsNodeView({ editor }: NodeViewProps) {
  const { formatMessage } = useIntl();
  const untitledLabel = formatMessage({
    id: "tiptap-editor.toc.untitled",
    defaultMessage: "Untitled heading",
  });

  const headings =
    useEditorState({
      editor,
      selector: ({ editor: ed }) => {
        const out: TocHeadingEntry[] = [];
        ed?.state?.doc?.descendants((n) => {
          if (n.type.name === "heading") {
            const text = n.textContent || untitledLabel;
            out.push({
              level: Number(n.attrs.level) || 1,
              text,
              id: (n.attrs.id as string) || slugifyHeadingText(text),
            });
          }
        });
        return out;
      },
    }) ?? [];

  return (
    <NodeViewWrapper data-type="table-of-contents">
      <nav
        aria-label={formatMessage({
          id: "tiptap-editor.toc.ariaLabel",
          defaultMessage: "Table of Contents",
        })}
        contentEditable={false}
        style={{
          padding: "12px 16px",
          margin: "0.75em 0",
          backgroundColor: "#f6f6f9",
          border: "1px solid #dcdce4",
          borderRadius: "6px",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: "1.3rem",
            marginBottom: "6px",
            color: "#32324d",
          }}
        >
          📑{" "}
          {formatMessage({
            id: "tiptap-editor.toc.title",
            defaultMessage: "Table of Contents",
          })}
        </div>
        {headings.length === 0 ? (
          <div
            style={{
              fontSize: "1.2rem",
              color: "#666687",
              fontStyle: "italic",
            }}
          >
            {formatMessage({
              id: "tiptap-editor.toc.emptyHint",
              defaultMessage:
                "Add headings (H1–H6) to populate the Table of Contents automatically.",
            })}
          </div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "16px", listStyle: "none" }}>
            {headings.map((h, i) => (
              <li
                key={`${h.id}-${i}`}
                style={{
                  marginLeft: `${(h.level - 1) * 14}px`,
                  fontSize: "1.25rem",
                  padding: "2px 0",
                }}
              >
                <a
                  href={`#${h.id}`}
                  style={{ color: "#4945ff", textDecoration: "none" }}
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </NodeViewWrapper>
  );
}

const tocSyncPluginKey = new PluginKey("tableOfContentsSync");

export const TableOfContentsNode = Node.create({
  name: "tableOfContents",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      headings: {
        default: [],
        parseHTML: (el: HTMLElement) => {
          const items: TocHeadingEntry[] = [];
          el.querySelectorAll("li").forEach((li) => {
            const link = li.querySelector("a");
            const text = (link?.textContent || li.textContent || "").trim();
            const href = link?.getAttribute("href") || "";
            const id = href.startsWith("#")
              ? href.slice(1)
              : slugifyHeadingText(text);
            const level = Number(li.getAttribute("data-level")) || 1;
            if (text) {
              items.push({ level, text, id });
            }
          });
          return items;
        },
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'nav[data-type="table-of-contents"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const rawHeadings = Array.isArray(node?.attrs?.headings)
      ? (node.attrs.headings as TocHeadingEntry[])
      : [];
    const listChildren = rawHeadings
      .filter(
        (h) => h && typeof h.text === "string" && h.text.trim().length > 0
      )
      .map((h) => {
        const id = h.id || slugifyHeadingText(h.text);
        return [
          "li",
          { "data-level": String(Number(h.level) || 1) },
          ["a", { href: `#${id}` }, h.text],
        ];
      });

    return [
      "nav",
      mergeAttributes(HTMLAttributes, {
        "data-type": "table-of-contents",
        "aria-label": "Table of Contents",
      }),
      listChildren.length > 0
        ? ["ul", { class: "tiptap-toc-list" }, ...listChildren]
        : "Table of Contents",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableOfContentsNodeView);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: tocSyncPluginKey,
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) return null;

          const currentHeadings: TocHeadingEntry[] = [];
          const tocPositions: Array<{
            pos: number;
            attrs: Record<string, unknown>;
          }> = [];

          newState.doc.descendants((node, pos) => {
            if (node.type.name === "heading") {
              const text = node.textContent;
              if (!text.trim()) return;
              const id = (node.attrs.id as string) || slugifyHeadingText(text);
              currentHeadings.push({
                level: Number(node.attrs.level) || 1,
                text,
                id,
              });
            } else if (node.type.name === "tableOfContents") {
              tocPositions.push({ pos, attrs: node.attrs });
            }
          });

          if (tocPositions.length === 0) return null;

          const nextSignature = JSON.stringify(currentHeadings);
          const tr = newState.tr;
          let modified = false;

          for (const toc of tocPositions) {
            const prevSignature = JSON.stringify(toc.attrs.headings ?? []);
            if (prevSignature !== nextSignature) {
              tr.setNodeMarkup(toc.pos, undefined, {
                ...toc.attrs,
                headings: currentHeadings,
              });
              modified = true;
            }
          }

          return modified ? tr : null;
        },
      }),
    ];
  },
});
