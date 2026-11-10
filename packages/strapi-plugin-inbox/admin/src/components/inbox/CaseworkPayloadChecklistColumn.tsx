import { Badge, Box, Checkbox, Flex, Typography } from "@strapi/design-system";
import * as React from "react";

import type { ChecklistItem, FormRecord } from "../../../../shared";

export function formatFieldKeyLabel(rawKey: string): string {
  return rawKey
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export interface CaseworkPayloadChecklistColumnProps {
  t: (id: string, defaultMessage: string) => string;
  shortLocale: string;
  dataEntries: Array<[string, unknown]>;
  form?: FormRecord | null;
  checklist: ChecklistItem[];
  onToggleChecklistItem: (itemId: string, verified: boolean) => Promise<void>;
}

export const CaseworkPayloadChecklistColumn: React.FC<
  CaseworkPayloadChecklistColumnProps
> = ({
  t,
  shortLocale,
  dataEntries,
  form,
  checklist,
  onToggleChecklistItem,
}) => {
  const resolveFieldLabel = (key: string): string => {
    const matchedField = form?.fields?.find((f) => f.name === key);
    if (matchedField) {
      return (
        matchedField.localizedLabels?.[shortLocale] ||
        matchedField.label ||
        formatFieldKeyLabel(key)
      );
    }
    return formatFieldKeyLabel(key);
  };

  const resolveFieldValue = (key: string, val: unknown): string => {
    if (val === null || val === undefined || val === "") return "-";
    if (typeof val === "object") return JSON.stringify(val);
    const strVal = String(val);
    const matchedField = form?.fields?.find((f) => f.name === key);
    const matchedOption = matchedField?.options?.find(
      (o) => o.value === strVal
    );
    if (matchedOption) {
      return (
        matchedOption.localizedLabels?.[shortLocale] || matchedOption.label
      );
    }
    return strVal;
  };

  return (
    <Box style={{ flex: "1 1 360px" }}>
      <Box paddingBottom={4}>
        <Typography variant="sigma" textColor="neutral600">
          {t("page.ui.submitted_form_payload", "Submitted Form Payload")}
        </Typography>
        <Box background="neutral100" padding={3} hasRadius marginTop={2}>
          {dataEntries.length === 0 ? (
            <Typography variant="pi" textColor="neutral500">
              {t(
                "page.ui.no_payload_fields",
                "No custom payload fields recorded."
              )}
            </Typography>
          ) : (
            <Flex direction="column" alignItems="stretch" gap={0}>
              {dataEntries.map(([key, val], idx) => (
                <Flex
                  key={key}
                  justifyContent="space-between"
                  alignItems="baseline"
                  gap={3}
                  paddingTop={2}
                  paddingBottom={2}
                  style={{
                    borderBottom:
                      idx < dataEntries.length - 1
                        ? "1px solid rgba(128, 128, 128, 0.14)"
                        : "none",
                  }}
                >
                  <Typography
                    variant="pi"
                    fontWeight="bold"
                    textColor="neutral600"
                    style={{ textTransform: "capitalize" }}
                  >
                    {resolveFieldLabel(key)}
                  </Typography>
                  <Typography
                    variant="pi"
                    fontWeight="semiBold"
                    textColor="neutral800"
                    style={{ textAlign: "right" }}
                  >
                    {resolveFieldValue(key, val)}
                  </Typography>
                </Flex>
              ))}
            </Flex>
          )}
        </Box>
      </Box>

      <Box>
        <Typography variant="sigma" textColor="neutral600">
          {t(
            "page.ui.document_verification_checklist",
            "Document Verification Checklist"
          )}{" "}
          ({checklist.filter((c) => c.verified).length}/{checklist.length})
        </Typography>
        <Box background="neutral100" padding={3} hasRadius marginTop={2}>
          {checklist.length === 0 ? (
            <Typography variant="pi" textColor="neutral500">
              {t(
                "page.ui.no_checklist",
                "No verification checklist attached to this form."
              )}
            </Typography>
          ) : (
            <Flex direction="column" alignItems="stretch" gap={2}>
              {checklist.map((item) => (
                <Flex
                  key={item.id}
                  justifyContent="space-between"
                  alignItems="center"
                  gap={2}
                >
                  <Checkbox
                    checked={Boolean(item.verified)}
                    onCheckedChange={(checked: boolean) =>
                      onToggleChecklistItem(item.id, Boolean(checked))
                    }
                  >
                    {item.localizedLabels?.[shortLocale] || item.label}
                  </Checkbox>
                  <Badge active={Boolean(item.verified)}>
                    {item.verified
                      ? t("page.ui.verified", "Verified")
                      : item.required
                        ? t("page.ui.required", "Required")
                        : t("page.ui.optional", "Optional")}
                  </Badge>
                </Flex>
              ))}
            </Flex>
          )}
        </Box>
      </Box>
    </Box>
  );
};
