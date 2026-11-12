import { TextInput, IconButton, Field, Button } from "@strapi/design-system";
import { Trash, Cross, ArrowClockwise } from "@strapi/icons";
import React from "react";
import { useIntl } from "react-intl";

import { TextAlignCenter } from "../icons/TextAlignCenter";
import { TextAlignLeft } from "../icons/TextAlignLeft";
import { TextAlignRight } from "../icons/TextAlignRight";
import { ToolbarButton } from "./ToolbarButton";

export interface ImageAltPopoverFormProps {
  currentAlign: "left" | "center" | "right" | null;
  resizeEnabled: boolean;
  widthInput: string;
  heightInput: string;
  hasCustomDimensions: boolean;
  altText: string;
  title: string;
  caption: string;
  assetId: number | null;
  onAlign: (value: "left" | "center" | "right") => void;
  onOpenEditor: () => void;
  onWidthChange: (value: string) => void;
  onWidthCommit: () => void;
  onHeightChange: (value: string) => void;
  onHeightCommit: () => void;
  onResetSize: () => void;
  onAltChange: (value: string) => void;
  onAltCommit: () => void;
  onTitleChange: (value: string) => void;
  onTitleCommit: () => void;
  onCaptionChange: (value: string) => void;
  onCaptionCommit: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFillFromMediaLibrary: () => void;
  onDeleteNode: () => void;
}

/**
 * Form fields rendered inside the ImageNodeView popover for alignment, dimensions, metadata, and actions.
 */
export function ImageAltPopoverForm({
  currentAlign,
  resizeEnabled,
  widthInput,
  heightInput,
  hasCustomDimensions,
  altText,
  title,
  caption,
  assetId,
  onAlign,
  onOpenEditor,
  onWidthChange,
  onWidthCommit,
  onHeightChange,
  onHeightCommit,
  onResetSize,
  onAltChange,
  onAltCommit,
  onTitleChange,
  onTitleCommit,
  onCaptionChange,
  onCaptionCommit,
  onKeyDown,
  onFillFromMediaLibrary,
  onDeleteNode,
}: ImageAltPopoverFormProps) {
  const { formatMessage } = useIntl();

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "8px",
          paddingBottom: "0",
        }}
      >
        <Field.Root>
          <Field.Label>
            {formatMessage({
              id: "tiptap-editor.image.alignment",
              defaultMessage: "Alignment",
            })}
          </Field.Label>
          <div style={{ display: "flex", gap: "4px" }}>
            <ToolbarButton
              onClick={() => onAlign("left")}
              icon={<TextAlignLeft />}
              active={currentAlign === "left"}
              toggle
              disabled={false}
              tooltip={formatMessage({
                id: "tiptap-editor.image.alignLeft",
                defaultMessage: "Align left",
              })}
              marginLeft={0}
            />
            <ToolbarButton
              onClick={() => onAlign("center")}
              icon={<TextAlignCenter />}
              active={currentAlign === "center"}
              toggle
              disabled={false}
              tooltip={formatMessage({
                id: "tiptap-editor.image.alignCenter",
                defaultMessage: "Align center",
              })}
              marginLeft={0}
            />
            <ToolbarButton
              onClick={() => onAlign("right")}
              icon={<TextAlignRight />}
              active={currentAlign === "right"}
              toggle
              disabled={false}
              tooltip={formatMessage({
                id: "tiptap-editor.image.alignRight",
                defaultMessage: "Align right",
              })}
              marginLeft={0}
            />
            <ToolbarButton
              onClick={onOpenEditor}
              icon={
                <span style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                  {formatMessage({
                    id: "tiptap-editor.image.cropEditLabel",
                    defaultMessage: "Crop/Edit",
                  })}
                </span>
              }
              active={false}
              disabled={false}
              tooltip={formatMessage({
                id: "tiptap-editor.image.openEditor",
                defaultMessage: "Edit image (crop, rotate, caption)",
              })}
              marginLeft={0}
            />
          </div>
        </Field.Root>
        {resizeEnabled && (
          <Field.Root>
            <Field.Label>
              {formatMessage({
                id: "tiptap-editor.image.size",
                defaultMessage: "Size (px)",
              })}
            </Field.Label>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <TextInput
                type="number"
                placeholder="W"
                value={widthInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onWidthChange(e.target.value)
                }
                onBlur={onWidthCommit}
                onKeyDown={onKeyDown}
                aria-label={formatMessage({
                  id: "tiptap-editor.image.width",
                  defaultMessage: "Width (px)",
                })}
                style={{ minWidth: "62px", flexGrow: 1 }}
              />
              <span style={{ fontSize: "1.1rem", color: "#999" }}>&times;</span>
              <TextInput
                type="number"
                placeholder="H"
                value={heightInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onHeightChange(e.target.value)
                }
                onBlur={onHeightCommit}
                onKeyDown={onKeyDown}
                aria-label={formatMessage({
                  id: "tiptap-editor.image.height",
                  defaultMessage: "Height (px)",
                })}
                style={{ minWidth: "62px", flexGrow: 1 }}
              />
              {hasCustomDimensions && (
                <IconButton
                  onClick={onResetSize}
                  label={formatMessage({
                    id: "tiptap-editor.image.resetSize",
                    defaultMessage: "Reset size",
                  })}
                >
                  <Cross />
                </IconButton>
              )}
            </div>
          </Field.Root>
        )}
        <Field.Root>
          <Field.Label>
            {formatMessage({
              id: "tiptap-editor.image.altText",
              defaultMessage: "Alt text",
            })}
          </Field.Label>
          <TextInput
            value={altText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onAltChange(e.target.value)
            }
            onBlur={onAltCommit}
            onKeyDown={onKeyDown}
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>
            {formatMessage({
              id: "tiptap-editor.image.title",
              defaultMessage: "Title",
            })}
          </Field.Label>
          <TextInput
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onTitleChange(e.target.value)
            }
            onBlur={onTitleCommit}
            onKeyDown={onKeyDown}
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>
            {formatMessage({
              id: "tiptap-editor.image.caption",
              defaultMessage: "Caption",
            })}
          </Field.Label>
          <TextInput
            value={caption}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onCaptionChange(e.target.value)
            }
            onBlur={onCaptionCommit}
            onKeyDown={onKeyDown}
          />
        </Field.Root>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "8px",
          padding: "8px",
        }}
      >
        <Button
          variant="tertiary"
          size="S"
          startIcon={<ArrowClockwise />}
          disabled={!assetId}
          onClick={onFillFromMediaLibrary}
        >
          {formatMessage({
            id: "tiptap-editor.image.fillFromMediaLibrary",
            defaultMessage: "Use Media Library data",
          })}
        </Button>
        <Button
          variant="danger-light"
          size="S"
          startIcon={<Trash />}
          onClick={onDeleteNode}
        >
          {formatMessage({
            id: "tiptap-editor.image.deleteImage",
            defaultMessage: "Delete image",
          })}
        </Button>
      </div>
    </>
  );
}
