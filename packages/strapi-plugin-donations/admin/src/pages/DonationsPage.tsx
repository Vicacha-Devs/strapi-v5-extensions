import { Box, Main } from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import React, { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";

import {
  PLUGIN_ID,
  type CampaignEvidenceType,
  type CampaignKind,
  type DonationCampaignItem,
  type DonationPledgeItem,
  type DonationsSettings,
} from "../../../shared";
import { CampaignComposerSection } from "../components/donations/CampaignComposerSection";
import { CampaignEvidenceInspector } from "../components/donations/CampaignEvidenceInspector";
import { CampaignsTableSection } from "../components/donations/CampaignsTableSection";
import {
  DonationsKpiGrid,
  DonationsTopHeader,
} from "../components/donations/DonationsHeaderAndKpis";
import {
  buildCampaignPresetState,
  buildEvidencePresetState,
  computeFundSummaryForList,
  computeKpiStats,
  type ActiveTab,
  type CampaignFormState,
  type EvidenceFormState,
  type TranslateFn,
} from "../components/donations/donationsHelpers";
import { PledgesTableSection } from "../components/donations/PledgesTableSection";

interface OverviewPayload {
  campaigns?: DonationCampaignItem[];
  majorCampaigns?: DonationCampaignItem[];
  utilityInvoices?: DonationCampaignItem[];
  pledges?: DonationPledgeItem[];
  settings?: DonationsSettings;
}

const INITIAL_CAMPAIGN_FORM: CampaignFormState = {
  title: "",
  slug: "",
  kind: "major_campaign",
  category: "general_fund",
  isCustomCategory: false,
  goalAmount: "1000000",
  raisedAmount: "0",
  currency: "COP",
  billingPeriod: "",
  dueDate: "",
  invoiceProvider: "",
  invoiceReference: "",
  description: "",
  body: "",
};

function createInitialEvidenceForm(): EvidenceFormState {
  return {
    title: "",
    type: "paid_receipt",
    date: new Date().toISOString().slice(0, 10),
    amountSpent: "",
    documentUrl: "",
    mediaUrls: "",
    body: "",
    markPaid: false,
    appendBody: true,
  };
}

function resolveCampaignListFromPayload(
  payload: OverviewPayload
): DonationCampaignItem[] {
  if (Array.isArray(payload.campaigns)) return payload.campaigns;
  return [
    ...(Array.isArray(payload.majorCampaigns) ? payload.majorCampaigns : []),
    ...(Array.isArray(payload.utilityInvoices) ? payload.utilityInvoices : []),
  ];
}

function trimmedOrNull(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

function buildCreateCampaignPayloadData(
  form: CampaignFormState
): Record<string, unknown> {
  const title = form.title.trim();
  return {
    title,
    slug: form.slug.trim() || undefined,
    campaignKind: form.kind,
    categoryKey: form.category || "general_fund",
    goalAmount: Number(form.goalAmount) || 0,
    raisedAmount: Number(form.raisedAmount) || 0,
    currency: form.currency || "COP",
    billingPeriod: trimmedOrNull(form.billingPeriod),
    dueDate: trimmedOrNull(form.dueDate),
    invoiceProvider: trimmedOrNull(form.invoiceProvider),
    invoiceReference: trimmedOrNull(form.invoiceReference),
    description: form.description.trim() || title,
    body: form.body,
  };
}

function buildAddEvidencePayloadData(
  evForm: EvidenceFormState,
  currency: string
): Record<string, unknown> {
  const mediaUrls = evForm.mediaUrls
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const trimmedBody = evForm.body.trim();

  return {
    title: evForm.title.trim(),
    evidenceType: evForm.type,
    date: evForm.date,
    amountSpent: Number(evForm.amountSpent) || 0,
    currency,
    documentUrl: trimmedOrNull(evForm.documentUrl),
    mediaUrls,
    description: trimmedBody,
    body: trimmedBody,
    markCampaignPaid: evForm.markPaid,
    appendToCampaignBody: evForm.appendBody,
  };
}

export const DonationsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t: TranslateFn = (id, defaultMessage, values) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage }, values);

  const { get, post, put, del } = useFetchClient();
  const [campaigns, setCampaigns] = useState<DonationCampaignItem[]>([]);
  const [pledges, setPledges] = useState<DonationPledgeItem[]>([]);
  const [settings, setSettings] = useState<DonationsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [notice, setNotice] = useState<string>("");
  const [processingRef, setProcessingRef] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState(INITIAL_CAMPAIGN_FORM);

  const [selectedCampaignSlug, setSelectedCampaignSlug] = useState<
    string | null
  >(null);
  const [editingBodyText, setEditingBodyText] = useState("");
  const [editingDescriptionText, setEditingDescriptionText] = useState("");
  const [savingBody, setSavingBody] = useState(false);

  const [evForm, setEvForm] = useState(createInitialEvidenceForm);
  const [savingEvidence, setSavingEvidence] = useState(false);

  const patchCampaignForm = (patch: Partial<CampaignFormState>) => {
    setCampaignForm((prev) => ({ ...prev, ...patch }));
  };

  const patchEvForm = (patch: Partial<EvidenceFormState>) => {
    setEvForm((prev) => ({ ...prev, ...patch }));
  };

  const evidenceTypeLabels: Record<CampaignEvidenceType, string> = {
    paid_receipt: t(
      "evidence.type.paid_receipt",
      "Paid Utility / Service Bill Receipt"
    ),
    photo_gallery: t(
      "evidence.type.photo_gallery",
      "Equipment & Donated Assets Photo Gallery"
    ),
    delivery_report: t(
      "evidence.type.delivery_report",
      "Seasonal / Aid Gift Distribution Report"
    ),
    audit_document: t(
      "evidence.type.audit_document",
      "Financial Audit & Official Voucher"
    ),
    beneficiary_update: t(
      "evidence.type.beneficiary_update",
      "Beneficiary Impact & Progress Story"
    ),
  };

  const campaignKindLabels: Record<CampaignKind, string> = {
    major_campaign: t(
      "campaign.kind.major_campaign",
      "Major Crowdfunding Campaign"
    ),
    utility_invoice: t(
      "campaign.kind.utility_invoice",
      "Utility & Operational Service Bill"
    ),
    micro_need: t(
      "campaign.kind.micro_need",
      "Micro-Need / Equipment / Gift Drive"
    ),
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await get<OverviewPayload>(`/${PLUGIN_ID}/overview`);
      const payload = res?.data?.data || {};
      setCampaigns(resolveCampaignListFromPayload(payload));
      setPledges(Array.isArray(payload.pledges) ? payload.pledges : []);
      if (payload.settings) {
        setSettings(payload.settings);
        if (payload.settings.baseCurrency) {
          patchCampaignForm({ currency: payload.settings.baseCurrency });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectedCampaign = useMemo(
    () =>
      campaigns.find(
        (c) =>
          c.slug === selectedCampaignSlug ||
          c.documentId === selectedCampaignSlug
      ) || null,
    [campaigns, selectedCampaignSlug]
  );

  useEffect(() => {
    if (!selectedCampaign) return;
    setEditingBodyText(selectedCampaign.body || "");
    setEditingDescriptionText(selectedCampaign.description || "");
    const isUtility = selectedCampaign.campaignKind === "utility_invoice";
    patchEvForm({
      amountSpent: isUtility ? String(selectedCampaign.goalAmount || "") : "",
      markPaid: isUtility,
    });
  }, [selectedCampaign?.slug, selectedCampaign?.documentId]);

  const majorCampaigns = useMemo(
    () => campaigns.filter((c) => c.campaignKind === "major_campaign"),
    [campaigns]
  );
  const utilityInvoices = useMemo(
    () => campaigns.filter((c) => c.campaignKind === "utility_invoice"),
    [campaigns]
  );
  const microNeeds = useMemo(
    () => campaigns.filter((c) => c.campaignKind === "micro_need"),
    [campaigns]
  );
  const visibleCampaigns = useMemo(
    () =>
      activeTab === "all" || activeTab === "pledges"
        ? campaigns
        : campaigns.filter((c) => c.campaignKind === activeTab),
    [activeTab, campaigns]
  );

  const summarizeFunds = useMemo(() => {
    const baseCurrency = settings?.baseCurrency || "COP";
    const rates: Record<string, number> = {
      COP: 1,
      USD: 4150,
      EUR: 4500,
      TRY: 120,
      ...settings?.exchangeRatesToBase,
    };
    return {
      all: computeFundSummaryForList(campaigns, baseCurrency, rates),
      visible: computeFundSummaryForList(visibleCampaigns, baseCurrency, rates),
    };
  }, [campaigns, visibleCampaigns, settings]);

  const kpiStats = useMemo(
    () => computeKpiStats(campaigns, pledges),
    [campaigns, pledges]
  );

  const handleApplyCampaignPreset = (
    preset:
      | "crowdfunding"
      | "utility_bill"
      | "computer_donation"
      | "seasonal_gift"
  ) => {
    setShowCreateForm(true);
    const baseCurr = settings?.baseCurrency || "COP";
    patchCampaignForm(buildCampaignPresetState(preset, baseCurr, t));
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.title.trim()) return;
    setCreatingCampaign(true);
    try {
      const res = await post<DonationCampaignItem>(`/${PLUGIN_ID}/campaigns`, {
        data: buildCreateCampaignPayloadData(campaignForm),
      });
      const created = res?.data?.data;
      const title = created ? created.title : campaignForm.title;
      patchCampaignForm({ title: "", slug: "", description: "", body: "" });
      setShowCreateForm(false);
      setNotice(
        t("notice.campaign_created", 'Created "{title}" successfully.', {
          title,
        })
      );
      await loadData();
      if (created?.slug) setSelectedCampaignSlug(created.slug);
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleSaveCampaignRichText = async () => {
    if (!selectedCampaign) return;
    setSavingBody(true);
    try {
      const id = selectedCampaign.documentId || selectedCampaign.slug;
      await put(`/${PLUGIN_ID}/campaigns/${id}`, {
        data: { description: editingDescriptionText, body: editingBodyText },
      });
      setNotice(
        t(
          "notice.richtext_updated",
          'Updated Rich Text body & description for "{title}".',
          { title: selectedCampaign.title }
        )
      );
      await loadData();
    } finally {
      setSavingBody(false);
    }
  };

  const handleApplyEvidencePreset = (preset: CampaignEvidenceType) => {
    patchEvForm(
      buildEvidencePresetState(preset, selectedCampaign?.billingPeriod, t)
    );
  };

  const handleAddEvidence = async () => {
    if (!selectedCampaign || !evForm.title.trim()) return;
    setSavingEvidence(true);
    try {
      const identifier = selectedCampaign.documentId || selectedCampaign.slug;
      await post(`/${PLUGIN_ID}/campaigns/${identifier}/evidences`, {
        data: buildAddEvidencePayloadData(evForm, selectedCampaign.currency),
      });
      patchEvForm({ title: "", documentUrl: "", mediaUrls: "", body: "" });
      setNotice(
        t("notice.evidence_added", 'Added impact evidence to "{title}".', {
          title: selectedCampaign.title,
        })
      );
      await loadData();
    } finally {
      setSavingEvidence(false);
    }
  };

  const handleRemoveEvidence = async (evidenceId: string) => {
    if (!selectedCampaign) return;
    const identifier = selectedCampaign.documentId || selectedCampaign.slug;
    await del(`/${PLUGIN_ID}/campaigns/${identifier}/evidences/${evidenceId}`);
    setNotice(t("notice.evidence_removed", "Removed impact evidence item."));
    await loadData();
  };

  const handleDecision = async (
    referenceCode: string,
    decision: "verified" | "rejected"
  ) => {
    setProcessingRef(referenceCode);
    try {
      await post(`/${PLUGIN_ID}/pledges/${referenceCode}/verify`, {
        decision,
        issueTaxCertificate: decision === "verified",
      });
      setNotice(
        t(
          "notice.pledge_updated",
          "Pledge {referenceCode} marked as {decision}.",
          { referenceCode, decision }
        )
      );
      await loadData();
    } finally {
      setProcessingRef(null);
    }
  };

  return (
    <Main>
      <Box padding={8}>
        <DonationsTopHeader
          allSummary={summarizeFunds.all}
          showCreateForm={showCreateForm}
          loading={loading}
          notice={notice}
          onToggleCreateForm={() => setShowCreateForm((prev) => !prev)}
          onRefresh={() => void loadData()}
          onDismissNotice={() => setNotice("")}
          t={t}
        />

        <DonationsKpiGrid
          allSummary={summarizeFunds.all}
          kpiStats={kpiStats}
          campaignsCount={campaigns.length}
          majorCount={majorCampaigns.length}
          utilityCount={utilityInvoices.length}
          microCount={microNeeds.length}
          pledgesCount={pledges.length}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          t={t}
        />

        {showCreateForm ? (
          <CampaignComposerSection
            form={campaignForm}
            settings={settings}
            campaignKindLabels={campaignKindLabels}
            creatingCampaign={creatingCampaign}
            onPatchForm={patchCampaignForm}
            onApplyPreset={handleApplyCampaignPreset}
            onCancel={() => setShowCreateForm(false)}
            onSubmit={() => void handleCreateCampaign()}
            t={t}
          />
        ) : null}

        {activeTab !== "pledges" ? (
          <CampaignsTableSection
            activeTab={activeTab}
            visibleCampaigns={visibleCampaigns}
            visibleSummary={summarizeFunds.visible}
            selectedCampaign={selectedCampaign}
            campaignKindLabels={campaignKindLabels}
            onSelectCampaignSlug={setSelectedCampaignSlug}
            t={t}
          />
        ) : null}

        {activeTab !== "pledges" && selectedCampaign ? (
          <CampaignEvidenceInspector
            selectedCampaign={selectedCampaign}
            editingDescriptionText={editingDescriptionText}
            editingBodyText={editingBodyText}
            savingBody={savingBody}
            evForm={evForm}
            savingEvidence={savingEvidence}
            evidenceTypeLabels={evidenceTypeLabels}
            onChangeDescription={setEditingDescriptionText}
            onChangeBody={setEditingBodyText}
            onSaveRichText={() => void handleSaveCampaignRichText()}
            onPatchEvForm={patchEvForm}
            onApplyEvidencePreset={handleApplyEvidencePreset}
            onAddEvidence={() => void handleAddEvidence()}
            onRemoveEvidence={(id) => void handleRemoveEvidence(id)}
            onClose={() => setSelectedCampaignSlug(null)}
            t={t}
          />
        ) : null}

        {activeTab === "pledges" ? (
          <PledgesTableSection
            pledges={pledges}
            processingRef={processingRef}
            onDecision={(ref, dec) => void handleDecision(ref, dec)}
            t={t}
          />
        ) : null}
      </Box>
    </Main>
  );
};

export default DonationsPage;
