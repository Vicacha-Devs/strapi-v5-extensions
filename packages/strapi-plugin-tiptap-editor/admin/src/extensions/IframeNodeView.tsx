import { Popover, TextInput, IconButton } from "@strapi/design-system";
import { Trash, Pencil } from "@strapi/icons";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import React, { useState, useEffect } from "react";
import { useIntl } from "react-intl";

import { isSafeIframeUrl } from "../../../shared/src/contentSerializer";
import { ToolbarButton } from "../components/ToolbarButton";
import { TextAlignCenter } from "../icons/TextAlignCenter";
import { TextAlignLeft } from "../icons/TextAlignLeft";
import { TextAlignRight } from "../icons/TextAlignRight";

export const DEFAULT_ALLOWED_IFRAME_DOMAINS = [
  "youtube.com",
  "youtube-nocookie.com",
  "vimeo.com",
  "player.vimeo.com",
  "codepen.io",
  "codesandbox.io",
  "figma.com",
  "google.com",
  "spotify.com",
  "soundcloud.com",
];

export interface StrapiIframeOptions {
  HTMLAttributes: Record<string, unknown>;
  enableContentCheck: boolean;
  allowedDomains: string[];
  sandbox: string;
}

/**
 * Resolves the effective domain allowlist (falling back to `DEFAULT_ALLOWED_IFRAME_DOMAINS`
 * when an empty array is configured).
 */
export function resolveEffectiveDomains(domains?: string[]): string[] {
  return Array.isArray(domains) && domains.length > 0
    ? domains
    : DEFAULT_ALLOWED_IFRAME_DOMAINS;
}

function IframePreview({
  node,
  extension,
}: Pick<NodeViewProps, "node" | "extension">) {
  const { formatMessage } = useIntl();
  const rawSrc = String(node.attrs.src || "");
  const allowedDomains = resolveEffectiveDomains(
    (extension?.options as StrapiIframeOptions | undefined)?.allowedDomains
  );
  const sandbox =
    (extension?.options as StrapiIframeOptions | undefined)?.sandbox ||
    "allow-scripts allow-popups";
  const isSafe = isSafeIframeUrl(rawSrc, allowedDomains);

  const width = node.attrs.width ? `${node.attrs.width}px` : "100%";
  const height = node.attrs.height ? `${node.attrs.height}px` : "360px";

  return (
    <div style={{ margin: "0.75em 0" }}>
      {isSafe ? (
        <iframe
          src={rawSrc}
          title={
            node.attrs.title ||
            formatMessage({
              id: "tiptap-editor.iframe.embeddedTitle",
              defaultMessage: "Embedded content",
            })
          }
          style={{
            width,
            maxWidth: "100%",
            height,
            border: "1px solid #dcdce4",
            borderRadius: "6px",
          }}
          sandbox={sandbox}
          loading="lazy"
        />
      ) : (
        <div
          style={{
            padding: "12px",
            border: "1px dashed #d02b20",
            borderRadius: "6px",
            color: "#d02b20",
            fontSize: "1.2rem",
          }}
        >
          {formatMessage({
            id: "tiptap-editor.iframe.blockedUrl",
            defaultMessage: "Blocked unsafe or non-HTTPS iframe URL.",
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Read-only NodeView for sandboxed HTTPS iframes when the feature is disabled in the active preset.
 */
export function IframeNodeViewReadOnly({ node, extension }: NodeViewProps) {
  return (
    <NodeViewWrapper data-align={node.attrs["data-align"] ?? undefined}>
      <IframePreview node={node} extension={extension} />
    </NodeViewWrapper>
  );
}

/**
 * Interactive NodeView for sandboxed HTTPS iframes with alignment, title, height, and delete controls.
 */
export function IframeNodeView(props: NodeViewProps) {
  const { node, updateAttributes, deleteNode, selected, extension, editor } =
    props;
  const { formatMessage } = useIntl();
  const isEditable = editor?.isEditable !== false;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [title, setTitle] = useState<string>(node.attrs.title ?? "");
  const [heightInput, setHeightInput] = useState<string>(
    node.attrs.height ? String(node.attrs.height) : "360"
  );
  const currentAlign = node.attrs["data-align"] as
    | "left"
    | "center"
    | "right"
    | null;

  useEffect(() => {
    setTitle(node.attrs.title ?? "");
  }, [node.attrs.title]);

  useEffect(() => {
    setHeightInput(node.attrs.height ? String(node.attrs.height) : "360");
  }, [node.attrs.height]);

  useEffect(() => {
    if (!isEditable) setIsPopoverOpen(false);
  }, [isEditable]);

  if (!isEditable) {
    return <IframeNodeViewReadOnly {...props} />;
  }

  const handleAlign = (val: "left" | "center" | "right") => {
    updateAttributes({ "data-align": currentAlign === val ? null : val });
  };

  const handleHeightCommit = () => {
    const parsed = parseInt(heightInput, 10);
    if (!Number.isNaN(parsed) && parsed >= 100 && parsed <= 1600) {
      updateAttributes({ height: parsed });
    }
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
                  id: "tiptap-editor.iframe.edit",
                  defaultMessage: "Edit iframe",
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
                  {(
                    [
                      [
                        "left",
                        <TextAlignLeft key="l" />,
                        "alignLeft",
                        "Align left",
                      ],
                      [
                        "center",
                        <TextAlignCenter key="c" />,
                        "alignCenter",
                        "Align center",
                      ],
                      [
                        "right",
                        <TextAlignRight key="r" />,
                        "alignRight",
                        "Align right",
                      ],
                    ] as const
                  ).map(([alignVal, iconNode, msgSuffix, defaultMsg]) => (
                    <ToolbarButton
                      key={alignVal}
                      onClick={() => handleAlign(alignVal)}
                      icon={iconNode}
                      active={currentAlign === alignVal}
                      toggle
                      tooltip={formatMessage({
                        id: `tiptap-editor.iframe.${msgSuffix}`,
                        defaultMessage: defaultMsg,
                      })}
                    />
                  ))}
                  <TextInput
                    type="number"
                    placeholder={formatMessage({
                      id: "tiptap-editor.iframe.heightPlaceholder",
                      defaultMessage: "Height (px)",
                    })}
                    value={heightInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setHeightInput(e.target.value)
                    }
                    onBlur={handleHeightCommit}
                    aria-label={formatMessage({
                      id: "tiptap-editor.iframe.heightAriaLabel",
                      defaultMessage: "Iframe height",
                    })}
                    style={{ width: "90px" }}
                  />
                  <IconButton
                    onClick={deleteNode}
                    label={formatMessage({
                      id: "tiptap-editor.iframe.delete",
                      defaultMessage: "Delete iframe",
                    })}
                  >
                    <Trash />
                  </IconButton>
                </div>
                <TextInput
                  placeholder={formatMessage({
                    id: "tiptap-editor.iframe.titlePlaceholder",
                    defaultMessage: "Accessible title (for screen readers)",
                  })}
                  value={title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setTitle(e.target.value)
                  }
                  onBlur={() => updateAttributes({ title: title || null })}
                  aria-label={formatMessage({
                    id: "tiptap-editor.iframe.titleAriaLabel",
                    defaultMessage: "Iframe title",
                  })}
                />
              </div>
            </Popover.Content>
          </Popover.Root>
          <IconButton
            onClick={deleteNode}
            label={formatMessage({
              id: "tiptap-editor.iframe.delete",
              defaultMessage: "Delete iframe",
            })}
            variant="ghost"
          >
            <Trash />
          </IconButton>
        </div>
        <IframePreview node={node} extension={extension} />
      </div>
    </NodeViewWrapper>
  );
}
