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

import {
  extractRichTextPlainText,
  type CampaignKind,
  type DonationCampaignItem,
} from "../../../../shared";
import {
  getProgressBarColor,
  openInContentManager,
  type ActiveTab,
  type FundSummary,
  type TranslateFn,
} from "./donationsHelpers";

function formatProviderSubtitle(camp: DonationCampaignItem): string {
  if (!camp.invoiceProvider) return "";
  const periodSuffix = camp.billingPeriod ? ` (${camp.billingPeriod})` : "";
  return ` • ${camp.invoiceProvider}${periodSuffix}`;
}

function truncatePlainText(raw: string): string {
  const plain = extractRichTextPlainText(raw);
  if (!plain) return "";
  return plain.length > 95 ? `${plain.slice(0, 95)}…` : plain;
}

const CampaignTableRow: React.FC<{
  camp: DonationCampaignItem;
  isSelected: boolean;
  onSelectCampaignSlug: (slug: string | null) => void;
  t: TranslateFn;
}> = ({ camp, isSelected, onSelectCampaignSlug, t }) => {
  const barColor = getProgressBarColor(
    camp.invoiceStatus,
    camp.progressPercent
  );
  const snippet = truncatePlainText(camp.description);
  const providerSubtitle = formatProviderSubtitle(camp);
  const evidenceCount = camp.evidenceCount || 0;
  const clampedPercent = Math.min(100, Math.max(0, camp.progressPercent));
  const inspectorLabel = isSelected
    ? t("table.action.close_inspector", "Close Inspector")
    : t("table.action.open_evidences", "Evidences & Rich Text ({count})", {
        count: evidenceCount,
      });

  return (
    <Tr>
      <Td>
        <Typography fontWeight="bold">{camp.title}</Typography>
        {providerSubtitle ? (
          <Typography variant="pi" textColor="neutral600">
            {providerSubtitle}
          </Typography>
        ) : null}
        {snippet ? (
          <Box paddingTop={1}>
            <Typography variant="pi" textColor="neutral500">
              {snippet}
            </Typography>
          </Box>
        ) : null}
      </Td>
      <Td>
        <Badge>{camp.campaignKind}</Badge>
        <Box paddingTop={1}>
          <Typography variant="pi" textColor="neutral600">
            {camp.categoryKey}
          </Typography>
        </Box>
      </Td>
      <Td>
        <Typography fontWeight="bold">
          {camp.raisedAmount.toLocaleString()} /{" "}
          {camp.goalAmount.toLocaleString()} {camp.currency}
        </Typography>
        <Box paddingTop={1}>
          <Typography variant="pi" textColor="neutral600">
            {t(
              "table.cell.remaining_donors",
              "Remaining: {remaining} {currency} • {donors} donors",
              {
                remaining: camp.remainingAmount.toLocaleString(),
                currency: camp.currency,
                donors: camp.donorCount,
              }
            )}
          </Typography>
        </Box>
      </Td>
      <Td>
        <Box style={{ minWidth: 130 }}>
          <Flex
            justifyContent="space-between"
            alignItems="center"
            marginBottom={1}
          >
            <Typography variant="pi" fontWeight="bold">
              {camp.progressPercent}%
            </Typography>
            {camp.dueDate ? (
              <Typography variant="pi" textColor="neutral600">
                {t("table.cell.due_date", "Due {date}", { date: camp.dueDate })}
              </Typography>
            ) : null}
          </Flex>
          <div
            style={{
              width: "100%",
              height: 8,
              borderRadius: 999,
              background: "rgba(128, 128, 128, 0.2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${clampedPercent}%`,
                height: "100%",
                borderRadius: 999,
                background: barColor,
                transition: "width 0.25s ease",
              }}
            />
          </div>
        </Box>
      </Td>
      <Td>
        <Badge active={camp.invoiceStatus === "paid"}>
          {camp.invoiceStatus.toUpperCase()}
        </Badge>
      </Td>
      <Td>
        <Badge active={evidenceCount > 0}>
          {t("table.cell.proofs_count", "{count} proofs", {
            count: evidenceCount,
          })}
        </Badge>
        {camp.accountedAmount > 0 ? (
          <Box paddingTop={1}>
            <Typography variant="pi" textColor="neutral600">
              {camp.accountedAmount.toLocaleString()} {camp.currency}
            </Typography>
          </Box>
        ) : null}
      </Td>
      <Td>
        <Flex gap={2} wrap="wrap">
          <Button
            size="S"
            variant={isSelected ? "default" : "secondary"}
            onClick={() => onSelectCampaignSlug(isSelected ? null : camp.slug)}
          >
            {inspectorLabel}
          </Button>
          {camp.documentId ? (
            <Button
              size="S"
              variant="tertiary"
              onClick={() => openInContentManager(camp.documentId)}
            >
              {t("table.action.edit_in_cm", "Edit in CM")}
            </Button>
          ) : null}
        </Flex>
      </Td>
    </Tr>
  );
};

export interface CampaignsTableSectionProps {
  activeTab: Exclude<ActiveTab, "pledges">;
  visibleCampaigns: DonationCampaignItem[];
  visibleSummary: FundSummary;
  selectedCampaign: DonationCampaignItem | null;
  campaignKindLabels: Record<CampaignKind, string>;
  onSelectCampaignSlug: (slug: string | null) => void;
  t: TranslateFn;
}

export const CampaignsTableSection: React.FC<CampaignsTableSectionProps> = ({
  activeTab,
  visibleCampaigns,
  visibleSummary,
  selectedCampaign,
  campaignKindLabels,
  onSelectCampaignSlug,
  t,
}) => {
  const tableTitle =
    activeTab === "all"
      ? t(
          "table.campaigns.all_title",
          "All Active Campaigns, Utility Bills & Micro-Needs ({count})",
          { count: visibleCampaigns.length }
        )
      : `${campaignKindLabels[activeTab]} (${visibleCampaigns.length})`;

  return (
    <Box
      marginBottom={6}
      background="neutral0"
      padding={5}
      hasRadius
      shadow="filterShadow"
    >
      <Flex
        justifyContent="space-between"
        alignItems="center"
        marginBottom={4}
        wrap="wrap"
        gap={2}
      >
        <Flex alignItems="center" gap={3} wrap="wrap">
          <Typography variant="delta" tag="h2">
            {tableTitle}
          </Typography>
          <Badge active>
            {t(
              "table.campaigns.gathered_badge",
              "Gathered: {raised} / {goal} ({donors} donors)",
              {
                raised: visibleSummary.raisedBreakdown,
                goal: visibleSummary.goalBreakdown,
                donors: visibleSummary.totalDonors,
              }
            )}
          </Badge>
        </Flex>
        <Typography variant="pi" textColor="neutral600">
          {t(
            "table.campaigns.hint",
            'Click "Evidences & Rich Text" on any item to attach paid bill receipts, equipment photos, or Kurban/Ramadan gift reports.'
          )}
        </Typography>
      </Flex>

      <Table colCount={7} rowCount={visibleCampaigns.length}>
        <Thead>
          <Tr>
            <Th>
              <Typography variant="sigma">
                {t("table.col.campaign", "Campaign / Service Bill")}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {t("table.col.kind", "Kind & Category")}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {t("table.col.raised_goal", "Raised / Goal")}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {t("table.col.progress", "Progress")}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {t("table.col.status", "Status")}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {t("table.col.evidences", "Evidences")}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {t("table.col.actions", "Actions")}
              </Typography>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {visibleCampaigns.map((camp) => (
            <CampaignTableRow
              key={camp.documentId || camp.slug}
              camp={camp}
              isSelected={
                Boolean(selectedCampaign) &&
                selectedCampaign?.slug === camp.slug
              }
              onSelectCampaignSlug={onSelectCampaignSlug}
              t={t}
            />
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};
