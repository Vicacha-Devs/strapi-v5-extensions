import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Main,
  Tabs,
  Typography,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import React, { useEffect, useState } from "react";
import { useIntl } from "react-intl";

import { PLUGIN_ID, type DonationsSettings } from "../../../shared";
import { DonationCategoriesManager } from "../components/DonationCategoriesManager";
import type { TranslateFn } from "../components/donations/donationsHelpers";
import {
  SettingsCertificatesTab,
  SettingsCurrencyTab,
} from "../components/donations/SettingsTabs";

const SettingsHeaderBadges: React.FC<{
  settings: DonationsSettings;
  t: TranslateFn;
}> = ({ settings, t }) => {
  const baseCurr = settings.baseCurrency || "COP";
  const currenciesList = (
    settings.supportedCurrencies || ["COP", "USD", "EUR"]
  ).join(", ");
  const localesList = (
    settings.supportedLocales || ["es", "en", "ar", "tr"]
  ).join(", ");
  const certsState = settings.enableCertificatesBridge
    ? t("common.enabled", "Enabled")
    : t("common.disabled", "Disabled");

  return (
    <Flex gap={2} paddingTop={3} wrap="wrap">
      <Badge>
        {t("settings.badge.base_currency", "Base Currency")}: {baseCurr}
      </Badge>
      <Badge>
        {t("settings.badge.currencies", "Currencies")}: {currenciesList}
      </Badge>
      <Badge>
        {t("settings.badge.locales", "Locales")}: {localesList}
      </Badge>
      <Badge>
        {t("settings.badge.tax_certificates", "Tax Certificates")}: {certsState}
      </Badge>
    </Flex>
  );
};

export const SettingsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t: TranslateFn = (id, defaultMessage, values) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage }, values);
  const { get, put } = useFetchClient();
  const [settings, setSettings] = useState<DonationsSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await get<DonationsSettings>(`/${PLUGIN_ID}/settings`);
      if (res?.data?.data) {
        setSettings(res.data.data);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await put<DonationsSettings>(`/${PLUGIN_ID}/settings`, {
        data: settings,
      });
      if (res?.data?.data) {
        setSettings(res.data.data);
        setSavedNotice(
          t(
            "settings.saved_notice",
            "Donations, Assessment Calculator & Tax Certificate settings saved."
          )
        );
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
            {t(
              "settings.loading",
              "Loading donations & utility invoice settings..."
            )}
          </Typography>
        </Box>
      </Main>
    );
  }

  return (
    <Main>
      <Box padding={8}>
        <Flex
          justifyContent="space-between"
          alignItems="flex-start"
          paddingBottom={4}
          wrap="wrap"
          gap={4}
        >
          <Box>
            <Typography variant="alpha" as="h1">
              {t(
                "settings.page_title",
                "Donations, Assessment Calculator & Utility Invoices Settings"
              )}
            </Typography>
            <Box paddingTop={1}>
              <Typography variant="epsilon" textColor="neutral600">
                {t(
                  "settings.page_subtitle",
                  "Configure multi-currency conversion, Rich Text editor integration, and cryptographic tax certificates."
                )}
              </Typography>
            </Box>
            <SettingsHeaderBadges settings={settings} t={t} />
          </Box>
          <Button onClick={() => void handleSave()} loading={saving}>
            {t("settings.save_button", "Save Settings")}
          </Button>
        </Flex>

        {savedNotice ? (
          <Box padding={3} marginBottom={4} background="success100" hasRadius>
            <Typography textColor="success700" fontWeight="semiBold">
              {savedNotice}
            </Typography>
          </Box>
        ) : null}

        <Divider />

        <Box paddingTop={6}>
          <Tabs.Root defaultValue="currency">
            <Tabs.List
              aria-label={t("settings.page_title", "Donations Settings")}
            >
              <Tabs.Trigger value="currency">
                {t(
                  "settings.tab.currency",
                  "Currency, Localization & Rich Text"
                )}
              </Tabs.Trigger>
              <Tabs.Trigger value="categories">
                {t("settings.tab.categories", "Donation Categories ({count})", {
                  count: (settings.categories || []).length,
                })}
              </Tabs.Trigger>
              <Tabs.Trigger value="certificates">
                {t(
                  "settings.tab.certificates",
                  "Cryptographic Tax Certificates Bridge"
                )}
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="currency">
              <SettingsCurrencyTab
                settings={settings}
                setSettings={setSettings}
                t={t}
              />
            </Tabs.Content>

            <Tabs.Content value="categories">
              <DonationCategoriesManager
                categories={settings.categories || []}
                defaultLocale={settings.defaultLocale || "es"}
                supportedLocales={
                  settings.supportedLocales || ["es", "en", "ar", "tr"]
                }
                onChange={(nextCategories) =>
                  setSettings({ ...settings, categories: nextCategories })
                }
              />
            </Tabs.Content>

            <Tabs.Content value="certificates">
              <SettingsCertificatesTab
                settings={settings}
                setSettings={setSettings}
                t={t}
              />
            </Tabs.Content>
          </Tabs.Root>
        </Box>
      </Box>
    </Main>
  );
};

export default SettingsPage;
