import {
  Badge,
  Box,
  Button,
  Flex,
  Tabs,
  Typography,
} from "@strapi/design-system";
import React from "react";

import {
  openInContentManager,
  type ActiveTab,
  type FundSummary,
  type KpiStats,
  type TranslateFn,
} from "./donationsHelpers";

export interface DonationsTopHeaderProps {
  allSummary: FundSummary;
  showCreateForm: boolean;
  loading: boolean;
  notice: string;
  onToggleCreateForm: () => void;
  onRefresh: () => void;
  onDismissNotice: () => void;
  t: TranslateFn;
}

export const DonationsTopHeader: React.FC<DonationsTopHeaderProps> = ({
  allSummary,
  showCreateForm,
  loading,
  notice,
  onToggleCreateForm,
  onRefresh,
  onDismissNotice,
  t,
}) => {
  const headerSubDetail =
    allSummary.currenciesCount > 1
      ? t(
          "dashboard.total_gathered.multi_currency",
          "≈ {consolidated} {currency} consolidated • Goal: {goal} • {donors} donors",
          {
            consolidated: allSummary.raisedInBase.toLocaleString(),
            currency: allSummary.baseCurrency,
            goal: allSummary.goalBreakdown,
            donors: allSummary.totalDonors,
          }
        )
      : t(
          "dashboard.total_gathered.single_currency",
          "Goal: {goal} • {donors} donors",
          {
            goal: allSummary.goalBreakdown,
            donors: allSummary.totalDonors,
          }
        );

  const toggleBtnLabel = showCreateForm
    ? t("dashboard.action.close_composer", "Close Campaign Composer")
    : t("dashboard.action.new_campaign", "+ New Campaign / Bill / Micro-Need");

  return (
    <>
      <Flex
        justifyContent="space-between"
        alignItems="flex-start"
        marginBottom={6}
        wrap="wrap"
        gap={4}
      >
        <Box style={{ flex: "1 1 480px" }}>
          <Flex alignItems="center" gap={3} wrap="wrap">
            <Typography variant="alpha" as="h1">
              {t(
                "dashboard.title",
                "Donations, Crowdfunding, Utility Bills & Impact Evidences"
              )}
            </Typography>
            <Badge active>
              {t("dashboard.badge.gathered", "Gathered: {amount}", {
                amount: allSummary.raisedBreakdown,
              })}
            </Badge>
          </Flex>
          <Box paddingTop={1}>
            <Typography variant="epsilon" textColor="neutral600">
              {t(
                "dashboard.subtitle",
                "Open donation campaigns, track progress bars, publish transparency evidences (paid service bills, donated equipment photos, seasonal/Kurban/Ramadan gifts), and issue Ed25519 tax certificates."
              )}
            </Typography>
          </Box>
        </Box>
        <Flex direction="column" alignItems="flex-end" gap={3}>
          <Box
            padding={3}
            background="neutral0"
            hasRadius
            shadow="filterShadow"
            style={{
              border: "1px solid rgba(22, 163, 74, 0.35)",
              background: "rgba(22, 163, 74, 0.06)",
            }}
          >
            <Flex direction="column" alignItems="flex-end" gap={1}>
              <Typography variant="sigma" textColor="success700">
                {t("dashboard.total_gathered_label", "TOTAL GATHERED MONEY")}
              </Typography>
              <Typography
                variant="beta"
                fontWeight="bold"
                textColor="success700"
              >
                {allSummary.raisedBreakdown}
              </Typography>
              <Typography variant="pi" textColor="neutral600">
                {headerSubDetail}
              </Typography>
            </Flex>
          </Box>
          <Flex gap={2} wrap="wrap">
            <Button
              variant={showCreateForm ? "secondary" : "default"}
              onClick={onToggleCreateForm}
            >
              {toggleBtnLabel}
            </Button>
            <Button variant="secondary" onClick={() => openInContentManager()}>
              {t(
                "dashboard.action.open_cm",
                "Open in Content Manager (Rich Text / Tiptap)"
              )}
            </Button>
            <Button variant="tertiary" onClick={onRefresh} loading={loading}>
              {t("dashboard.action.refresh", "Refresh")}
            </Button>
          </Flex>
        </Flex>
      </Flex>

      {notice ? (
        <Box padding={3} marginBottom={4} background="success100" hasRadius>
          <Flex justifyContent="space-between" alignItems="center">
            <Typography textColor="success700" fontWeight="semiBold">
              {notice}
            </Typography>
            <Button variant="ghost" size="S" onClick={onDismissNotice}>
              {t("common.dismiss", "Dismiss")}
            </Button>
          </Flex>
        </Box>
      ) : null}
    </>
  );
};

export interface DonationsKpiGridProps {
  allSummary: FundSummary;
  kpiStats: KpiStats;
  campaignsCount: number;
  majorCount: number;
  utilityCount: number;
  microCount: number;
  pledgesCount: number;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  t: TranslateFn;
}

export const DonationsKpiGrid: React.FC<DonationsKpiGridProps> = ({
  allSummary,
  kpiStats,
  campaignsCount,
  majorCount,
  utilityCount,
  microCount,
  pledgesCount,
  activeTab,
  onSelectTab,
  t,
}) => {
  const kpiGatheredDetail =
    allSummary.currenciesCount > 1
      ? t(
          "kpi.gathered.multi_currency",
          "≈ {consolidated} {currency} • {donors} donors",
          {
            consolidated: allSummary.raisedInBase.toLocaleString(),
            currency: allSummary.baseCurrency,
            donors: allSummary.totalDonors,
          }
        )
      : t("kpi.gathered.single_currency", "Of {goal} goal • {donors} donors", {
          goal: allSummary.goalBreakdown,
          donors: allSummary.totalDonors,
        });

  return (
    <>
      <Box
        marginBottom={6}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 16,
        }}
      >
        <Box padding={4} background="neutral0" hasRadius shadow="filterShadow">
          <Typography variant="sigma" textColor="neutral600">
            {t("dashboard.total_gathered_label", "TOTAL GATHERED MONEY")}
          </Typography>
          <Box paddingTop={1}>
            <Typography variant="beta" fontWeight="bold">
              {allSummary.raisedBreakdown}
            </Typography>
          </Box>
          <Typography variant="pi" textColor="neutral600">
            {kpiGatheredDetail}
          </Typography>
        </Box>

        <Box padding={4} background="neutral0" hasRadius shadow="filterShadow">
          <Typography variant="sigma" textColor="neutral600">
            {t("kpi.active_campaigns.label", "ACTIVE CAMPAIGNS & BILLS")}
          </Typography>
          <Box paddingTop={1}>
            <Typography variant="alpha">{campaignsCount}</Typography>
          </Box>
          <Typography variant="pi" textColor="neutral600">
            {t(
              "kpi.active_campaigns.detail",
              "{major} Crowdfunding • {bills} Bills • {micro} Micro-Needs",
              {
                major: majorCount,
                bills: utilityCount,
                micro: microCount,
              }
            )}
          </Typography>
        </Box>

        <Box padding={4} background="neutral0" hasRadius shadow="filterShadow">
          <Typography variant="sigma" textColor="neutral600">
            {t("kpi.avg_progress.label", "AVERAGE FUNDING PROGRESS")}
          </Typography>
          <Box paddingTop={1}>
            <Typography variant="alpha">{kpiStats.avgProgress}%</Typography>
          </Box>
          <Typography variant="pi" textColor="neutral600">
            {t("kpi.avg_progress.detail", "{count} fully funded / paid off", {
              count: kpiStats.paidOrCompleted,
            })}
          </Typography>
        </Box>

        <Box padding={4} background="neutral0" hasRadius shadow="filterShadow">
          <Typography variant="sigma" textColor="neutral600">
            {t("kpi.evidences.label", "IMPACT EVIDENCES & PROOFS")}
          </Typography>
          <Box paddingTop={1}>
            <Typography variant="alpha">{kpiStats.totalEvidences}</Typography>
          </Box>
          <Typography variant="pi" textColor="neutral600">
            {t(
              "kpi.evidences.detail",
              "Paid bills, donated asset photos & delivery reports"
            )}
          </Typography>
        </Box>

        <Box padding={4} background="neutral0" hasRadius shadow="filterShadow">
          <Typography variant="sigma" textColor="neutral600">
            {t("kpi.pledges.label", "PLEDGES & TAX CERTIFICATES")}
          </Typography>
          <Box paddingTop={1}>
            <Typography variant="alpha">{pledgesCount}</Typography>
          </Box>
          <Typography variant="pi" textColor="neutral600">
            {t(
              "kpi.pledges.detail",
              "{pending} pending • {certs} certificates issued",
              {
                pending: kpiStats.pendingPledges,
                certs: kpiStats.issuedCerts,
              }
            )}
          </Typography>
        </Box>
      </Box>

      <Box marginBottom={5}>
        <Tabs.Root
          value={activeTab}
          onValueChange={(val: string) => onSelectTab(val as ActiveTab)}
        >
          <Tabs.List aria-label={t("dashboard.title", "Donations tabs")}>
            <Tabs.Trigger value="all">
              {t("tab.all", "All Campaigns & Bills")} ({campaignsCount})
            </Tabs.Trigger>
            <Tabs.Trigger value="major_campaign">
              {t("tab.major_campaigns", "Major Campaigns")} ({majorCount})
            </Tabs.Trigger>
            <Tabs.Trigger value="utility_invoice">
              {t("tab.utility_invoices", "Utility & Service Bills")} (
              {utilityCount})
            </Tabs.Trigger>
            <Tabs.Trigger value="micro_need">
              {t("tab.micro_needs", "Micro-Needs & Gift Drives")} ({microCount})
            </Tabs.Trigger>
            <Tabs.Trigger value="pledges">
              {t("tab.pledges", "Pledges & Certificates")} ({pledgesCount})
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
      </Box>
    </>
  );
};
