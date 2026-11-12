import { TextInput, Dialog, Button, Field, Flex } from "@strapi/design-system";
import { Play } from "@strapi/icons";
import { Node, mergeAttributes, type Editor } from "@tiptap/core";
import { ReactNodeViewRenderer, useEditorState } from "@tiptap/react";
import React, { useState } from "react";
import { useIntl } from "react-intl";

import { isSafeUrl } from "../../../shared/src/contentSerializer";
import {
  MediaLibraryWrapper,
  type StrapiFile,
} from "../components/MediaLibraryWrapper";
import { ToolbarButton } from "../components/ToolbarButton";
import {
  VideoNodeView,
  VideoNodeViewReadOnly,
  isSafeVideoEmbedSrc,
} from "./VideoNodeView";

export { VideoNodeView, VideoNodeViewReadOnly };

export interface StrapiVideoOptions {
  HTMLAttributes: Record<string, unknown>;
  enableContentCheck: boolean;
}

/**
 * Normalizes YouTube or Vimeo watch URLs into privacy-enhanced embed URLs,
 * or returns direct video file URLs.
 */
export function normalizeVideoEmbedUrl(
  rawUrl: string
): { src: string; embedType: "file" | "embed" } | null {
  const trimmed = rawUrl.trim();
  if (!isSafeUrl(trimmed)) return null;

  try {
    const parsed = new URL(trimmed, "https://example.com");
    const host = parsed.hostname.toLowerCase();
    const isHost = (domain: string) =>
      host === domain || host.endsWith(`.${domain}`);

    // YouTube watch or embed URL
    if (isHost("youtube.com") || isHost("youtube-nocookie.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId && /^[\w-]{6,20}$/.test(videoId)) {
        return {
          src: `https://www.youtube-nocookie.com/embed/${videoId}`,
          embedType: "embed",
        };
      }
      if (parsed.pathname.startsWith("/embed/")) {
        const embedId = parsed.pathname.slice("/embed/".length).split("/")[0];
        if (embedId && /^[\w-]{6,20}$/.test(embedId)) {
          return {
            src: `https://www.youtube-nocookie.com/embed/${embedId}`,
            embedType: "embed",
          };
        }
        return null;
      }
      const pathMatch = /^\/(?:shorts|live)\/([\w-]{6,20})(?:\/|$)/.exec(
        parsed.pathname
      );
      if (pathMatch?.[1]) {
        return {
          src: `https://www.youtube-nocookie.com/embed/${pathMatch[1]}`,
          embedType: "embed",
        };
      }
      return null;
    }
    if (host === "youtu.be") {
      const videoId = parsed.pathname.replace(/^\//, "").split("/")[0];
      if (videoId && /^[\w-]{6,20}$/.test(videoId)) {
        return {
          src: `https://www.youtube-nocookie.com/embed/${videoId}`,
          embedType: "embed",
        };
      }
      return null;
    }

    // Vimeo
    if (isHost("vimeo.com")) {
      const match = /\/(\d+)/.exec(parsed.pathname);
      if (match?.[1]) {
        return {
          src: `https://player.vimeo.com/video/${match[1]}`,
          embedType: "embed",
        };
      }
      return null;
    }

    return { src: trimmed, embedType: "file" };
  } catch {
    return null;
  }
}

export const StrapiVideo = Node.create<StrapiVideoOptions>({
  name: "video",
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
      "embedType": {
        default: "file",
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-embed-type") ??
          el.getAttribute("embedType") ??
          (el.tagName === "IFRAME" ? "embed" : "file"),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.embedType ? { "data-embed-type": String(attrs.embedType) } : {},
      },
      "width": { default: null },
      "height": { default: null },
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
    return [
      { tag: 'iframe[data-type="video"]' },
      { tag: "video" },
      { tag: 'div[data-type="video"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const rawSrc =
      typeof HTMLAttributes.src === "string" ? HTMLAttributes.src : "";
    const isEmbed =
      HTMLAttributes["data-embed-type"] === "embed" ||
      HTMLAttributes.embedType === "embed";
    const safeAttrs = {
      ...HTMLAttributes,
      src: isEmbed
        ? isSafeVideoEmbedSrc(rawSrc)
          ? rawSrc
          : ""
        : isSafeUrl(rawSrc)
          ? rawSrc
          : "",
    };

    if (isEmbed) {
      return [
        "iframe",
        mergeAttributes(this.options.HTMLAttributes, safeAttrs, {
          "data-type": "video",
          "allowfullscreen": "true",
          "sandbox": "allow-scripts allow-same-origin allow-presentation",
        }),
      ];
    }

    return [
      "video",
      mergeAttributes(this.options.HTMLAttributes, safeAttrs, {
        "controls": "true",
        "data-type": "video",
      }),
    ];
  },

  addNodeView() {
    if (this.options.enableContentCheck) {
      return ReactNodeViewRenderer(VideoNodeViewReadOnly);
    }
    return ReactNodeViewRenderer(VideoNodeView);
  },
});

/**
 * Provides toolbar button and dialog for inserting videos from Strapi Media Library or external URLs.
 */
export function useVideo(
  editor: Editor | null,
  props: { disabled?: boolean } = { disabled: false }
) {
  const { formatMessage } = useIntl();
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoCaption, setVideoCaption] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      isInCodeBlock: ctx.editor?.isActive("codeBlock") ?? false,
    }),
  });

  const handleSelectAssets = (assets: StrapiFile[]) => {
    const asset = assets[0];
    const src = asset?.url?.trim();
    if (!asset || !editor || !src || !isSafeUrl(src)) {
      setShowMediaLibrary(false);
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent({
        type: "video",
        attrs: {
          src,
          "title": asset.name ?? asset.alternativeText ?? "",
          "caption": asset.caption ?? null,
          "embedType": "file",
          "data-asset-id": asset.id ?? null,
          "data-document-id": asset.documentId ?? null,
        },
      })
      .createParagraphNear()
      .run();

    setShowMediaLibrary(false);
  };

  const handleInsertExternalUrl = () => {
    if (!editor) return;
    const normalized = normalizeVideoEmbedUrl(videoUrl);
    if (!normalized) {
      setUrlError(
        formatMessage({
          id: "tiptap-editor.video.invalidUrl",
          defaultMessage: "Enter a valid video URL.",
        })
      );
      return;
    }
    setUrlError(null);

    editor
      .chain()
      .focus()
      .insertContent({
        type: "video",
        attrs: {
          src: normalized.src,
          embedType: normalized.embedType,
          caption: videoCaption.trim() || null,
        },
      })
      .createParagraphNear()
      .run();

    setVideoUrl("");
    setVideoCaption("");
    setShowUrlDialog(false);
  };

  const videoButton = (
    <ToolbarButton
      onClick={() => {
        setUrlError(null);
        setShowUrlDialog(true);
      }}
      icon={<Play />}
      active={false}
      tint="purple"
      disabled={
        props.disabled || !editor || (editorState?.isInCodeBlock ?? false)
      }
      tooltip={formatMessage({
        id: "tiptap-editor.toolbar.insertVideo",
        defaultMessage: "Insert video",
      })}
    />
  );

  const videoDialog = (
    <>
      <Dialog.Root
        open={showUrlDialog}
        onOpenChange={(open: boolean) => {
          if (!open) setUrlError(null);
          setShowUrlDialog(open);
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            {formatMessage({
              id: "tiptap-editor.video.dialogTitle",
              defaultMessage: "Insert Video",
            })}
          </Dialog.Header>
          <Dialog.Body>
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Button
                variant="secondary"
                onClick={() => {
                  setUrlError(null);
                  setShowUrlDialog(false);
                  setShowMediaLibrary(true);
                }}
              >
                {formatMessage({
                  id: "tiptap-editor.video.chooseFromLibrary",
                  defaultMessage: "Choose from Strapi Media Library",
                })}
              </Button>
              <Field.Root name="videoUrl" error={urlError || undefined}>
                <Field.Label>
                  {formatMessage({
                    id: "tiptap-editor.video.urlLabel",
                    defaultMessage:
                      "Or External Video URL (YouTube, Vimeo, MP4)",
                  })}
                </Field.Label>
                <TextInput
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setVideoUrl(e.target.value);
                    if (urlError) setUrlError(null);
                  }}
                />
                <Field.Error />
              </Field.Root>
              <Field.Root name="videoCaption">
                <Field.Label>
                  {formatMessage({
                    id: "tiptap-editor.video.captionLabel",
                    defaultMessage: "Caption (optional)",
                  })}
                </Field.Label>
                <TextInput
                  value={videoCaption}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setVideoCaption(e.target.value)
                  }
                />
              </Field.Root>
            </Flex>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Cancel>
              <Button
                variant="tertiary"
                onClick={() => {
                  setUrlError(null);
                  setShowUrlDialog(false);
                }}
              >
                {formatMessage({
                  id: "tiptap-editor.video.cancel",
                  defaultMessage: "Cancel",
                })}
              </Button>
            </Dialog.Cancel>
            <Button
              onClick={handleInsertExternalUrl}
              disabled={!videoUrl.trim()}
            >
              {formatMessage({
                id: "tiptap-editor.video.insertUrl",
                defaultMessage: "Insert URL",
              })}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>

      <MediaLibraryWrapper
        open={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelectAssets={handleSelectAssets}
        allowedTypes={["videos"]}
      />
    </>
  );

  return { videoButton, videoDialog };
}
