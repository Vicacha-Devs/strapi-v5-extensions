import {
  Box,
  Typography,
  Field,
  SingleSelect,
  SingleSelectOption,
  Checkbox,
  TextInput,
} from "@strapi/design-system";
import React from "react";
import { useIntl } from "react-intl";

import type {
  TiptapRuntimeSettings,
  TiptapOutputFormat,
} from "../../../shared/src/types";

export interface SettingsGlobalSectionProps {
  settings: TiptapRuntimeSettings;
  presetNames: string[];
  iframeDomainsInput: string;
  getPresetLabel: (presetName: string) => string;
  onChangeDefaultPreset: (preset: string) => void;
  onChangeDefaultOutputFormat: (format: TiptapOutputFormat) => void;
  onChangeIframeDomainsInput: (value: string) => void;
  onChangeRelationalSync: (enabled: boolean) => void;
}

export function SettingsGlobalSection({
  settings,
  presetNames,
  iframeDomainsInput,
  getPresetLabel,
  onChangeDefaultPreset,
  onChangeDefaultOutputFormat,
  onChangeIframeDomainsInput,
  onChangeRelationalSync,
}: SettingsGlobalSectionProps) {
  const { formatMessage } = useIntl();

  return (
    <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius>
      <Box marginBottom={4}>
        <Typography variant="delta" tag="h2">
          {formatMessage({
            id: "tiptap-editor.settings.globalSectionTitle",
            defaultMessage: "Global Configuration",
          })}
        </Typography>
        <Box marginTop={1}>
          <Typography variant="pi" textColor="neutral600">
            {formatMessage({
              id: "tiptap-editor.settings.globalSectionSubtitle",
              defaultMessage:
                "Default editor behavior applied when a Rich Text field does not specify custom options.",
            })}
          </Typography>
        </Box>
      </Box>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "20px",
          alignItems: "start",
        }}
      >
        <Box>
          <Field.Root
            name="defaultPreset"
            hint={formatMessage({
              id: "tiptap-editor.settings.defaultPresetHint",
              defaultMessage:
                "Toolbar preset applied by default to new or unconfigured Tiptap fields.",
            })}
          >
            <Field.Label>
              {formatMessage({
                id: "tiptap-editor.settings.defaultPresetLabel",
                defaultMessage: "Default Preset",
              })}
            </Field.Label>
            <SingleSelect
              value={settings.defaultPreset}
              onChange={(val: string | number) =>
                onChangeDefaultPreset(String(val))
              }
            >
              {presetNames.map((name) => (
                <SingleSelectOption key={name} value={name}>
                  {getPresetLabel(name)}
                </SingleSelectOption>
              ))}
            </SingleSelect>
            <Field.Hint />
          </Field.Root>
        </Box>

        <Box>
          <Field.Root
            name="defaultOutputFormat"
            hint={formatMessage({
              id: "tiptap-editor.settings.defaultOutputFormatWarning",
              defaultMessage:
                "Warning: Changing this default changes the storage format of fields without an explicit outputFormat.",
            })}
          >
            <Field.Label>
              {formatMessage({
                id: "tiptap-editor.settings.defaultOutputFormatLabel",
                defaultMessage: "Default Output Format",
              })}
            </Field.Label>
            <SingleSelect
              value={settings.defaultOutputFormat}
              onChange={(val: string | number) =>
                onChangeDefaultOutputFormat(String(val) as TiptapOutputFormat)
              }
            >
              <SingleSelectOption value="json">
                {formatMessage({
                  id: "tiptap-editor.settings.outputFormatJson",
                  defaultMessage: "JSON (ProseMirror Document)",
                })}
              </SingleSelectOption>
              <SingleSelectOption value="html">
                {formatMessage({
                  id: "tiptap-editor.settings.outputFormatHtml",
                  defaultMessage: "HTML String",
                })}
              </SingleSelectOption>
              <SingleSelectOption value="markdown">
                {formatMessage({
                  id: "tiptap-editor.settings.outputFormatMarkdown",
                  defaultMessage: "Markdown String",
                })}
              </SingleSelectOption>
            </SingleSelect>
            <Field.Hint />
          </Field.Root>
        </Box>

        <Box>
          <Field.Root
            name="allowedIframeDomains"
            hint={formatMessage({
              id: "tiptap-editor.settings.allowedIframeDomainsHint",
              defaultMessage:
                "Comma-separated HTTPS hostnames allowed for embedded iframes (e.g., www.youtube.com, player.vimeo.com).",
            })}
          >
            <Field.Label>
              {formatMessage({
                id: "tiptap-editor.settings.allowedIframeDomainsLabel",
                defaultMessage: "Allowed Iframe Domains (comma-separated)",
              })}
            </Field.Label>
            <TextInput
              name="allowedIframeDomains"
              placeholder="www.youtube.com, player.vimeo.com"
              value={iframeDomainsInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChangeIframeDomainsInput(e.target.value)
              }
            />
            <Field.Hint />
          </Field.Root>
        </Box>
      </div>

      <Box
        marginTop={5}
        padding={4}
        background="neutral100"
        borderColor="neutral200"
        hasRadius
      >
        <Checkbox
          checked={settings.enableRelationalSync}
          onCheckedChange={(checked: boolean) =>
            onChangeRelationalSync(Boolean(checked))
          }
        >
          {formatMessage({
            id: "tiptap-editor.settings.enableRelationalSyncLabel",
            defaultMessage:
              "Automatically sync embedded Media ('<FieldName>'Media) and Internal Links ('<FieldName>'Links)",
          })}
        </Checkbox>
      </Box>
    </Box>
  );
}
