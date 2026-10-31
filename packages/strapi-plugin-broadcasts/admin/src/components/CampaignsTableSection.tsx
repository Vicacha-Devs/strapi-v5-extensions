import {
  Badge,
  Button,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Table,
  Tbody,
  Td,
  TextInput,
  Th,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system";
import * as React from "react";

import { CAMPAIGN_UID } from "../../../shared/constants";
import type { CampaignRecord, EmailDesignerTemplateSummary } from "../../../shared/types";
import type { TranslateFn } from "./DeliveryLedgerSection";

export interface EmailTemplateFieldProps {
  t: TranslateFn;
  emailTemplates: EmailDesignerTemplateSummary[];
  value: string;
  onChange: (nextVal: string) => void;
}

export const EmailTemplateSelectorField: React.FC<EmailTemplateFieldProps> = ({
  t,
  emailTemplates,
  value,
  onChange,
}) => (
  <Field.Root
    name="emailTemplateRef"
    hint={t(
      "page.ui.email_designer_template_hint",
      "Wraps email broadcasts in an Email Designer 5 layout (injects {{subject}}, {{bodyHtml}}, {{recipientName}}, {{secondaryDate}})."
    )}
  >
    <Field.Label>
      {t("field.email_designer_html_template_optional", "Email Designer HTML Template (optional)")}
    </Field.Label>
    {emailTemplates.length > 0 ? (
      <SingleSelect
        placeholder={t(
          "placeholder.none_use_inline_campaign_body",
          "None (use inline campaign body)"
        )}
        value={value || "__none__"}
        onChange={(val: string | number) => onChange(val === "__none__" ? "" : String(val))}
      >
        <SingleSelectOption value="__none__">
          {t("page.ui.none_use_inline_campaign_html", "None (use inline campaign HTML / text)")}
        </SingleSelectOption>
        <SingleSelectOption value="broadcastNewsletter">
          {t(
            "page.ui.broadcast_newsletter_auto_localized",
            "broadcastNewsletter (Auto-localized es / en / ar / tr)"
          )}
        </SingleSelectOption>
        {emailTemplates.map((tpl) => (
          <SingleSelectOption
            key={`${tpl.templateReferenceId}-${tpl.name}`}
            value={String(tpl.templateReferenceId)}
          >
            #{tpl.templateReferenceId} — {tpl.name}
          </SingleSelectOption>
        ))}
      </SingleSelect>
    ) : (
      <TextInput
        name="emailTemplateRef"
        placeholder={t(
          "placeholder.optional_e_g_401_or_broadcastnewsletter",
          "Optional: e.g. 401 or broadcastNewsletter"
        )}
        value={value}
        onChange={(e: { target: { value: string } }) => onChange(e.target.value)}
      />
    )}
    <Field.Hint />
  </Field.Root>
);

export interface CampaignsTableSectionProps {
  t: TranslateFn;
  campaigns: CampaignRecord[];
  onEdit: (camp: CampaignRecord) => void;
  onDispatch: (slugOrDocId?: string) => void;
  navigate: (path: string) => void;
}

export const CampaignsTableSection: React.FC<CampaignsTableSectionProps> = ({
  t,
  campaigns,
  onEdit,
  onDispatch,
  navigate,
}) => (
  <Table colCount={7} rowCount={campaigns.length + 1}>
    <Thead>
      <Tr>
        <Th>
          <Typography variant="sigma">{t("page.ui.slug_title", "Slug / Title")}</Typography>
        </Th>
        <Th>
          <Typography variant="sigma">{t("page.ui.topic", "Topic")}</Typography>
        </Th>
        <Th>
          <Typography variant="sigma">{t("page.ui.channels", "Channels")}</Typography>
        </Th>
        <Th>
          <Typography variant="sigma">{t("page.ui.status", "Status")}</Typography>
        </Th>
        <Th>
          <Typography variant="sigma">
            {t("page.ui.hijri_secondary_date", "Hijri / Secondary Date")}
          </Typography>
        </Th>
        <Th>
          <Typography variant="sigma">{t("page.ui.delivery_stats", "Delivery Stats")}</Typography>
        </Th>
        <Th>
          <Typography variant="sigma">{t("page.ui.actions", "Actions")}</Typography>
        </Th>
      </Tr>
    </Thead>
    <Tbody>
      {campaigns.map((camp) => {
        const sentTotal = (camp.stats?.sentCount || 0) + (camp.stats?.simulatedCount || 0);
        const failedTotal = camp.stats?.failedCount || 0;

        return (
          <Tr key={camp.slug}>
            <Td>
              <Flex direction="column" alignItems="flex-start" gap={1}>
                <Typography fontWeight="bold">{camp.title}</Typography>
                <Flex gap={2} alignItems="center" wrap="wrap">
                  <Typography variant="pi" textColor="neutral600">
                    {camp.slug}
                  </Typography>
                  {camp.emailTemplateRef && (
                    <Badge>
                      {t("page.ui.email_template_badge", "Email Template:")} {camp.emailTemplateRef}
                    </Badge>
                  )}
                </Flex>
              </Flex>
            </Td>
            <Td>
              <Badge>{camp.topic}</Badge>
            </Td>
            <Td>
              <Typography>{(camp.channels || []).join(", ")}</Typography>
            </Td>
            <Td>
              <Badge>{camp.status}</Badge>
            </Td>
            <Td>
              <Typography>{camp.secondaryDateLabel || "-"}</Typography>
            </Td>
            <Td>
              <Typography>
                {t("page.ui.sent_label", "Sent:")} {sentTotal} /{" "}
                {t("page.ui.failed_label", "Failed:")} {failedTotal}
              </Typography>
            </Td>
            <Td>
              <Flex gap={2} wrap="wrap">
                <Button variant="tertiary" size="S" onClick={() => onEdit(camp)}>
                  {t("common.edit", "Edit")}
                </Button>
                {camp.documentId && (
                  <Button
                    variant="tertiary"
                    size="S"
                    onClick={() =>
                      navigate(
                        `/content-manager/collection-types/${CAMPAIGN_UID}/${camp.documentId}`
                      )
                    }
                  >
                    {t("common.content_manager", "Content Manager")}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="S"
                  onClick={() => onDispatch(camp.documentId || camp.slug)}
                >
                  {t("page.ui.dispatch_now", "Dispatch Now")}
                </Button>
              </Flex>
            </Td>
          </Tr>
        );
      })}
    </Tbody>
  </Table>
);
