import { Badge, Box, Button, Flex, TextInput, Typography } from "@strapi/design-system";
import * as React from "react";

import type { ChecklistItem, FormTranslation } from "../../../../shared";

export const SUPPORTED_FORM_LOCALES = ["es", "en", "ar"] as const;

export interface FormChecklistAndLocalePanelsProps {
  t: (id: string, defaultMessage: string) => string;
  checklistItems: ChecklistItem[];
  newChecklistLabel: string;
  onNewChecklistLabelChange: (val: string) => void;
  onAddChecklistItem: () => void;
  onRemoveChecklistItem: (id: string) => void;
  onUpdateChecklistItemLabel?: (id: string, value: string) => void;
  activeLocale: string;
  onActiveLocaleChange: (loc: string) => void;
  translations: Record<string, FormTranslation>;
  onUpdateTranslationField: (key: keyof FormTranslation, value: string) => void;
}

export const FormChecklistAndLocalePanels: React.FC<FormChecklistAndLocalePanelsProps> = ({
  t,
  checklistItems,
  newChecklistLabel,
  onNewChecklistLabelChange,
  onAddChecklistItem,
  onRemoveChecklistItem,
  onUpdateChecklistItemLabel,
  activeLocale,
  onActiveLocaleChange,
  translations,
  onUpdateTranslationField,
}) => {
  const currentTranslation: FormTranslation = translations[activeLocale] || {};

  return (
    <Flex gap={5} paddingTop={4} wrap="wrap" alignItems="flex-start">
      <Box padding={4} background="neutral100" hasRadius style={{ flex: "1 1 340px" }}>
        <Flex justifyContent="space-between" alignItems="center">
          <Typography variant="sigma" textColor="neutral600">
            {t("page.ui.required_verification_documents", "Required Verification Documents")} (
            {checklistItems.length})
          </Typography>
          <Badge>{activeLocale.toUpperCase()}</Badge>
        </Flex>
        <Flex direction="column" alignItems="stretch" gap={2} paddingTop={2}>
          {checklistItems.map((item) => {
            const displayLabel = item.localizedLabels?.[activeLocale] ?? item.label;
            return (
              <Flex
                key={item.id}
                justifyContent="space-between"
                alignItems="center"
                gap={2}
                padding={2}
                background="neutral0"
                hasRadius
              >
                <Box style={{ flex: 1 }}>
                  {onUpdateChecklistItemLabel ? (
                    <TextInput
                      name={`chk_${item.id}`}
                      value={displayLabel}
                      onChange={(e: { target: { value: string } }) =>
                        onUpdateChecklistItemLabel(item.id, e.target.value)
                      }
                    />
                  ) : (
                    <Typography variant="omega">{displayLabel}</Typography>
                  )}
                </Box>
                <Button
                  size="S"
                  variant="danger-light"
                  onClick={() => onRemoveChecklistItem(item.id)}
                >
                  {t("page.ui.remove", "Remove")}
                </Button>
              </Flex>
            );
          })}
          <Flex gap={2} paddingTop={2}>
            <Box style={{ flex: 1 }}>
              <TextInput
                name="newChecklistLabel"
                placeholder={t(
                  "placeholder.add_required_document",
                  "Add required document (e.g., Valid National ID)..."
                )}
                value={newChecklistLabel}
                onChange={(e: { target: { value: string } }) =>
                  onNewChecklistLabelChange(e.target.value)
                }
              />
            </Box>
            <Button size="S" variant="secondary" onClick={onAddChecklistItem}>
              {t("page.ui.add_item", "+ Add")}
            </Button>
          </Flex>
        </Flex>
      </Box>

      <Box padding={4} background="neutral100" hasRadius style={{ flex: "1 1 360px" }}>
        <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
          <Typography variant="sigma" textColor="neutral600">
            {t("page.ui.form_localization_header", "Form Localization (es / en / ar)")}
          </Typography>
          <Flex gap={1}>
            {SUPPORTED_FORM_LOCALES.map((loc) => (
              <Button
                key={loc}
                size="S"
                variant={activeLocale === loc ? "default" : "tertiary"}
                onClick={() => onActiveLocaleChange(loc)}
              >
                {loc.toUpperCase()}
              </Button>
            ))}
          </Flex>
        </Flex>

        <Flex direction="column" alignItems="stretch" gap={2}>
          <TextInput
            name="localizedTitle"
            placeholder={`${t("placeholder.localized_title", "Localized title")} (${activeLocale})`}
            value={currentTranslation.title || ""}
            onChange={(e: { target: { value: string } }) =>
              onUpdateTranslationField("title", e.target.value)
            }
          />
          <TextInput
            name="localizedDescription"
            placeholder={`${t("placeholder.localized_description", "Localized description")} (${activeLocale})`}
            value={currentTranslation.description || ""}
            onChange={(e: { target: { value: string } }) =>
              onUpdateTranslationField("description", e.target.value)
            }
          />
          <Flex gap={2}>
            <Box style={{ flex: 1 }}>
              <TextInput
                name="localizedSubmit"
                placeholder={`${t("placeholder.localized_submit_label", "Submit label")} (${activeLocale})`}
                value={currentTranslation.submitButtonLabel || ""}
                onChange={(e: { target: { value: string } }) =>
                  onUpdateTranslationField("submitButtonLabel", e.target.value)
                }
              />
            </Box>
            <Box style={{ flex: 1 }}>
              <TextInput
                name="localizedSuccess"
                placeholder={`${t("placeholder.localized_success_message", "Success message")} (${activeLocale})`}
                value={currentTranslation.successMessage || ""}
                onChange={(e: { target: { value: string } }) =>
                  onUpdateTranslationField("successMessage", e.target.value)
                }
              />
            </Box>
          </Flex>
          <Flex gap={1} paddingTop={1}>
            {SUPPORTED_FORM_LOCALES.map((loc) =>
              translations[loc]?.title ? (
                <Badge key={loc}>
                  {loc.toUpperCase()} {t("page.ui.ready", "Ready")}
                </Badge>
              ) : null
            )}
          </Flex>
        </Flex>
      </Box>
    </Flex>
  );
};
