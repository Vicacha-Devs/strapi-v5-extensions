import { mergeAttributes } from "@tiptap/core";
import BaseImage, { type ImageOptions } from "@tiptap/extension-image";
import React, { useState } from "react";

interface StrapiImageOptions extends ImageOptions {
  enableContentCheck: boolean;
}
import { Image as ImageIcon } from "@strapi/icons";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  useEditorState,
} from "@tiptap/react";
import type { NodeViewProps, Editor } from "@tiptap/react";
import { useIntl } from "react-intl";

import { isSafeUrl } from "../../../shared/src/urlSafety";
import { ImageNodeView } from "../components/ImageAltPopover";
import type { StrapiFile } from "../components/MediaLibraryWrapper";
import { MediaLibraryWrapper } from "../components/MediaLibraryWrapper";
import { ToolbarButton } from "../components/ToolbarButton";

export function isSafeImageSrc(
  src: unknown,
  allowBase64 = false
): src is string {
  if (typeof src !== "string") return false;
  if (!allowBase64 && /^\s*data:/i.test(src)) return false;
  return isSafeUrl(src);
}

export function ImageNodeViewReadOnly({ node, extension }: NodeViewProps) {
  const rawWidth = node.attrs.width;
  const rawHeight = node.attrs.height;
  const width = typeof rawWidth === "number" && rawWidth > 0 ? rawWidth : null;
  const height =
    typeof rawHeight === "number" && rawHeight > 0 ? rawHeight : null;
  const allowBase64 = Boolean(
    (extension?.options as ImageOptions | undefined)?.allowBase64
  );
  const safeSrc = isSafeImageSrc(node.attrs.src, allowBase64)
    ? node.attrs.src
    : "";

  return (
    <NodeViewWrapper data-align={node.attrs["data-align"] ?? undefined}>
      <figure style={{ margin: 0 }}>
        {safeSrc ? (
          <img
            src={safeSrc}
            alt={node.attrs.alt ?? ""}
            title={node.attrs.title ?? undefined}
            style={
              width !== null && height !== null
                ? {
                    display: "block",
                    width: `${width}px`,
                    maxWidth: "100%",
                    height: "auto",
                    aspectRatio: `${width} / ${height}`,
                  }
                : {
                    display: "block",
                    maxWidth: "100%",
                    width: width !== null ? `${width}px` : undefined,
                    height: height !== null ? `${height}px` : "auto",
                  }
            }
            draggable={false}
          />
        ) : null}
        {node.attrs.caption && (
          <figcaption
            style={{ fontSize: "1.2rem", color: "#666687", marginTop: "4px" }}
          >
            {node.attrs.caption}
          </figcaption>
        )}
      </figure>
    </NodeViewWrapper>
  );
}

const resolveImageElement = (element: HTMLElement): HTMLElement =>
  element.tagName === "FIGURE"
    ? (element.querySelector?.("img") ?? element)
    : element;

interface ParentAttrRecord {
  src?: Record<string, unknown>;
  [key: string]: unknown;
}

function callParent<T>(ctx: unknown): T | undefined {
  const fn = (ctx as { parent?: () => T }).parent;
  return typeof fn === "function" ? fn.call(ctx) : undefined;
}

export const StrapiImage = BaseImage.extend<StrapiImageOptions>({
  addOptions() {
    const parentOpts = callParent<StrapiImageOptions>(this);
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
      resize: false,
      ...parentOpts,
      enableContentCheck: false,
    };
  },

  addAttributes() {
    const parentAttrs = callParent<ParentAttrRecord>(this) ?? {};
    const allowBase64 = Boolean(
      (this as { options?: { allowBase64?: boolean } }).options?.allowBase64
    );
    return {
      ...parentAttrs,
      "src": {
        default: null,
        ...parentAttrs.src,
        parseHTML: (element: HTMLElement) => {
          const raw = resolveImageElement(element).getAttribute("src");
          return isSafeImageSrc(raw, allowBase64) ? raw : null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          const raw = attributes.src;
          if (!isSafeImageSrc(raw, allowBase64)) return {};
          return { src: raw };
        },
      },
      "data-asset-id": {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const raw =
            resolveImageElement(element).getAttribute("data-asset-id");
          if (raw === null) return null;
          const parsed = parseInt(raw, 10);
          return isNaN(parsed) ? null : parsed;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          const id = attributes["data-asset-id"];
          if (id === null || id === undefined) return {};
          return { "data-asset-id": String(id) };
        },
      },
      "data-document-id": {
        default: null,
        parseHTML: (element: HTMLElement) =>
          resolveImageElement(element).getAttribute("data-document-id") ?? null,
        renderHTML: (attributes: Record<string, unknown>) => {
          const docId = attributes["data-document-id"];
          if (!docId) return {};
          return { "data-document-id": String(docId) };
        },
      },
      "data-align": {
        default: null,
        parseHTML: (element: HTMLElement) =>
          resolveImageElement(element).getAttribute("data-align") ?? null,
        renderHTML: (attributes: Record<string, unknown>) => {
          const align = attributes["data-align"];
          if (!align) return {};
          return { "data-align": align };
        },
      },
      "caption": {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const img = resolveImageElement(element);
          const dataCaption =
            img.getAttribute("data-caption") ??
            element.getAttribute("data-caption");
          if (dataCaption !== null) return dataCaption;
          if (element.tagName === "FIGURE") {
            return element.querySelector?.("figcaption")?.textContent ?? null;
          }
          return null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          const cap = attributes.caption;
          if (!cap) return {};
          return { "data-caption": String(cap) };
        },
      },
    };
  },

  parseHTML() {
    const allowBase64 = Boolean(this.options?.allowBase64);
    const imgSelector = allowBase64
      ? "img[src]"
      : 'img[src]:not([src^="data:"])';
    return [
      {
        tag: "figure",
        getAttrs: (node: HTMLElement) => {
          const img = node.querySelector?.(imgSelector);
          if (!img) return false;
          const rawSrc = img.getAttribute("src");
          if (!isSafeImageSrc(rawSrc, allowBase64)) return false;
          const rawWidth = img.getAttribute("width");
          const rawHeight = img.getAttribute("height");
          const parsedWidth = rawWidth !== null ? parseInt(rawWidth, 10) : null;
          const parsedHeight =
            rawHeight !== null ? parseInt(rawHeight, 10) : null;
          return {
            src: rawSrc,
            alt: img.getAttribute("alt"),
            title: img.getAttribute("title"),
            width:
              parsedWidth !== null && !isNaN(parsedWidth)
                ? parsedWidth
                : rawWidth,
            height:
              parsedHeight !== null && !isNaN(parsedHeight)
                ? parsedHeight
                : rawHeight,
          };
        },
      },
      {
        tag: imgSelector,
        getAttrs: (node: HTMLElement) => {
          const rawSrc = node.getAttribute("src");
          return isSafeImageSrc(rawSrc, allowBase64) ? null : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const allowBase64 = Boolean(this.options?.allowBase64);
    const mergedAttributes = mergeAttributes(
      this.options?.HTMLAttributes ?? {},
      HTMLAttributes
    );
    if (
      mergedAttributes.src !== undefined &&
      !isSafeImageSrc(mergedAttributes.src, allowBase64)
    ) {
      mergedAttributes.src = "";
    }
    const caption = mergedAttributes["data-caption"];
    if (caption) {
      return [
        "figure",
        { class: "strapi-image-figure" },
        ["img", mergedAttributes],
        ["figcaption", {}, String(caption)],
      ];
    }
    return ["img", mergedAttributes];
  },

  addNodeView() {
    if (this.options.enableContentCheck) {
      return ReactNodeViewRenderer(ImageNodeViewReadOnly);
    }
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

export function useImage(
  editor: Editor | null,
  props: { disabled?: boolean } = { disabled: false }
) {
  const [showPicker, setShowPicker] = useState(false);
  const { formatMessage } = useIntl();

  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      isInCodeBlock: ctx.editor?.isActive("codeBlock") ?? false,
    }),
  });

  function handleSelectAssets(assets: StrapiFile[]) {
    const asset = assets[0];
    const src = asset?.url?.trim();
    if (!asset || !editor || !src || !isSafeUrl(src)) {
      setShowPicker(false);
      return;
    }

    // Alt text fallback chain (IMG-03)
    const altText = asset.alternativeText ?? asset.name ?? "";

    const imageAttrs: Record<string, unknown> = {
      src,
      "alt": altText,
      "data-asset-id": asset.id,
      "data-document-id": asset.documentId ?? null,
      "caption": asset.caption || null,
    };

    editor
      .chain()
      .focus()
      .setImage(
        imageAttrs as unknown as Parameters<
          ReturnType<Editor["chain"]>["setImage"]
        >[0]
      )
      .createParagraphNear()
      .run();

    setShowPicker(false);
  }

  const imageButton = (
    <ToolbarButton
      onClick={() => setShowPicker(true)}
      icon={<ImageIcon />}
      active={false}
      tint="green"
      disabled={
        props.disabled || !editor || (editorState?.isInCodeBlock ?? false)
      }
      tooltip={formatMessage({
        id: "tiptap-editor.toolbar.insertImage",
        defaultMessage: "Insert image",
      })}
    />
  );

  const imageDialog = (
    <MediaLibraryWrapper
      open={showPicker}
      onClose={() => setShowPicker(false)}
      onSelectAssets={handleSelectAssets}
      allowedTypes={["images"]}
    />
  );

  return { imageButton, imageDialog };
}
