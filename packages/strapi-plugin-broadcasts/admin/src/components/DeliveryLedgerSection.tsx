import {
  Badge,
  Box,
  Button,
  Flex,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system";
import * as React from "react";

import { AUTOMATION_RULE_UID } from "../../../shared/constants";
import type {
  AutomationRuleRecord,
  DeliveryLogRecord,
} from "../../../shared/types";

export type TranslateFn = (id: string, defaultMessage: string) => string;

export interface DeliveryLedgerSectionProps {
  t: TranslateFn;
  logs: DeliveryLogRecord[];
}

export const DeliveryLedgerSection: React.FC<DeliveryLedgerSectionProps> = ({
  t,
  logs,
}) => (
  <Box paddingTop={6}>
    <Box
      padding={4}
      marginBottom={4}
      background="neutral100"
      hasRadius
      style={{ border: "1px solid rgba(128, 128, 128, 0.18)" }}
    >
      <Typography variant="delta" tag="h2" fontWeight="bold">
        {t(
          "page.ui.what_is_the_delivery_ledger",
          "What is the Delivery Ledger?"
        )}
      </Typography>
      <Box paddingTop={1}>
        <Typography variant="omega" textColor="neutral600">
          {t(
            "page.ui.delivery_ledger_description",
            "The Delivery Ledger is an immutable audit and idempotency log of every message dispatched across Email, Telegram, and WhatsApp. Each delivery records a deterministic idempotency key (campaignSlug + channel + recipient) so retrying a campaign never sends duplicate messages, masks recipient PII (e.g. a***@domain.org, +57***4567), and tracks whether the message was sent live or simulated in Dry-Run mode."
          )}
        </Typography>
      </Box>
    </Box>

    <Table colCount={6} rowCount={Math.max(logs.length, 1) + 1}>
      <Thead>
        <Tr>
          <Th>
            <Typography variant="sigma">
              {t("page.ui.campaign", "Campaign")}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t("page.ui.channel_driver", "Channel / Driver")}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t("page.ui.masked_recipient", "Masked Recipient")}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t("page.ui.locale", "Locale")}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t("page.ui.status", "Status")}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t("page.ui.sent_at", "Sent At")}
            </Typography>
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {logs.length === 0 ? (
          <Tr>
            <Td colSpan={6}>
              <Box padding={4}>
                <Typography textColor="neutral600">
                  {t(
                    "page.ui.no_deliveries_recorded_yet",
                    'No deliveries recorded yet. Click "Dispatch Now" on any campaign in the Campaigns tab to dispatch (or simulate in Dry-Run mode) and populate the ledger.'
                  )}
                </Typography>
              </Box>
            </Td>
          </Tr>
        ) : (
          logs.map((log) => (
            <Tr key={log.idempotencyKey}>
              <Td>
                <Typography fontWeight="bold">{log.campaignSlug}</Typography>
              </Td>
              <Td>
                <Typography>
                  {log.channel} ({log.driver})
                </Typography>
              </Td>
              <Td>
                <Typography>{log.recipientMasked}</Typography>
              </Td>
              <Td>
                <Badge>{log.locale}</Badge>
              </Td>
              <Td>
                <Badge>{log.status}</Badge>
              </Td>
              <Td>
                <Typography>{log.sentAt?.slice(0, 19)}</Typography>
              </Td>
            </Tr>
          ))
        )}
      </Tbody>
    </Table>
  </Box>
);

export interface AutomationRulesTableProps {
  t: TranslateFn;
  rules: AutomationRuleRecord[];
  onEdit: (rule: AutomationRuleRecord) => void;
  onToggleActive: (rule: AutomationRuleRecord) => void;
  navigate: (path: string) => void;
}

export const AutomationRulesTable: React.FC<AutomationRulesTableProps> = ({
  t,
  rules,
  onEdit,
  onToggleActive,
  navigate,
}) => (
  <Table colCount={7} rowCount={rules.length + 1}>
    <Thead>
      <Tr>
        <Th>
          <Typography variant="sigma">
            {t("page.ui.rule_slug", "Rule Slug")}
          </Typography>
        </Th>
        <Th>
          <Typography variant="sigma">
            {t("page.ui.eventhub_trigger", "EventHub Trigger")}
          </Typography>
        </Th>
        <Th>
          <Typography variant="sigma">{t("page.ui.topic", "Topic")}</Typography>
        </Th>
        <Th>
          <Typography variant="sigma">
            {t("page.ui.channels", "Channels")}
          </Typography>
        </Th>
        <Th>
          <Typography variant="sigma">
            {t("page.ui.trigger_count", "Trigger Count")}
          </Typography>
        </Th>
        <Th>
          <Typography variant="sigma">
            {t("page.ui.status", "Status")}
          </Typography>
        </Th>
        <Th>
          <Typography variant="sigma">
            {t("page.ui.actions", "Actions")}
          </Typography>
        </Th>
      </Tr>
    </Thead>
    <Tbody>
      {rules.map((rule) => (
        <Tr key={rule.slug}>
          <Td>
            <Flex direction="column" alignItems="flex-start" gap={1}>
              <Typography fontWeight="bold">{rule.name}</Typography>
              <Typography variant="pi" textColor="neutral600">
                {rule.slug}
              </Typography>
            </Flex>
          </Td>
          <Td>
            <Badge>{rule.eventName}</Badge>
          </Td>
          <Td>
            <Typography>{rule.topic}</Typography>
          </Td>
          <Td>
            <Typography>{(rule.channels || []).join(", ")}</Typography>
          </Td>
          <Td>
            <Typography>{rule.triggerCount || 0}</Typography>
          </Td>
          <Td>
            <Badge active={rule.active}>
              {rule.active
                ? t("common.active", "active")
                : t("common.paused", "paused")}
            </Badge>
          </Td>
          <Td>
            <Flex gap={2} wrap="wrap">
              <Button variant="tertiary" size="S" onClick={() => onEdit(rule)}>
                {t("common.edit", "Edit")}
              </Button>
              <Button
                variant="secondary"
                size="S"
                onClick={() => onToggleActive(rule)}
              >
                {rule.active
                  ? t("common.pause", "Pause")
                  : t("common.activate", "Activate")}
              </Button>
              {rule.documentId && (
                <Button
                  variant="tertiary"
                  size="S"
                  onClick={() =>
                    navigate(
                      `/content-manager/collection-types/${AUTOMATION_RULE_UID}/${rule.documentId}`
                    )
                  }
                >
                  {t("common.content_manager", "Content Manager")}
                </Button>
              )}
            </Flex>
          </Td>
        </Tr>
      ))}
    </Tbody>
  </Table>
);
