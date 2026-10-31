import { Badge, Box, Button, Divider, Flex, Main, Tabs, Typography } from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import React, { useEffect, useState } from "react";
import { useIntl } from "react-intl";

import { PLUGIN_ID, type IslamPluginSettings } from "../../../shared";
import {
  CalculationSettingsTab,
  EcosystemBridgesSettingsTab,
  FiqhRatesSettingsTab,
  QURAN_RECITER_OPTIONS,
  QuranFoundationSettingsTab,
  type TranslateFn,
} from "../components/SettingsTabs";

interface SettingsApiResponse {
  data?: IslamPluginSettings;
}

const SettingsHeaderSummary: React.FC<{
  settings: IslamPluginSettings;
  saving: boolean;
  onSave: () => void;
  t: TranslateFn;
}> = ({ settings, saving, onSave, t }) => {
  const schoolLabel =
    settings.school === "2"
      ? t("settings.ui.school_hanafi", "Hanafi")
      : t("settings.ui.school_shafii", "Shafi’i");
  const qfEnv = settings.quranFoundation?.environment || "production";
  const reciterId = String(settings.quranFoundation?.defaultReciterId || 7);
  const reciterName =
    QURAN_RECITER_OPTIONS.find((r) => r.value === reciterId)?.name || "Mishari Rashid al-`Afasy";

  return (
    <Flex
      justifyContent="space-between"
      alignItems="flex-start"
      paddingBottom={4}
      wrap="wrap"
      gap={4}
    >
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography variant="alpha" tag="h1">
          {t(
            "settings.ui.islam_suite_calculation_nisab_ecosystem_bridges",
            "Islam Suite — Calculation, Nisab & Ecosystem Bridges"
          )}
        </Typography>
        <Typography variant="epsilon" textColor="neutral600">
          {t(
            "settings.ui.configure_astronomical_prayer_calculation_parame",
            "Configure astronomical prayer calculation parameters, mosque coordinates, Gold/Silver Nisab rates, Quran Foundation API v4, and cross-plugin bridges."
          )}
        </Typography>
        <Flex gap={2} paddingTop={2} wrap="wrap">
          <Badge>
            {t("settings.ui.badge_coords", "Coords: {lat}, {lon}", {
              lat: settings.defaultLat,
              lon: settings.defaultLon,
            })}
          </Badge>
          <Badge>
            {t("settings.ui.badge_method_school", "Method: #{method} (School: {school})", {
              method: settings.method,
              school: schoolLabel,
            })}
          </Badge>
          <Badge>
            {t("settings.ui.badge_hijri_offset", "Hijri Offset: {days}d", {
              days: settings.shifting,
            })}
          </Badge>
          <Badge>
            {t("settings.ui.badge_quran_api", "Quran API: {env}", {
              env: qfEnv,
            })}
          </Badge>
          <Badge>
            {t("settings.ui.badge_reciter", "Reciter: {name} (#{id})", {
              name: reciterName,
              id: reciterId,
            })}
          </Badge>
        </Flex>
      </Flex>
      <Button onClick={onSave} loading={saving}>
        {t("settings.ui.save_settings", "Save Settings")}
      </Button>
    </Flex>
  );
};

export const SettingsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t: TranslateFn = (id, defaultMessage, values) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage }, values);
  const { get, put } = useFetchClient();
  const [settings, setSettings] = useState<IslamPluginSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await get<SettingsApiResponse>(`/${PLUGIN_ID}/settings`);
      if (res?.data?.data) {
        setSettings(res.data.data);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSavedBanner(false);
    try {
      const res = await put<SettingsApiResponse>(`/${PLUGIN_ID}/settings`, settings);
      if (res?.data?.data) {
        setSettings(res.data.data);
        setSavedBanner(true);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <Main>
        <Box padding={8}>
          <Typography>
            {t("settings.ui.loading_islam_suite_settings", "Loading Islam Suite settings...")}
          </Typography>
        </Box>
      </Main>
    );
  }

  return (
    <Main>
      <Box padding={8}>
        <SettingsHeaderSummary
          settings={settings}
          saving={saving}
          onSave={() => void handleSave()}
          t={t}
        />

        {savedBanner && (
          <Box marginBottom={4} padding={3} background="success100" hasRadius>
            <Typography textColor="success700" fontWeight="bold">
              {t(
                "settings.ui.settings_saved_and_synchronized_with_mapped_coll",
                "Settings saved and synchronized with mapped collections."
              )}
            </Typography>
          </Box>
        )}

        <Divider />

        <Box paddingTop={6}>
          <Tabs.Root defaultValue="calculation">
            <Tabs.List
              aria-label={t(
                "settings.ui.islam_suite_calculation_nisab_ecosystem_bridges",
                "Islam Suite Settings"
              )}
            >
              <Tabs.Trigger value="calculation">
                {t("settings.tab.calculation", "Mosque & Astronomical Calculation")}
              </Tabs.Trigger>
              <Tabs.Trigger value="fiqh">
                {t("settings.tab.fiqh", "Fiqh & Nisab Benchmarks (COP)")}
              </Tabs.Trigger>
              <Tabs.Trigger value="quran">
                {t("settings.tab.quran", "Quran Foundation API v4")}
              </Tabs.Trigger>
              <Tabs.Trigger value="bridges">
                {t("settings.tab.bridges", "Ecosystem Bridges")}
              </Tabs.Trigger>
            </Tabs.List>

            <CalculationSettingsTab settings={settings} setSettings={setSettings} t={t} />
            <FiqhRatesSettingsTab settings={settings} setSettings={setSettings} t={t} />
            <QuranFoundationSettingsTab settings={settings} setSettings={setSettings} t={t} />
            <EcosystemBridgesSettingsTab settings={settings} setSettings={setSettings} t={t} />
          </Tabs.Root>
        </Box>
      </Box>
    </Main>
  );
};

export default SettingsPage;
