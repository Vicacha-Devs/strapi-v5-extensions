import React, { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Main,
  Box,
  Flex,
  Typography,
  Button,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Field,
  TextInput,
  Textarea,
  SingleSelect,
  SingleSelectOption,
  Checkbox,
  Divider,
  Tabs,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import {
  PLUGIN_ID,
  extractRichTextPlainText,
  type CampaignEvidenceType,
  type CampaignKind,
  type DonationCampaignItem,
  type DonationPledgeItem,
  type DonationsSettings,
} from '../../../shared';

type ActiveTab = 'all' | 'major_campaign' | 'utility_invoice' | 'micro_need' | 'pledges';

function getProgressBarColor(status: string, percent: number): string {
  if (status === 'paid' || percent >= 100) return '#16a34a';
  if (status === 'overdue') return '#dc2626';
  if (percent >= 50) return '#2563eb';
  return '#4f46e5';
}

export const DonationsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string, values?: Record<string, any>) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage }, values);

  const { get, post, put, del } = useFetchClient();
  const [campaigns, setCampaigns] = useState<DonationCampaignItem[]>([]);
  const [pledges, setPledges] = useState<DonationPledgeItem[]>([]);
  const [settings, setSettings] = useState<DonationsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [notice, setNotice] = useState<string>('');
  const [processingRef, setProcessingRef] = useState<string | null>(null);

  // New Campaign / Bill Composer state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newKind, setNewKind] = useState<CampaignKind>('major_campaign');
  const [newCategory, setNewCategory] = useState('general_fund');
  const [newGoalAmount, setNewGoalAmount] = useState('1000000');
  const [newRaisedAmount, setNewRaisedAmount] = useState('0');
  const [newCurrency, setNewCurrency] = useState('COP');
  const [newBillingPeriod, setNewBillingPeriod] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newInvoiceProvider, setNewInvoiceProvider] = useState('');
  const [newInvoiceReference, setNewInvoiceReference] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newBody, setNewBody] = useState('');

  // Selected Campaign for Impact Evidences & Rich Text Body
  const [selectedCampaignSlug, setSelectedCampaignSlug] = useState<string | null>(null);
  const [editingBodyText, setEditingBodyText] = useState('');
  const [editingDescriptionText, setEditingDescriptionText] = useState('');
  const [savingBody, setSavingBody] = useState(false);

  // Add Evidence Form state
  const [evTitle, setEvTitle] = useState('');
  const [evType, setEvType] = useState<CampaignEvidenceType>('paid_receipt');
  const [evDate, setEvDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [evAmountSpent, setEvAmountSpent] = useState('');
  const [evDocumentUrl, setEvDocumentUrl] = useState('');
  const [evMediaUrls, setEvMediaUrls] = useState('');
  const [evBody, setEvBody] = useState('');
  const [evMarkPaid, setEvMarkPaid] = useState(false);
  const [evAppendBody, setEvAppendBody] = useState(true);
  const [savingEvidence, setSavingEvidence] = useState(false);

  const evidenceTypeLabels: Record<CampaignEvidenceType, string> = {
    paid_receipt: t('evidence.type.paid_receipt', 'Paid Utility / Service Bill Receipt'),
    photo_gallery: t('evidence.type.photo_gallery', 'Equipment & Donated Assets Photo Gallery'),
    delivery_report: t('evidence.type.delivery_report', 'Seasonal / Aid Gift Distribution Report'),
    audit_document: t('evidence.type.audit_document', 'Financial Audit & Official Voucher'),
    beneficiary_update: t('evidence.type.beneficiary_update', 'Beneficiary Impact & Progress Story'),
  };

  const campaignKindLabels: Record<CampaignKind, string> = {
    major_campaign: t('campaign.kind.major_campaign', 'Major Crowdfunding Campaign'),
    utility_invoice: t('campaign.kind.utility_invoice', 'Utility & Operational Service Bill'),
    micro_need: t('campaign.kind.micro_need', 'Micro-Need / Equipment / Gift Drive'),
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await get(`/${PLUGIN_ID}/overview`);
      const payload = res?.data?.data || {};
      const allCamps: DonationCampaignItem[] = Array.isArray(payload.campaigns)
        ? payload.campaigns
        : [
            ...(Array.isArray(payload.majorCampaigns) ? payload.majorCampaigns : []),
            ...(Array.isArray(payload.utilityInvoices) ? payload.utilityInvoices : []),
          ];
      setCampaigns(allCamps);
      setPledges(Array.isArray(payload.pledges) ? payload.pledges : []);
      if (payload.settings) {
        setSettings(payload.settings);
        if (payload.settings.baseCurrency) {
          setNewCurrency(payload.settings.baseCurrency);
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
        (c) => c.slug === selectedCampaignSlug || c.documentId === selectedCampaignSlug
      ) || null,
    [campaigns, selectedCampaignSlug]
  );

  useEffect(() => {
    if (selectedCampaign) {
      setEditingBodyText(selectedCampaign.body || '');
      setEditingDescriptionText(selectedCampaign.description || '');
      setEvAmountSpent(
        selectedCampaign.campaignKind === 'utility_invoice'
          ? String(selectedCampaign.goalAmount || '')
          : ''
      );
      setEvMarkPaid(selectedCampaign.campaignKind === 'utility_invoice');
    }
  }, [selectedCampaign?.slug, selectedCampaign?.documentId]);

  const majorCampaigns = useMemo(
    () => campaigns.filter((c) => c.campaignKind === 'major_campaign'),
    [campaigns]
  );
  const utilityInvoices = useMemo(
    () => campaigns.filter((c) => c.campaignKind === 'utility_invoice'),
    [campaigns]
  );
  const microNeeds = useMemo(
    () => campaigns.filter((c) => c.campaignKind === 'micro_need'),
    [campaigns]
  );

  const visibleCampaigns = useMemo(() => {
    if (activeTab === 'major_campaign') return majorCampaigns;
    if (activeTab === 'utility_invoice') return utilityInvoices;
    if (activeTab === 'micro_need') return microNeeds;
    return campaigns;
  }, [activeTab, campaigns, majorCampaigns, utilityInvoices, microNeeds]);

  const kpiStats = useMemo(() => {
    const totalEvidences = campaigns.reduce((acc, c) => acc + (c.evidenceCount || 0), 0);
    const paidOrCompleted = campaigns.filter(
      (c) => c.invoiceStatus === 'paid' || c.progressPercent >= 100
    ).length;
    const avgProgress =
      campaigns.length > 0
        ? Math.round(
            campaigns.reduce((acc, c) => acc + (Number(c.progressPercent) || 0), 0) /
              campaigns.length
          )
        : 0;
    const pendingPledges = pledges.filter((p) => p.status === 'pending').length;
    const issuedCerts = pledges.filter((p) => Boolean(p.certificateSerialNumber)).length;
    return {
      totalEvidences,
      paidOrCompleted,
      avgProgress,
      pendingPledges,
      issuedCerts,
    };
  }, [campaigns, pledges]);

  const applyCampaignPreset = (
    preset: 'crowdfunding' | 'utility_bill' | 'computer_donation' | 'seasonal_gift'
  ) => {
    setShowCreateForm(true);
    if (preset === 'crowdfunding') {
      setNewKind('major_campaign');
      setNewCategory('endowment');
      setNewTitle(t('preset.crowdfunding.title', 'Community Education & Infrastructure Fund'));
      setNewDescription(
        t(
          'preset.crowdfunding.desc',
          'Crowdfunding campaign for classrooms, scholarships, and community social programs.'
        )
      );
      setNewBody(
        t(
          'preset.crowdfunding.body',
          '## Campaign Objectives\n\n- Expand educational classrooms and digital learning labs\n- Provide scholarships and community welfare packages\n- Publish transparent receipts and photo evidences of every milestone'
        )
      );
      setNewGoalAmount('50000');
      setNewCurrency('USD');
    } else if (preset === 'utility_bill') {
      setNewKind('utility_invoice');
      setNewCategory('utility_bills');
      setNewTitle(t('preset.utility_bill.title', 'Monthly Electricity & Facility Services Bill'));
      setNewBillingPeriod('March 2026');
      setNewInvoiceProvider('Enel / Public Utility Provider');
      setNewInvoiceReference('INV-2026-03');
      setNewDescription(
        t(
          'preset.utility_bill.desc',
          'Monthly operational utility invoice. Contributors can chip in or pay off the remaining balance.'
        )
      );
      setNewBody(
        t(
          'preset.utility_bill.body',
          '### Operational Utility Invoice\n\nOnce paid, the official stamped payment voucher is uploaded to the **Impact Evidences** section.'
        )
      );
      setNewGoalAmount('1850000');
      setNewCurrency(settings?.baseCurrency || 'COP');
    } else if (preset === 'computer_donation') {
      setNewKind('micro_need');
      setNewCategory('general_fund');
      setNewTitle(t('preset.computer_donation.title', 'Computers & Study Lab Equipment Drive'));
      setNewDescription(
        t(
          'preset.computer_donation.desc',
          'Micro-need campaign to equip classrooms and students with laptops, monitors, and study workstations.'
        )
      );
      setNewBody(
        t(
          'preset.computer_donation.body',
          '## Equipment & Computers Donation Drive\n\n- **Target**: 10 workstation computers for students\n- **Transparency**: Photos of delivered computers and serial receipts are published in the campaign evidences.'
        )
      );
      setNewGoalAmount('12000000');
      setNewCurrency(settings?.baseCurrency || 'COP');
    } else if (preset === 'seasonal_gift') {
      setNewKind('micro_need');
      setNewCategory('general_fund');
      setNewTitle(
        t('preset.seasonal_gift.title', 'Seasonal Food Baskets, Ramadan & Kurban Gift Drive')
      );
      setNewDescription(
        t(
          'preset.seasonal_gift.desc',
          'Solidarity campaign for seasonal food packages, Ramadan Iftar baskets, and Kurban gift distributions.'
        )
      );
      setNewBody(
        t(
          'preset.seasonal_gift.body',
          '## Seasonal Solidarity & Gift Distribution\n\nEvery contribution funds direct food baskets and seasonal gifts for vulnerable families. Field distribution photos and delivery reports are attached as evidences.'
        )
      );
      setNewGoalAmount('15000000');
      setNewCurrency(settings?.baseCurrency || 'COP');
    }
  };

  const handleCreateCampaign = async () => {
    if (!newTitle.trim()) return;
    setCreatingCampaign(true);
    try {
      const res = await post(`/${PLUGIN_ID}/campaigns`, {
        data: {
          title: newTitle.trim(),
          slug: newSlug.trim() || undefined,
          campaignKind: newKind,
          categoryKey: newCategory || 'general_fund',
          goalAmount: Number(newGoalAmount) || 0,
          raisedAmount: Number(newRaisedAmount) || 0,
          currency: newCurrency || 'COP',
          billingPeriod: newBillingPeriod.trim() || null,
          dueDate: newDueDate.trim() || null,
          invoiceProvider: newInvoiceProvider.trim() || null,
          invoiceReference: newInvoiceReference.trim() || null,
          description: newDescription.trim() || newTitle.trim(),
          body: newBody,
        },
      });
      const created = res?.data?.data;
      setNewTitle('');
      setNewSlug('');
      setNewDescription('');
      setNewBody('');
      setShowCreateForm(false);
      setNotice(
        t('notice.campaign_created', 'Created "{title}" successfully.', {
          title: created?.title || newTitle,
        })
      );
      await loadData();
      if (created?.slug) {
        setSelectedCampaignSlug(created.slug);
      }
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleSaveCampaignRichText = async () => {
    if (!selectedCampaign) return;
    setSavingBody(true);
    try {
      const identifier = selectedCampaign.documentId || selectedCampaign.slug;
      await put(`/${PLUGIN_ID}/campaigns/${identifier}`, {
        data: {
          description: editingDescriptionText,
          body: editingBodyText,
        },
      });
      setNotice(
        t('notice.richtext_updated', 'Updated Rich Text body & description for "{title}".', {
          title: selectedCampaign.title,
        })
      );
      await loadData();
    } finally {
      setSavingBody(false);
    }
  };

  const applyEvidencePreset = (preset: CampaignEvidenceType) => {
    setEvType(preset);
    if (preset === 'paid_receipt') {
      setEvTitle(
        t('evidence.preset.paid_receipt.title', 'Paid Utility Service Receipt — {period}', {
          period: selectedCampaign?.billingPeriod || 'Official Voucher',
        })
      );
      setEvBody(
        t(
          'evidence.preset.paid_receipt.body',
          'Official utility provider payment receipt confirming 100% settlement of the service bill.'
        )
      );
      setEvMarkPaid(true);
    } else if (preset === 'photo_gallery') {
      setEvTitle(
        t(
          'evidence.preset.photo_gallery.title',
          'Delivered Computers & Classroom Equipment — Photo Evidence'
        )
      );
      setEvBody(
        t(
          'evidence.preset.photo_gallery.body',
          'Photos of the donated computers installed and delivered to students and community classrooms.'
        )
      );
      setEvMarkPaid(false);
    } else if (preset === 'delivery_report') {
      setEvTitle(
        t(
          'evidence.preset.delivery_report.title',
          'Kurban & Ramadan Gift Packages Distribution Report'
        )
      );
      setEvBody(
        t(
          'evidence.preset.delivery_report.body',
          'Photographic evidence and field report of seasonal gift baskets and food packages distributed to beneficiary families.'
        )
      );
      setEvMarkPaid(false);
    } else if (preset === 'audit_document') {
      setEvTitle(
        t('evidence.preset.audit_document.title', 'Financial Audit & Supplier Invoices Summary')
      );
      setEvBody(
        t(
          'evidence.preset.audit_document.body',
          'Verified accounting breakdown and supplier invoices for donated funds.'
        )
      );
      setEvMarkPaid(false);
    } else {
      setEvTitle(t('evidence.preset.beneficiary_update.title', 'Beneficiary Impact Update'));
      setEvBody(
        t(
          'evidence.preset.beneficiary_update.body',
          'Direct impact testimony and progress update from community beneficiaries.'
        )
      );
      setEvMarkPaid(false);
    }
  };

  const handleAddEvidence = async () => {
    if (!selectedCampaign || !evTitle.trim()) return;
    setSavingEvidence(true);
    try {
      const identifier = selectedCampaign.documentId || selectedCampaign.slug;
      const mediaUrls = evMediaUrls
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await post(`/${PLUGIN_ID}/campaigns/${identifier}/evidences`, {
        data: {
          title: evTitle.trim(),
          evidenceType: evType,
          date: evDate,
          amountSpent: Number(evAmountSpent) || 0,
          currency: selectedCampaign.currency,
          documentUrl: evDocumentUrl.trim() || null,
          mediaUrls,
          description: evBody.trim(),
          body: evBody.trim(),
          markCampaignPaid: evMarkPaid,
          appendToCampaignBody: evAppendBody,
        },
      });
      setEvTitle('');
      setEvDocumentUrl('');
      setEvMediaUrls('');
      setEvBody('');
      setNotice(
        t('notice.evidence_added', 'Added impact evidence to "{title}".', {
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
    setNotice(t('notice.evidence_removed', 'Removed impact evidence item.'));
    await loadData();
  };

  const handleDecision = async (referenceCode: string, decision: 'verified' | 'rejected') => {
    setProcessingRef(referenceCode);
    try {
      await post(`/${PLUGIN_ID}/pledges/${referenceCode}/verify`, {
        decision,
        issueTaxCertificate: decision === 'verified',
      });
      setNotice(
        t('notice.pledge_updated', 'Pledge {referenceCode} marked as {decision}.', {
          referenceCode,
          decision,
        })
      );
      await loadData();
    } finally {
      setProcessingRef(null);
    }
  };

  const openInContentManager = (documentId?: string) => {
    const base = '/admin/content-manager/collection-types/plugin::donations.campaign';
    window.location.href = documentId ? `${base}/${documentId}` : base;
  };

  return (
    <Main>
      <Box padding={8}>
        {/* Top Header */}
        <Flex
          justifyContent="space-between"
          alignItems="flex-start"
          marginBottom={6}
          wrap="wrap"
          gap={4}
        >
          <Box>
            <Typography variant="alpha" as="h1">
              {t(
                'dashboard.title',
                'Donations, Crowdfunding, Utility Bills & Impact Evidences'
              )}
            </Typography>
            <Box paddingTop={1}>
              <Typography variant="epsilon" textColor="neutral600">
                {t(
                  'dashboard.subtitle',
                  'Open donation campaigns, track progress bars, publish transparency evidences (paid service bills, donated equipment photos, seasonal/Kurban/Ramadan gifts), and issue Ed25519 tax certificates.'
                )}
              </Typography>
            </Box>
          </Box>
          <Flex gap={2} wrap="wrap">
            <Button
              variant={showCreateForm ? 'secondary' : 'default'}
              onClick={() => setShowCreateForm((prev) => !prev)}
            >
              {showCreateForm
                ? t('dashboard.action.close_composer', 'Close Campaign Composer')
                : t('dashboard.action.new_campaign', '+ New Campaign / Bill / Micro-Need')}
            </Button>
            <Button variant="secondary" onClick={() => openInContentManager()}>
              {t('dashboard.action.open_cm', 'Open in Content Manager (Rich Text / Tiptap)')}
            </Button>
            <Button variant="tertiary" onClick={() => void loadData()} loading={loading}>
              {t('dashboard.action.refresh', 'Refresh')}
            </Button>
          </Flex>
        </Flex>

        {notice ? (
          <Box padding={3} marginBottom={4} background="success100" hasRadius>
            <Flex justifyContent="space-between" alignItems="center">
              <Typography textColor="success700" fontWeight="semiBold">
                {notice}
              </Typography>
              <Button variant="ghost" size="S" onClick={() => setNotice('')}>
                {t('common.dismiss', 'Dismiss')}
              </Button>
            </Flex>
          </Box>
        ) : null}

        {/* KPI Summary Cards */}
        <Box
          marginBottom={6}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          <Box padding={4} background="neutral0" hasRadius shadow="filterShadow">
            <Typography variant="sigma" textColor="neutral600">
              {t('kpi.active_campaigns.label', 'ACTIVE CAMPAIGNS & BILLS')}
            </Typography>
            <Box paddingTop={1}>
              <Typography variant="alpha">{campaigns.length}</Typography>
            </Box>
            <Typography variant="pi" textColor="neutral600">
              {t(
                'kpi.active_campaigns.detail',
                '{major} Crowdfunding • {bills} Bills • {micro} Micro-Needs',
                {
                  major: majorCampaigns.length,
                  bills: utilityInvoices.length,
                  micro: microNeeds.length,
                }
              )}
            </Typography>
          </Box>

          <Box padding={4} background="neutral0" hasRadius shadow="filterShadow">
            <Typography variant="sigma" textColor="neutral600">
              {t('kpi.avg_progress.label', 'AVERAGE FUNDING PROGRESS')}
            </Typography>
            <Box paddingTop={1}>
              <Typography variant="alpha">{kpiStats.avgProgress}%</Typography>
            </Box>
            <Typography variant="pi" textColor="neutral600">
              {t('kpi.avg_progress.detail', '{count} fully funded / paid off', {
                count: kpiStats.paidOrCompleted,
              })}
            </Typography>
          </Box>

          <Box padding={4} background="neutral0" hasRadius shadow="filterShadow">
            <Typography variant="sigma" textColor="neutral600">
              {t('kpi.evidences.label', 'IMPACT EVIDENCES & PROOFS')}
            </Typography>
            <Box paddingTop={1}>
              <Typography variant="alpha">{kpiStats.totalEvidences}</Typography>
            </Box>
            <Typography variant="pi" textColor="neutral600">
              {t(
                'kpi.evidences.detail',
                'Paid bills, donated asset photos & delivery reports'
              )}
            </Typography>
          </Box>

          <Box padding={4} background="neutral0" hasRadius shadow="filterShadow">
            <Typography variant="sigma" textColor="neutral600">
              {t('kpi.pledges.label', 'PLEDGES & TAX CERTIFICATES')}
            </Typography>
            <Box paddingTop={1}>
              <Typography variant="alpha">{pledges.length}</Typography>
            </Box>
            <Typography variant="pi" textColor="neutral600">
              {t(
                'kpi.pledges.detail',
                '{pending} pending • {certs} certificates issued',
                {
                  pending: kpiStats.pendingPledges,
                  certs: kpiStats.issuedCerts,
                }
              )}
            </Typography>
          </Box>
        </Box>

        {/* New Campaign / Utility Bill / Micro-Need Composer */}
        {showCreateForm && (
          <Box
            marginBottom={6}
            padding={6}
            background="neutral0"
            hasRadius
            shadow="filterShadow"
            style={{ border: '1px solid rgba(79, 70, 229, 0.35)' }}
          >
            <Flex
              justifyContent="space-between"
              alignItems="center"
              marginBottom={4}
              wrap="wrap"
              gap={2}
            >
              <Box>
                <Typography variant="beta" as="h2">
                  {t(
                    'composer.title',
                    'Open New Donation Campaign, Utility Bill or Micro-Need'
                  )}
                </Typography>
                <Typography variant="pi" textColor="neutral600">
                  {t(
                    'composer.subtitle',
                    'Use a quick preset below or fill in custom parameters. Both description and body are Rich Text compatible with Strapi default RichText, Tiptap Editor, or CKEditor.'
                  )}
                </Typography>
              </Box>
              <Flex gap={2} wrap="wrap">
                <Button
                  size="S"
                  variant="secondary"
                  onClick={() => applyCampaignPreset('crowdfunding')}
                >
                  {t('composer.preset.crowdfunding', 'Preset: Major Crowdfunding')}
                </Button>
                <Button
                  size="S"
                  variant="secondary"
                  onClick={() => applyCampaignPreset('utility_bill')}
                >
                  {t('composer.preset.utility_bill', 'Preset: Service / Utility Bill')}
                </Button>
                <Button
                  size="S"
                  variant="secondary"
                  onClick={() => applyCampaignPreset('computer_donation')}
                >
                  {t('composer.preset.computer_donation', 'Preset: Computers / Equipment')}
                </Button>
                <Button
                  size="S"
                  variant="secondary"
                  onClick={() => applyCampaignPreset('seasonal_gift')}
                >
                  {t('composer.preset.seasonal_gift', 'Preset: Kurban / Ramadan Gifts')}
                </Button>
              </Flex>
            </Flex>

            <Box
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              <Field.Root name="title" required>
                <Field.Label>
                  {t('composer.field.title', 'Campaign / Bill Title')}
                </Field.Label>
                <TextInput
                  name="title"
                  placeholder={t(
                    'composer.placeholder.title',
                    'e.g., Classroom Computers Donation or Electricity Bill'
                  )}
                  value={newTitle}
                  onChange={(e: any) => setNewTitle(e.target.value)}
                />
              </Field.Root>

              <Field.Root name="slug">
                <Field.Label>
                  {t('composer.field.slug', 'Slug (auto-generated if empty)')}
                </Field.Label>
                <TextInput
                  name="slug"
                  placeholder="e.g., classroom-computers-2026"
                  value={newSlug}
                  onChange={(e: any) => setNewSlug(e.target.value)}
                />
              </Field.Root>

              <Field.Root name="campaignKind">
                <Field.Label>{t('composer.field.kind', 'Campaign Kind')}</Field.Label>
                <SingleSelect
                  value={newKind}
                  onChange={(val: string | number) => setNewKind(String(val) as CampaignKind)}
                >
                  <SingleSelectOption value="major_campaign">
                    {campaignKindLabels.major_campaign}
                  </SingleSelectOption>
                  <SingleSelectOption value="utility_invoice">
                    {campaignKindLabels.utility_invoice}
                  </SingleSelectOption>
                  <SingleSelectOption value="micro_need">
                    {campaignKindLabels.micro_need}
                  </SingleSelectOption>
                </SingleSelect>
              </Field.Root>

              <Field.Root name="categoryKey">
                <Field.Label>{t('composer.field.category', 'Category Key')}</Field.Label>
                <TextInput
                  name="categoryKey"
                  placeholder="e.g., general_fund, utility_bills, waqf, iftar"
                  value={newCategory}
                  onChange={(e: any) => setNewCategory(e.target.value)}
                />
              </Field.Root>

              <Field.Root name="goalAmount" required>
                <Field.Label>
                  {t('composer.field.goal_amount', 'Goal / Total Bill Amount')}
                </Field.Label>
                <TextInput
                  name="goalAmount"
                  type="number"
                  value={newGoalAmount}
                  onChange={(e: any) => setNewGoalAmount(e.target.value)}
                />
              </Field.Root>

              <Field.Root name="raisedAmount">
                <Field.Label>
                  {t('composer.field.raised_amount', 'Initial Raised Amount')}
                </Field.Label>
                <TextInput
                  name="raisedAmount"
                  type="number"
                  value={newRaisedAmount}
                  onChange={(e: any) => setNewRaisedAmount(e.target.value)}
                />
              </Field.Root>

              <Field.Root name="currency">
                <Field.Label>{t('composer.field.currency', 'Currency (ISO 4217)')}</Field.Label>
                <TextInput
                  name="currency"
                  value={newCurrency}
                  onChange={(e: any) => setNewCurrency(e.target.value.toUpperCase())}
                />
              </Field.Root>

              {newKind === 'utility_invoice' && (
                <>
                  <Field.Root name="invoiceProvider">
                    <Field.Label>
                      {t('composer.field.invoice_provider', 'Utility / Service Provider')}
                    </Field.Label>
                    <TextInput
                      name="invoiceProvider"
                      placeholder="e.g., Enel, Vanti, Acueducto, ETB"
                      value={newInvoiceProvider}
                      onChange={(e: any) => setNewInvoiceProvider(e.target.value)}
                    />
                  </Field.Root>
                  <Field.Root name="billingPeriod">
                    <Field.Label>
                      {t('composer.field.billing_period', 'Billing Period')}
                    </Field.Label>
                    <TextInput
                      name="billingPeriod"
                      placeholder="e.g., March 2026"
                      value={newBillingPeriod}
                      onChange={(e: any) => setNewBillingPeriod(e.target.value)}
                    />
                  </Field.Root>
                  <Field.Root name="dueDate">
                    <Field.Label>
                      {t('composer.field.due_date', 'Due Date (YYYY-MM-DD)')}
                    </Field.Label>
                    <TextInput
                      name="dueDate"
                      placeholder="2026-03-28"
                      value={newDueDate}
                      onChange={(e: any) => setNewDueDate(e.target.value)}
                    />
                  </Field.Root>
                  <Field.Root name="invoiceReference">
                    <Field.Label>
                      {t('composer.field.invoice_reference', 'Invoice Reference Number')}
                    </Field.Label>
                    <TextInput
                      name="invoiceReference"
                      placeholder="e.g., ENEL-8849201-03"
                      value={newInvoiceReference}
                      onChange={(e: any) => setNewInvoiceReference(e.target.value)}
                    />
                  </Field.Root>
                </>
              )}
            </Box>

            <Box
              paddingTop={4}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
            >
              <Field.Root name="description">
                <Field.Label>
                  {t(
                    'composer.field.description',
                    'Short Summary / Pitch (Rich Text compatible)'
                  )}
                </Field.Label>
                <Textarea
                  name="description"
                  placeholder={t(
                    'composer.placeholder.description',
                    'Short summary displayed on campaign cards...'
                  )}
                  value={newDescription}
                  onChange={(e: any) => setNewDescription(e.target.value)}
                />
              </Field.Root>

              <Field.Root name="body">
                <Field.Label>
                  {t(
                    'composer.field.body',
                    'Full Rich Text Body (Markdown / HTML / Tiptap compatible)'
                  )}
                </Field.Label>
                <Textarea
                  name="body"
                  placeholder={t(
                    'composer.placeholder.body',
                    'Write full campaign story, breakdown of needs, or impact report...'
                  )}
                  value={newBody}
                  onChange={(e: any) => setNewBody(e.target.value)}
                />
              </Field.Root>
            </Box>

            <Flex justifyContent="flex-end" gap={2} paddingTop={4}>
              <Button variant="tertiary" onClick={() => setShowCreateForm(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button onClick={() => void handleCreateCampaign()} loading={creatingCampaign}>
                {t('composer.submit', 'Create & Publish Campaign')}
              </Button>
            </Flex>
          </Box>
        )}

        {/* Navigation Filter Tabs */}
        <Box marginBottom={5}>
          <Tabs.Root
            value={activeTab}
            onValueChange={(val: string) => setActiveTab(val as ActiveTab)}
          >
            <Tabs.List aria-label={t('dashboard.title', 'Donations tabs')}>
              <Tabs.Trigger value="all">
                {t('tab.all', 'All Campaigns & Bills')} ({campaigns.length})
              </Tabs.Trigger>
              <Tabs.Trigger value="major_campaign">
                {t('tab.major_campaigns', 'Major Campaigns')} ({majorCampaigns.length})
              </Tabs.Trigger>
              <Tabs.Trigger value="utility_invoice">
                {t('tab.utility_invoices', 'Utility & Service Bills')} ({utilityInvoices.length})
              </Tabs.Trigger>
              <Tabs.Trigger value="micro_need">
                {t('tab.micro_needs', 'Micro-Needs & Gift Drives')} ({microNeeds.length})
              </Tabs.Trigger>
              <Tabs.Trigger value="pledges">
                {t('tab.pledges', 'Pledges & Certificates')} ({pledges.length})
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        </Box>

        {/* Campaigns / Bills / Micro-Needs Table with Visual Progress Bars */}
        {activeTab !== 'pledges' && (
          <Box marginBottom={6} background="neutral0" padding={5} hasRadius shadow="filterShadow">
            <Flex
              justifyContent="space-between"
              alignItems="center"
              marginBottom={4}
              wrap="wrap"
              gap={2}
            >
              <Typography variant="delta" as="h2">
                {activeTab === 'all'
                  ? t(
                      'table.campaigns.all_title',
                      'All Active Campaigns, Utility Bills & Micro-Needs ({count})',
                      { count: visibleCampaigns.length }
                    )
                  : `${campaignKindLabels[activeTab]} (${visibleCampaigns.length})`}
              </Typography>
              <Typography variant="pi" textColor="neutral600">
                {t(
                  'table.campaigns.hint',
                  'Click "Evidences & Rich Text" on any item to attach paid bill receipts, equipment photos, or Kurban/Ramadan gift reports.'
                )}
              </Typography>
            </Flex>

            <Table colCount={7} rowCount={visibleCampaigns.length}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma">
                      {t('table.col.campaign', 'Campaign / Service Bill')}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      {t('table.col.kind', 'Kind & Category')}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      {t('table.col.raised_goal', 'Raised / Goal')}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      {t('table.col.progress', 'Progress')}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      {t('table.col.status', 'Status')}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      {t('table.col.evidences', 'Evidences')}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      {t('table.col.actions', 'Actions')}
                    </Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {visibleCampaigns.map((camp) => {
                  const isSelected =
                    selectedCampaign?.slug === camp.slug && Boolean(selectedCampaign);
                  const barColor = getProgressBarColor(camp.invoiceStatus, camp.progressPercent);
                  const plainDesc = extractRichTextPlainText(camp.description);

                  return (
                    <Tr key={camp.documentId || camp.slug}>
                      <Td>
                        <Typography fontWeight="bold">{camp.title}</Typography>
                        {camp.invoiceProvider && (
                          <Typography variant="pi" textColor="neutral600">
                            {' '}
                            • {camp.invoiceProvider}
                            {camp.billingPeriod ? ` (${camp.billingPeriod})` : ''}
                          </Typography>
                        )}
                        {plainDesc && (
                          <Box paddingTop={1}>
                            <Typography variant="pi" textColor="neutral500">
                              {plainDesc.slice(0, 95)}
                              {plainDesc.length > 95 ? '…' : ''}
                            </Typography>
                          </Box>
                        )}
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
                          {camp.raisedAmount.toLocaleString()} / {camp.goalAmount.toLocaleString()}{' '}
                          {camp.currency}
                        </Typography>
                        <Box paddingTop={1}>
                          <Typography variant="pi" textColor="neutral600">
                            {t('table.cell.remaining_donors', 'Remaining: {remaining} {currency} • {donors} donors', {
                              remaining: camp.remainingAmount.toLocaleString(),
                              currency: camp.currency,
                              donors: camp.donorCount,
                            })}
                          </Typography>
                        </Box>
                      </Td>
                      <Td>
                        <Box style={{ minWidth: 130 }}>
                          <Flex justifyContent="space-between" alignItems="center" marginBottom={1}>
                            <Typography variant="pi" fontWeight="bold">
                              {camp.progressPercent}%
                            </Typography>
                            {camp.dueDate && (
                              <Typography variant="pi" textColor="neutral600">
                                {t('table.cell.due_date', 'Due {date}', { date: camp.dueDate })}
                              </Typography>
                            )}
                          </Flex>
                          <div
                            style={{
                              width: '100%',
                              height: 8,
                              borderRadius: 999,
                              background: 'rgba(128, 128, 128, 0.2)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, Math.max(0, camp.progressPercent))}%`,
                                height: '100%',
                                borderRadius: 999,
                                background: barColor,
                                transition: 'width 0.25s ease',
                              }}
                            />
                          </div>
                        </Box>
                      </Td>
                      <Td>
                        <Badge active={camp.invoiceStatus === 'paid'}>
                          {camp.invoiceStatus.toUpperCase()}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge active={(camp.evidenceCount || 0) > 0}>
                          {t('table.cell.proofs_count', '{count} proofs', {
                            count: camp.evidenceCount || 0,
                          })}
                        </Badge>
                        {camp.accountedAmount > 0 && (
                          <Box paddingTop={1}>
                            <Typography variant="pi" textColor="neutral600">
                              {camp.accountedAmount.toLocaleString()} {camp.currency}
                            </Typography>
                          </Box>
                        )}
                      </Td>
                      <Td>
                        <Flex gap={2} wrap="wrap">
                          <Button
                            size="S"
                            variant={isSelected ? 'default' : 'secondary'}
                            onClick={() =>
                              setSelectedCampaignSlug(isSelected ? null : camp.slug)
                            }
                          >
                            {isSelected
                              ? t('table.action.close_inspector', 'Close Inspector')
                              : t(
                                  'table.action.open_evidences',
                                  'Evidences & Rich Text ({count})',
                                  { count: camp.evidenceCount || 0 }
                                )}
                          </Button>
                          {camp.documentId && (
                            <Button
                              size="S"
                              variant="tertiary"
                              onClick={() => openInContentManager(camp.documentId)}
                            >
                              {t('table.action.edit_in_cm', 'Edit in CM')}
                            </Button>
                          )}
                        </Flex>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        )}

        {/* Selected Campaign: Impact Evidences & Rich Text Body Inspector */}
        {activeTab !== 'pledges' && selectedCampaign && (
          <Box
            marginBottom={6}
            padding={6}
            background="neutral0"
            hasRadius
            shadow="filterShadow"
            style={{ border: '2px solid #4f46e5' }}
          >
            <Flex
              justifyContent="space-between"
              alignItems="flex-start"
              marginBottom={4}
              wrap="wrap"
              gap={3}
            >
              <Box>
                <Flex gap={2} alignItems="center">
                  <Badge active>{selectedCampaign.campaignKind}</Badge>
                  <Badge>{selectedCampaign.invoiceStatus.toUpperCase()}</Badge>
                  <Badge>{selectedCampaign.progressPercent}%</Badge>
                </Flex>
                <Box paddingTop={2}>
                  <Typography variant="beta" as="h2">
                    {selectedCampaign.title} —{' '}
                    {t('inspector.header_suffix', 'Impact Evidences & Rich Text Story')}
                  </Typography>
                </Box>
                <Typography variant="pi" textColor="neutral600">
                  {t(
                    'inspector.summary',
                    'Raised {raised} of {goal} {currency} • {count} published impact evidences',
                    {
                      raised: selectedCampaign.raisedAmount.toLocaleString(),
                      goal: selectedCampaign.goalAmount.toLocaleString(),
                      currency: selectedCampaign.currency,
                      count: selectedCampaign.evidenceCount || 0,
                    }
                  )}
                </Typography>
              </Box>
              <Flex gap={2}>
                {selectedCampaign.documentId && (
                  <Button
                    variant="secondary"
                    onClick={() => openInContentManager(selectedCampaign.documentId)}
                  >
                    {t(
                      'inspector.open_in_cm_richtext',
                      'Open in Content Manager (Tiptap / RichText Editor)'
                    )}
                  </Button>
                )}
                <Button variant="tertiary" onClick={() => setSelectedCampaignSlug(null)}>
                  {t('common.close', 'Close')}
                </Button>
              </Flex>
            </Flex>

            <Divider />

            {/* Sub-section A: Rich Text Body & Description Editor */}
            <Box paddingTop={5} paddingBottom={5}>
              <Box marginBottom={2} style={{ marginBottom: 8 }}>
                <Typography variant="delta" tag="h3">
                  {t(
                    'inspector.section1.title',
                    'Campaign Rich Text Body & Effectiveness Narrative'
                  )}
                </Typography>
              </Box>
              <Typography variant="pi" textColor="neutral600">
                {t(
                  'inspector.section1.subtitle',
                  'Compatible with standard Strapi Rich Text (Markdown), @notum-cz/strapi-plugin-tiptap-editor, CKEditor, or HTML. Edit directly below or open in Content Manager for full media embeds.'
                )}
              </Typography>

              <Box
                paddingTop={3}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}
              >
                <Field.Root name="editDescription">
                  <Field.Label>
                    {t('inspector.field.description', 'Summary Description (description)')}
                  </Field.Label>
                  <Textarea
                    name="editDescription"
                    value={editingDescriptionText}
                    onChange={(e: any) => setEditingDescriptionText(e.target.value)}
                  />
                </Field.Root>

                <Field.Root name="editBody">
                  <Field.Label>
                    {t(
                      'inspector.field.body',
                      'Full Rich Text Story & Impact Report (body)'
                    )}
                  </Field.Label>
                  <Textarea
                    name="editBody"
                    placeholder={t(
                      'inspector.placeholder.body',
                      'Write Markdown, HTML, or rich text narrative of how donations were used...'
                    )}
                    value={editingBodyText}
                    onChange={(e: any) => setEditingBodyText(e.target.value)}
                  />
                </Field.Root>
              </Box>

              <Flex justifyContent="flex-end" paddingTop={3}>
                <Button
                  size="S"
                  onClick={() => void handleSaveCampaignRichText()}
                  loading={savingBody}
                >
                  {t('inspector.save_richtext', 'Save Rich Text Body')}
                </Button>
              </Flex>
            </Box>

            <Divider />

            {/* Sub-section B: Published Impact Evidences List */}
            <Box paddingTop={5} paddingBottom={5}>
              <Box marginBottom={3} style={{ marginBottom: 12 }}>
                <Typography variant="delta" tag="h3">
                  {t(
                    'inspector.section2.title',
                    'Published Impact Evidences & Transparency Proofs ({count})',
                    { count: selectedCampaign.evidences?.length || 0 }
                  )}
                </Typography>
              </Box>

              {!selectedCampaign.evidences || selectedCampaign.evidences.length === 0 ? (
                <Box padding={4} background="neutral100" hasRadius>
                  <Typography textColor="neutral600">
                    {t(
                      'inspector.section2.empty',
                      'No impact evidences uploaded yet for this campaign. Use the form below to attach a paid utility bill receipt, photos of donated computers/equipment, or Kurban/Ramadan gift distribution photos.'
                    )}
                  </Typography>
                </Box>
              ) : (
                <Box
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: 16,
                  }}
                >
                  {selectedCampaign.evidences.map((ev) => (
                    <Box
                      key={ev.id}
                      padding={4}
                      background="neutral100"
                      hasRadius
                      style={{ border: '1px solid rgba(128, 128, 128, 0.25)' }}
                    >
                      <Flex justifyContent="space-between" alignItems="flex-start" gap={2}>
                        <Badge>{evidenceTypeLabels[ev.evidenceType] || ev.evidenceType}</Badge>
                        <Button
                          size="S"
                          variant="danger-light"
                          onClick={() => void handleRemoveEvidence(ev.id)}
                        >
                          {t('common.remove', 'Remove')}
                        </Button>
                      </Flex>

                      <Box paddingTop={2}>
                        <Typography fontWeight="bold">{ev.title}</Typography>
                      </Box>
                      <Typography variant="pi" textColor="neutral600">
                        {ev.date}
                        {ev.secondaryDates?.[0]?.formatted
                          ? ` (${ev.secondaryDates[0].formatted})`
                          : ''}
                        {ev.amountSpent > 0
                          ? ` • ${ev.amountSpent.toLocaleString()} ${ev.currency}`
                          : ''}
                        {ev.verifiedBy ? ` • ${ev.verifiedBy}` : ''}
                      </Typography>

                      {ev.body && (
                        <Box paddingTop={2}>
                          <Typography variant="omega">
                            {extractRichTextPlainText(ev.body)}
                          </Typography>
                        </Box>
                      )}

                      {ev.documentUrl && (
                        <Box paddingTop={2}>
                          <a
                            href={ev.documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#4f46e5', fontWeight: 600, fontSize: 13 }}
                          >
                            {t(
                              'evidence.view_document',
                              'View Official Receipt / Bill Document →'
                            )}
                          </a>
                        </Box>
                      )}

                      {Array.isArray(ev.mediaUrls) && ev.mediaUrls.length > 0 && (
                        <Box
                          paddingTop={3}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                            gap: 8,
                          }}
                        >
                          {ev.mediaUrls.map((url, idx) => (
                            <a
                              key={`${ev.id}-media-${idx}`}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'block',
                                borderRadius: 6,
                                overflow: 'hidden',
                                border: '1px solid rgba(128,128,128,0.25)',
                              }}
                            >
                              <img
                                src={url}
                                alt={`${ev.title} ${idx + 1}`}
                                style={{
                                  width: '100%',
                                  height: 68,
                                  objectFit: 'cover',
                                  display: 'block',
                                }}
                              />
                            </a>
                          ))}
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <Divider />

            {/* Sub-section C: Add New Evidence Form */}
            <Box paddingTop={5}>
              <Flex
                justifyContent="space-between"
                alignItems="center"
                marginBottom={3}
                wrap="wrap"
                gap={2}
              >
                <Box>
                  <Typography variant="delta" as="h3">
                    {t(
                      'inspector.section3.title',
                      '3. Add New Evidence of Donation Effectiveness'
                    )}
                  </Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {t(
                      'inspector.section3.subtitle',
                      'Attach proof of paid utility bills, photos of donated computers/equipment, or photos of Kurban & Ramadan gift distributions.'
                    )}
                  </Typography>
                </Box>
                <Flex gap={2} wrap="wrap">
                  <Button
                    size="S"
                    variant="secondary"
                    onClick={() => applyEvidencePreset('paid_receipt')}
                  >
                    {t('evidence.preset.btn.paid_bill', '+ Paid Service Bill')}
                  </Button>
                  <Button
                    size="S"
                    variant="secondary"
                    onClick={() => applyEvidencePreset('photo_gallery')}
                  >
                    {t('evidence.preset.btn.computers', '+ Donated Computers Photos')}
                  </Button>
                  <Button
                    size="S"
                    variant="secondary"
                    onClick={() => applyEvidencePreset('delivery_report')}
                  >
                    {t('evidence.preset.btn.gifts', '+ Kurban / Ramadan Gifts')}
                  </Button>
                  <Button
                    size="S"
                    variant="secondary"
                    onClick={() => applyEvidencePreset('audit_document')}
                  >
                    {t('evidence.preset.btn.audit', '+ Financial Audit')}
                  </Button>
                </Flex>
              </Flex>

              <Box
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                }}
              >
                <Field.Root name="evTitle" required>
                  <Field.Label>{t('evidence.field.title', 'Evidence Title')}</Field.Label>
                  <TextInput
                    name="evTitle"
                    placeholder={t(
                      'evidence.placeholder.title',
                      'e.g., Enel Paid Receipt Feb 2026 or 10 Laptops Delivered'
                    )}
                    value={evTitle}
                    onChange={(e: any) => setEvTitle(e.target.value)}
                  />
                </Field.Root>

                <Field.Root name="evType">
                  <Field.Label>{t('evidence.field.type', 'Evidence Type')}</Field.Label>
                  <SingleSelect
                    value={evType}
                    onChange={(val: string | number) =>
                      setEvType(String(val) as CampaignEvidenceType)
                    }
                  >
                    <SingleSelectOption value="paid_receipt">
                      {evidenceTypeLabels.paid_receipt}
                    </SingleSelectOption>
                    <SingleSelectOption value="photo_gallery">
                      {evidenceTypeLabels.photo_gallery}
                    </SingleSelectOption>
                    <SingleSelectOption value="delivery_report">
                      {evidenceTypeLabels.delivery_report}
                    </SingleSelectOption>
                    <SingleSelectOption value="audit_document">
                      {evidenceTypeLabels.audit_document}
                    </SingleSelectOption>
                    <SingleSelectOption value="beneficiary_update">
                      {evidenceTypeLabels.beneficiary_update}
                    </SingleSelectOption>
                  </SingleSelect>
                </Field.Root>

                <Field.Root name="evDate">
                  <Field.Label>
                    {t('evidence.field.date', 'Execution / Payment Date')}
                  </Field.Label>
                  <TextInput
                    name="evDate"
                    placeholder="YYYY-MM-DD"
                    value={evDate}
                    onChange={(e: any) => setEvDate(e.target.value)}
                  />
                </Field.Root>

                <Field.Root name="evAmountSpent">
                  <Field.Label>
                    {t('evidence.field.amount_spent', 'Amount Spent / Paid ({currency})', {
                      currency: selectedCampaign.currency,
                    })}
                  </Field.Label>
                  <TextInput
                    name="evAmountSpent"
                    type="number"
                    placeholder="e.g., 1850000"
                    value={evAmountSpent}
                    onChange={(e: any) => setEvAmountSpent(e.target.value)}
                  />
                </Field.Root>

                <Field.Root name="evDocumentUrl">
                  <Field.Label>
                    {t(
                      'evidence.field.document_url',
                      'Receipt / Invoice Document URL (PDF or Scan)'
                    )}
                  </Field.Label>
                  <TextInput
                    name="evDocumentUrl"
                    placeholder="https://.../uploads/paid-bill-receipt.pdf"
                    value={evDocumentUrl}
                    onChange={(e: any) => setEvDocumentUrl(e.target.value)}
                  />
                </Field.Root>

                <Field.Root name="evMediaUrls">
                  <Field.Label>
                    {t('evidence.field.media_urls', 'Photo Gallery URLs (comma-separated)')}
                  </Field.Label>
                  <TextInput
                    name="evMediaUrls"
                    placeholder="https://.../computers-1.jpg, https://.../kurban-gifts.jpg"
                    value={evMediaUrls}
                    onChange={(e: any) => setEvMediaUrls(e.target.value)}
                  />
                </Field.Root>
              </Box>

              <Box paddingTop={3}>
                <Field.Root name="evBody">
                  <Field.Label>
                    {t(
                      'evidence.field.body',
                      'Evidence Rich Text Narrative (body — Markdown / HTML / Tiptap compatible)'
                    )}
                  </Field.Label>
                  <Textarea
                    name="evBody"
                    placeholder={t(
                      'evidence.placeholder.body',
                      'Describe the impact, invoice payment reference, serial numbers of donated computers, or number of families reached during Kurban/Ramadan...'
                    )}
                    value={evBody}
                    onChange={(e: any) => setEvBody(e.target.value)}
                  />
                </Field.Root>
              </Box>

              <Flex
                justifyContent="space-between"
                alignItems="center"
                paddingTop={4}
                wrap="wrap"
                gap={3}
              >
                <Flex gap={4} wrap="wrap">
                  <Checkbox
                    checked={evMarkPaid}
                    onCheckedChange={(val: boolean) => setEvMarkPaid(Boolean(val))}
                  >
                    {t(
                      'evidence.checkbox.mark_paid',
                      'Mark Campaign / Utility Bill status as PAID (100%)'
                    )}
                  </Checkbox>
                  <Checkbox
                    checked={evAppendBody}
                    onCheckedChange={(val: boolean) => setEvAppendBody(Boolean(val))}
                  >
                    {t(
                      'evidence.checkbox.append_body',
                      'Also append this evidence section into the Campaign Rich Text body'
                    )}
                  </Checkbox>
                </Flex>

                <Button onClick={() => void handleAddEvidence()} loading={savingEvidence}>
                  {t('evidence.submit', 'Publish Impact Evidence')}
                </Button>
              </Flex>
            </Box>
          </Box>
        )}

        {/* Recent Pledges & Tax Certificates Table */}
        {activeTab === 'pledges' && (
          <Box background="neutral0" padding={5} hasRadius shadow="filterShadow">
            <Box marginBottom={4} style={{ marginBottom: 16 }}>
              <Typography variant="delta" tag="h2">
                {t(
                  'table.pledges.title',
                  'Recent Donor Pledges, Bill Contributions & Tax Certificates ({count})',
                  { count: pledges.length }
                )}
              </Typography>
            </Box>
            <Table colCount={7} rowCount={pledges.length}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma">{t('pledge.col.ref', 'Ref')}</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">{t('pledge.col.donor', 'Donor')}</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">{t('pledge.col.amount', 'Amount')}</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      {t('pledge.col.target', 'Target / Category')}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">{t('pledge.col.status', 'Status')}</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      {t('pledge.col.certificate', 'Certificate')}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">{t('pledge.col.actions', 'Actions')}</Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {pledges.map((pledge) => (
                  <Tr key={pledge.referenceCode}>
                    <Td>
                      <Typography fontWeight="bold">{pledge.referenceCode}</Typography>
                    </Td>
                    <Td>
                      <Typography>{pledge.donorName}</Typography>
                      <Typography variant="pi" textColor="neutral600">
                        {' '}
                        ({pledge.donorEmail})
                      </Typography>
                    </Td>
                    <Td>
                      <Typography fontWeight="bold">
                        {pledge.amount.toLocaleString()} {pledge.currency}
                      </Typography>
                    </Td>
                    <Td>
                      <Typography>{pledge.campaignSlug || pledge.categoryKey}</Typography>
                      {pledge.coversRemainingBalance && (
                        <Badge>{t('pledge.badge.full_balance', 'Full Balance Payoff')}</Badge>
                      )}
                    </Td>
                    <Td>
                      <Badge>{pledge.status.toUpperCase()}</Badge>
                    </Td>
                    <Td>
                      <Typography variant="pi">
                        {pledge.certificateSerialNumber ||
                          t('pledge.cert.not_issued', 'Not issued')}
                      </Typography>
                    </Td>
                    <Td>
                      {pledge.status === 'pending' && (
                        <Flex gap={2}>
                          <Button
                            size="S"
                            loading={processingRef === pledge.referenceCode}
                            onClick={() => void handleDecision(pledge.referenceCode, 'verified')}
                          >
                            {t('pledge.action.verify_issue', 'Verify & Issue Cert')}
                          </Button>
                          <Button
                            size="S"
                            variant="danger-light"
                            loading={processingRef === pledge.referenceCode}
                            onClick={() => void handleDecision(pledge.referenceCode, 'rejected')}
                          >
                            {t('pledge.action.reject', 'Reject')}
                          </Button>
                        </Flex>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>
    </Main>
  );
};

export default DonationsPage;
