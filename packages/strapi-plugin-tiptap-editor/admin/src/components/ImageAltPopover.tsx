import { Popover } from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import type { ImageOptions } from "@tiptap/extension-image";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
import { useIntl } from "react-intl";

import { isSafeUrl } from "../../../shared/src/urlSafety";
import { ImageAltPopoverForm } from "./ImageAltPopoverForm";
import { ImageEditorModal } from "./ImageEditorModal";

function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === "Enter") {
    e.preventDefault();
    e.currentTarget.blur();
  }
}

/**
 * Interactive NodeView for images with alignment, dimensions, alt text, title, caption,
 * Media Library metadata sync, drag-resize handle, and HTML5 Canvas Image Studio integration.
 */
export function ImageNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  extension,
  editor,
}: NodeViewProps) {
  const { formatMessage } = useIntl();
  const { get } = useFetchClient();
  const isEditable = editor?.isEditable !== false;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [altText, setAltText] = useState<string>(node.attrs.alt ?? "");
  const [title, setTitle] = useState<string>(String(node.attrs.title ?? ""));
  const [caption, setCaption] = useState<string>(node.attrs.caption ?? "");
  const imgRef = useRef<HTMLImageElement>(null);
  const isResizingRef = useRef(false);
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  const imageOptions = (extension?.options ?? {}) as ImageOptions;
  const allowBase64 = Boolean(imageOptions.allowBase64);
  const rawSrc = node.attrs.src;
  const safeSrc =
    typeof rawSrc === "string" &&
    (allowBase64 || !/^\s*data:/i.test(rawSrc)) &&
    isSafeUrl(rawSrc)
      ? rawSrc
      : "";

  const rawResize = imageOptions.resize;
  const resizeEnabled =
    typeof rawResize === "object" && !!rawResize
      ? rawResize.enabled
      : !!rawResize;
  const resizeOpts =
    resizeEnabled && typeof rawResize === "object" ? rawResize : undefined;
  const preserveAspectRatio = resizeOpts?.alwaysPreserveAspectRatio ?? true;
  const minWidth = resizeOpts?.minWidth ?? 50;
  const minHeight = resizeOpts?.minHeight ?? 50;

  const currentWidth = node.attrs.width;
  const currentHeight = node.attrs.height;
  const numericWidth =
    typeof currentWidth === "number" && currentWidth > 0 ? currentWidth : null;
  const numericHeight =
    typeof currentHeight === "number" && currentHeight > 0
      ? currentHeight
      : null;
  const [widthInput, setWidthInput] = useState<string>(
    currentWidth ? String(currentWidth) : ""
  );
  const [heightInput, setHeightInput] = useState<string>(
    currentHeight ? String(currentHeight) : ""
  );

  useEffect(() => {
    if (!isEditable) {
      setIsPopoverOpen(false);
      setIsEditorOpen(false);
    }
  }, [isEditable]);

  // Sync local alt, title & caption text state when node attrs change externally (undo/redo safety)
  useEffect(() => {
    setAltText(node.attrs.alt ?? "");
  }, [node.attrs.alt]);

  useEffect(() => {
    setTitle(String(node.attrs.title ?? ""));
  }, [node.attrs.title]);

  useEffect(() => {
    setCaption(node.attrs.caption ?? "");
  }, [node.attrs.caption]);

  // Sync dimension inputs when node attrs change (undo/redo, resize handle)
  useEffect(() => {
    setWidthInput(node.attrs.width ? String(node.attrs.width) : "");
  }, [node.attrs.width]);

  useEffect(() => {
    setHeightInput(node.attrs.height ? String(node.attrs.height) : "");
  }, [node.attrs.height]);

  // Close popover when any ancestor scrolls so it doesn't float over other components
  useEffect(() => {
    if (!isPopoverOpen) return;
    const handleScroll = () => setIsPopoverOpen(false);
    document.addEventListener("scroll", handleScroll, true);
    return () => document.removeEventListener("scroll", handleScroll, true);
  }, [isPopoverOpen]);

  // Remove resize document listeners if component unmounts mid-drag
  useEffect(() => {
    return () => {
      resizeCleanupRef.current?.();
    };
  }, []);

  const currentAlign = node.attrs["data-align"] as
    | "left"
    | "center"
    | "right"
    | null;

  function handleAlign(value: "left" | "center" | "right") {
    const current = node.attrs["data-align"] as string | null;
    updateAttributes({ "data-align": current === value ? null : value });
  }

  function handleCommit() {
    updateAttributes({ alt: altText });
  }

  function handleTitleCommit() {
    updateAttributes({ title: title.trim() || null });
  }

  function handleCaptionCommit() {
    updateAttributes({ caption: caption.trim() || null });
  }

  const assetId = node.attrs["data-asset-id"] as number | null;
  const assetIdRef = useRef(assetId);
  // Bumped on each fill request, on alt/caption edits and on asset changes so stale responses are dropped
  const fillRequestRef = useRef(0);

  // Synced after commit, not during render, so an abandoned render can't affect pending fills
  useLayoutEffect(() => {
    if (assetIdRef.current === assetId) return;
    assetIdRef.current = assetId;
    fillRequestRef.current++;
  }, [assetId]);

  function handleFillFromMediaLibrary() {
    if (!assetId) return;
    const requestId = ++fillRequestRef.current;
    const requestedAssetId = assetId;
    get(`/upload/files/${requestedAssetId}`)
      .then(
        (res: {
          data?: {
            name?: string;
            alternativeText?: string | null;
            caption?: string | null;
          };
        }) => {
          if (
            requestId !== fillRequestRef.current ||
            requestedAssetId !== assetIdRef.current
          ) {
            return;
          }
          const file = res.data;
          if (!file) return;
          updateAttributes({
            alt: file.alternativeText ?? file.name ?? "",
            caption: file.caption || null,
          });
        }
      )
      .catch(() => {});
  }

  function getAspectRatio(): number | null {
    const img = imgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return null;
    return img.naturalWidth / img.naturalHeight;
  }

  function handleWidthCommit() {
    if (widthInput === "") {
      updateAttributes({ width: null, height: null });
      return;
    }
    const num = parseInt(widthInput, 10);
    if (!isNaN(num) && num >= minWidth) {
      const ratio = getAspectRatio();
      if (preserveAspectRatio && ratio) {
        const newHeight = Math.round(num / ratio);
        updateAttributes({ width: num, height: newHeight });
      } else {
        updateAttributes({ width: num });
      }
    } else {
      setWidthInput(node.attrs.width ? String(node.attrs.width) : "");
    }
  }

  function handleHeightCommit() {
    if (heightInput === "") {
      updateAttributes({ height: null, width: null });
      return;
    }
    const num = parseInt(heightInput, 10);
    if (!isNaN(num) && num >= minHeight) {
      const ratio = getAspectRatio();
      if (preserveAspectRatio && ratio) {
        const newWidth = Math.round(num * ratio);
        updateAttributes({ width: newWidth, height: num });
      } else {
        updateAttributes({ height: num });
      }
    } else {
      setHeightInput(node.attrs.height ? String(node.attrs.height) : "");
    }
  }

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditable) return;
      e.preventDefault();
      e.stopPropagation();
      isResizingRef.current = true;

      const startX = e.clientX;
      const img = imgRef.current;
      if (!img) return;
      const startWidth = img.offsetWidth;
      const ratio =
        img.naturalWidth && img.naturalHeight
          ? img.naturalWidth / img.naturalHeight
          : null;

      function onMouseMove(moveEvent: MouseEvent) {
        const diff = moveEvent.clientX - startX;
        const newWidth = Math.max(minWidth, startWidth + diff);
        if (img) {
          img.style.width = `${newWidth}px`;
          if (preserveAspectRatio && ratio) {
            const newHeight = Math.round(newWidth / ratio);
            img.style.height = "auto";
            img.style.aspectRatio = `${newWidth} / ${newHeight}`;
          }
        }
      }

      function cleanup() {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        resizeCleanupRef.current = null;
      }

      function onMouseUp(upEvent: MouseEvent) {
        cleanup();
        const diff = upEvent.clientX - startX;
        const finalWidth = Math.max(minWidth, startWidth + diff);
        const attrs: Record<string, unknown> = { width: finalWidth };
        if (preserveAspectRatio && ratio) {
          attrs.height = Math.round(finalWidth / ratio);
        }
        updateAttributes(attrs);
        requestAnimationFrame(() => {
          isResizingRef.current = false;
        });
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      resizeCleanupRef.current = cleanup;
    },
    [isEditable, updateAttributes, preserveAspectRatio, minWidth]
  );

  return (
    <NodeViewWrapper
      data-drag-handle={isEditable || undefined}
      data-align={node.attrs["data-align"] ?? undefined}
    >
      <Popover.Root
        open={isEditable && isPopoverOpen}
        onOpenChange={(nextOpen: boolean) =>
          setIsPopoverOpen(isEditable ? nextOpen : false)
        }
      >
        <Popover.Anchor>
          <figure
            className="image-wrapper"
            data-selected={
              selected || (isEditable && isPopoverOpen) || undefined
            }
            tabIndex={isEditable ? 0 : undefined}
            role={isEditable ? "button" : undefined}
            aria-haspopup={isEditable ? "dialog" : undefined}
            aria-expanded={isEditable ? isPopoverOpen : undefined}
            aria-label={
              isEditable
                ? formatMessage({
                    id: "tiptap-editor.image.openEditor",
                    defaultMessage: "Edit image (crop, rotate, caption)",
                  })
                : undefined
            }
            onClick={() => {
              if (isEditable && !isResizingRef.current) setIsPopoverOpen(true);
            }}
            onKeyDown={(e) => {
              if (!isEditable) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!isResizingRef.current) setIsPopoverOpen(true);
              }
            }}
            style={{ margin: 0, cursor: isEditable ? "pointer" : undefined }}
          >
            {safeSrc ? (
              <img
                ref={imgRef}
                src={safeSrc}
                alt={node.attrs.alt ?? ""}
                title={node.attrs.title ?? undefined}
                style={
                  numericWidth !== null && numericHeight !== null
                    ? {
                        display: "block",
                        width: `${numericWidth}px`,
                        maxWidth: "100%",
                        height: "auto",
                        aspectRatio: `${numericWidth} / ${numericHeight}`,
                      }
                    : {
                        display: "block",
                        maxWidth: "100%",
                        width: currentWidth ? `${currentWidth}px` : undefined,
                        height: currentHeight ? `${currentHeight}px` : "auto",
                      }
                }
                draggable={false}
              />
            ) : null}
            {node.attrs.caption && (
              <figcaption
                style={{
                  fontSize: "1.2rem",
                  color: "#666687",
                  marginTop: "4px",
                  lineHeight: 1.4,
                  textAlign: "center",
                }}
              >
                {node.attrs.caption}
              </figcaption>
            )}
            {isEditable && resizeEnabled && (
              <div
                className="image-resize-handle"
                onMouseDown={handleResizeStart}
              />
            )}
          </figure>
        </Popover.Anchor>
        <Popover.Content side="bottom">
          <ImageAltPopoverForm
            currentAlign={currentAlign}
            resizeEnabled={resizeEnabled}
            widthInput={widthInput}
            heightInput={heightInput}
            hasCustomDimensions={Boolean(currentWidth || currentHeight)}
            altText={altText}
            title={title}
            caption={caption}
            assetId={assetId}
            onAlign={handleAlign}
            onOpenEditor={() => {
              setIsPopoverOpen(false);
              setIsEditorOpen(true);
            }}
            onWidthChange={setWidthInput}
            onWidthCommit={handleWidthCommit}
            onHeightChange={setHeightInput}
            onHeightCommit={handleHeightCommit}
            onResetSize={() => updateAttributes({ width: null, height: null })}
            onAltChange={(nextAlt) => {
              fillRequestRef.current++;
              setAltText(nextAlt);
            }}
            onAltCommit={handleCommit}
            onTitleChange={setTitle}
            onTitleCommit={handleTitleCommit}
            onCaptionChange={(nextCaption) => {
              fillRequestRef.current++;
              setCaption(nextCaption);
            }}
            onCaptionCommit={handleCaptionCommit}
            onKeyDown={handleKeyDown}
            onFillFromMediaLibrary={handleFillFromMediaLibrary}
            onDeleteNode={deleteNode}
          />
        </Popover.Content>
      </Popover.Root>
      {isEditable && (
        <ImageEditorModal
          open={isEditorOpen}
          src={safeSrc}
          initialAlt={node.attrs.alt ?? ""}
          initialCaption={node.attrs.caption ?? ""}
          onClose={() => setIsEditorOpen(false)}
          onSave={(edited) => {
            if (!isSafeUrl(edited.src)) return;
            fillRequestRef.current++;
            const srcChanged = edited.src !== node.attrs.src;
            let nextWidth = edited.width;
            let nextHeight = edited.height;
            if (
              typeof node.attrs.width === "number" &&
              node.attrs.width > 0 &&
              typeof edited.width === "number" &&
              edited.width > 0 &&
              typeof edited.height === "number" &&
              edited.height > 0
            ) {
              nextWidth = node.attrs.width;
              nextHeight = Math.max(
                1,
                Math.round((node.attrs.width * edited.height) / edited.width)
              );
            }
            updateAttributes({
              src: edited.src,
              alt: edited.alt,
              caption: edited.caption || null,
              ...(nextWidth !== undefined ? { width: nextWidth } : {}),
              ...(nextHeight !== undefined ? { height: nextHeight } : {}),
              ...(srcChanged
                ? {
                    "data-asset-id": edited.assetId ?? null,
                    "data-document-id": edited.documentId ?? null,
                  }
                : {}),
            });
          }}
        />
      )}
    </NodeViewWrapper>
  );
}

export default ImageNodeView;
