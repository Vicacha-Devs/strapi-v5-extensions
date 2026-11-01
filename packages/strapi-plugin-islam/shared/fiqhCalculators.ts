import {
  GOLD_CARAT_PURITY_FACTORS,
  NISAB_STANDARDS,
  TROY_OUNCE_IN_GRAMS,
} from "./constants";
import type {
  FiqhRatesConfig,
  FitranaFidyahKaffarahInput,
  FitranaFidyahKaffarahResult,
  NisabStandardId,
  NisabThresholdResult,
  SupportedCurrency,
  ZakatAlMalCalculationInput,
  ZakatAlMalCalculationResult,
} from "./types";
import {
  sanitizeCurrency,
  sanitizeNisabStandard,
  sanitizeNonNegativeNumber,
} from "./validation";

function roundMoney(value: number, currency: SupportedCurrency): number {
  if (currency === "COP") {
    return Math.round(value);
  }
  return Math.round(value * 100) / 100;
}

function resolveSpotPricePerGram(
  overridePrice: number | undefined,
  ratesByCurrency: Record<SupportedCurrency, number>,
  currency: SupportedCurrency
): number {
  if (overridePrice && overridePrice > 0) {
    return overridePrice;
  }
  return ratesByCurrency[currency] || ratesByCurrency.COP;
}

function convertGramToUnitPrice(
  pricePerGram: number,
  isTroyOz: boolean
): number {
  return isTroyOz
    ? Math.round(pricePerGram * TROY_OUNCE_IN_GRAMS * 100) / 100
    : pricePerGram;
}

function convertWeightToUnit(weightGrams: number, isTroyOz: boolean): number {
  return isTroyOz
    ? Math.round((weightGrams / TROY_OUNCE_IN_GRAMS) * 1000) / 1000
    : weightGrams;
}

function computeCaratPrices(
  goldPerGram: number,
  currency: SupportedCurrency
): Record<string, number> {
  const caratPricesPerGram: Record<string, number> = {};
  for (const [carat, factor] of Object.entries(GOLD_CARAT_PURITY_FACTORS)) {
    caratPricesPerGram[carat] = roundMoney(goldPerGram * factor, currency);
  }
  return caratPricesPerGram;
}

export function calculateNisabThresholds(
  ratesConfig: FiqhRatesConfig,
  options?: {
    currency?: SupportedCurrency;
    standard?: NisabStandardId;
    unit?: "g" | "oz";
    goldSpotOverridePerGram?: number;
    silverSpotOverridePerGram?: number;
    source?: "configured_or_live" | "external_api";
  }
): NisabThresholdResult {
  const currency = sanitizeCurrency(
    options?.currency,
    ratesConfig.defaultCurrency
  );
  const standard = sanitizeNisabStandard(
    options?.standard,
    ratesConfig.defaultStandard
  );
  const isTroyOz = options?.unit === "oz";
  const spec = NISAB_STANDARDS[standard];

  const goldPerGram = resolveSpotPricePerGram(
    options?.goldSpotOverridePerGram,
    ratesConfig.goldPricePerGramByCurrency,
    currency
  );
  const silverPerGram = resolveSpotPricePerGram(
    options?.silverSpotOverridePerGram,
    ratesConfig.silverPricePerGramByCurrency,
    currency
  );

  return {
    fetchedAt: new Date().toISOString(),
    standard,
    currency,
    weightUnit: isTroyOz ? "troy_oz" : "gram",
    zakatRate: 0.025,
    zakatRatePercent: 2.5,
    gold: {
      weightGrams: spec.goldGrams,
      weightInUnit: convertWeightToUnit(spec.goldGrams, isTroyOz),
      unitPrice: convertGramToUnitPrice(goldPerGram, isTroyOz),
      nisabAmount: roundMoney(spec.goldGrams * goldPerGram, currency),
      caratPricesPerGram: computeCaratPrices(goldPerGram, currency),
    },
    silver: {
      weightGrams: spec.silverGrams,
      weightInUnit: convertWeightToUnit(spec.silverGrams, isTroyOz),
      unitPrice: convertGramToUnitPrice(silverPerGram, isTroyOz),
      nisabAmount: roundMoney(spec.silverGrams * silverPerGram, currency),
    },
    source: options?.source ?? "configured_or_live",
  };
}

const USHR_RATE_BY_IRRIGATION: Record<string, number> = {
  rain_fed_10: 10,
  irrigated_5: 5,
  mixed_7_5: 7.5,
};

function resolveUshrRatePercent(
  irrigation?: ZakatAlMalCalculationInput["agriculturalIrrigation"]
): number {
  return irrigation ? (USHR_RATE_BY_IRRIGATION[irrigation] ?? 0) : 0;
}

function computeAgriculturalUshrDue(
  agriValue: number,
  ratePercent: number,
  currency: SupportedCurrency
): number {
  if (agriValue <= 0 || ratePercent <= 0) {
    return 0;
  }
  return roundMoney(agriValue * (ratePercent / 100), currency);
}

export function calculateZakatAlMal(
  input: ZakatAlMalCalculationInput,
  ratesConfig: FiqhRatesConfig
): ZakatAlMalCalculationResult {
  const currency = sanitizeCurrency(
    input.currency,
    ratesConfig.defaultCurrency
  );
  const standard = sanitizeNisabStandard(
    input.standard,
    ratesConfig.defaultStandard
  );
  const benchmark: "gold" | "silver" =
    input.benchmark === "silver" ? "silver" : "gold";

  const nisabDetails = calculateNisabThresholds(ratesConfig, {
    currency,
    standard,
  });
  const nisabThresholdAmount =
    benchmark === "silver"
      ? nisabDetails.silver.nisabAmount
      : nisabDetails.gold.nisabAmount;

  const goldPerGram24K = resolveSpotPricePerGram(
    undefined,
    ratesConfig.goldPricePerGramByCurrency,
    currency
  );
  const silverPerGram = resolveSpotPricePerGram(
    undefined,
    ratesConfig.silverPricePerGramByCurrency,
    currency
  );

  const gold24g = sanitizeNonNegativeNumber(input.goldGrams24K, 1_000_000);
  const gold22g = sanitizeNonNegativeNumber(input.goldGrams22K, 1_000_000);
  const gold18g = sanitizeNonNegativeNumber(input.goldGrams18K, 1_000_000);
  const silverG = sanitizeNonNegativeNumber(input.silverGrams, 10_000_000);

  const pureGoldEquivalentGrams =
    gold24g * GOLD_CARAT_PURITY_FACTORS["24K"] +
    gold22g * GOLD_CARAT_PURITY_FACTORS["22K"] +
    gold18g * GOLD_CARAT_PURITY_FACTORS["18K"];

  const goldAndSilverComputedValue = roundMoney(
    pureGoldEquivalentGrams * goldPerGram24K + silverG * silverPerGram,
    currency
  );

  const cashAndBank = sanitizeNonNegativeNumber(input.cashAndBank);
  const bullionOrJewelryValue = sanitizeNonNegativeNumber(
    input.bullionOrJewelryValue
  );
  const stocksAndInvestments = sanitizeNonNegativeNumber(
    input.stocksAndInvestments
  );
  const tradeInventory = sanitizeNonNegativeNumber(input.tradeInventory);
  const recoverableReceivables = sanitizeNonNegativeNumber(
    input.recoverableReceivables
  );
  const rentalNetSavings = sanitizeNonNegativeNumber(input.rentalNetSavings);
  const deductibleLiabilities = sanitizeNonNegativeNumber(
    input.shortTermLiabilities
  );

  const grossZakatableWealth = roundMoney(
    cashAndBank +
      goldAndSilverComputedValue +
      bullionOrJewelryValue +
      stocksAndInvestments +
      tradeInventory +
      recoverableReceivables +
      rentalNetSavings,
    currency
  );

  const netZakatableWealth = roundMoney(
    Math.max(0, grossZakatableWealth - deductibleLiabilities),
    currency
  );

  const meetsNisab = netZakatableWealth >= nisabThresholdAmount;
  const wealthZakatDue = meetsNisab
    ? roundMoney(netZakatableWealth * 0.025, currency)
    : 0;

  const agriValue = sanitizeNonNegativeNumber(input.agriculturalProduceValue);
  const agriculturalUshrRatePercent = resolveUshrRatePercent(
    input.agriculturalIrrigation
  );
  const agriculturalUshrDue = computeAgriculturalUshrDue(
    agriValue,
    agriculturalUshrRatePercent,
    currency
  );

  return {
    currency,
    standard,
    benchmark,
    nisabThresholdAmount,
    nisabDetails,
    breakdown: {
      cashAndBank,
      goldAndSilverComputedValue,
      bullionOrJewelryValue,
      stocksAndInvestments,
      tradeInventory,
      recoverableReceivables,
      rentalNetSavings,
      grossZakatableWealth,
      deductibleLiabilities,
      netZakatableWealth,
    },
    meetsNisab,
    wealthZakatDue,
    agriculturalUshrRatePercent,
    agriculturalUshrDue,
    totalZakatPayable: roundMoney(
      wealthZakatDue + agriculturalUshrDue,
      currency
    ),
  };
}

export function calculateFitranaFidyahKaffarah(
  input: FitranaFidyahKaffarahInput,
  ratesConfig: FiqhRatesConfig
): FitranaFidyahKaffarahResult {
  const currency = sanitizeCurrency(
    input.currency,
    ratesConfig.defaultCurrency
  );

  const householdMembers = Math.trunc(
    sanitizeNonNegativeNumber(input.householdMembersForFitrana, 500)
  );
  const fitranaRate =
    ratesConfig.zakatAlFitrPerPersonByCurrency[currency] ||
    ratesConfig.zakatAlFitrPerPersonByCurrency.COP;
  const fitranaDue = roundMoney(householdMembers * fitranaRate, currency);

  const missedDays = Math.trunc(
    sanitizeNonNegativeNumber(input.missedFastDaysForFidyah, 3650)
  );
  const fidyahRate =
    ratesConfig.fidyahPerDayByCurrency[currency] ||
    ratesConfig.fidyahPerDayByCurrency.COP;
  const fidyahDue = roundMoney(missedDays * fidyahRate, currency);

  const brokenFastCount = Math.trunc(
    sanitizeNonNegativeNumber(input.brokenFastKaffarahCount, 100)
  );
  const brokenOathCount = Math.trunc(
    sanitizeNonNegativeNumber(input.brokenOathKaffarahCount, 100)
  );
  const kaffarahFastRate =
    ratesConfig.kaffarahFastByCurrency[currency] ||
    ratesConfig.kaffarahFastByCurrency.COP;
  const kaffarahOathRate =
    ratesConfig.kaffarahOathByCurrency[currency] ||
    ratesConfig.kaffarahOathByCurrency.COP;
  const kaffarahTotal = roundMoney(
    brokenFastCount * kaffarahFastRate + brokenOathCount * kaffarahOathRate,
    currency
  );

  const voluntarySadaqah = roundMoney(
    sanitizeNonNegativeNumber(input.voluntarySadaqahAmount),
    currency
  );

  return {
    currency,
    zakatAlFitr: {
      householdMembers,
      perPersonRate: fitranaRate,
      equivalentFoodKg:
        Math.round(
          householdMembers * (ratesConfig.stapleFoodWeightKg || 2.5) * 10
        ) / 10,
      totalDue: fitranaDue,
    },
    fidyah: {
      missedFastDays: missedDays,
      perDayRate: fidyahRate,
      totalDue: fidyahDue,
    },
    kaffarah: {
      brokenFastCount,
      brokenFastRate: kaffarahFastRate,
      brokenOathCount,
      brokenOathRate: kaffarahOathRate,
      totalDue: kaffarahTotal,
    },
    voluntarySadaqah,
    grandTotalPayable: roundMoney(
      fitranaDue + fidyahDue + kaffarahTotal + voluntarySadaqah,
      currency
    ),
  };
}
