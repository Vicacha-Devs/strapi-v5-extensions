import { Box, Flex, Typography, Button, Tabs } from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import { useState, useEffect } from "react";
import { useIntl } from "react-intl";

import {
  PRESET_FEATURE_KEYS,
  DEFAULT_RUNTIME_SETTINGS,
  BUILT_IN_PRESETS,
  type PresetFeatureKey,
  type TiptapRuntimeSettings,
} from "../../../shared/src/types";
import {
  FEATURE_DEFAULT_LABELS,
  PRESET_DEFAULT_LABELS,
  FEATURE_CATEGORIES,
  UNSAFE_CONFIG_KEYS,
  isPlainRecord,
  isPresetFeatureKeyEnabled,
  buildNextFeatureOverrideValue,
  formatFallbackPresetName,
  type FeatureCategoryDefinition,
} from "./settingsConstants";
import { SettingsFeatureMatrixSection } from "./SettingsFeatureMatrixSection";
import { SettingsGlobalSection } from "./SettingsGlobalSection";

export {
  FEATURE_DEFAULT_LABELS,
  PRESET_DEFAULT_LABELS,
  FEATURE_CATEGORIES,
  UNSAFE_CONFIG_KEYS,
  isPlainRecord,
  isPresetFeatureKeyEnabled,
  buildNextFeatureOverrideValue,
  formatFallbackPresetName,
  type FeatureCategoryDefinition,
};

/**
 * Global Administration Settings page for the Tiptap Editor plugin.
 * Allows authorized administrators to configure default preset, output format,
 * allowed iframe domains, relational sync, and per-preset feature overrides.
 */
export function SettingsPage() {
  const { formatMessage } = useIntl();
  const { get, put } = useFetchClient();
  const [settings, setSettings] = useState<TiptapRuntimeSettings>(
    DEFAULT_RUNTIME_SETTINGS
  );
  const [selectedPreset, setSelectedPreset] = useState<string>("default");
  const [iframeDomainsInput, setIframeDomainsInput] = useState<string>(
    DEFAULT_RUNTIME_SETTINGS.allowedIframeDomains.join(", ")
  );
  const [availablePresets, setAvailablePresets] = useState<string[]>(
    Object.keys(BUILT_IN_PRESETS)
  );
  const [basePreset, setBasePreset] = useState<Record<string, unknown>>(
    (BUILT_IN_PRESETS.default ?? {}) as Record<string, unknown>
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const getPresetLabel = (presetName: string): string =>
    formatMessage({
      id: `tiptap-editor.settings.presetName.${presetName}`,
      defaultMessage: formatFallbackPresetName(presetName),
    });

  useEffect(() => {
    let mounted = true;
    get("/tiptap-editor/settings")
      .then((res: { data?: TiptapRuntimeSettings }) => {
        if (!mounted || !res?.data) return;
        const loaded: TiptapRuntimeSettings = {
          ...DEFAULT_RUNTIME_SETTINGS,
          ...res.data,
          presetOverrides: res.data.presetOverrides || {},
        };
        setSettings(loaded);
        if (loaded.defaultPreset) {
          setSelectedPreset(loaded.defaultPreset);
        }
        setIframeDomainsInput((loaded.allowedIframeDomains || []).join(", "));
      })
      .catch(() => {
        if (mounted) setLoadError(true);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [get]);

  useEffect(() => {
    let mounted = true;
    get("/tiptap-editor/presets?includeBuiltIn=true")
      .then((res: { data?: { presets?: string[] } }) => {
        if (mounted && Array.isArray(res?.data?.presets)) {
          setAvailablePresets(res.data.presets);
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [get]);

  useEffect(() => {
    let mounted = true;
    const builtInSelected = Object.prototype.hasOwnProperty.call(
      BUILT_IN_PRESETS,
      selectedPreset
    )
      ? ((BUILT_IN_PRESETS[selectedPreset] ?? {}) as Record<string, unknown>)
      : {};
    get(`/tiptap-editor/presets/${encodeURIComponent(selectedPreset)}`)
      .then((res: { data?: Record<string, unknown> }) => {
        if (mounted) {
          setBasePreset(res?.data ?? builtInSelected);
        }
      })
      .catch(() => {
        if (mounted) {
          setBasePreset(builtInSelected);
        }
      });
    return () => {
      mounted = false;
    };
  }, [get, selectedPreset]);

  const builtInPresetForSelected = Object.prototype.hasOwnProperty.call(
    BUILT_IN_PRESETS,
    selectedPreset
  )
    ? (BUILT_IN_PRESETS[selectedPreset] ?? {})
    : {};
  const selectedPresetOverrides =
    settings.presetOverrides &&
    Object.prototype.hasOwnProperty.call(
      settings.presetOverrides,
      selectedPreset
    )
      ? (settings.presetOverrides[selectedPreset] ?? {})
      : {};

  const currentPresetConfig: Record<string, unknown> = {
    ...builtInPresetForSelected,
    ...basePreset,
    ...selectedPresetOverrides,
  };

  const handleToggleFeature = (
    featureKey: PresetFeatureKey,
    enabled: boolean
  ) => {
    if (UNSAFE_CONFIG_KEYS.has(selectedPreset)) return;
    const baseValue = Object.prototype.hasOwnProperty.call(
      basePreset,
      featureKey
    )
      ? basePreset[featureKey]
      : undefined;
    const builtInValue = Object.prototype.hasOwnProperty.call(
      builtInPresetForSelected,
      featureKey
    )
      ? (builtInPresetForSelected as Record<string, unknown>)[featureKey]
      : undefined;
    setSettings((prev) => {
      const prevPresetOverride =
        prev.presetOverrides &&
        Object.prototype.hasOwnProperty.call(
          prev.presetOverrides,
          selectedPreset
        )
          ? (prev.presetOverrides[selectedPreset] ?? {})
          : {};
      const currentOverrideValue = Object.prototype.hasOwnProperty.call(
        prevPresetOverride,
        featureKey
      )
        ? (prevPresetOverride as Record<string, unknown>)[featureKey]
        : undefined;
      const nextValue = buildNextFeatureOverrideValue(
        featureKey,
        enabled,
        baseValue,
        currentOverrideValue,
        builtInValue
      );
      return {
        ...prev,
        presetOverrides: {
          ...prev.presetOverrides,
          [selectedPreset]: {
            ...prevPresetOverride,
            [featureKey]: nextValue,
          },
        },
      };
    });
  };

  const handleBulkToggleFeatures = (
    featureKeys: PresetFeatureKey[],
    enabled: boolean
  ) => {
    if (UNSAFE_CONFIG_KEYS.has(selectedPreset)) return;
    setSettings((prev) => {
      const prevPresetOverride =
        prev.presetOverrides &&
        Object.prototype.hasOwnProperty.call(
          prev.presetOverrides,
          selectedPreset
        )
          ? (prev.presetOverrides[selectedPreset] ?? {})
          : {};
      const updatedPreset = { ...prevPresetOverride };
      for (const featureKey of featureKeys) {
        const baseValue = Object.prototype.hasOwnProperty.call(
          basePreset,
          featureKey
        )
          ? basePreset[featureKey]
          : undefined;
        const builtInValue = Object.prototype.hasOwnProperty.call(
          builtInPresetForSelected,
          featureKey
        )
          ? (builtInPresetForSelected as Record<string, unknown>)[featureKey]
          : undefined;
        const currentOverrideValue = Object.prototype.hasOwnProperty.call(
          prevPresetOverride,
          featureKey
        )
          ? (prevPresetOverride as Record<string, unknown>)[featureKey]
          : undefined;
        (updatedPreset as Record<string, unknown>)[featureKey] =
          buildNextFeatureOverrideValue(
            featureKey,
            enabled,
            baseValue,
            currentOverrideValue,
            builtInValue
          );
      }
      return {
        ...prev,
        presetOverrides: {
          ...prev.presetOverrides,
          [selectedPreset]: updatedPreset,
        },
      };
    });
  };

  const handleResetPresetOverrides = () => {
    setSettings((prev) => {
      const nextOverrides = { ...prev.presetOverrides };
      delete nextOverrides[selectedPreset];
      return {
        ...prev,
        presetOverrides: nextOverrides,
      };
    });
  };

  const handleSave = async () => {
    if (loadError) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const domains = iframeDomainsInput
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
      const payload: TiptapRuntimeSettings = {
        ...settings,
        allowedIframeDomains: domains,
      };
      const res = await put("/tiptap-editor/settings", payload);
      if (res?.data) {
        setSettings({
          ...DEFAULT_RUNTIME_SETTINGS,
          ...res.data,
          presetOverrides: res.data.presetOverrides || {},
        });
      }
      setSaveMessage(
        formatMessage({
          id: "tiptap-editor.settings.saveSuccess",
          defaultMessage: "Settings saved successfully.",
        })
      );
    } catch {
      setSaveMessage(
        formatMessage({
          id: "tiptap-editor.settings.saveError",
          defaultMessage: "Failed to save settings.",
        })
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Box padding={8}>
        <Typography>
          {formatMessage({
            id: "tiptap-editor.settings.loading",
            defaultMessage: "Loading Tiptap Editor settings...",
          })}
        </Typography>
      </Box>
    );
  }

  const presetNames = Array.from(
    new Set([
      ...availablePresets,
      ...Object.keys(settings.presetOverrides || {}),
    ])
  );

  const enabledFeaturesCount = PRESET_FEATURE_KEYS.filter((key) =>
    isPresetFeatureKeyEnabled(currentPresetConfig, key)
  ).length;

  return (
    <Box padding={8} background="neutral100">
      <Flex
        justifyContent="space-between"
        alignItems="center"
        marginBottom={6}
        wrap="wrap"
        gap={4}
      >
        <Box>
          <Typography variant="alpha" tag="h1">
            {formatMessage({
              id: "tiptap-editor.settings.pageTitle",
              defaultMessage: "Tiptap Editor Settings",
            })}
          </Typography>
          <Box marginTop={1}>
            <Typography variant="epsilon" textColor="neutral600">
              {formatMessage({
                id: "tiptap-editor.settings.pageDescription",
                defaultMessage:
                  "Configure global defaults, relational sync, iframe security, and toolbar presets.",
              })}
            </Typography>
          </Box>
        </Box>
        <Button onClick={handleSave} loading={isSaving} disabled={loadError}>
          {formatMessage({
            id: "tiptap-editor.settings.saveButton",
            defaultMessage: "Save Settings",
          })}
        </Button>
      </Flex>

      {loadError && (
        <Box
          role="alert"
          padding={3}
          marginBottom={4}
          background="danger100"
          borderColor="danger200"
          hasRadius
        >
          <Typography textColor="danger700">
            {formatMessage({
              id: "tiptap-editor.settings.loadError",
              defaultMessage:
                "Failed to load settings. Saving is disabled to prevent overwriting existing configuration.",
            })}
          </Typography>
        </Box>
      )}

      {saveMessage && (
        <Box
          role="status"
          padding={3}
          marginBottom={4}
          background="primary100"
          borderColor="primary200"
          hasRadius
        >
          <Typography textColor="primary700">{saveMessage}</Typography>
        </Box>
      )}

      <Tabs.Root defaultValue="global">
        <Tabs.List
          aria-label={formatMessage({
            id: "tiptap-editor.settings.pageTitle",
            defaultMessage: "Tiptap Editor Settings",
          })}
        >
          <Tabs.Trigger value="global">
            {formatMessage({
              id: "tiptap-editor.settings.globalSectionTitle",
              defaultMessage: "Global Configuration",
            })}
          </Tabs.Trigger>
          <Tabs.Trigger value="presets">
            {formatMessage({
              id: "tiptap-editor.settings.presetMatrixTitle",
              defaultMessage: "Preset Feature Matrix",
            })}{" "}
            ({enabledFeaturesCount}/{PRESET_FEATURE_KEYS.length})
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="global">
          <SettingsGlobalSection
            settings={settings}
            presetNames={presetNames}
            iframeDomainsInput={iframeDomainsInput}
            getPresetLabel={getPresetLabel}
            onChangeDefaultPreset={(defaultPreset) =>
              setSettings((prev) => ({ ...prev, defaultPreset }))
            }
            onChangeDefaultOutputFormat={(defaultOutputFormat) =>
              setSettings((prev) => ({ ...prev, defaultOutputFormat }))
            }
            onChangeIframeDomainsInput={setIframeDomainsInput}
            onChangeRelationalSync={(enableRelationalSync) =>
              setSettings((prev) => ({ ...prev, enableRelationalSync }))
            }
          />
        </Tabs.Content>

        <Tabs.Content value="presets">
          <SettingsFeatureMatrixSection
            selectedPreset={selectedPreset}
            presetNames={presetNames}
            currentPresetConfig={currentPresetConfig}
            enabledFeaturesCount={enabledFeaturesCount}
            hasCustomPresetOverrides={Boolean(
              settings.presetOverrides?.[selectedPreset]
            )}
            onSelectPreset={setSelectedPreset}
            onToggleFeature={handleToggleFeature}
            onBulkToggleFeatures={handleBulkToggleFeatures}
            onResetPresetOverrides={handleResetPresetOverrides}
          />
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
}

export default SettingsPage;
