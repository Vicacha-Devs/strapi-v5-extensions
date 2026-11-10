import {
  Box,
  Button,
  Divider,
  Flex,
  Main,
  Tabs,
  Typography,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import * as React from "react";
import { useIntl } from "react-intl";

import { PLUGIN_ID, type ResourcesPluginSettings } from "../../../shared";
import { ResourcesFoldersTab } from "../components/resources/ResourcesFoldersTab";
import {
  ResourcesOptimizationTab,
  ResourcesSecurityTab,
} from "../components/resources/ResourcesSettingsTabs";

export const SettingsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t = React.useCallback(
    (id: string, defaultMessage: string) =>
      formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage }),
    [formatMessage]
  );
  const { get, put } = useFetchClient();
  const [settings, setSettings] =
    React.useState<ResourcesPluginSettings | null>(null);
  const [savedNotice, setSavedNotice] = React.useState<string>("");
  const [saveError, setSaveError] = React.useState<string>("");
  const [loadError, setLoadError] = React.useState<string>("");
  const [isSaving, setIsSaving] = React.useState<boolean>(false);

  const isMountedRef = React.useRef(true);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const fetchSettings = React.useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoadError("");

    try {
      const res = await get(`/${PLUGIN_ID}/settings`, {
        signal: controller.signal,
      });
      if (!isMountedRef.current || controller.signal.aborted) return;
      if (res?.data?.data) {
        setSettings(res.data.data);
      }
    } catch (err) {
      if (!isMountedRef.current || controller.signal.aborted) return;
      const errMsg =
        err instanceof Error && err.message
          ? err.message
          : t("common.load_failed", "Failed to load settings.");
      setLoadError(errMsg);
    }
  }, [get, t]);

  React.useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    if (!settings || isSaving) return;
    setIsSaving(true);
    setSavedNotice("");
    setSaveError("");
    try {
      const res = await put(`/${PLUGIN_ID}/settings`, settings);
      if (!isMountedRef.current) return;
      if (res?.data?.data) {
        setSettings(res.data.data);
        setSavedNotice(
          t(
            "settings.ui.saved_notice",
            "Resources & Media Library settings saved."
          )
        );
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      const msg =
        err instanceof Error && err.message ? err.message : "Save failed";
      setSaveError(msg);
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  if (!settings) {
    return (
      <Main>
        <Box padding={8}>
          {loadError ? (
            <Box padding={4} background="danger100" hasRadius role="alert">
              <Flex justifyContent="space-between" alignItems="center" gap={3}>
                <Typography fontWeight="bold" textColor="danger700">
                  {loadError}
                </Typography>
                <Button
                  size="S"
                  variant="secondary"
                  onClick={() => void fetchSettings()}
                >
                  {t("common.retry", "Retry")}
                </Button>
              </Flex>
            </Box>
          ) : (
            <Typography>
              {t(
                "settings.ui.loading_resources_media_library_settings",
                "Loading Resources & Media Library settings..."
              )}
            </Typography>
          )}
        </Box>
      </Main>
    );
  }

  return (
    <Main>
      <Box padding={8} background="neutral100">
        <Flex
          justifyContent="space-between"
          alignItems="center"
          paddingBottom={4}
          wrap="wrap"
          gap={4}
        >
          <Box>
            <Typography variant="alpha" tag="h1">
              {t(
                "settings.ui.resources_media_library_settings",
                "Resources & Media Library Settings"
              )}
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              {t(
                "settings.ui.configure_strapi_v5_media_library_folder_default",
                "Configure Strapi v5 Media Library folder defaults, localization, CDN transforms, and download security."
              )}
            </Typography>
          </Box>
          <Button
            loading={isSaving}
            disabled={isSaving}
            onClick={() => void handleSave()}
          >
            {t("settings.ui.save_settings", "Save Settings")}
          </Button>
        </Flex>

        {savedNotice && (
          <Box
            padding={3}
            marginBottom={4}
            background="success100"
            hasRadius
            role="status"
          >
            <Typography fontWeight="bold" textColor="success700">
              {savedNotice}
            </Typography>
          </Box>
        )}

        {saveError && (
          <Box
            padding={3}
            marginBottom={4}
            background="danger100"
            hasRadius
            role="alert"
          >
            <Typography fontWeight="bold" textColor="danger700">
              {saveError}
            </Typography>
          </Box>
        )}

        <Divider />

        <Box paddingTop={6}>
          <Tabs.Root defaultValue="folders" variant="simple">
            <Tabs.List
              aria-label={t(
                "settings.ui.resources_media_library_settings",
                "Resources Settings"
              )}
            >
              <Tabs.Trigger value="folders">
                {t(
                  "settings.tab.folders",
                  "Media Library Folders & Organization"
                )}
              </Tabs.Trigger>
              <Tabs.Trigger value="optimization">
                {t(
                  "settings.tab.optimization",
                  "CDN Optimization & Folder Sync"
                )}
              </Tabs.Trigger>
              <Tabs.Trigger value="security">
                {t("settings.tab.security", "Download Security & Allow-Lists")}
              </Tabs.Trigger>
            </Tabs.List>

            <ResourcesFoldersTab
              settings={settings}
              setSettings={setSettings}
              t={t}
            />
            <ResourcesOptimizationTab
              settings={settings}
              setSettings={setSettings}
              t={t}
            />
            <ResourcesSecurityTab
              settings={settings}
              setSettings={setSettings}
              t={t}
            />
          </Tabs.Root>
        </Box>
      </Box>
    </Main>
  );
};

export default SettingsPage;
