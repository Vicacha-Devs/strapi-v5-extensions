import {
  GOLD_CARAT_PURITY_FACTORS,
  NISAB_STANDARDS,
  TROY_OUNCE_IN_GRAMS,
} from './constants';
import type {
  FiqhRatesConfig,
  FitranaFidyahKaffarahInput,
  FitranaFidyahKaffarahResult,
  NisabStandardId,
  NisabThresholdResult,
  SupportedCurrency,
  ZakatAlMalCalculationInput,
  ZakatAlMalCalculationResult,
} from './types';
import {
  sanitizeCurrency,
  sanitizeNisabStandard,
  sanitizeNonNegativeNumber,
} from './validation';

function roundMoney(value: number, currency: SupportedCurrency): number {
  if (currency === 'COP') {
    return Math.round(value);
  }
  return Math.round(value * 100) / 100;
}

export function calculateNisabThresholds(
  ratesConfig: FiqhRatesConfig,
  options?: {
    currency?: SupportedCurrency;
    standard?: NisabStandardId;
    unit?: 'g' | 'oz';
    goldSpotOverridePerGram?: number;
    silverSpotOverridePerGram?: number;
    source?: 'configured_or_live' | 'external_api';
  }
): NisabThresholdResult {
  const currency = sanitizeCurrency(options?.currency, ratesConfig.defaultCurrency);
  const standard = sanitizeNisabStandard(options?.standard, ratesConfig.defaultStandard);
  const isTroyOz = options?.unit === 'oz';
  const spec = NISAB_STANDARDS[standard];

  const goldPerGram =
    options?.goldSpotOverridePerGram && options.goldSpotOverridePerGram > 0
      ? options.goldSpotOverridePerGram
      : ratesConfig.goldPricePerGramByCurrency[currency] ||
        ratesConfig.goldPricePerGramByCurrency.COP;

  const silverPerGram =
    options?.silverSpotOverridePerGram && options.silverSpotOverridePerGram > 0
      ? options.silverSpotOverridePerGram
      : ratesConfig.silverPricePerGramByCurrency[currency] ||
        ratesConfig.silverPricePerGramByCurrency.COP;

  const goldUnitPrice = isTroyOz
    ? Math.round(goldPerGram * TROY_OUNCE_IN_GRAMS * 100) / 100
    : goldPerGram;
  const silverUnitPrice = isTroyOz
    ? Math.round(silverPerGram * TROY_OUNCE_IN_GRAMS * 100) / 100
    : silverPerGram;

  const goldNisabAmount = roundMoney(spec.goldGrams * goldPerGram, currency);
  const silverNisabAmount = roundMoney(spec.silverGrams * silverPerGram, currency);

  const caratPricesPerGram: Record<string, number> = {};
  for (const [carat, factor] of Object.entries(GOLD_CARAT_PURITY_FACTORS)) {
    caratPricesPerGram[carat] = roundMoney(goldPerGram * factor, currency);
  }

  return {
    fetchedAt: new Date().toISOString(),
    standard,
    currency,
    weightUnit: isTroyOz ? 'troy_oz' : 'gram',
    zakatRate: 0.025,
    zakatRatePercent: 2.5,
    gold: {
      weightGrams: spec.goldGrams,
      weightInUnit: isTroyOz
        ? Math.round((spec.goldGrams / TROY_OUNCE_IN_GRAMS) * 1000) / 1000
        : spec.goldGrams,
      unitPrice: goldUnitPrice,
      nisabAmount: goldNisabAmount,
      caratPricesPerGram,
    },
    silver: {
      weightGrams: spec.silverGrams,
      weightInUnit: isTroyOz
        ? Math.round((spec.silverGrams / TROY_OUNCE_IN_GRAMS) * 1000) / 1000
        : spec.silverGrams,
      unitPrice: silverUnitPrice,
      nisabAmount: silverNisabAmount,
    },
    source: options?.source || 'configured_or_live',
  };
}

export function calculateZakatAlMal(
  input: ZakatAlMalCalculationInput,
  ratesConfig: FiqhRatesConfig
): ZakatAlMalCalculationResult {
  const currency = sanitizeCurrency(input.currency, ratesConfig.defaultCurrency);
  const standard = sanitizeNisabStandard(input.standard, ratesConfig.defaultStandard);
  const benchmark: 'gold' | 'silver' = input.benchmark === 'silver' ? 'silver' : 'gold';

  const nisabDetails = calculateNisabThresholds(ratesConfig, { currency, standard });
  const nisabThresholdAmount =
    benchmark === 'silver'
      ? nisabDetails.silver.nisabAmount
      : nisabDetails.gold.nisabAmount;

  const goldPerGram24K =
    ratesConfig.goldPricePerGramByCurrency[currency] ||
    ratesConfig.goldPricePerGramByCurrency.COP;
  const silverPerGram =
    ratesConfig.silverPricePerGramByCurrency[currency] ||
    ratesConfig.silverPricePerGramByCurrency.COP;

  const gold24g = sanitizeNonNegativeNumber(input.goldGrams24K, 1_000_000);
  const gold22g = sanitizeNonNegativeNumber(input.goldGrams22K, 1_000_000);
  const gold18g = sanitizeNonNegativeNumber(input.goldGrams18K, 1_000_000);
  const silverG = sanitizeNonNegativeNumber(input.silverGrams, 10_000_000);

  const pureGoldEquivalentGrams =
    gold24g * GOLD_CARAT_PURITY_FACTORS['24K'] +
    gold22g * GOLD_CARAT_PURITY_FACTORS['22K'] +
    gold18g * GOLD_CARAT_PURITY_FACTORS['18K'];

  const goldAndSilverComputedValue = roundMoney(
    pureGoldEquivalentGrams * goldPerGram24K + silverG * silverPerGram,
    currency
  );

  const cashAndBank = sanitizeNonNegativeNumber(input.cashAndBank);
  const bullionOrJewelryValue = sanitizeNonNegativeNumber(input.bullionOrJewelryValue);
  const stocksAndInvestments = sanitizeNonNegativeNumber(input.stocksAndInvestments);
  const tradeInventory = sanitizeNonNegativeNumber(input.tradeInventory);
  const recoverableReceivables = sanitizeNonNegativeNumber(input.recoverableReceivables);
  const rentalNetSavings = sanitizeNonNegativeNumber(input.rentalNetSavings);
  const deductibleLiabilities = sanitizeNonNegativeNumber(input.shortTermLiabilities);

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
  let agriculturalUshrRatePercent = 0;
  if (input.agriculturalIrrigation === 'rain_fed_10') {
    agriculturalUshrRatePercent = 10;
  } else if (input.agriculturalIrrigation === 'irrigated_5') {
    agriculturalUshrRatePercent = 5;
  } else if (input.agriculturalIrrigation === 'mixed_7_5') {
    agriculturalUshrRatePercent = 7.5;
  }
  const agriculturalUshrDue =
    agriValue > 0 && agriculturalUshrRatePercent > 0
      ? roundMoney(agriValue * (agriculturalUshrRatePercent / 100), currency)
      : 0;

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
    totalZakatPayable: roundMoney(wealthZakatDue + agriculturalUshrDue, currency),
  };
}

export function calculateFitranaFidyahKaffarah(
  input: FitranaFidyahKaffarahInput,
  ratesConfig: FiqhRatesConfig
): FitranaFidyahKaffarahResult {
  const currency = sanitizeCurrency(input.currency, ratesConfig.defaultCurrency);

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
        Math.round(householdMembers * (ratesConfig.stapleFoodWeightKg || 2.5) * 10) / 10,
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
