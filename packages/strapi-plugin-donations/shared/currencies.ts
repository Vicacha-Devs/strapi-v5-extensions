export interface IsoCurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  countryCode: string;
  flag: string;
}

export interface IsoCountryInfo {
  code: string;
  name: string;
  flag: string;
  defaultCurrency: string;
}

export const ISO_4217_CURRENCIES: IsoCurrencyInfo[] = [
  {
    code: "COP",
    symbol: "$",
    name: "Colombian Peso",
    countryCode: "CO",
    flag: "🇨🇴",
  },
  {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    countryCode: "US",
    flag: "🇺🇸",
  },
  { code: "EUR", symbol: "€", name: "Euro", countryCode: "EU", flag: "🇪🇺" },
  {
    code: "TRY",
    symbol: "₺",
    name: "Turkish Lira",
    countryCode: "TR",
    flag: "🇹🇷",
  },
  {
    code: "SAR",
    symbol: "﷼",
    name: "Saudi Riyal",
    countryCode: "SA",
    flag: "🇸🇦",
  },
  {
    code: "AED",
    symbol: "د.إ",
    name: "UAE Dirham",
    countryCode: "AE",
    flag: "🇦🇪",
  },
  {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    countryCode: "GB",
    flag: "🇬🇧",
  },
  {
    code: "CAD",
    symbol: "$",
    name: "Canadian Dollar",
    countryCode: "CA",
    flag: "🇨🇦",
  },
  {
    code: "MXN",
    symbol: "$",
    name: "Mexican Peso",
    countryCode: "MX",
    flag: "🇲🇽",
  },
  {
    code: "BRL",
    symbol: "R$",
    name: "Brazilian Real",
    countryCode: "BR",
    flag: "🇧🇷",
  },
  {
    code: "ARS",
    symbol: "$",
    name: "Argentine Peso",
    countryCode: "AR",
    flag: "🇦🇷",
  },
  {
    code: "CLP",
    symbol: "$",
    name: "Chilean Peso",
    countryCode: "CL",
    flag: "🇨🇱",
  },
  {
    code: "PEN",
    symbol: "S/",
    name: "Peruvian Sol",
    countryCode: "PE",
    flag: "🇵🇪",
  },
  {
    code: "UYU",
    symbol: "$U",
    name: "Uruguayan Peso",
    countryCode: "UY",
    flag: "🇺🇾",
  },
  {
    code: "CRC",
    symbol: "₡",
    name: "Costa Rican Colón",
    countryCode: "CR",
    flag: "🇨🇷",
  },
  {
    code: "DOP",
    symbol: "RD$",
    name: "Dominican Peso",
    countryCode: "DO",
    flag: "🇩🇴",
  },
  {
    code: "GTQ",
    symbol: "Q",
    name: "Guatemalan Quetzal",
    countryCode: "GT",
    flag: "🇬🇹",
  },
  {
    code: "CHF",
    symbol: "CHF",
    name: "Swiss Franc",
    countryCode: "CH",
    flag: "🇨🇭",
  },
  {
    code: "QAR",
    symbol: "ر.ق",
    name: "Qatari Riyal",
    countryCode: "QA",
    flag: "🇶🇦",
  },
  {
    code: "KWD",
    symbol: "د.ك",
    name: "Kuwaiti Dinar",
    countryCode: "KW",
    flag: "🇰🇼",
  },
  {
    code: "BHD",
    symbol: ".د.ب",
    name: "Bahraini Dinar",
    countryCode: "BH",
    flag: "🇧🇭",
  },
  {
    code: "OMR",
    symbol: "ر.ع.",
    name: "Omani Rial",
    countryCode: "OM",
    flag: "🇴🇲",
  },
  {
    code: "JOD",
    symbol: "د.أ",
    name: "Jordanian Dinar",
    countryCode: "JO",
    flag: "🇯🇴",
  },
  {
    code: "EGP",
    symbol: "E£",
    name: "Egyptian Pound",
    countryCode: "EG",
    flag: "🇪🇬",
  },
  {
    code: "MAD",
    symbol: "د.م.",
    name: "Moroccan Dirham",
    countryCode: "MA",
    flag: "🇲🇦",
  },
  {
    code: "MYR",
    symbol: "RM",
    name: "Malaysian Ringgit",
    countryCode: "MY",
    flag: "🇲🇾",
  },
  {
    code: "IDR",
    symbol: "Rp",
    name: "Indonesian Rupiah",
    countryCode: "ID",
    flag: "🇮🇩",
  },
  {
    code: "PKR",
    symbol: "₨",
    name: "Pakistani Rupee",
    countryCode: "PK",
    flag: "🇵🇰",
  },
  {
    code: "AUD",
    symbol: "A$",
    name: "Australian Dollar",
    countryCode: "AU",
    flag: "🇦🇺",
  },
  {
    code: "JPY",
    symbol: "¥",
    name: "Japanese Yen",
    countryCode: "JP",
    flag: "🇯🇵",
  },
  {
    code: "CNY",
    symbol: "¥",
    name: "Chinese Yuan",
    countryCode: "CN",
    flag: "🇨🇳",
  },
];

export const ISO_3166_COUNTRIES: IsoCountryInfo[] = [
  { code: "CO", name: "Colombia", flag: "🇨🇴", defaultCurrency: "COP" },
  { code: "US", name: "United States", flag: "🇺🇸", defaultCurrency: "USD" },
  { code: "ES", name: "Spain", flag: "🇪🇸", defaultCurrency: "EUR" },
  { code: "TR", name: "Türkiye", flag: "🇹🇷", defaultCurrency: "TRY" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", defaultCurrency: "SAR" },
  {
    code: "AE",
    name: "United Arab Emirates",
    flag: "🇦🇪",
    defaultCurrency: "AED",
  },
  { code: "MX", name: "Mexico", flag: "🇲🇽", defaultCurrency: "MXN" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", defaultCurrency: "BRL" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", defaultCurrency: "ARS" },
  { code: "CL", name: "Chile", flag: "🇨🇱", defaultCurrency: "CLP" },
  { code: "PE", name: "Peru", flag: "🇵🇪", defaultCurrency: "PEN" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨", defaultCurrency: "USD" },
  { code: "PA", name: "Panama", flag: "🇵🇦", defaultCurrency: "USD" },
  { code: "CA", name: "Canada", flag: "🇨🇦", defaultCurrency: "CAD" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", defaultCurrency: "GBP" },
  { code: "FR", name: "France", flag: "🇫🇷", defaultCurrency: "EUR" },
  { code: "DE", name: "Germany", flag: "🇩🇪", defaultCurrency: "EUR" },
  { code: "IT", name: "Italy", flag: "🇮🇹", defaultCurrency: "EUR" },
  { code: "QA", name: "Qatar", flag: "🇶🇦", defaultCurrency: "QAR" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼", defaultCurrency: "KWD" },
  { code: "JO", name: "Jordan", flag: "🇯🇴", defaultCurrency: "JOD" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", defaultCurrency: "EGP" },
  { code: "MA", name: "Morocco", flag: "🇲🇦", defaultCurrency: "MAD" },
  { code: "PS", name: "Palestine", flag: "🇵🇸", defaultCurrency: "JOD" },
  { code: "LB", name: "Lebanon", flag: "🇱🇧", defaultCurrency: "USD" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", defaultCurrency: "MYR" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", defaultCurrency: "IDR" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", defaultCurrency: "PKR" },
];

export function resolveLocalizedCurrencyName(
  code: string,
  locale = "en"
): string {
  const upper = String(code || "")
    .trim()
    .toUpperCase();
  const entry = ISO_4217_CURRENCIES.find((c) => c.code === upper);
  try {
    if (
      typeof Intl !== "undefined" &&
      typeof Intl.DisplayNames === "function"
    ) {
      const dn = new Intl.DisplayNames([locale, "en"], { type: "currency" });
      const localized = dn.of(upper);
      if (localized && localized.toUpperCase() !== upper) {
        return localized;
      }
    }
  } catch {
    // Fallback to catalog name
  }
  return entry?.name || upper;
}

export function resolveLocalizedCountryName(
  code: string,
  locale = "en"
): string {
  const upper = String(code || "")
    .trim()
    .toUpperCase();
  const entry = ISO_3166_COUNTRIES.find((c) => c.code === upper);
  try {
    if (
      typeof Intl !== "undefined" &&
      typeof Intl.DisplayNames === "function"
    ) {
      const dn = new Intl.DisplayNames([locale, "en"], { type: "region" });
      const localized = dn.of(upper);
      if (localized && localized.toUpperCase() !== upper) {
        return localized;
      }
    }
  } catch {
    // Fallback to catalog name
  }
  return entry?.name || upper;
}

export function formatCurrencyOptionLabel(code: string, locale = "en"): string {
  const upper = String(code || "")
    .trim()
    .toUpperCase();
  const entry = ISO_4217_CURRENCIES.find((c) => c.code === upper);
  const name = resolveLocalizedCurrencyName(upper, locale);
  const flag = entry?.flag || "💱";
  const symbol = entry?.symbol ? ` (${entry.symbol})` : "";
  return `${flag} ${upper} — ${name}${symbol}`;
}

export function formatCountryOptionLabel(code: string, locale = "en"): string {
  const upper = String(code || "")
    .trim()
    .toUpperCase();
  const entry = ISO_3166_COUNTRIES.find((c) => c.code === upper);
  const name = resolveLocalizedCountryName(upper, locale);
  const flag = entry?.flag || "🌐";
  const currencySuffix = entry?.defaultCurrency
    ? ` · ${entry.defaultCurrency}`
    : "";
  return `${flag} ${upper} — ${name}${currencySuffix}`;
}

export function getOrderedCurrencyOptions(
  supportedCurrencies?: string[],
  locale = "en",
  currentValue?: string
): Array<{ code: string; label: string; isConfigured: boolean }> {
  const configuredSet = new Set(
    (supportedCurrencies ?? [])
      .map((c) =>
        String(c || "")
          .trim()
          .toUpperCase()
      )
      .filter(Boolean)
  );
  const seen = new Set<string>();
  const options: Array<{ code: string; label: string; isConfigured: boolean }> =
    [];

  const pushCode = (rawCode: string) => {
    const code = String(rawCode || "")
      .trim()
      .toUpperCase();
    if (!code || seen.has(code)) return;
    seen.add(code);
    options.push({
      code,
      label: formatCurrencyOptionLabel(code, locale),
      isConfigured: configuredSet.has(code),
    });
  };

  for (const code of configuredSet) {
    pushCode(code);
  }
  if (currentValue) {
    pushCode(currentValue);
  }
  for (const item of ISO_4217_CURRENCIES) {
    pushCode(item.code);
  }

  return options;
}
