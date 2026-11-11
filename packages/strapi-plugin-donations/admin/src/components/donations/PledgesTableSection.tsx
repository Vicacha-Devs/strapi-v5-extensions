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
import React from "react";

import type { DonationPledgeItem } from "../../../../shared";
import type { TranslateFn } from "./donationsHelpers";

const PledgeTableRow: React.FC<{
  pledge: DonationPledgeItem;
  processingRef: string | null;
  onDecision: (
    referenceCode: string,
    decision: "verified" | "rejected"
  ) => void;
  t: TranslateFn;
}> = ({ pledge, processingRef, onDecision, t }) => {
  const isProcessing = processingRef === pledge.referenceCode;
  const certLabel =
    pledge.certificateSerialNumber || t("pledge.cert.not_issued", "Not issued");

  return (
    <Tr>
      <Td>
        <Typography fontWeight="bold">{pledge.referenceCode}</Typography>
      </Td>
      <Td>
        <Typography>{pledge.donorName}</Typography>
        <Typography variant="pi" textColor="neutral600">
          {` (${pledge.donorEmail})`}
        </Typography>
      </Td>
      <Td>
        <Typography fontWeight="bold">
          {pledge.amount.toLocaleString()} {pledge.currency}
        </Typography>
      </Td>
      <Td>
        <Typography>{pledge.campaignSlug || pledge.categoryKey}</Typography>
        {pledge.coversRemainingBalance ? (
          <Badge>{t("pledge.badge.full_balance", "Full Balance Payoff")}</Badge>
        ) : null}
      </Td>
      <Td>
        <Badge>{pledge.status.toUpperCase()}</Badge>
      </Td>
      <Td>
        <Typography variant="pi">{certLabel}</Typography>
      </Td>
      <Td>
        {pledge.status === "pending" ? (
          <Flex gap={2}>
            <Button
              size="S"
              loading={isProcessing}
              onClick={() => onDecision(pledge.referenceCode, "verified")}
            >
              {t("pledge.action.verify_issue", "Verify & Issue Cert")}
            </Button>
            <Button
              size="S"
              variant="danger-light"
              loading={isProcessing}
              onClick={() => onDecision(pledge.referenceCode, "rejected")}
            >
              {t("pledge.action.reject", "Reject")}
            </Button>
          </Flex>
        ) : null}
      </Td>
    </Tr>
  );
};

export interface PledgesTableSectionProps {
  pledges: DonationPledgeItem[];
  processingRef: string | null;
  onDecision: (
    referenceCode: string,
    decision: "verified" | "rejected"
  ) => void;
  t: TranslateFn;
}

export const PledgesTableSection: React.FC<PledgesTableSectionProps> = ({
  pledges,
  processingRef,
  onDecision,
  t,
}) => (
  <Box background="neutral0" padding={5} hasRadius shadow="filterShadow">
    <Box marginBottom={4} style={{ marginBottom: 16 }}>
      <Typography variant="delta" tag="h2">
        {t(
          "table.pledges.title",
          "Recent Donor Pledges, Bill Contributions & Tax Certificates ({count})",
          { count: pledges.length }
        )}
      </Typography>
    </Box>
    <Table colCount={7} rowCount={pledges.length}>
      <Thead>
        <Tr>
          <Th>
            <Typography variant="sigma">
              {t("pledge.col.ref", "Ref")}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t("pledge.col.donor", "Donor")}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t("pledge.col.amount", "Amount")}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t("pledge.col.target", "Target / Category")}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t("pledge.col.status", "Status")}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t("pledge.col.certificate", "Certificate")}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t("pledge.col.actions", "Actions")}
            </Typography>
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {pledges.map((pledge) => (
          <PledgeTableRow
            key={pledge.referenceCode}
            pledge={pledge}
            processingRef={processingRef}
            onDecision={onDecision}
            t={t}
          />
        ))}
      </Tbody>
    </Table>
  </Box>
);
