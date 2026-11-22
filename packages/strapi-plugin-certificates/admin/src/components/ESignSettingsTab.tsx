import { Box, Button, Flex, Typography } from "@strapi/design-system";
import React from "react";

import type { DocuSignProviderConfig } from "../../../shared/types";
import {
  Code,
  gridStyle,
  renderCheckbox,
  renderField,
  SUB_CARD_BORDER,
  TabPanelBox,
} from "./SettingsTabHelpers";

export interface ESignSettingsTabProps {
  esign?: DocuSignProviderConfig;
  t: (id: string, defaultMessage: string) => string;
  updateEsign: (patch: Partial<DocuSignProviderConfig>) => void;
}

export const ESignSettingsTab: React.FC<ESignSettingsTabProps> = ({
  esign,
  t,
  updateEsign,
}) => {
  const isDocuSeal = esign?.provider === "docuseal";

  return (
    <TabPanelBox value="docusign">
      <Typography variant="beta" fontWeight="bold">
        {t(
          "settings.ui.2_optional_docusign_e_signature_service",
          "Optional DocuSign / DocuSeal E-Signature Service"
        )}
      </Typography>
      <Box marginTop={1}>
        <Typography variant="pi" textColor="neutral600">
          {t("settings.ui.secrets_prefix", "Secrets")} (
          <Code>
            {isDocuSeal ? "DOCUSEAL_API_KEY" : "DOCUSIGN_ACCESS_TOKEN"}
          </Code>{" "}
          {t("settings.ui.and_conjunction", "&")}{" "}
          <Code>
            {isDocuSeal ? "DOCUSEAL_WEBHOOK_SECRET" : "DOCUSIGN_WEBHOOK_SECRET"}
          </Code>
          ){" "}
          {t(
            "settings.ui.secrets_loaded_from_env",
            "are loaded from environment variables. Connect webhook endpoint:"
          )}{" "}
          <Code>
            {isDocuSeal
              ? "POST /api/certificates/webhooks/docuseal"
              : t(
                  "settings.ui.endpoint_docusign_webhook",
                  "POST /api/certificates/webhooks/docusign"
                )}
          </Code>
        </Typography>
      </Box>
      <Flex direction="column" gap={4} marginTop={4} alignItems="stretch">
        <Box
          padding={4}
          background="neutral100"
          hasRadius
          style={SUB_CARD_BORDER}
        >
          {renderCheckbox(
            esign?.enabled ?? false,
            (enabled) =>
              updateEsign({
                enabled,
                provider: enabled
                  ? isDocuSeal
                    ? "docuseal"
                    : "docusign"
                  : "none",
              }),
            t(
              "checkbox.enable_docusign_esignature_multi_party_envelope_",
              "Enable DocuSign / DocuSeal multi-party eSignature routing for Witnesses & Signatories"
            )
          )}
          <Flex gap={2} marginTop={3}>
            <Button
              size="S"
              variant={isDocuSeal ? "default" : "tertiary"}
              onClick={() =>
                updateEsign({
                  enabled: true,
                  provider: "docuseal",
                  baseUrl:
                    esign?.baseUrl && !esign.baseUrl.includes("docusign.")
                      ? esign.baseUrl
                      : "https://sign.example.org",
                })
              }
            >
              DocuSeal (Self-Hosted)
            </Button>
            <Button
              size="S"
              variant={!isDocuSeal ? "default" : "tertiary"}
              onClick={() =>
                updateEsign({
                  enabled: true,
                  provider: "docusign",
                  baseUrl: esign?.baseUrl?.includes("docusign.")
                    ? esign.baseUrl
                    : "https://demo.docusign.net/restapi",
                })
              }
            >
              DocuSign (SaaS)
            </Button>
          </Flex>
          {isDocuSeal && (
            <Box marginTop={3}>
              {renderCheckbox(
                (esign?.emailDeliveryMode ?? "strapi") === "strapi",
                (useStrapi) =>
                  updateEsign({
                    emailDeliveryMode: useStrapi ? "strapi" : "provider",
                  }),
                "Send 100% branded signing invites via Strapi / Resend SMTP (sets DocuSeal send_email: false)"
              )}
            </Box>
          )}
        </Box>
        <Box style={gridStyle(2)}>
          {renderField(
            isDocuSeal
              ? "DocuSeal Base URL (HTTPS)"
              : t(
                  "field.docusign_rest_api_base_url_https",
                  "DocuSign REST API Base URL (HTTPS)"
                ),
            isDocuSeal
              ? "HTTPS URL of your self-hosted DocuSeal server (e.g. https://sign.your-domain.com)."
              : t(
                  "settings.ui.docusign_rest_api_endpoint_demo_sandbox_or_produ",
                  "DocuSign REST API endpoint (demo sandbox or production account URI)."
                ),
            isDocuSeal
              ? "https://sign.example.org"
              : t(
                  "placeholder.e_g_https_demo_docusign_net_restapi",
                  "e.g., https://demo.docusign.net/restapi"
                ),
            esign?.baseUrl ||
              (isDocuSeal
                ? "https://sign.example.org"
                : "https://demo.docusign.net/restapi"),
            (baseUrl) => updateEsign({ baseUrl })
          )}
          {isDocuSeal &&
            (esign?.emailDeliveryMode ?? "strapi") === "strapi" &&
            renderField(
              "Email Designer Template ID (Optional)",
              "Optional strapi-plugin-email-designer-5 templateReferenceId; leave blank to use built-in branded HTML.",
              "e.g., 501",
              esign?.emailDesignerTemplateId
                ? String(esign.emailDesignerTemplateId)
                : "",
              (rawVal) => {
                const parsed = Number.parseInt(rawVal.trim(), 10);
                updateEsign({
                  emailDesignerTemplateId:
                    Number.isInteger(parsed) && parsed > 0 ? parsed : undefined,
                });
              }
            )}
          {!isDocuSeal &&
            renderField(
              t("field.docusign_account_id", "DocuSign Account ID"),
              t(
                "settings.ui.docusign_api_account_guid_used_when_dispatching_",
                "DocuSign API Account GUID used when dispatching signature envelopes."
              ),
              t("placeholder.e_g_a1b2c3d4", "e.g., a1b2c3d4-..."),
              esign?.accountId || "ds-account-bogota-central",
              (accountId) => updateEsign({ accountId })
            )}
        </Box>
      </Flex>
    </TabPanelBox>
  );
};
