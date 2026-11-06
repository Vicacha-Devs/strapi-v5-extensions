import {
  Box,
  Button,
  Field,
  Flex,
  Grid,
  Main,
  NumberInput,
  Table,
  Tabs,
  Tbody,
  Td,
  Th,
  Thead,
  Toggle,
  Tr,
  Typography,
} from "@strapi/design-system";
import { Check } from "@strapi/icons";
import { Layouts, Page, useNotification, useRBAC } from "@strapi/strapi/admin";
import { useEffect, useState, type ChangeEvent } from "react";

import {
  fetchAllTypes,
  fetchSettings,
  resetSettings,
  updateSettings,
} from "../api/searchApi";
import { invalidateSearchableTypes } from "../hooks/useSearchableTypes";
import pluginPermissions from "../permissions";
import type { ContentTypeSummary, PluginSettings } from "../types";
import { t } from "../utils/getTrad";

const getNumberFields = (): Array<{
  name: keyof PluginSettings;
  label: string;
  hint: string;
}> => [
  {
    name: "minChars",
    label: t("settings.min_chars_label", "Minimum characters"),
    hint: t(
      "settings.min_chars_hint",
      "Shorter queries are not sent to the server."
    ),
  },
  {
    name: "debounce",
    label: t("settings.debounce_label", "Debounce (ms)"),
    hint: t(
      "settings.debounce_hint",
      "How long to wait after the last keystroke."
    ),
  },
  {
    name: "perTypeLimit",
    label: t("settings.per_type_limit_label", "Results per content type"),
    hint: t("settings.per_type_limit_hint", "Rows fetched from each type."),
  },
  {
    name: "maxResults",
    label: t("settings.max_results_label", "Maximum results"),
    hint: t(
      "settings.max_results_hint",
      "Hard cap on the merged, ranked list."
    ),
  },
  {
    name: "maxDepth",
    label: t("settings.max_depth_label", "Component depth"),
    hint: t(
      "settings.max_depth_hint",
      "How many component levels to search into."
    ),
  },
  {
    name: "queryTimeout",
    label: t("settings.query_timeout_label", "Query timeout (ms)"),
    hint: t("settings.query_timeout_hint", "A slower content type is skipped."),
  },
  {
    name: "concurrency",
    label: t("settings.concurrency_label", "Concurrency"),
    hint: t(
      "settings.concurrency_hint",
      "Maximum content types queried in parallel."
    ),
  },
];

const extractSaveErrorMessage = (error: unknown): string => {
  const err = error as {
    response?: { data?: { error?: { message?: string } } };
  };
  return (
    err?.response?.data?.error?.message ||
    t("settings.error_save", "Could not save global search settings.")
  );
};

const getToggleFields = (
  settings: PluginSettings
): Array<{
  name: "deep" | "includeDrafts" | "includePluginContentTypes";
  label: string;
  hint: string;
  checked: boolean;
}> => [
  {
    name: "deep",
    label: t("settings.deep_label", "Search inside components"),
    hint: t("settings.deep_hint", "Also match fields nested in components."),
    checked: Boolean(settings.deep),
  },
  {
    name: "includeDrafts",
    label: t("settings.drafts_label", "Include drafts"),
    hint: t("settings.drafts_hint", "Search unpublished entries too."),
    checked: Boolean(settings.includeDrafts),
  },
  {
    name: "includePluginContentTypes",
    label: t("settings.plugins_label", "Include plugin content types"),
    hint: t(
      "settings.plugins_hint",
      "Also search visible content types registered by plugins."
    ),
    checked: settings.includePluginContentTypes !== false,
  },
];

interface SearchBehaviourPanelProps {
  settings: PluginSettings;
  canEdit: boolean;
  onSetField: <K extends keyof PluginSettings>(
    name: K,
    value: PluginSettings[K]
  ) => void;
}

const SearchBehaviourPanel = ({
  settings,
  canEdit,
  onSetField,
}: SearchBehaviourPanelProps) => {
  const onText = t("common.on", "On");
  const offText = t("common.off", "Off");

  return (
    <Box background="neutral0" padding={6} hasRadius shadow="tableShadow">
      <Typography variant="delta">
        {t("settings.behaviour_title", "Search behaviour")}
      </Typography>

      <Box paddingTop={4}>
        <Grid.Root gap={4}>
          {getNumberFields().map((field) => (
            <Grid.Item key={field.name} col={4} s={12}>
              <Field.Root name={field.name} hint={field.hint}>
                <Field.Label>{field.label}</Field.Label>
                <NumberInput
                  name={field.name}
                  aria-label={field.label}
                  value={settings[field.name] as number}
                  onValueChange={(value: number | undefined) => {
                    if (typeof value === "number" && Number.isFinite(value)) {
                      onSetField(
                        field.name,
                        Math.round(value) as PluginSettings[typeof field.name]
                      );
                    }
                  }}
                  disabled={!canEdit}
                />
                <Field.Hint />
              </Field.Root>
            </Grid.Item>
          ))}

          {getToggleFields(settings).map((field) => (
            <Grid.Item key={field.name} col={4} s={12}>
              <Field.Root name={field.name} hint={field.hint}>
                <Field.Label>{field.label}</Field.Label>
                <Toggle
                  name={field.name}
                  aria-label={field.label}
                  onLabel={onText}
                  offLabel={offText}
                  checked={field.checked}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    onSetField(field.name, event.target.checked)
                  }
                  disabled={!canEdit}
                />
                <Field.Hint />
              </Field.Root>
            </Grid.Item>
          ))}
        </Grid.Root>
      </Box>
    </Box>
  );
};

const CONTENT_TYPE_COLS: Array<[string, string]> = [
  ["settings.col_content_type", "Content type"],
  ["settings.col_kind", "Kind"],
  ["settings.col_main_field", "Main field"],
  ["settings.col_searchable_fields", "Searchable fields"],
  ["settings.col_enabled", "Enabled"],
];

interface ContentTypesTablePanelProps {
  contentTypes: ContentTypeSummary[];
  excluded: string[];
  canEdit: boolean;
  onToggleContentType: (uid: string) => void;
}

const ContentTypesTablePanel = ({
  contentTypes,
  excluded,
  canEdit,
  onToggleContentType,
}: ContentTypesTablePanelProps) => (
  <Box background="neutral0" padding={6} hasRadius shadow="tableShadow">
    <Typography variant="delta">
      {t("settings.content_types_title", "Content types")}
    </Typography>
    <Box paddingTop={1} paddingBottom={4}>
      <Typography textColor="neutral600" variant="pi">
        {t(
          "settings.content_types_hint",
          "Every API and visible plugin content type is discovered " +
            "automatically. Turn one off to exclude it from search results."
        )}
      </Typography>
    </Box>

    <Table colCount={5} rowCount={contentTypes.length}>
      <Thead>
        <Tr>
          {CONTENT_TYPE_COLS.map(([key, label]) => (
            <Th key={key}>
              <Typography variant="sigma">{t(key, label)}</Typography>
            </Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {contentTypes.map((type) => (
          <Tr key={type.uid}>
            <Td>
              <Box>
                <Typography textColor="neutral800" fontWeight="semiBold">
                  {type.displayName}
                </Typography>
                <Box>
                  <Typography variant="pi" textColor="neutral500">
                    {type.uid}
                  </Typography>
                </Box>
              </Box>
            </Td>
            <Td>
              <Typography textColor="neutral600">
                {type.kind === "singleType"
                  ? t("settings.kind_single", "Single")
                  : t("settings.kind_collection", "Collection")}
              </Typography>
            </Td>
            <Td>
              <Typography textColor="neutral600">{type.mainField}</Typography>
            </Td>
            <Td>
              <Typography
                textColor={type.searchable ? "neutral600" : "danger600"}
              >
                {type.searchable ? type.fieldCount : t("common.none", "none")}
              </Typography>
            </Td>
            <Td>
              <Toggle
                name={`enabled-${type.uid}`}
                aria-label={t(
                  "settings.enable_for_type",
                  "Enable search for {name}",
                  { name: type.displayName }
                )}
                onLabel={t("common.on", "On")}
                offLabel={t("common.off", "Off")}
                checked={!excluded.includes(type.uid)}
                onChange={() => onToggleContentType(type.uid)}
                disabled={!canEdit || !type.searchable}
              />
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  </Box>
);

const SettingsPage = () => {
  const { toggleNotification } = useNotification();
  const { allowedActions } = useRBAC(pluginPermissions.settings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<PluginSettings | null>(null);
  const [contentTypes, setContentTypes] = useState<ContentTypeSummary[]>([]);

  const canEdit =
    (allowedActions as { canSettings?: boolean }).canSettings !== false;

  const load = async () => {
    setIsLoading(true);

    try {
      const [nextSettings, schema] = await Promise.all([
        fetchSettings(),
        fetchAllTypes(),
      ]);
      setSettings(nextSettings);
      setContentTypes(schema.contentTypes || []);
    } catch {
      toggleNotification({
        type: "danger",
        message: t(
          "settings.error_load",
          "Could not load global search settings."
        ),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = <K extends keyof PluginSettings>(
    name: K,
    value: PluginSettings[K]
  ) =>
    setSettings((previous) =>
      previous ? { ...previous, [name]: value } : previous
    );

  const toggleContentType = (uid: string) => {
    setSettings((previous) => {
      if (!previous) return previous;
      const excluded = previous.excludedContentTypes || [];
      return {
        ...previous,
        excludedContentTypes: excluded.includes(uid)
          ? excluded.filter((item) => item !== uid)
          : [...excluded, uid],
      };
    });
  };

  const save = async () => {
    if (!settings) return;
    setIsSaving(true);

    try {
      const saved = await updateSettings(settings);
      const schema = await fetchAllTypes();
      setSettings(saved);
      setContentTypes(schema.contentTypes || []);
      invalidateSearchableTypes();
      toggleNotification({
        type: "success",
        message: t("settings.saved", "Global search settings saved."),
      });
    } catch (error: unknown) {
      toggleNotification({
        type: "danger",
        message: extractSaveErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const restoreDefaults = async () => {
    setIsSaving(true);

    try {
      const restored = await resetSettings();
      const schema = await fetchAllTypes();
      setSettings(restored);
      setContentTypes(schema.contentTypes || []);
      invalidateSearchableTypes();
      toggleNotification({
        type: "success",
        message: t("settings.restored", "Defaults restored."),
      });
    } catch {
      toggleNotification({
        type: "danger",
        message: t("settings.error_restore", "Could not restore defaults."),
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) return <Page.Loading />;

  const ctTabTitle = t("settings.content_types_title", "Content types");

  return (
    <Main>
      <Layouts.Header
        title={t("plugin.name", "Global Search")}
        subtitle={t(
          "settings.subtitle",
          "Tune how the search page and the Ctrl/Cmd + K palette " +
            "query your content."
        )}
        primaryAction={
          <Flex gap={2}>
            <Button
              variant="tertiary"
              onClick={restoreDefaults}
              disabled={!canEdit || isSaving}
            >
              {t("settings.restore_defaults", "Restore defaults")}
            </Button>
            <Button
              startIcon={<Check />}
              onClick={save}
              loading={isSaving}
              disabled={!canEdit}
            >
              {t("settings.save", "Save")}
            </Button>
          </Flex>
        }
      />

      <Layouts.Content>
        <Tabs.Root defaultValue="behaviour" variant="simple">
          <Tabs.List aria-label={t("plugin.name", "Global Search")}>
            <Tabs.Trigger value="behaviour">
              {t("settings.behaviour_title", "Search behaviour")}
            </Tabs.Trigger>
            <Tabs.Trigger value="content-types">
              {`${ctTabTitle} (${contentTypes.length})`}
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="behaviour">
            <Box paddingTop={4}>
              <SearchBehaviourPanel
                settings={settings}
                canEdit={canEdit}
                onSetField={setField}
              />
            </Box>
          </Tabs.Content>

          <Tabs.Content value="content-types">
            <Box paddingTop={4}>
              <ContentTypesTablePanel
                contentTypes={contentTypes}
                excluded={settings.excludedContentTypes || []}
                canEdit={canEdit}
                onToggleContentType={toggleContentType}
              />
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Layouts.Content>
    </Main>
  );
};

export { SettingsPage };
export default SettingsPage;
