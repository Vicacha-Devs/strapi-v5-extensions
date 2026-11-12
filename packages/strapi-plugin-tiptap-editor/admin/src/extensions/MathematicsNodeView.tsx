import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import React, { useState } from "react";
import { useIntl } from "react-intl";

/**
 * Formats a LaTeX expression string into readable mathematical Unicode symbols for preview.
 */
export function formatLatexPreview(latex: string): string {
  if (!latex) return "";
  return latex
    .replace(/\\sum/g, "∑")
    .replace(/\\int/g, "∫")
    .replace(/\\sqrt\{([^}]*)\}/g, "√($1)")
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\gamma/g, "γ")
    .replace(/\\delta/g, "δ")
    .replace(/\\pi/g, "π")
    .replace(/\\infty/g, "∞")
    .replace(/\\pm/g, "±")
    .replace(/\\neq/g, "≠")
    .replace(/\\leq/g, "≤")
    .replace(/\\geq/g, "≥")
    .replace(/\\rightarrow/g, "→")
    .replace(/\\times/g, "×");
}

/**
 * Read-only node view component rendering a mathematical formula inline or as a block equation.
 */
export function MathematicsNodeViewReadOnly({ node }: NodeViewProps) {
  const { formatMessage } = useIntl();
  const latex = String(node.attrs.latex ?? "");
  const displayMode = node.attrs.displayMode === "block" ? "block" : "inline";
  const rendered = formatLatexPreview(latex);

  return (
    <NodeViewWrapper
      as="span"
      data-type="mathematics"
      style={{
        display: displayMode === "block" ? "block" : "inline-block",
        textAlign: displayMode === "block" ? "center" : undefined,
        padding: displayMode === "block" ? "10px 14px" : "1px 6px",
        margin: displayMode === "block" ? "0.5em 0" : "0 2px",
        backgroundColor: "#f6f6f9",
        border: "1px solid #dcdce4",
        borderRadius: "4px",
        fontFamily: "Cambria Math, Georgia, serif",
        fontStyle: "italic",
      }}
    >
      <span
        role="math"
        aria-label={formatMessage(
          {
            id: "tiptap-editor.mathematics.formulaAria",
            defaultMessage: "Mathematical formula: {latex}",
          },
          { latex }
        )}
      >
        {rendered || latex}
      </span>
    </NodeViewWrapper>
  );
}

/**
 * Interactive node view component allowing editors to click to edit or remove a mathematical formula.
 */
export function MathematicsNodeView(props: NodeViewProps) {
  const { node, updateAttributes, deleteNode, editor } = props;
  const { formatMessage } = useIntl();
  const isEditable = editor?.isEditable !== false;
  const [editing, setEditing] = useState(false);
  const latex = String(node.attrs.latex ?? "");
  const displayMode = node.attrs.displayMode === "block" ? "block" : "inline";
  const [draftLatex, setDraftLatex] = useState(latex);
  const rendered = formatLatexPreview(latex);

  if (!isEditable) {
    return <MathematicsNodeViewReadOnly {...props} />;
  }

  return (
    <NodeViewWrapper
      as="span"
      data-type="mathematics"
      tabIndex={!editing && isEditable ? 0 : undefined}
      role={!editing && isEditable ? "button" : undefined}
      style={{
        display: displayMode === "block" ? "block" : "inline-block",
        textAlign: displayMode === "block" ? "center" : undefined,
        padding: displayMode === "block" ? "10px 14px" : "1px 6px",
        margin: displayMode === "block" ? "0.5em 0" : "0 2px",
        backgroundColor: "#f6f6f9",
        border: "1px solid #dcdce4",
        borderRadius: "4px",
        fontFamily: "Cambria Math, Georgia, serif",
        fontStyle: "italic",
        cursor: "pointer",
      }}
      onClick={() => {
        if (!editing) {
          setDraftLatex(latex);
          setEditing(true);
        }
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (!editing && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          setDraftLatex(latex);
          setEditing(true);
        } else if (editing && e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          setDraftLatex(latex);
          setEditing(false);
        }
      }}
    >
      {editing ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontStyle: "normal",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={draftLatex}
            onChange={(e) => setDraftLatex(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setDraftLatex(latex);
                setEditing(false);
              } else if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                if (draftLatex.trim()) {
                  updateAttributes({ latex: draftLatex.trim() });
                }
                setEditing(false);
              }
            }}
            aria-label={formatMessage({
              id: "tiptap-editor.mathematics.latexLabel",
              defaultMessage: "LaTeX Expression",
            })}
            style={{
              fontFamily: "monospace",
              fontSize: "0.85em",
              padding: "2px 6px",
              border: "1px solid #4945ff",
              borderRadius: "3px",
            }}
          />
          <button
            type="button"
            aria-label={formatMessage({
              id: "tiptap-editor.common.save",
              defaultMessage: "Save",
            })}
            onClick={() => {
              if (draftLatex.trim()) {
                updateAttributes({ latex: draftLatex.trim() });
              }
              setEditing(false);
            }}
            style={{
              border: "none",
              background: "#4945ff",
              color: "#fff",
              borderRadius: "3px",
              padding: "2px 6px",
              fontSize: "0.75em",
              cursor: "pointer",
            }}
          >
            ✓
          </button>
          <button
            type="button"
            aria-label={formatMessage({
              id: "tiptap-editor.common.remove",
              defaultMessage: "Remove",
            })}
            onClick={() => deleteNode()}
            style={{
              border: "none",
              background: "#d02b20",
              color: "#fff",
              borderRadius: "3px",
              padding: "2px 6px",
              fontSize: "0.75em",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </span>
      ) : (
        <span
          role="math"
          aria-label={formatMessage(
            {
              id: "tiptap-editor.mathematics.formulaAria",
              defaultMessage: "Mathematical formula: {latex}",
            },
            { latex }
          )}
        >
          {rendered || latex}
        </span>
      )}
    </NodeViewWrapper>
  );
}
