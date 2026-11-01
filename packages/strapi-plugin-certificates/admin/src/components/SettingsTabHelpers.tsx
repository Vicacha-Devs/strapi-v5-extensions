import { Box, Checkbox, Field, Tabs, TextInput } from "@strapi/design-system";
import React from "react";

export const SUB_CARD_BORDER: React.CSSProperties = {
  border: "1px solid rgba(128, 128, 128, 0.18)",
};

export const INLINE_CODE_STYLE: React.CSSProperties = {
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "0.88em",
  padding: "2px 6px",
  borderRadius: 4,
  background: "rgba(128, 128, 128, 0.16)",
  border: "1px solid rgba(128, 128, 128, 0.25)",
};

export const gridStyle = (cols: number): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
  gap: 20,
});

export const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <code style={INLINE_CODE_STYLE}>{children}</code>
);

export const renderCheckbox = (
  checked: boolean,
  onChange: (val: boolean) => void,
  children: React.ReactNode
) => (
  <Checkbox
    checked={checked}
    onCheckedChange={(val: boolean) => onChange(Boolean(val))}
  >
    {children}
  </Checkbox>
);

export const renderField = (
  label: string,
  hint: string,
  placeholder: string,
  value: string,
  onChange: (val: string) => void
) => (
  <Field.Root hint={hint}>
    <Field.Label>{label}</Field.Label>
    <TextInput
      placeholder={placeholder}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        onChange(e.target.value)
      }
    />
    <Field.Hint />
  </Field.Root>
);

export const TabPanelBox: React.FC<{
  value: string;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <Tabs.Content value={value}>
    <Box
      padding={6}
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
    >
      {children}
    </Box>
  </Tabs.Content>
);
