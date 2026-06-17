// Currency handling for price display.
//
// Prices are stored in the database as plain numbers in BASE_CURRENCY. At
// display time we detect the visitor's currency from their browser locale,
// fetch live exchange rates, and convert. If rates can't be loaded we fall
// back to showing the base amount.

export const BASE_CURRENCY = "USD";
export const DEFAULT_LOCALE = "en-US";

// Region (from the visitor's locale) → currency code.
const REGION_CURRENCY: Record<string, string> = {
  IN: "INR",
  US: "USD",
  GB: "GBP",
  CA: "CAD",
  AU: "AUD",
  AE: "AED",
  SG: "SGD",
  JP: "JPY",
  CN: "CNY",
  CH: "CHF",
  // Common Eurozone members
  DE: "EUR",
  FR: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  IE: "EUR",
};

export function localeToCurrency(locale: string): string {
  try {
    const region = new Intl.Locale(locale).region;
    return (region && REGION_CURRENCY[region]) || BASE_CURRENCY;
  } catch {
    return BASE_CURRENCY;
  }
}

export function formatMoney(amount: number, locale: string, currency: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface DetectedMoney {
  currency: string;
  locale: string;
}

const MONEY_CACHE_KEY = "hms_money_locale";
const MONEY_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Detect the visitor's currency from their IP location (so it matches where
// they actually are, not their browser language). Falls back to the browser
// locale if the geo lookup is unavailable. Cached for a day.
export async function detectMoneyLocale(): Promise<DetectedMoney> {
  const fallback = (): DetectedMoney => {
    const locale =
      typeof navigator !== "undefined" ? navigator.language : DEFAULT_LOCALE;
    return { currency: localeToCurrency(locale), locale: locale || DEFAULT_LOCALE };
  };

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(MONEY_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as DetectedMoney & { ts: number };
        if (Date.now() - cached.ts < MONEY_TTL && cached.currency) {
          return { currency: cached.currency, locale: cached.locale };
        }
      }
    } catch {
      // ignore corrupt cache
    }
  }

  let result: DetectedMoney | null = null;
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
      const data = (await res.json()) as {
        currency?: string;
        languages?: string;
      };
      if (data.currency) {
        const locale =
          data.languages?.split(",")[0] ||
          (typeof navigator !== "undefined" ? navigator.language : DEFAULT_LOCALE);
        result = { currency: data.currency, locale: locale || DEFAULT_LOCALE };
      }
    }
  } catch {
    // network/CORS/ratelimit — fall back below
  }

  if (!result) result = fallback();

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        MONEY_CACHE_KEY,
        JSON.stringify({ ...result, ts: Date.now() }),
      );
    } catch {
      // storage unavailable — fine
    }
  }
  return result;
}

interface CachedRates {
  ts: number;
  rates: Record<string, number>;
}

const CACHE_KEY = `hms_fx_${BASE_CURRENCY}`;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// Fetch BASE_CURRENCY → * rates, cached in localStorage to avoid refetching
// on every page load. Returns null if unavailable.
export async function getRates(): Promise<Record<string, number> | null> {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as CachedRates;
        if (Date.now() - cached.ts < CACHE_TTL) return cached.rates;
      }
    } catch {
      // ignore corrupt cache
    }
  }

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${BASE_CURRENCY}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { rates?: Record<string, number> };
    if (!data.rates) return null;

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ ts: Date.now(), rates: data.rates }),
        );
      } catch {
        // storage full / unavailable — fine
      }
    }
    return data.rates;
  } catch {
    return null;
  }
}
