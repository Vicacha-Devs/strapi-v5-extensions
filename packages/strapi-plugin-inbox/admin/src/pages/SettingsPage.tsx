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
import * as React from "react";
import { useIntl } from "react-intl";

import {
  DEFAULT_INBOX_SETTINGS,
  PLUGIN_ID,
  type CaptchaProvider,
  type InboxSettings,
} from "../../../shared";
import { AntiSpamCaptchaTab } from "../components/settings/AntiSpamCaptchaTab";
import { BridgesNotificationsTab } from "../components/settings/BridgesNotificationsTab";
import { LocalizationRoutingTab } from "../components/settings/LocalizationRoutingTab";

export const SettingsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });
  const { get, put, post } = useFetchClient();
  const [settings, setSettings] = React.useState<InboxSettings>(
    DEFAULT_INBOX_SETTINGS
  );
  const [savedNotice, setSavedNotice] = React.useState<string>("");
  const [captchaTestResult, setCaptchaTestResult] = React.useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await get(`/${PLUGIN_ID}/settings`);
        if (res?.data?.data) {
          setSettings({
            ...DEFAULT_INBOX_SETTINGS,
            ...res.data.data,
          });
        }
      } catch {
        // Fallback to defaults
      }
    };
    void fetchSettings();
  }, []);

  const handleSave = async () => {
    const res = await put(`/${PLUGIN_ID}/settings`, settings);
    if (res?.data?.data) {
      setSettings({
        ...DEFAULT_INBOX_SETTINGS,
        ...res.data.data,
      });
      setSavedNotice(
        "Inbox, Anti-Spam & Casework settings saved successfully."
      );
    }
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_INBOX_SETTINGS);
    setSavedNotice(
      'Settings reset to defaults in editor. Click "Save Settings" to persist.'
    );
  };

  const handleTestCaptcha = async (
    provider: CaptchaProvider,
    secret?: string
  ) => {
    const res = await post(`/${PLUGIN_ID}/captcha/test`, {
      provider,
      secret: secret || "",
    });
    const out = res?.data?.data;
    const isOk = Boolean(out?.ok);
    setCaptchaTestResult({
      ok: isOk,
      message: isOk
        ? `${provider === "turnstile" ? "Cloudflare Turnstile" : "Google reCAPTCHA"} secret key verified!`
        : `Verification failed (${provider}): ${out?.reason || "Invalid or empty secret key"}`,
    });
  };

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
            <Typography variant="alpha" tag="h1">
              {t(
                "settings.ui.inbox_anti_spam_casework_settings",
                "Inbox, Anti-Spam & Casework Settings"
              )}
            </Typography>
            <Box paddingTop={1}>
              <Typography variant="epsilon" textColor="neutral600">
                {t(
                  "settings.ui.configure_multi_locale_forms_secondary_hijri_cal",
                  "Configure multi-locale forms, anti-spam protection, double opt-in subscribers, and Bookings / Certificates bridges"
                )}
              </Typography>
            </Box>
            <Flex gap={2} paddingTop={3} wrap="wrap">
              <Badge>
                {t("settings.ui.locales_badge", "Locales")} (
                {(settings.supportedLocales || []).length}):{" "}
                {(settings.supportedLocales || []).join(", ")}
              </Badge>
              <Badge>
                {t("settings.ui.captcha_badge", "CAPTCHA")}:{" "}
                {settings.defaultCaptchaProvider || "none"}
              </Badge>
              <Badge>
                {t(
                  "settings.ui.form_builder_bridge_badge",
                  "Form Builder Bridge"
                )}
                :{" "}
                {settings.enableFormBuilderBridge !== false
                  ? t("common.enabled", "Enabled")
                  : t("common.disabled", "Disabled")}
              </Badge>
              <Badge>
                {t("settings.ui.double_opt_in_label", "Double Opt-In")}:{" "}
                {settings.enableDoubleOptIn
                  ? t("common.enabled", "Enabled")
                  : t("common.disabled", "Disabled")}
              </Badge>
            </Flex>
          </Box>
          <Flex gap={2}>
            <Button variant="tertiary" onClick={handleResetDefaults}>
              {t("settings.ui.reset_to_defaults", "Reset to Defaults")}
            </Button>
            <Button onClick={handleSave}>
              {t("settings.ui.save_settings", "Save Settings")}
            </Button>
          </Flex>
        </Flex>

        {savedNotice ? (
          <Box padding={3} marginBottom={4} background="success100" hasRadius>
            <Typography textColor="success700" fontWeight="semiBold">
              {savedNotice}
            </Typography>
          </Box>
        ) : null}

        {captchaTestResult ? (
          <Box
            padding={3}
            marginBottom={4}
            background={captchaTestResult.ok ? "success100" : "danger100"}
            hasRadius
          >
            <Typography
              textColor={captchaTestResult.ok ? "success700" : "danger700"}
              fontWeight="semiBold"
            >
              {captchaTestResult.message}
            </Typography>
          </Box>
        ) : null}

        <Divider />

        <Box paddingTop={6}>
          <Tabs.Root defaultValue="routing">
            <Tabs.List
              aria-label={t(
                "settings.ui.inbox_anti_spam_casework_settings",
                "Inbox Settings"
              )}
            >
              <Tabs.Trigger value="routing">
                {t("settings.tab.routing", "Localization & Routing")}
              </Tabs.Trigger>
              <Tabs.Trigger value="antispam">
                {t("settings.tab.antispam", "Anti-Spam Guard & CAPTCHA")}
              </Tabs.Trigger>
              <Tabs.Trigger value="bridges">
                {t("settings.tab.bridges", "Double Opt-In & Ecosystem Bridges")}
              </Tabs.Trigger>
            </Tabs.List>

            <LocalizationRoutingTab
              t={t}
              settings={settings}
              setSettings={setSettings}
            />
            <AntiSpamCaptchaTab
              t={t}
              settings={settings}
              setSettings={setSettings}
              onTestCaptcha={handleTestCaptcha}
            />
            <BridgesNotificationsTab
              t={t}
              settings={settings}
              setSettings={setSettings}
            />
          </Tabs.Root>
        </Box>
      </Box>
    </Main>
  );
};

export default SettingsPage;
