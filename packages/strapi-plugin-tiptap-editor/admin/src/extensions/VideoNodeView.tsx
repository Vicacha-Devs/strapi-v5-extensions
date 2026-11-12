import { Popover, TextInput, IconButton } from "@strapi/design-system";
import { Trash, Pencil } from "@strapi/icons";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import React, { useState, useEffect } from "react";
import { useIntl } from "react-intl";

import {
  isSafeIframeUrl,
  isSafeUrl,
} from "../../../shared/src/contentSerializer";
import { ToolbarButton } from "../components/ToolbarButton";
import { TextAlignCenter } from "../icons/TextAlignCenter";
import { TextAlignLeft } from "../icons/TextAlignLeft";
import { TextAlignRight } from "../icons/TextAlignRight";

export const VIDEO_EMBED_HOSTS = ["youtube-nocookie.com", "player.vimeo.com"];
export const isSafeVideoEmbedSrc = (src: string) =>
  isSafeIframeUrl(src, VIDEO_EMBED_HOSTS);

function VideoPreview({ node }: Pick<NodeViewProps, "node">) {
  const { formatMessage } = useIntl();
  const src = String(node.attrs.src || "");
  const embedType = node.attrs.embedType === "embed" ? "embed" : "file";
  const safeSrc =
    embedType === "embed"
      ? isSafeVideoEmbedSrc(src)
        ? src
        : ""
      : isSafeUrl(src)
        ? src
        : "";
  const width = node.attrs.width ? `${node.attrs.width}px` : "100%";
  const height = node.attrs.height ? `${node.attrs.height}px` : "360px";

  return (
    <figure style={{ margin: "0.75em 0" }}>
      {embedType === "embed"
        ? safeSrc && (
            <iframe
              src={safeSrc}
              title={
                node.attrs.title ||
                formatMessage({
                  id: "tiptap-editor.video.embeddedTitle",
                  defaultMessage: "Embedded video",
                })
              }
              style={{
                width,
                maxWidth: "100%",
                height,
                border: 0,
                borderRadius: "6px",
              }}
              sandbox="allow-scripts allow-same-origin allow-presentation"
              allowFullScreen
            />
          )
        : safeSrc && (
            <video
              src={safeSrc}
              controls
              style={{
                width,
                maxWidth: "100%",
                borderRadius: "6px",
                display: "block",
              }}
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
 * Read-only NodeView for videos when the feature is disabled in the active preset.
 */
export function VideoNodeViewReadOnly({ node }: NodeViewProps) {
  return (
    <NodeViewWrapper data-align={node.attrs["data-align"] ?? undefined}>
      <VideoPreview node={node} />
    </NodeViewWrapper>
  );
}

/**
 * Interactive NodeView for videos with alignment, caption editing, and delete action.
 */
export function VideoNodeView(props: NodeViewProps) {
  const { node, updateAttributes, deleteNode, selected, editor } = props;
  const { formatMessage } = useIntl();
  const isEditable = editor?.isEditable !== false;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [caption, setCaption] = useState<string>(node.attrs.caption ?? "");
  const currentAlign = node.attrs["data-align"] as
    | "left"
    | "center"
    | "right"
    | null;

  useEffect(() => {
    setCaption(node.attrs.caption ?? "");
  }, [node.attrs.caption]);

  useEffect(() => {
    if (!isEditable) setIsPopoverOpen(false);
  }, [isEditable]);

  if (!isEditable) {
    return <VideoNodeViewReadOnly {...props} />;
  }

  const handleAlign = (val: "left" | "center" | "right") => {
    updateAttributes({ "data-align": currentAlign === val ? null : val });
  };

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
          contentEditable={false}
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "4px",
            marginBottom: "4px",
          }}
        >
          <Popover.Root open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <Popover.Trigger>
              <IconButton
                onClick={() => setIsPopoverOpen((prev) => !prev)}
                label={formatMessage({
                  id: "tiptap-editor.video.edit",
                  defaultMessage: "Edit video",
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
                  flexDirection: "column",
                  gap: "8px",
                  padding: "8px",
                }}
              >
                <div
                  style={{ display: "flex", gap: "4px", alignItems: "center" }}
                >
                  <ToolbarButton
                    onClick={() => handleAlign("left")}
                    icon={<TextAlignLeft />}
                    active={currentAlign === "left"}
                    toggle
                    tooltip={formatMessage({
                      id: "tiptap-editor.video.alignLeft",
                      defaultMessage: "Align left",
                    })}
                  />
                  <ToolbarButton
                    onClick={() => handleAlign("center")}
                    icon={<TextAlignCenter />}
                    active={currentAlign === "center"}
                    toggle
                    tooltip={formatMessage({
                      id: "tiptap-editor.video.alignCenter",
                      defaultMessage: "Align center",
                    })}
                  />
                  <ToolbarButton
                    onClick={() => handleAlign("right")}
                    icon={<TextAlignRight />}
                    active={currentAlign === "right"}
                    toggle
                    tooltip={formatMessage({
                      id: "tiptap-editor.video.alignRight",
                      defaultMessage: "Align right",
                    })}
                  />
                  <IconButton
                    onClick={deleteNode}
                    label={formatMessage({
                      id: "tiptap-editor.video.delete",
                      defaultMessage: "Delete video",
                    })}
                  >
                    <Trash />
                  </IconButton>
                </div>
                <TextInput
                  placeholder={formatMessage({
                    id: "tiptap-editor.video.captionPlaceholder",
                    defaultMessage: "Video caption",
                  })}
                  value={caption}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCaption(e.target.value)
                  }
                  onBlur={() => updateAttributes({ caption: caption || null })}
                  aria-label={formatMessage({
                    id: "tiptap-editor.video.captionPlaceholder",
                    defaultMessage: "Video caption",
                  })}
                />
              </div>
            </Popover.Content>
          </Popover.Root>
          <IconButton
            onClick={deleteNode}
            label={formatMessage({
              id: "tiptap-editor.video.delete",
              defaultMessage: "Delete video",
            })}
            variant="ghost"
          >
            <Trash />
          </IconButton>
        </div>
        <VideoPreview node={node} />
      </div>
    </NodeViewWrapper>
  );
}
