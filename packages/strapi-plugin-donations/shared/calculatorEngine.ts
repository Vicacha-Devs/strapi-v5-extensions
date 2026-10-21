import type {
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
  const remainingAmount = Math.max(0, Number((goalAmount - raisedAmount).toFixed(2)));

  const progressPercent =
    goalAmount > 0
      ? Math.min(100, Math.round((raisedAmount / goalAmount) * 1000) / 10)
      : raisedAmount > 0
        ? 100
        : 0;

  let invoiceStatus: InvoiceStatus = params.currentStatus || 'open';

  if (goalAmount > 0 && raisedAmount >= goalAmount) {
    invoiceStatus = 'paid';
  } else if (params.dueDate) {
    const dueTime = new Date(params.dueDate).getTime();
    const nowTime = (params.referenceDate || new Date()).getTime();
    if (!Number.isNaN(dueTime) && dueTime < nowTime) {
      invoiceStatus = 'overdue';
    } else if (raisedAmount > 0) {
      invoiceStatus = 'partially_funded';
    } else {
      invoiceStatus = 'open';
    }
  } else if (raisedAmount > 0) {
    invoiceStatus = 'partially_funded';
  } else {
    invoiceStatus = 'open';
  }

  return {
    goalAmount,
    raisedAmount,
    remainingAmount,
    progressPercent,
    invoiceStatus,
  };
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
  const benchmark =
    profile.benchmarks.find((b) => b.key === input.benchmarkKey) ||
    profile.benchmarks.find((b) => b.key === profile.defaultBenchmarkKey) ||
    profile.benchmarks[0];

  if (!benchmark) {
    throw new Error(`No benchmark configured for assessment profile "${profile.key}"`);
  }

  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const field of profile.fields) {
    const rawVal = Number(input.values?.[field.key] ?? 0);
    const val = Number.isFinite(rawVal) && rawVal > 0 ? rawVal : 0;
    if (field.kind === 'deductible_liability') {
      totalLiabilities += val;
    } else {
      totalAssets += val;
    }
  }

  const netAssessableWealth = Math.max(0, Number((totalAssets - totalLiabilities).toFixed(2)));
  const unitPrice = Number(benchmark.unitPricesByCurrency[currency] ?? 0);
  const thresholdAmount =
    benchmark.unitType === 'gram_weight'
      ? Number((benchmark.thresholdUnits * unitPrice).toFixed(2))
      : Number((benchmark.thresholdUnits * (unitPrice || 1)).toFixed(2));

  const meetsThreshold = thresholdAmount > 0 ? netAssessableWealth >= thresholdAmount : netAssessableWealth > 0;
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
