import type {
  CampaignEvidenceType,
  CampaignKind,
  DonationCampaignItem,
  DonationPledgeItem,
  DonationsSettings,
} from "../../../../shared";

export type ActiveTab =
  | "all"
  | "major_campaign"
  | "utility_invoice"
  | "micro_need"
  | "pledges";

export type TranslateFn = (
  id: string,
  defaultMessage: string,
  values?: Record<string, string | number>
) => string;

export interface InputChangeEvent {
  target: { value: string };
}

export interface CurrencyBucket {
  raised: number;
  goal: number;
  remaining: number;
  donors: number;
}

export interface FundSummary {
  byCurrency: Record<string, CurrencyBucket>;
  currenciesCount: number;
  raisedBreakdown: string;
  goalBreakdown: string;
  raisedInBase: number;
  goalInBase: number;
  baseCurrency: string;
  totalDonors: number;
}

export interface KpiStats {
  totalEvidences: number;
  paidOrCompleted: number;
  avgProgress: number;
  pendingPledges: number;
  issuedCerts: number;
}

export interface CampaignFormState {
  title: string;
  slug: string;
  kind: CampaignKind;
  category: string;
  isCustomCategory: boolean;
  goalAmount: string;
  raisedAmount: string;
  currency: string;
  billingPeriod: string;
  dueDate: string;
  invoiceProvider: string;
  invoiceReference: string;
  description: string;
  body: string;
}

export interface EvidenceFormState {
  title: string;
  type: CampaignEvidenceType;
  date: string;
  amountSpent: string;
  documentUrl: string;
  mediaUrls: string;
  body: string;
  markPaid: boolean;
  appendBody: boolean;
}

export function getProgressBarColor(status: string, percent: number): string {
  if (status === "paid" || percent >= 100) return "#16a34a";
  if (status === "overdue") return "#dc2626";
  if (percent >= 50) return "#2563eb";
  return "#4f46e5";
}

function numOrZero(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function accumulateCampaignItem(
  c: DonationCampaignItem,
  baseCurrency: string,
  rates: Record<string, number>,
  byCurrency: Record<string, CurrencyBucket>
): { raisedBaseDelta: number; goalBaseDelta: number; donors: number } {
  const curr = (c.currency || baseCurrency).toUpperCase();
  const raised = numOrZero(c.raisedAmount);
  const goal = numOrZero(c.goalAmount);
  const remaining = numOrZero(c.remainingAmount) || Math.max(0, goal - raised);
  const donors = numOrZero(c.donorCount);

  if (!byCurrency[curr]) {
    byCurrency[curr] = { raised: 0, goal: 0, remaining: 0, donors: 0 };
  }
  byCurrency[curr].raised += raised;
  byCurrency[curr].goal += goal;
  byCurrency[curr].remaining += remaining;
  byCurrency[curr].donors += donors;

  const rateToBase = rates[curr] ?? 1;
  return {
    raisedBaseDelta: raised * rateToBase,
    goalBaseDelta: goal * rateToBase,
    donors,
  };
}

export function computeFundSummaryForList(
  list: DonationCampaignItem[],
  baseCurrency: string,
  rates: Record<string, number>
): FundSummary {
  const byCurrency: Record<string, CurrencyBucket> = {};
  let raisedInBase = 0;
  let goalInBase = 0;
  let totalDonors = 0;

  for (const c of list) {
    const delta = accumulateCampaignItem(c, baseCurrency, rates, byCurrency);
    raisedInBase += delta.raisedBaseDelta;
    goalInBase += delta.goalBaseDelta;
    totalDonors += delta.donors;
  }

  const entries = Object.entries(byCurrency);
  const hasEntries = entries.length > 0;
  const raisedBreakdown = hasEntries
    ? entries
        .map(([curr, val]) => `${val.raised.toLocaleString()} ${curr}`)
        .join(" + ")
    : `0 ${baseCurrency}`;
  const goalBreakdown = hasEntries
    ? entries
        .map(([curr, val]) => `${val.goal.toLocaleString()} ${curr}`)
        .join(" + ")
    : `0 ${baseCurrency}`;

  return {
    byCurrency,
    currenciesCount: entries.length,
    raisedBreakdown,
    goalBreakdown,
    raisedInBase: Math.round(raisedInBase),
    goalInBase: Math.round(goalInBase),
    baseCurrency,
    totalDonors,
  };
}

export function computeKpiStats(
  campaigns: DonationCampaignItem[],
  pledges: DonationPledgeItem[]
): KpiStats {
  const totalEvidences = campaigns.reduce(
    (acc, c) => acc + numOrZero(c.evidenceCount),
    0
  );
  const paidOrCompleted = campaigns.filter(
    (c) => c.invoiceStatus === "paid" || c.progressPercent >= 100
  ).length;
  const totalProgress = campaigns.reduce(
    (acc, c) => acc + numOrZero(c.progressPercent),
    0
  );
  const avgProgress =
    campaigns.length > 0 ? Math.round(totalProgress / campaigns.length) : 0;
  const pendingPledges = pledges.filter((p) => p.status === "pending").length;
  const issuedCerts = pledges.filter((p) =>
    Boolean(p.certificateSerialNumber)
  ).length;

  return {
    totalEvidences,
    paidOrCompleted,
    avgProgress,
    pendingPledges,
    issuedCerts,
  };
}

const FALLBACK_CATEGORY_PRESETS: Array<{ key: string; label: string }> = [
  { key: "general_fund", label: "General Fund (general_fund)" },
  { key: "utility_bills", label: "Utility Invoices (utility_bills)" },
  {
    key: "equipment_donation",
    label: "Equipment / Computers (equipment_donation)",
  },
  { key: "seasonal_gifts", label: "Kurban / Ramadan Gifts (seasonal_gifts)" },
  { key: "waqf", label: "Waqf & Infrastructure (waqf)" },
  { key: "sadaqah", label: "Sadaqah & Social Welfare (sadaqah)" },
  { key: "zakat", label: "Zakat Al-Mal (zakat)" },
  { key: "iftar", label: "Community Iftar & Food Baskets (iftar)" },
];

function resolveCategoryDisplayLabel(
  labels: Record<string, string> | undefined,
  defaultLoc: string,
  key: string
): string {
  if (!labels) return key;
  return labels[defaultLoc] || labels.en || labels.es || key;
}

function collectConfiguredCategoryOptions(
  settings: DonationsSettings | null,
  seen: Set<string>
): Array<{ key: string; label: string }> {
  const options: Array<{ key: string; label: string }> = [];
  const defaultLoc = settings?.defaultLocale || "es";
  const categories = settings?.categories || [];

  for (const cat of categories) {
    if (cat.key && !seen.has(cat.key)) {
      seen.add(cat.key);
      const label = resolveCategoryDisplayLabel(
        cat.labels,
        defaultLoc,
        cat.key
      );
      options.push({ key: cat.key, label: `${label} (${cat.key})` });
    }
  }
  return options;
}

export function buildCategoryOptions(
  settings: DonationsSettings | null,
  isCustomCategory: boolean,
  newCategory: string
): Array<{ key: string; label: string }> {
  const seen = new Set<string>();
  const options = collectConfiguredCategoryOptions(settings, seen);

  for (const preset of FALLBACK_CATEGORY_PRESETS) {
    if (!seen.has(preset.key)) {
      seen.add(preset.key);
      options.push(preset);
    }
  }

  if (!isCustomCategory && newCategory && !seen.has(newCategory)) {
    options.unshift({ key: newCategory, label: newCategory });
  }

  return options;
}

export function buildCampaignPresetState(
  preset:
    | "crowdfunding"
    | "utility_bill"
    | "computer_donation"
    | "seasonal_gift",
  baseCurrency: string,
  t: TranslateFn
): Partial<CampaignFormState> {
  if (preset === "crowdfunding") {
    return {
      kind: "major_campaign",
      category: "endowment",
      title: t(
        "preset.crowdfunding.title",
        "Community Education & Infrastructure Fund"
      ),
      description: t(
        "preset.crowdfunding.desc",
        "Crowdfunding campaign for classrooms, scholarships, and community social programs."
      ),
      body: t(
        "preset.crowdfunding.body",
        "## Campaign Objectives\n\n- Expand educational classrooms and digital learning labs\n- Provide scholarships and community welfare packages\n- Publish transparent receipts and photo evidences of every milestone"
      ),
      goalAmount: "50000",
      currency: "USD",
    };
  }
  if (preset === "utility_bill") {
    return {
      kind: "utility_invoice",
      category: "utility_bills",
      title: t(
        "preset.utility_bill.title",
        "Monthly Electricity & Facility Services Bill"
      ),
      billingPeriod: "March 2026",
      invoiceProvider: "Enel / Public Utility Provider",
      invoiceReference: "INV-2026-03",
      description: t(
        "preset.utility_bill.desc",
        "Monthly operational utility invoice. Contributors can chip in or pay off the remaining balance."
      ),
      body: t(
        "preset.utility_bill.body",
        "### Operational Utility Invoice\n\nOnce paid, the official stamped payment voucher is uploaded to the **Impact Evidences** section."
      ),
      goalAmount: "1850000",
      currency: baseCurrency,
    };
  }
  if (preset === "computer_donation") {
    return {
      kind: "micro_need",
      category: "general_fund",
      title: t(
        "preset.computer_donation.title",
        "Computers & Study Lab Equipment Drive"
      ),
      description: t(
        "preset.computer_donation.desc",
        "Micro-need campaign to equip classrooms and students with laptops, monitors, and study workstations."
      ),
      body: t(
        "preset.computer_donation.body",
        "## Equipment & Computers Donation Drive\n\n- **Target**: 10 workstation computers for students\n- **Transparency**: Photos of delivered computers and serial receipts are published in the campaign evidences."
      ),
      goalAmount: "12000000",
      currency: baseCurrency,
    };
  }
  return {
    kind: "micro_need",
    category: "general_fund",
    title: t(
      "preset.seasonal_gift.title",
      "Seasonal Food Baskets, Ramadan & Kurban Gift Drive"
    ),
    description: t(
      "preset.seasonal_gift.desc",
      "Solidarity campaign for seasonal food packages, Ramadan Iftar baskets, and Kurban gift distributions."
    ),
    body: t(
      "preset.seasonal_gift.body",
      "## Seasonal Solidarity & Gift Distribution\n\nEvery contribution funds direct food baskets and seasonal gifts for vulnerable families. Field distribution photos and delivery reports are attached as evidences."
    ),
    goalAmount: "15000000",
    currency: baseCurrency,
  };
}

export function buildEvidencePresetState(
  preset: CampaignEvidenceType,
  billingPeriod: string | null | undefined,
  t: TranslateFn
): {
  type: CampaignEvidenceType;
  title: string;
  body: string;
  markPaid: boolean;
} {
  if (preset === "paid_receipt") {
    return {
      type: preset,
      title: t(
        "evidence.preset.paid_receipt.title",
        "Paid Utility Service Receipt — {period}",
        {
          period: billingPeriod || "Official Voucher",
        }
      ),
      body: t(
        "evidence.preset.paid_receipt.body",
        "Official utility provider payment receipt confirming 100% settlement of the service bill."
      ),
      markPaid: true,
    };
  }
  if (preset === "photo_gallery") {
    return {
      type: preset,
      title: t(
        "evidence.preset.photo_gallery.title",
        "Delivered Computers & Classroom Equipment — Photo Evidence"
      ),
      body: t(
        "evidence.preset.photo_gallery.body",
        "Photos of the donated computers installed and delivered to students and community classrooms."
      ),
      markPaid: false,
    };
  }
  if (preset === "delivery_report") {
    return {
      type: preset,
      title: t(
        "evidence.preset.delivery_report.title",
        "Kurban & Ramadan Gift Packages Distribution Report"
      ),
      body: t(
        "evidence.preset.delivery_report.body",
        "Photographic evidence and field report of seasonal gift baskets and food packages distributed to beneficiary families."
      ),
      markPaid: false,
    };
  }
  if (preset === "audit_document") {
    return {
      type: preset,
      title: t(
        "evidence.preset.audit_document.title",
        "Financial Audit & Supplier Invoices Summary"
      ),
      body: t(
        "evidence.preset.audit_document.body",
        "Verified accounting breakdown and supplier invoices for donated funds."
      ),
      markPaid: false,
    };
  }
  return {
    type: preset,
    title: t(
      "evidence.preset.beneficiary_update.title",
      "Beneficiary Impact Update"
    ),
    body: t(
      "evidence.preset.beneficiary_update.body",
      "Direct impact testimony and progress update from community beneficiaries."
    ),
    markPaid: false,
  };
}

export function openInContentManager(documentId?: string): void {
  const base =
    "/admin/content-manager/collection-types/plugin::donations.campaign";
  window.location.href = documentId ? `${base}/${documentId}` : base;
}
