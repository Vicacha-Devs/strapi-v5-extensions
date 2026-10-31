import type {
  AssessmentAssetFieldConfig as AssessmentFieldConfig,
  AssessmentBenchmarkConfig as AssessmentBenchmark,
  AssessmentCalculationInput,
  AssessmentCalculationResult,
  AssessmentProfileConfig,
  CampaignKind,
  InvoiceStatus,
} from './types';

export interface CampaignProgressSummary {
  goalAmount: number;
  raisedAmount: number;
  remainingAmount: number;
  progressPercent: number;
  invoiceStatus: InvoiceStatus;
}

function computeProgressPercent(goalAmount: number, raisedAmount: number): number {
  if (goalAmount > 0) {
    return Math.min(100, Math.round((raisedAmount / goalAmount) * 1000) / 10);
  }
  return raisedAmount > 0 ? 100 : 0;
}

function isPastDueDate(
  dueDate: string | null | undefined,
  referenceDate?: Date
): boolean {
  if (!dueDate) return false;
  const dueTime = new Date(dueDate).getTime();
  const nowTime = (referenceDate || new Date()).getTime();
  return !Number.isNaN(dueTime) && dueTime < nowTime;
}

function resolveInvoiceStatus(
  goalAmount: number,
  raisedAmount: number,
  dueDate: string | null | undefined,
  referenceDate?: Date
): InvoiceStatus {
  if (goalAmount > 0 && raisedAmount >= goalAmount) {
    return 'paid';
  }
  if (isPastDueDate(dueDate, referenceDate)) {
    return 'overdue';
  }
  return raisedAmount > 0 ? 'partially_funded' : 'open';
}

/**
 * Computes campaign or utility invoice progress, remaining balance to pay off,
 * and automatic invoice status transition (`open` -> `partially_funded` -> `paid` / `overdue`).
 */
export function computeCampaignProgress(params: {
  goalAmount: number;
  raisedAmount: number;
  campaignKind?: CampaignKind;
  dueDate?: string | null;
  currentStatus?: InvoiceStatus | null;
  referenceDate?: Date;
}): CampaignProgressSummary {
  const goalAmount = Math.max(0, Number(params.goalAmount) || 0);
  const raisedAmount = Math.max(0, Number(params.raisedAmount) || 0);
  const remainingAmount = Math.max(
    0,
    Number((goalAmount - raisedAmount).toFixed(2))
  );
  const progressPercent = computeProgressPercent(goalAmount, raisedAmount);
  const invoiceStatus = resolveInvoiceStatus(
    goalAmount,
    raisedAmount,
    params.dueDate,
    params.referenceDate
  );

  return {
    goalAmount,
    raisedAmount,
    remainingAmount,
    progressPercent,
    invoiceStatus,
  };
}

function resolveBenchmark(
  profile: AssessmentProfileConfig,
  benchmarkKey?: string
): AssessmentBenchmark {
  const benchmark =
    profile.benchmarks.find((b) => b.key === benchmarkKey) ??
    profile.benchmarks.find((b) => b.key === profile.defaultBenchmarkKey) ??
    profile.benchmarks[0];

  if (!benchmark) {
    throw new Error(
      `No benchmark configured for assessment profile "${profile.key}"`
    );
  }
  return benchmark;
}

function sumAssessmentFields(
  fields: AssessmentFieldConfig[],
  values?: Record<string, number>
): { totalAssets: number; totalLiabilities: number } {
  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const field of fields) {
    const rawVal = Number(values?.[field.key] ?? 0);
    const val = Number.isFinite(rawVal) && rawVal > 0 ? rawVal : 0;
    if (field.kind === 'deductible_liability') {
      totalLiabilities += val;
    } else {
      totalAssets += val;
    }
  }
  return { totalAssets, totalLiabilities };
}

function computeBenchmarkThreshold(
  benchmark: AssessmentBenchmark,
  currency: string
): number {
  const unitPrice = Number(benchmark.unitPricesByCurrency[currency] ?? 0);
  const effectivePrice =
    benchmark.unitType === 'gram_weight' ? unitPrice : unitPrice || 1;
  return Number((benchmark.thresholdUnits * effectivePrice).toFixed(2));
}

/**
 * Evaluates a rule-based assessment profile (such as a 2.5% net asset calculation
 * against a commodity weight or fixed currency threshold).
 */
export function evaluateAssessmentCalculation(
  profile: AssessmentProfileConfig,
  input: AssessmentCalculationInput
): AssessmentCalculationResult {
  const currency = (input.currency || 'COP').toUpperCase();
  const benchmark = resolveBenchmark(profile, input.benchmarkKey);
  const { totalAssets, totalLiabilities } = sumAssessmentFields(
    profile.fields,
    input.values
  );

  const netAssessableWealth = Math.max(
    0,
    Number((totalAssets - totalLiabilities).toFixed(2))
  );
  const thresholdAmount = computeBenchmarkThreshold(benchmark, currency);
  const meetsThreshold =
    thresholdAmount > 0
      ? netAssessableWealth >= thresholdAmount
      : netAssessableWealth > 0;
  const rateFraction = (Number(profile.ratePercent) || 0) / 100;
  const payableAmount = meetsThreshold
    ? Number((netAssessableWealth * rateFraction).toFixed(2))
    : 0;

  return {
    profileKey: profile.key,
    currency,
    benchmarkKey: benchmark.key,
    ratePercent: profile.ratePercent,
    totalAssets: Number(totalAssets.toFixed(2)),
    totalLiabilities: Number(totalLiabilities.toFixed(2)),
    netAssessableWealth,
    thresholdAmount,
    meetsThreshold,
    payableAmount,
  };
}

/**
 * Converts a donation amount from a source currency into the configured base currency.
 */
export function convertToBaseCurrency(
  amount: number,
  currency: string,
  baseCurrency: string,
  exchangeRatesToBase: Record<string, number>
): number {
  const cleanAmount = Math.max(0, Number(amount) || 0);
  const normCurrency = (currency || baseCurrency).toUpperCase();
  const normBase = (baseCurrency || 'COP').toUpperCase();
  if (normCurrency === normBase) {
    return cleanAmount;
  }
  const rate = Number(exchangeRatesToBase?.[normCurrency] ?? 1);
  return Number((cleanAmount * (rate > 0 ? rate : 1)).toFixed(2));
}

/**
 * Generates a deterministic-format human-readable donation reference code.
 */
export function generateDonationReferenceCode(prefix = 'DON'): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix.toUpperCase()}-${datePart}-${randomPart}`;
}

interface RichTextNode {
  type?: string;
  text?: string;
  content?: unknown[];
  children?: unknown[];
}

function getNodeChildren(node: RichTextNode): unknown[] {
  if (Array.isArray(node.content)) return node.content;
  if (Array.isArray(node.children)) return node.children;
  return [];
}

function formatBlockNodeText(type: string | undefined, joined: string): string {
  if (type === 'heading' || type === 'paragraph' || type === 'blockquote') {
    return `${joined}\n`;
  }
  if (type === 'listItem' || type === 'list-item') {
    return `• ${joined.trim()}\n`;
  }
  return joined;
}

function extractNodeText(node: unknown): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  const obj = node as RichTextNode;
  if (typeof obj.text === 'string') return obj.text;
  const children = getNodeChildren(obj);
  const separator = obj.type === 'doc' ? '\n\n' : '';
  const joined = children.map(extractNodeText).filter(Boolean).join(separator);
  return formatBlockNodeText(obj.type, joined);
}

/**
 * Normalizes a Rich Text field value from Strapi default Richtext (Markdown),
 * Tiptap Editor (Markdown, HTML, or ProseMirror JSON), CKEditor (HTML), or Strapi Blocks.
 */
export function normalizeRichTextValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj.type === 'doc' && Array.isArray(obj.content)) {
      return extractNodeText(obj).trim();
    }
    if (Array.isArray(value)) {
      return value.map(extractNodeText).join('\n').trim();
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Extracts human-readable text from any Rich Text representation (Markdown, HTML, Tiptap JSON, or Blocks).
 */
export function extractRichTextPlainText(value: unknown): string {
  const raw = normalizeRichTextValue(value).trim();
  if (!raw) return '';
  if (raw.startsWith('{') || raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown> | unknown[];
      if (
        parsed &&
        (Array.isArray(parsed) ||
          (typeof parsed === 'object' && parsed.type === 'doc'))
      ) {
        return extractNodeText(parsed).trim();
      }
    } catch {
      // treat as regular string
    }
  }
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
