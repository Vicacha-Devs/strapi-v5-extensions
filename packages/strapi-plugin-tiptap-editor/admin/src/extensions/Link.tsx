import { Link as LinkIcon } from "@strapi/icons";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { useRef, useState } from "react";
import { useIntl } from "react-intl";

import { isSafeUrl } from "../../../shared/src/urlSafety";
import type { LinkDialogPayload } from "../components/LinkDialog";
import LinkDialogModal from "../components/LinkDialog";
import { ToolbarButton } from "../components/ToolbarButton";

export function useLink(
  editor: Editor | null,
  props: { disabled?: boolean } = { disabled: false }
) {
  const { formatMessage } = useIntl();
  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) {
        return { isLink: false, canSetLink: false };
      }
      return {
        isLink: ctx.editor.isActive("link") ?? false,
        canSetLink:
          ctx.editor.can().setLink?.({ href: "https://example.com" }) ?? true,
      };
    },
  });

  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [currentLinkUrl, setCurrentLinkUrl] = useState<string>("");
  const [linkDialogMode, setLinkDialogMode] = useState<"add" | "edit">("add");
  const selectionRef = useRef<{ from: number; to: number } | null>(null);

  const openAddLinkDialog = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    selectionRef.current = { from, to };
    setCurrentLinkUrl("");
    setLinkDialogMode("add");
    setShowLinkDialog(true);
  };

  const openEditLinkDialog = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    selectionRef.current = { from, to };
    const currentHref =
      (editor.getAttributes("link").href as string | undefined) || "";
    setCurrentLinkUrl(currentHref);
    setLinkDialogMode("edit");
    setShowLinkDialog(true);
  };

  const toggleLink = () => {
    if (!editor) return;
    if (editorState?.isLink) {
      openEditLinkDialog();
    } else {
      openAddLinkDialog();
    }
  };

  const restoreSelection = () => {
    if (!editor) return;
    const sel = selectionRef.current;
    if (sel) {
      editor.chain().setTextSelection({ from: sel.from, to: sel.to }).run();
    }
  };

  const handleSaveEditedLink = ({ url }: LinkDialogPayload) => {
    if (!editor) return;
    const trimmed = url.trim();
    if (trimmed === "") {
      restoreSelection();
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setShowLinkDialog(false);
      return;
    }
    if (!isSafeUrl(trimmed)) return;
    restoreSelection();
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: trimmed })
      .run();
    setShowLinkDialog(false);
  };

  const handleRemoveLink = () => {
    if (!editor) return;
    restoreSelection();
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setShowLinkDialog(false);
  };

  const handleSaveNewLink = ({ url }: LinkDialogPayload) => {
    if (!editor) return;
    const trimmed = url.trim();
    if (!isSafeUrl(trimmed)) return;
    restoreSelection();
    editor.chain().focus().setLink({ href: trimmed }).run();
    setShowLinkDialog(false);
  };

  return {
    linkButton: (
      <ToolbarButton
        onClick={toggleLink}
        icon={<LinkIcon />}
        active={editorState?.isLink ?? false}
        disabled={props.disabled || !editor || !editorState?.canSetLink}
        tooltip={
          editorState?.isLink
            ? formatMessage({
                id: "tiptap-editor.toolbar.editOrRemoveLink",
                defaultMessage: "Edit or remove link",
              })
            : formatMessage({
                id: "tiptap-editor.toolbar.addLink",
                defaultMessage: "Add link",
              })
        }
      />
    ),
    linkDialog: (
      <LinkDialogModal
        open={showLinkDialog}
        url={currentLinkUrl}
        mode={linkDialogMode}
        onClose={() => setShowLinkDialog(false)}
        onSave={
          linkDialogMode === "add" ? handleSaveNewLink : handleSaveEditedLink
        }
        onRemove={handleRemoveLink}
      />
    ),
  };
}
