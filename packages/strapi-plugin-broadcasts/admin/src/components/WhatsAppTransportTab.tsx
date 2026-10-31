import {
  Box,
  Checkbox,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from "@strapi/design-system";
import * as React from "react";

import type { BroadcastSettings, WhatsAppDriver } from "../../../shared/types";
import type { TranslateFn } from "./DeliveryLedgerSection";

const WHATSAPP_DRIVER_OPTIONS: Array<{ value: WhatsAppDriver; label: string }> = [
  {
    value: "meta-cloud",
    label: "Meta WhatsApp Cloud API (Official WABA — meta-cloud)",
  },
  {
    value: "evolution",
    label: "Evolution API v2 Self-Hosted Gateway (evolution)",
  },
  { value: "openwa", label: "OpenWA Self-Hosted Gateway (openwa)" },
];

const cardBorderStyle: React.CSSProperties = {
  border: "1px solid rgba(128, 128, 128, 0.22)",
  borderTopLeftRadius: 0,
  borderTopRightRadius: 0,
};

function parseCsvList(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export interface WhatsAppTransportTabProps {
  settings: BroadcastSettings;
  setSettings: (next: BroadcastSettings | ((prev: BroadcastSettings) => BroadcastSettings)) => void;
  t: TranslateFn;
}

export const WhatsAppTransportTab: React.FC<WhatsAppTransportTabProps> = ({
  settings,
  setSettings,
  t,
}) => (
  <Box padding={6} background="neutral0" hasRadius shadow="filterShadow" style={cardBorderStyle}>
    <Flex justifyContent="space-between" alignItems="center" paddingBottom={2} wrap="wrap" gap={2}>
      <Box>
        <Typography variant="beta" tag="h2">
          {t(
            "settings.ui.3_whatsapp_transport_meta_cloud_api_evolution_op",
            "WhatsApp Transport (Meta Cloud API / Evolution / OpenWA)"
          )}
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          {t(
            "settings.ui.configure_official_meta_whatsapp_business_cloud_",
            "Configure official Meta WhatsApp Business Cloud API (WABA) or self-hosted Evolution / OpenWA gateways with SSRF protection."
          )}
        </Typography>
      </Box>
      <Checkbox
        checked={Boolean(settings.whatsappEnabled)}
        onCheckedChange={(checked: boolean) =>
          setSettings({ ...settings, whatsappEnabled: Boolean(checked) })
        }
      >
        {t("checkbox.enable_whatsapp_transport", "Enable WhatsApp Transport")}
      </Checkbox>
    </Flex>

    <Box
      paddingTop={4}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 20,
      }}
    >
      <Field.Root
        name="whatsappDriver"
        hint={t(
          "settings.ui.choose_meta_cloud_api_for_official_templates_or_",
          "Choose Meta Cloud API for official templates or Evolution/OpenWA for self-hosted gateways."
        )}
      >
        <Field.Label>
          {t("field.whatsapp_transport_driver", "WhatsApp Transport Driver")}
        </Field.Label>
        <SingleSelect
          placeholder={t("placeholder.select_whatsapp_driver", "Select WhatsApp driver")}
          value={settings.whatsappDriver || "meta-cloud"}
          onChange={(val: string | number) =>
            setSettings({
              ...settings,
              whatsappDriver: String(val) as WhatsAppDriver,
            })
          }
        >
          {WHATSAPP_DRIVER_OPTIONS.map((opt) => (
            <SingleSelectOption key={opt.value} value={opt.value}>
              {opt.label}
            </SingleSelectOption>
          ))}
        </SingleSelect>
        <Field.Hint />
      </Field.Root>

      <Field.Root
        name="whatsappPhoneNumberId"
        hint={t(
          "settings.ui.meta_phone_number_id_hint",
          "Numeric Phone Number ID from Meta Developer Console (used when driver is meta-cloud)."
        )}
      >
        <Field.Label>
          {t("field.meta_waba_phone_number_id", "Meta WABA Phone Number ID")}
        </Field.Label>
        <TextInput
          name="whatsappPhoneNumberId"
          placeholder={t("placeholder.e_g_109876543210123", "e.g., 109876543210123")}
          value={settings.whatsappPhoneNumberId || ""}
          onChange={(e: { target: { value: string } }) =>
            setSettings({
              ...settings,
              whatsappPhoneNumberId: e.target.value,
            })
          }
        />
        <Field.Hint />
      </Field.Root>

      <Field.Root
        name="whatsappAccessToken"
        hint={t(
          "settings.ui.system_user_bearer_token_for_graph_facebook_com_",
          "System user bearer token for graph.facebook.com WABA message dispatch."
        )}
      >
        <Field.Label>
          {t(
            "field.meta_cloud_api_permanent_access_token",
            "Meta Cloud API Permanent Access Token"
          )}
        </Field.Label>
        <TextInput
          name="whatsappAccessToken"
          type="password"
          placeholder={t("placeholder.e_g_eaagm0px4zcpsba", "e.g., EAAGm0PX4ZCpsBA...")}
          value={settings.whatsappAccessToken || ""}
          onChange={(e: { target: { value: string } }) =>
            setSettings({
              ...settings,
              whatsappAccessToken: e.target.value,
            })
          }
        />
        <Field.Hint />
      </Field.Root>

      <Field.Root
        name="whatsappGatewayUrl"
        hint={t(
          "settings.ui.https_base_url_of_your_evolution_api_or_openwa_i",
          "HTTPS base URL of your Evolution API or OpenWA instance (validated against SSRF rules)."
        )}
      >
        <Field.Label>
          {t(
            "field.self_hosted_gateway_url_evolution_openwa",
            "Self-Hosted Gateway URL (Evolution / OpenWA)"
          )}
        </Field.Label>
        <TextInput
          name="whatsappGatewayUrl"
          placeholder={t(
            "placeholder.e_g_https_wa_gateway_mezquitabogota_org",
            "e.g., https://wa-gateway.mezquitabogota.org"
          )}
          value={settings.whatsappGatewayUrl || ""}
          onChange={(e: { target: { value: string } }) =>
            setSettings({ ...settings, whatsappGatewayUrl: e.target.value })
          }
        />
        <Field.Hint />
      </Field.Root>

      <Field.Root
        name="whatsappGatewaySession"
        hint={t(
          "settings.ui.session_or_instance_identifier_on_the_self_hoste",
          "Session or instance identifier on the self-hosted WhatsApp gateway."
        )}
      >
        <Field.Label>
          {t("field.gateway_instance_session_name", "Gateway Instance / Session Name")}
        </Field.Label>
        <TextInput
          name="whatsappGatewaySession"
          placeholder={t(
            "placeholder.e_g_default_or_mezquita_bogota",
            "e.g., default or mezquita-bogota"
          )}
          value={settings.whatsappGatewaySession || ""}
          onChange={(e: { target: { value: string } }) =>
            setSettings({
              ...settings,
              whatsappGatewaySession: e.target.value,
            })
          }
        />
        <Field.Hint />
      </Field.Root>

      <Field.Root
        name="whatsappGatewayApiKey"
        hint={t(
          "settings.ui.api_key_sent_via_apikey_authorization_header_to_",
          "API key sent via apikey / Authorization header to the self-hosted gateway."
        )}
      >
        <Field.Label>
          {t("field.gateway_api_key_evolution_openwa", "Gateway API Key (Evolution / OpenWA)")}
        </Field.Label>
        <TextInput
          name="whatsappGatewayApiKey"
          type="password"
          placeholder={t("placeholder.e_g_evo_live_key", "e.g., evo_live_key_...")}
          value={settings.whatsappGatewayApiKey || ""}
          onChange={(e: { target: { value: string } }) =>
            setSettings({
              ...settings,
              whatsappGatewayApiKey: e.target.value,
            })
          }
        />
        <Field.Hint />
      </Field.Root>

      <Field.Root
        name="whatsappDefaultRecipients"
        hint={t(
          "settings.ui.whatsapp_default_recipients_hint",
          "WhatsApp Group JIDs (@g.us), Channel JIDs (@newsletter), or E.164 phone numbers that receive WhatsApp broadcasts alongside topic subscribers."
        )}
      >
        <Field.Label>
          {t(
            "field.whatsapp_default_recipients",
            "Default WhatsApp Groups / Channels / Numbers (comma-separated)"
          )}
        </Field.Label>
        <TextInput
          name="whatsappDefaultRecipients"
          placeholder={t(
            "placeholder.whatsapp_default_recipients",
            "e.g., 120363025891234567@g.us, 120363099999999999@newsletter, +573101234567"
          )}
          value={(settings.whatsappDefaultRecipients || []).join(", ")}
          onChange={(e: { target: { value: string } }) =>
            setSettings({
              ...settings,
              whatsappDefaultRecipients: parseCsvList(e.target.value),
            })
          }
        />
        <Field.Hint />
      </Field.Root>
    </Box>
  </Box>
);
