import {
  Button,
  Dialog,
  Field,
  Flex,
  TextInput,
  Typography,
} from "@strapi/design-system";
import { CodeBlock } from "@strapi/icons";
import { Node, mergeAttributes, type Editor } from "@tiptap/core";
import { ReactNodeViewRenderer, useEditorState } from "@tiptap/react";
import React, { useState } from "react";
import { useIntl } from "react-intl";

import { isSafeIframeUrl } from "../../../shared/src/contentSerializer";
import { ToolbarButton } from "../components/ToolbarButton";
import {
  DEFAULT_ALLOWED_IFRAME_DOMAINS,
  IframeNodeView,
  IframeNodeViewReadOnly,
  resolveEffectiveDomains,
  type StrapiIframeOptions,
} from "./IframeNodeView";

export {
  DEFAULT_ALLOWED_IFRAME_DOMAINS,
  IframeNodeView,
  IframeNodeViewReadOnly,
  type StrapiIframeOptions,
};

export const StrapiIframe = Node.create<StrapiIframeOptions>({
  name: "iframe",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      enableContentCheck: false,
      allowedDomains: DEFAULT_ALLOWED_IFRAME_DOMAINS,
      sandbox: "allow-scripts allow-popups",
    };
  },

  addAttributes() {
    return {
      "src": { default: null },
      "title": { default: null },
      "width": { default: null },
      "height": { default: 360 },
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
      { tag: 'iframe[data-type="iframe"]' },
      { tag: 'iframe:not([data-type="video"])' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const rawSrc = String(HTMLAttributes.src || "");
    const allowedDomains = resolveEffectiveDomains(this.options.allowedDomains);
    const safeSrc = isSafeIframeUrl(rawSrc, allowedDomains)
      ? rawSrc
      : "about:blank";

    return [
      "iframe",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "src": safeSrc,
        "data-type": "iframe",
        "sandbox": this.options.sandbox,
        "loading": "lazy",
      }),
    ];
  },

  addNodeView() {
    if (this.options.enableContentCheck) {
      return ReactNodeViewRenderer(IframeNodeViewReadOnly);
    }
    return ReactNodeViewRenderer(IframeNodeView);
  },
});

/**
 * Provides toolbar button and dialog for embedding sandboxed HTTPS iframes from allowed domains.
 */
export function useIframe(
  editor: Editor | null,
  props: { disabled?: boolean; allowedDomains?: string[] } = { disabled: false }
) {
  const { formatMessage } = useIntl();
  const [showDialog, setShowDialog] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [height, setHeight] = useState("360");
  const [error, setError] = useState<string | null>(null);

  const effectiveAllowedDomains = resolveEffectiveDomains(props.allowedDomains);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      isInCodeBlock: ctx.editor?.isActive("codeBlock") ?? false,
    }),
  });

  const handleInsert = () => {
    if (!editor) return;
    const trimmed = url.trim();
    if (!isSafeIframeUrl(trimmed, effectiveAllowedDomains)) {
      setError(
        formatMessage(
          {
            id: "tiptap-editor.iframe.invalidUrlWithDomains",
            defaultMessage:
              "URL must use https:// and match allowed domains: {domains}",
          },
          { domains: effectiveAllowedDomains.join(", ") }
        )
      );
      return;
    }

    const parsedHeight = parseInt(height, 10);
    editor
      .chain()
      .focus()
      .insertContent({
        type: "iframe",
        attrs: {
          src: trimmed,
          title:
            title.trim() ||
            formatMessage({
              id: "tiptap-editor.iframe.embeddedTitle",
              defaultMessage: "Embedded content",
            }),
          height:
            !Number.isNaN(parsedHeight) && parsedHeight >= 100
              ? parsedHeight
              : 360,
        },
      })
      .createParagraphNear()
      .run();

    setUrl("");
    setTitle("");
    setHeight("360");
    setError(null);
    setShowDialog(false);
  };

  const iframeButton = (
    <ToolbarButton
      onClick={() => {
        setError(null);
        setShowDialog(true);
      }}
      icon={<CodeBlock />}
      active={false}
      disabled={
        props.disabled || !editor || (editorState?.isInCodeBlock ?? false)
      }
      tooltip={formatMessage({
        id: "tiptap-editor.toolbar.insertIframe",
        defaultMessage: "Embed iframe (HTTPS)",
      })}
    />
  );

  const iframeDialog = (
    <Dialog.Root open={showDialog} onOpenChange={setShowDialog}>
      <Dialog.Content>
        <Dialog.Header>
          {formatMessage({
            id: "tiptap-editor.iframe.dialogTitle",
            defaultMessage: "Embed HTTPS Iframe",
          })}
        </Dialog.Header>
        <Dialog.Body>
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Field.Root name="iframeUrl" error={error ?? undefined}>
              <Field.Label>
                {formatMessage({
                  id: "tiptap-editor.iframe.urlLabel",
                  defaultMessage: "HTTPS Embed URL",
                })}
              </Field.Label>
              <TextInput
                placeholder="https://..."
                value={url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
              />
              <Field.Error />
            </Field.Root>
            <Field.Root name="iframeTitle">
              <Field.Label>
                {formatMessage({
                  id: "tiptap-editor.iframe.titleLabel",
                  defaultMessage: "Title (accessibility)",
                })}
              </Field.Label>
              <TextInput
                placeholder={formatMessage({
                  id: "tiptap-editor.iframe.titleInputPlaceholder",
                  defaultMessage: "Interactive map or widget description",
                })}
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTitle(e.target.value)
                }
              />
            </Field.Root>
            <Field.Root name="iframeHeight">
              <Field.Label>
                {formatMessage({
                  id: "tiptap-editor.iframe.heightLabel",
                  defaultMessage: "Height (px)",
                })}
              </Field.Label>
              <TextInput
                type="number"
                value={height}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setHeight(e.target.value)
                }
              />
            </Field.Root>
            <Typography variant="pi" textColor="neutral600">
              {formatMessage({
                id: "tiptap-editor.iframe.sandboxNotice",
                defaultMessage:
                  "Embedded iframes are automatically sandboxed and lazy-loaded.",
              })}
            </Typography>
          </Flex>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.Cancel>
            <Button variant="tertiary" onClick={() => setShowDialog(false)}>
              {formatMessage({
                id: "tiptap-editor.iframe.cancel",
                defaultMessage: "Cancel",
              })}
            </Button>
          </Dialog.Cancel>
          <Button onClick={handleInsert} disabled={!url.trim()}>
            {formatMessage({
              id: "tiptap-editor.iframe.insert",
              defaultMessage: "Embed",
            })}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );

  return { iframeButton, iframeDialog };
}
