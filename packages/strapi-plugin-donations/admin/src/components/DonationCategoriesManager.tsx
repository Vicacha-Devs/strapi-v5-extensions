import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Field,
  Flex,
  TextInput,
  Typography,
} from "@strapi/design-system";
import React, { useState } from "react";
import { useIntl } from "react-intl";

import { PLUGIN_ID, type DonationCategoryConfig } from "../../../shared";

export interface DonationCategoriesManagerProps {
  categories: DonationCategoryConfig[];
  defaultLocale: string;
  supportedLocales: string[];
  onChange: (nextCategories: DonationCategoryConfig[]) => void;
}

const cardBorderStyle: React.CSSProperties = {
  border: "1px solid rgba(128, 128, 128, 0.22)",
};

function sanitizeCategoryKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export const DonationCategoriesManager: React.FC<
  DonationCategoriesManagerProps
> = ({ categories, defaultLocale, supportedLocales, onChange }) => {
  const { formatMessage } = useIntl();
  const t = (
    id: string,
    defaultMessage: string,
    values?: Record<string, string | number>
  ) => formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage }, values);

  const [newKey, setNewKey] = useState("");
  const [newPrimaryLabel, setNewPrimaryLabel] = useState("");
  const [newSecondaryLabel, setNewSecondaryLabel] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTaxDeductible, setNewTaxDeductible] = useState(true);
  const [newRequiresCalculator, setNewRequiresCalculator] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const primaryLoc = defaultLocale || "es";
  const secondaryLoc = primaryLoc === "en" ? "es" : "en";

  const handleAddCategory = () => {
    const cleanKey = sanitizeCategoryKey(newKey || newPrimaryLabel);
    if (!cleanKey) {
      setErrorMsg(
        t(
          "settings.categories.error_key_required",
          "Please provide a valid Category Key."
        )
      );
      return;
    }
    if (!newPrimaryLabel.trim()) {
      setErrorMsg(
        t(
          "settings.categories.error_label_required",
          "Please provide a display label."
        )
      );
      return;
    }

    const labels: Record<string, string> = {};
    const locales =
      supportedLocales.length > 0
        ? supportedLocales
        : [primaryLoc, secondaryLoc];
    for (const loc of locales) {
      labels[loc] = newPrimaryLabel.trim();
    }
    labels[primaryLoc] = newPrimaryLabel.trim();
    if (newSecondaryLabel.trim()) {
      labels[secondaryLoc] = newSecondaryLabel.trim();
    }

    const descriptions: Record<string, string> | undefined =
      newDescription.trim()
        ? Object.fromEntries(locales.map((loc) => [loc, newDescription.trim()]))
        : undefined;

    const nextItem: DonationCategoryConfig = {
      key: cleanKey,
      labels,
      ...(descriptions ? { descriptions } : {}),
      taxDeductible: newTaxDeductible,
      requiresAssessmentCalculator: newRequiresCalculator,
    };

    const existingIdx = categories.findIndex((c) => c.key === cleanKey);
    if (existingIdx >= 0) {
      const updated = [...categories];
      updated[existingIdx] = nextItem;
      onChange(updated);
    } else {
      onChange([...categories, nextItem]);
    }

    setNewKey("");
    setNewPrimaryLabel("");
    setNewSecondaryLabel("");
    setNewDescription("");
    setNewTaxDeductible(true);
    setNewRequiresCalculator(false);
    setErrorMsg("");
  };

  const handleRemoveCategory = (keyToRemove: string) => {
    onChange(categories.filter((c) => c.key !== keyToRemove));
  };

  const handleToggleFlag = (
    key: string,
    field: "taxDeductible" | "requiresAssessmentCalculator",
    checked: boolean
  ) => {
    onChange(
      categories.map((cat) =>
        cat.key === key ? { ...cat, [field]: checked } : cat
      )
    );
  };

  return (
    <Box
      padding={6}
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
    >
      <Flex
        justifyContent="space-between"
        alignItems="flex-start"
        wrap="wrap"
        gap={3}
      >
        <Box>
          <Typography variant="beta" as="h2">
            {t("settings.categories.title", "Donation Categories Manager")}
          </Typography>
          <Box paddingTop={1}>
            <Typography variant="pi" textColor="neutral600">
              {t(
                "settings.categories.subtitle",
                "Define category keys (e.g., sadaqah, zakat, utility_bills, waqf, iftar, general_fund) available in the Campaign Composer and donor pledge forms."
              )}
            </Typography>
          </Box>
        </Box>
        <Badge>
          {t(
            "settings.categories.count_badge",
            "{count} Categories Configured",
            {
              count: categories.length,
            }
          )}
        </Badge>
      </Flex>

      {/* Add / Update Category Form */}
      <Box
        marginTop={4}
        padding={4}
        background="neutral100"
        hasRadius
        style={cardBorderStyle}
      >
        <Typography variant="delta" as="h3">
          {t("settings.categories.add_heading", "Add or Update Category Key")}
        </Typography>
        <Box
          paddingTop={3}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 16,
          }}
        >
          <Field.Root
            name="newCategoryKey"
            required
            hint={t(
              "settings.categories.hint_key",
              "Lowercase identifier stored on campaigns & pledges."
            )}
          >
            <Field.Label>
              {t("settings.categories.field_key", "Category Key (slug)")}
            </Field.Label>
            <TextInput
              name="newCategoryKey"
              placeholder={t(
                "settings.categories.placeholder_key",
                "e.g., general_fund, orphan_support"
              )}
              value={newKey}
              onChange={(e: { target: { value: string } }) => {
                setNewKey(e.target.value);
                setErrorMsg("");
              }}
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root name="newCategoryPrimaryLabel" required>
            <Field.Label>
              {t(
                "settings.categories.field_primary_label",
                "Display Label ({locale})",
                {
                  locale: primaryLoc.toUpperCase(),
                }
              )}
            </Field.Label>
            <TextInput
              name="newCategoryPrimaryLabel"
              placeholder={t(
                "settings.categories.placeholder_primary_label",
                "e.g., Fondo General de la Mezquita"
              )}
              value={newPrimaryLabel}
              onChange={(e: { target: { value: string } }) => {
                setNewPrimaryLabel(e.target.value);
                if (!newKey) {
                  setNewKey(sanitizeCategoryKey(e.target.value));
                }
                setErrorMsg("");
              }}
            />
          </Field.Root>

          <Field.Root name="newCategorySecondaryLabel">
            <Field.Label>
              {t(
                "settings.categories.field_secondary_label",
                "Translated Label ({locale})",
                {
                  locale: secondaryLoc.toUpperCase(),
                }
              )}
            </Field.Label>
            <TextInput
              name="newCategorySecondaryLabel"
              placeholder={t(
                "settings.categories.placeholder_secondary_label",
                "e.g., General Mosque Fund"
              )}
              value={newSecondaryLabel}
              onChange={(e: { target: { value: string } }) =>
                setNewSecondaryLabel(e.target.value)
              }
            />
          </Field.Root>

          <Field.Root name="newCategoryDescription">
            <Field.Label>
              {t(
                "settings.categories.field_description",
                "Short Description (optional)"
              )}
            </Field.Label>
            <TextInput
              name="newCategoryDescription"
              placeholder={t(
                "settings.categories.placeholder_description",
                "e.g., Supports daily operations and community welfare."
              )}
              value={newDescription}
              onChange={(e: { target: { value: string } }) =>
                setNewDescription(e.target.value)
              }
            />
          </Field.Root>
        </Box>

        <Flex
          gap={4}
          paddingTop={3}
          wrap="wrap"
          alignItems="center"
          justifyContent="space-between"
        >
          <Flex gap={4} wrap="wrap">
            <Checkbox
              checked={newTaxDeductible}
              onCheckedChange={(val: boolean) =>
                setNewTaxDeductible(Boolean(val))
              }
            >
              {t(
                "settings.categories.tax_deductible",
                "Eligible for Tax Certificate"
              )}
            </Checkbox>
            <Checkbox
              checked={newRequiresCalculator}
              onCheckedChange={(val: boolean) =>
                setNewRequiresCalculator(Boolean(val))
              }
            >
              {t(
                "settings.categories.requires_calculator",
                "Requires Net-Wealth Assessment Calculator (Zakat)"
              )}
            </Checkbox>
          </Flex>
          <Button variant="secondary" onClick={handleAddCategory}>
            {t("settings.categories.add_button", "+ Add / Update Category")}
          </Button>
        </Flex>

        {errorMsg ? (
          <Box paddingTop={2}>
            <Typography variant="pi" textColor="danger600">
              {errorMsg}
            </Typography>
          </Box>
        ) : null}
      </Box>

      <Box paddingTop={4} paddingBottom={2}>
        <Divider />
      </Box>

      {/* Configured Categories List */}
      <Flex direction="column" alignItems="stretch" gap={3} paddingTop={2}>
        {categories.length === 0 ? (
          <Box padding={4} background="neutral100" hasRadius>
            <Typography textColor="neutral600">
              {t(
                "settings.categories.empty",
                "No categories configured yet. Add one above."
              )}
            </Typography>
          </Box>
        ) : (
          categories.map((cat) => {
            const labelPrimary =
              cat.labels?.[primaryLoc] ||
              cat.labels?.en ||
              cat.labels?.es ||
              cat.key;
            const descPrimary =
              cat.descriptions?.[primaryLoc] ||
              cat.descriptions?.en ||
              cat.descriptions?.es ||
              "";

            return (
              <Box
                key={cat.key}
                padding={4}
                background="neutral0"
                hasRadius
                style={cardBorderStyle}
              >
                <Flex
                  justifyContent="space-between"
                  alignItems="flex-start"
                  wrap="wrap"
                  gap={3}
                >
                  <Flex
                    direction="column"
                    alignItems="flex-start"
                    gap={1}
                    style={{ flex: 1 }}
                  >
                    <Flex gap={2} alignItems="center" wrap="wrap">
                      <Typography fontWeight="bold" textColor="neutral800">
                        {labelPrimary}
                      </Typography>
                      <Badge>{cat.key}</Badge>
                      {cat.taxDeductible && (
                        <Badge
                          backgroundColor="success100"
                          textColor="success700"
                        >
                          {t("settings.categories.badge_tax", "Tax Deductible")}
                        </Badge>
                      )}
                      {cat.requiresAssessmentCalculator && (
                        <Badge
                          backgroundColor="primary100"
                          textColor="primary700"
                        >
                          {t(
                            "settings.categories.badge_calc",
                            "Assessment Calculator"
                          )}
                        </Badge>
                      )}
                    </Flex>
                    {descPrimary ? (
                      <Typography variant="pi" textColor="neutral600">
                        {descPrimary}
                      </Typography>
                    ) : null}
                    <Flex gap={4} paddingTop={1} wrap="wrap">
                      <Checkbox
                        checked={Boolean(cat.taxDeductible)}
                        onCheckedChange={(val: boolean) =>
                          handleToggleFlag(
                            cat.key,
                            "taxDeductible",
                            Boolean(val)
                          )
                        }
                      >
                        {t(
                          "settings.categories.tax_deductible",
                          "Eligible for Tax Certificate"
                        )}
                      </Checkbox>
                      <Checkbox
                        checked={Boolean(cat.requiresAssessmentCalculator)}
                        onCheckedChange={(val: boolean) =>
                          handleToggleFlag(
                            cat.key,
                            "requiresAssessmentCalculator",
                            Boolean(val)
                          )
                        }
                      >
                        {t(
                          "settings.categories.requires_calculator",
                          "Requires Net-Wealth Assessment Calculator (Zakat)"
                        )}
                      </Checkbox>
                    </Flex>
                  </Flex>

                  <Button
                    variant="danger-light"
                    size="S"
                    onClick={() => handleRemoveCategory(cat.key)}
                  >
                    {t("settings.categories.remove_button", "Remove")}
                  </Button>
                </Flex>
              </Box>
            );
          })
        )}
      </Flex>
    </Box>
  );
};
