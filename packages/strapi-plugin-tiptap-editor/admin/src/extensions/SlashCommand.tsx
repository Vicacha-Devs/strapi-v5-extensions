import { Popover, TextInput } from "@strapi/design-system";
import { Plus } from "@strapi/icons";
import type { Editor } from "@tiptap/core";
import React, { useState } from "react";
import { useIntl } from "react-intl";

import {
  isFeatureEnabled,
  type TiptapPresetConfig,
} from "../../../shared/src/types";
import { ToolbarButton } from "../components/ToolbarButton";
import {
  getRegisteredTiptapExtensions,
  isCustomExtensionEnabledForPreset,
} from "../utils/customExtensionRegistry";
import {
  SLASH_COMMAND_ITEMS,
  type SlashCommandItem,
  type SlashCommandTranslator,
} from "./slashCommandItems";

export {
  SLASH_COMMAND_ITEMS,
  type SlashCommandItem,
  type SlashCommandTranslator,
};

/**
 * React hook providing the quick-insert slash command popover menu and toolbar button.
 */
export function useSlashCommand(
  editor: Editor | null,
  props: {
    disabled?: boolean;
    config?: TiptapPresetConfig;
    onOpenCustomDialog?: (extensionId: string) => void;
  } = { disabled: false }
) {
  const { formatMessage } = useIntl();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const builtInItems = SLASH_COMMAND_ITEMS.map((item) => ({
    ...item,
    isCustom: false,
    openExtensionDialogId: undefined as string | undefined,
    customAction: undefined as
      | ((
          ed: Editor,
          fmt: (descriptor: { id: string; defaultMessage: string }) => string,
          helpers?: { openDialog: (extId?: string) => void }
        ) => void)
      | undefined,
    label: formatMessage({
      id: `tiptap-editor.slash.${item.id}.label`,
      defaultMessage: item.label.replaceAll("<details>", "'<details>'"),
    }),
    description: formatMessage({
      id: `tiptap-editor.slash.${item.id}.description`,
      defaultMessage: item.description,
    }),
  }));

  const customItems = getRegisteredTiptapExtensions().flatMap((ext) => {
    if (props.config && !isCustomExtensionEnabledForPreset(ext, props.config)) {
      return [];
    }
    return (ext.slashCommands ?? []).map((cmd) => ({
      id: cmd.id,
      featureKey: (ext.featureKey || ext.id) as keyof TiptapPresetConfig,
      isCustom: true,
      openExtensionDialogId: cmd.openExtensionDialogId,
      customAction: cmd.action,
      label: formatMessage({
        id: cmd.labelId || `tiptap-editor.slash.${cmd.id}.label`,
        defaultMessage: cmd.defaultLabel,
      }),
      description: formatMessage({
        id: cmd.descriptionId || `tiptap-editor.slash.${cmd.id}.description`,
        defaultMessage: cmd.defaultDescription,
      }),
      keywords: cmd.keywords,
      isAvailable: cmd.isAvailable,
      action: () => undefined,
    }));
  });

  const localizedItems = [...builtInItems, ...customItems];

  const filteredItems = localizedItems.filter((item) => {
    if (
      !item.isCustom &&
      props.config &&
      !isFeatureEnabled(props.config[item.featureKey])
    ) {
      return false;
    }
    if (editor && item.isAvailable && !item.isAvailable(editor)) return false;
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  const handleSelect = (item: (typeof localizedItems)[number]) => {
    if (!editor) return;
    if (
      !item.isCustom &&
      props.config &&
      !isFeatureEnabled(props.config[item.featureKey])
    )
      return;
    if (item.isAvailable && !item.isAvailable(editor)) return;
    if (item.isCustom) {
      if (item.customAction) {
        item.customAction(editor, (descriptor) => formatMessage(descriptor), {
          openDialog: (extId?: string) => {
            const targetId = extId || item.openExtensionDialogId;
            if (targetId) props.onOpenCustomDialog?.(targetId);
          },
        });
      } else if (item.openExtensionDialogId) {
        props.onOpenCustomDialog?.(item.openExtensionDialogId);
      }
    } else {
      item.action(editor, (id, defaultMessage, values) =>
        formatMessage({ id, defaultMessage }, values)
      );
    }
    setOpen(false);
    setFilter("");
  };

  const tooltipLabel = formatMessage({
    id: "tiptap-editor.toolbar.slashCommands",
    defaultMessage: "Quick Insert Block (/ Slash Menu)",
  });

  const triggerButton = (
    <ToolbarButton
      onClick={() => undefined}
      icon={<Plus />}
      active={open}
      disabled={!editor || props.disabled}
      tooltip={tooltipLabel}
    />
  );

  return {
    slashCommandTrigger: triggerButton,
    slashCommandButton: (
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger>{triggerButton}</Popover.Trigger>
        <Popover.Content side="bottom">
          <div style={{ padding: "10px", width: "280px" }}>
            <TextInput
              placeholder={formatMessage({
                id: "tiptap-editor.slash.filterPlaceholder",
                defaultMessage: "Filter blocks (e.g. callout, columns, toc)...",
              })}
              value={filter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFilter(e.target.value)
              }
              aria-label={formatMessage({
                id: "tiptap-editor.slash.filterAria",
                defaultMessage: "Filter blocks",
              })}
            />
            <div
              role="group"
              aria-label={formatMessage({
                id: "tiptap-editor.slash.listAria",
                defaultMessage: "Quick insert blocks",
              })}
              style={{
                maxHeight: "240px",
                overflowY: "auto",
                marginTop: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    borderRadius: "4px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "1.3rem",
                      fontWeight: 600,
                      color: "#32324d",
                    }}
                  >
                    {item.label}
                  </div>
                  <div style={{ fontSize: "1.1rem", color: "#666687" }}>
                    {item.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Popover.Content>
      </Popover.Root>
    ),
  };
}
