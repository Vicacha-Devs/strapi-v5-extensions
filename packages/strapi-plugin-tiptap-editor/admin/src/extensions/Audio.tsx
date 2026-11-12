import { Popover, TextInput, IconButton } from "@strapi/design-system";
import { Trash, Pencil } from "@strapi/icons";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import React, { useState, useEffect } from "react";
import { useIntl } from "react-intl";

import { isSafeUrl } from "../../../shared/src/contentSerializer";

export { useAudio } from "./useAudio";

export interface StrapiAudioOptions {
  HTMLAttributes: Record<string, unknown>;
  enableContentCheck: boolean;
}

function AudioPreview({ node }: Pick<NodeViewProps, "node">) {
  const src = String(node.attrs.src || "");
  const safeSrc = isSafeUrl(src) ? src : "";

  return (
    <figure style={{ margin: "0.75em 0" }}>
      {safeSrc && (
        <audio
          src={safeSrc}
          controls
          style={{ width: "100%", maxWidth: "480px", display: "block" }}
        />
      )}
      {node.attrs.caption && (
        <figcaption
          style={{ fontSize: "1.2rem", color: "#666687", marginTop: "4px" }}
        >
          {node.attrs.caption}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Read-only NodeView for audio players when the feature is disabled in the active preset.
 */
export function AudioNodeViewReadOnly({ node }: NodeViewProps) {
  return (
    <NodeViewWrapper data-align={node.attrs["data-align"] ?? undefined}>
      <AudioPreview node={node} />
    </NodeViewWrapper>
  );
}

/**
 * Interactive NodeView for audio players with caption editing and delete action.
 */
export function AudioNodeView(props: NodeViewProps) {
  const { node, updateAttributes, deleteNode, selected, editor } = props;
  const { formatMessage } = useIntl();
  const isEditable = editor?.isEditable !== false;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [caption, setCaption] = useState<string>(node.attrs.caption ?? "");

  useEffect(() => {
    setCaption(node.attrs.caption ?? "");
  }, [node.attrs.caption]);

  useEffect(() => {
    if (!isEditable) setIsPopoverOpen(false);
  }, [isEditable]);

  if (!isEditable) {
    return <AudioNodeViewReadOnly {...props} />;
  }

  return (
    <NodeViewWrapper
      data-drag-handle
      data-align={node.attrs["data-align"] ?? undefined}
    >
      <div
        style={{
          outline: selected ? "2px solid #4945ff" : undefined,
          borderRadius: "6px",
          padding: "4px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flexGrow: 1, minWidth: "220px" }}>
            <AudioPreview node={node} />
          </div>
          <div contentEditable={false} style={{ display: "flex", gap: "4px" }}>
            <Popover.Root open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <Popover.Trigger>
                <IconButton
                  onClick={() => setIsPopoverOpen((prev) => !prev)}
                  label={formatMessage({
                    id: "tiptap-editor.audio.edit",
                    defaultMessage: "Edit audio",
                  })}
                  variant="ghost"
                >
                  <Pencil />
                </IconButton>
              </Popover.Trigger>
              <Popover.Content side="bottom">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px",
                  }}
                >
                  <TextInput
                    placeholder={formatMessage({
                      id: "tiptap-editor.audio.captionPlaceholder",
                      defaultMessage: "Audio caption",
                    })}
                    value={caption}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCaption(e.target.value)
                    }
                    onBlur={() =>
                      updateAttributes({ caption: caption || null })
                    }
                    aria-label={formatMessage({
                      id: "tiptap-editor.audio.captionPlaceholder",
                      defaultMessage: "Audio caption",
                    })}
                  />
                  <IconButton
                    onClick={deleteNode}
                    label={formatMessage({
                      id: "tiptap-editor.audio.delete",
                      defaultMessage: "Delete audio",
                    })}
                  >
                    <Trash />
                  </IconButton>
                </div>
              </Popover.Content>
            </Popover.Root>
            <IconButton
              onClick={deleteNode}
              label={formatMessage({
                id: "tiptap-editor.audio.delete",
                defaultMessage: "Delete audio",
              })}
              variant="ghost"
            >
              <Trash />
            </IconButton>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const StrapiAudio = Node.create<StrapiAudioOptions>({
  name: "audio",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      enableContentCheck: false,
    };
  },

  addAttributes() {
    return {
      "src": { default: null },
      "title": { default: null },
      "caption": {
        default: null,
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-caption") ?? el.getAttribute("caption") ?? null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.caption ? { "data-caption": String(attrs.caption) } : {},
      },
      "mime": {
        default: null,
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-mime") ?? el.getAttribute("mime") ?? null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.mime ? { "data-mime": String(attrs.mime) } : {},
      },
      "data-asset-id": {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const raw = el.getAttribute("data-asset-id");
          if (!raw) return null;
          const num = parseInt(raw, 10);
          return Number.isNaN(num) ? null : num;
        },
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs["data-asset-id"] != null
            ? { "data-asset-id": String(attrs["data-asset-id"]) }
            : {},
      },
      "data-document-id": {
        default: null,
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-document-id") ?? null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs["data-document-id"]
            ? { "data-document-id": String(attrs["data-document-id"]) }
            : {},
      },
      "data-align": {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-align") ?? null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs["data-align"]
            ? { "data-align": String(attrs["data-align"]) }
            : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "audio" }];
  },

  renderHTML({ HTMLAttributes }) {
    const src = String(HTMLAttributes.src || "");
    return [
      "audio",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "src": isSafeUrl(src) ? src : "",
        "controls": "true",
        "data-type": "audio",
      }),
    ];
  },

  addNodeView() {
    if (this.options.enableContentCheck) {
      return ReactNodeViewRenderer(AudioNodeViewReadOnly);
    }
    return ReactNodeViewRenderer(AudioNodeView);
  },
});
