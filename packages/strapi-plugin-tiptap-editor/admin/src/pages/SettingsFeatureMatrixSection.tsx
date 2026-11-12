import {
  Badge,
  Box,
  Flex,
  Typography,
  Button,
  Divider,
  Field,
  SingleSelect,
  SingleSelectOption,
  Checkbox,
  Tabs,
} from "@strapi/design-system";
import { useIntl } from "react-intl";

import {
  PRESET_FEATURE_KEYS,
  type PresetFeatureKey,
} from "../../../shared/src/types";
import {
  FEATURE_CATEGORIES,
  FEATURE_DEFAULT_LABELS,
  isPresetFeatureKeyEnabled,
  formatFallbackPresetName,
} from "./settingsConstants";

export interface SettingsFeatureMatrixSectionProps {
  selectedPreset: string;
  presetNames: string[];
  currentPresetConfig: Record<string, unknown>;
  enabledFeaturesCount: number;
  hasCustomPresetOverrides: boolean;
  onSelectPreset: (presetName: string) => void;
  onToggleFeature: (featureKey: PresetFeatureKey, enabled: boolean) => void;
  onBulkToggleFeatures: (
    featureKeys: PresetFeatureKey[],
    enabled: boolean
  ) => void;
  onResetPresetOverrides: () => void;
}

/**
 * Renders the Preset Feature Matrix tab content inside SettingsPage.
 */
export function SettingsFeatureMatrixSection({
  selectedPreset,
  presetNames,
  currentPresetConfig,
  enabledFeaturesCount,
  hasCustomPresetOverrides,
  onSelectPreset,
  onToggleFeature,
  onBulkToggleFeatures,
  onResetPresetOverrides,
}: SettingsFeatureMatrixSectionProps) {
  const { formatMessage } = useIntl();

  const getPresetLabel = (presetName: string): string =>
    formatMessage({
      id: `tiptap-editor.settings.presetName.${presetName}`,
      defaultMessage: formatFallbackPresetName(presetName),
    });

  const getFeatureLabel = (featureKey: PresetFeatureKey): string =>
    formatMessage({
      id: `tiptap-editor.settings.feature.${featureKey}`,
      defaultMessage: Object.prototype.hasOwnProperty.call(
        FEATURE_DEFAULT_LABELS,
        featureKey
      )
        ? FEATURE_DEFAULT_LABELS[featureKey]
        : featureKey,
    });

  return (
    <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius>
      <Flex
        justifyContent="space-between"
        alignItems="flex-start"
        marginBottom={4}
        wrap="wrap"
        gap={4}
      >
        <Box>
          <Flex alignItems="center" gap={3}>
            <Typography variant="delta" tag="h2">
              {formatMessage({
                id: "tiptap-editor.settings.presetMatrixTitle",
                defaultMessage: "Preset Feature Matrix",
              })}
            </Typography>
            <Badge active={enabledFeaturesCount > 0}>
              {formatMessage(
                {
                  id: "tiptap-editor.settings.enabledFeaturesCount",
                  defaultMessage: "{enabled} / {total} enabled",
                },
                {
                  enabled: enabledFeaturesCount,
                  total: PRESET_FEATURE_KEYS.length,
                }
              )}
            </Badge>
          </Flex>
          <Box marginTop={1}>
            <Typography variant="pi" textColor="neutral600">
              {formatMessage({
                id: "tiptap-editor.settings.presetMatrixSubtitle",
                defaultMessage:
                  "Toggle toolbar tools and extensions for the selected preset across all content types.",
              })}
            </Typography>
          </Box>
        </Box>

        <Flex alignItems="flex-end" gap={3} wrap="wrap">
          <Box style={{ minWidth: "220px" }}>
            <Field.Root name="selectedPreset">
              <Field.Label>
                {formatMessage({
                  id: "tiptap-editor.settings.presetMatrixSelectLabel",
                  defaultMessage: "Select preset to configure",
                })}
              </Field.Label>
              <SingleSelect
                aria-label={formatMessage({
                  id: "tiptap-editor.settings.presetMatrixSelectLabel",
                  defaultMessage: "Select preset to configure",
                })}
                value={selectedPreset}
                onChange={(val: string | number) => onSelectPreset(String(val))}
              >
                {presetNames.map((name) => (
                  <SingleSelectOption key={name} value={name}>
                    {getPresetLabel(name)}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
            </Field.Root>
          </Box>

          <Button
            variant="secondary"
            size="S"
            onClick={() => onBulkToggleFeatures([...PRESET_FEATURE_KEYS], true)}
          >
            {formatMessage({
              id: "tiptap-editor.settings.enableAllFeatures",
              defaultMessage: "Enable All",
            })}
          </Button>

          <Button
            variant="tertiary"
            size="S"
            onClick={() =>
              onBulkToggleFeatures([...PRESET_FEATURE_KEYS], false)
            }
          >
            {formatMessage({
              id: "tiptap-editor.settings.disableAllFeatures",
              defaultMessage: "Disable All",
            })}
          </Button>

          {hasCustomPresetOverrides && (
            <Button
              variant="danger-light"
              size="S"
              onClick={onResetPresetOverrides}
            >
              {formatMessage({
                id: "tiptap-editor.settings.resetPresetOverrides",
                defaultMessage: "Reset Defaults",
              })}
            </Button>
          )}
        </Flex>
      </Flex>

      <Divider />

      <Box marginTop={4}>
        <Tabs.Root defaultValue={FEATURE_CATEGORIES[0].id}>
          <Tabs.List
            aria-label={formatMessage({
              id: "tiptap-editor.settings.presetMatrixTitle",
              defaultMessage: "Preset Feature Matrix",
            })}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${FEATURE_CATEGORIES.length}, minmax(0, 1fr))`,
              alignItems: "stretch",
            }}
          >
            {FEATURE_CATEGORIES.map((category) => {
              const categoryEnabledCount = category.features.filter((key) =>
                isPresetFeatureKeyEnabled(currentPresetConfig, key)
              ).length;
              return (
                <Tabs.Trigger
                  key={category.id}
                  value={category.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    paddingBlock: "12px",
                    paddingInline: "12px",
                    minHeight: "64px",
                  }}
                >
                  {formatMessage({
                    id: `tiptap-editor.settings.category.${category.id}`,
                    defaultMessage: category.defaultTitle,
                  })}{" "}
                  ({categoryEnabledCount}/{category.features.length})
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>

          {FEATURE_CATEGORIES.map((category) => {
            const categoryEnabledCount = category.features.filter((key) =>
              isPresetFeatureKeyEnabled(currentPresetConfig, key)
            ).length;
            const allCategoryEnabled =
              categoryEnabledCount === category.features.length;

            return (
              <Tabs.Content key={category.id} value={category.id}>
                <Box padding={4}>
                  <Flex
                    justifyContent="space-between"
                    alignItems="center"
                    marginBottom={3}
                    wrap="wrap"
                    gap={2}
                  >
                    <Flex alignItems="center" gap={2}>
                      <Typography variant="sigma" textColor="neutral700">
                        {formatMessage({
                          id: `tiptap-editor.settings.category.${category.id}`,
                          defaultMessage: category.defaultTitle,
                        })}
                      </Typography>
                      <Badge active={categoryEnabledCount > 0}>
                        {categoryEnabledCount} / {category.features.length}
                      </Badge>
                    </Flex>
                    <Button
                      variant="ghost"
                      size="S"
                      onClick={() =>
                        onBulkToggleFeatures(
                          category.features,
                          !allCategoryEnabled
                        )
                      }
                    >
                      {allCategoryEnabled
                        ? formatMessage({
                            id: "tiptap-editor.settings.disableCategory",
                            defaultMessage: "Deselect category",
                          })
                        : formatMessage({
                            id: "tiptap-editor.settings.enableCategory",
                            defaultMessage: "Select category",
                          })}
                    </Button>
                  </Flex>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: "12px",
                    }}
                  >
                    {category.features.map((featureKey) => {
                      const isChecked = isPresetFeatureKeyEnabled(
                        currentPresetConfig,
                        featureKey
                      );
                      return (
                        <Box
                          key={featureKey}
                          padding={3}
                          background={isChecked ? "primary100" : "neutral100"}
                          borderColor={isChecked ? "primary200" : "neutral200"}
                          hasRadius
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked: boolean) =>
                              onToggleFeature(featureKey, Boolean(checked))
                            }
                          >
                            {getFeatureLabel(featureKey)}
                          </Checkbox>
                        </Box>
                      );
                    })}
                  </div>
                </Box>
              </Tabs.Content>
            );
          })}
        </Tabs.Root>
      </Box>
    </Box>
  );
}
