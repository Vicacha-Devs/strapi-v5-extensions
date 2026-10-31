import type { NisabStandardId, SupportedCurrency } from './types';

export interface NisabThresholdResult {
  fetchedAt: string;
  standard: NisabStandardId;
  currency: SupportedCurrency;
  weightUnit: 'gram' | 'troy_oz';
  zakatRate: number;
  zakatRatePercent: number;
  gold: {
    weightGrams: number;
    weightInUnit: number;
    unitPrice: number;
    nisabAmount: number;
    caratPricesPerGram: Record<string, number>;
  };
  silver: {
    weightGrams: number;
    weightInUnit: number;
    unitPrice: number;
    nisabAmount: number;
  };
  source: 'configured_or_live' | 'external_api';
}

export interface ZakatAlMalCalculationInput {
  currency?: SupportedCurrency;
  standard?: NisabStandardId;
  benchmark?: 'gold' | 'silver';
  cashAndBank?: number;
  goldGrams24K?: number;
  goldGrams22K?: number;
  goldGrams18K?: number;
  silverGrams?: number;
  bullionOrJewelryValue?: number;
  stocksAndInvestments?: number;
  tradeInventory?: number;
  recoverableReceivables?: number;
  rentalNetSavings?: number;
  shortTermLiabilities?: number;
  agriculturalProduceValue?: number;
  agriculturalIrrigation?: 'rain_fed_10' | 'irrigated_5' | 'mixed_7_5' | 'none';
}

export interface ZakatAlMalCalculationResult {
  currency: SupportedCurrency;
  standard: NisabStandardId;
  benchmark: 'gold' | 'silver';
  nisabThresholdAmount: number;
  nisabDetails: NisabThresholdResult;
  breakdown: {
    cashAndBank: number;
    goldAndSilverComputedValue: number;
    bullionOrJewelryValue: number;
    stocksAndInvestments: number;
    tradeInventory: number;
    recoverableReceivables: number;
    rentalNetSavings: number;
    grossZakatableWealth: number;
    deductibleLiabilities: number;
    netZakatableWealth: number;
  };
  meetsNisab: boolean;
  wealthZakatDue: number;
  agriculturalUshrRatePercent: number;
  agriculturalUshrDue: number;
  totalZakatPayable: number;
}

export interface FitranaFidyahKaffarahInput {
  currency?: SupportedCurrency;
  householdMembersForFitrana?: number;
  missedFastDaysForFidyah?: number;
  brokenFastKaffarahCount?: number;
  brokenOathKaffarahCount?: number;
  voluntarySadaqahAmount?: number;
}

export interface FitranaFidyahKaffarahResult {
  currency: SupportedCurrency;
  zakatAlFitr: {
    householdMembers: number;
    perPersonRate: number;
    equivalentFoodKg: number;
    totalDue: number;
  };
  fidyah: {
    missedFastDays: number;
    perDayRate: number;
    totalDue: number;
  };
  kaffarah: {
    brokenFastCount: number;
    brokenFastRate: number;
    brokenOathCount: number;
    brokenOathRate: number;
    totalDue: number;
  };
  voluntarySadaqah: number;
  grandTotalPayable: number;
}
