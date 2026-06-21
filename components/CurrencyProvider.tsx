"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  BASE_CURRENCY,
  DEFAULT_LOCALE,
  formatMoney,
  getRates,
  detectMoneyLocale,
} from "@/lib/currency";

interface CurrencyState {
  locale: string;
  currency: string;
  rate: number; // BASE_CURRENCY → currency multiplier
  ready: boolean;
}

const CurrencyContext = createContext<{
  format: (amount: number) => string;
  currency: string;
  locale: string;
  setCurrencyAndLocale: (currency: string, locale: string) => Promise<void>;
}>({
  // Default before the client has detected locale / loaded rates. Deterministic
  // so server and first client render match (avoids hydration mismatch).
  format: (amount) => formatMoney(amount, DEFAULT_LOCALE, BASE_CURRENCY),
  currency: BASE_CURRENCY,
  locale: DEFAULT_LOCALE,
  setCurrencyAndLocale: async () => {},
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CurrencyState>({
    locale: DEFAULT_LOCALE,
    currency: BASE_CURRENCY,
    rate: 1,
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { currency, locale } = await detectMoneyLocale();

      if (currency === BASE_CURRENCY) {
        if (!cancelled) setState({ locale, currency, rate: 1, ready: true });
        return;
      }

      const rates = await getRates();
      const rate = rates?.[currency];

      if (cancelled) return;
      if (rate && rate > 0) {
        setState({ locale, currency, rate, ready: true });
      } else {
        // Couldn't convert — show the base amount in the visitor's locale.
        setState({ locale, currency: BASE_CURRENCY, rate: 1, ready: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function setCurrencyAndLocale(newCurrency: string, newLocale: string) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "hms_money_locale",
          JSON.stringify({ currency: newCurrency, locale: newLocale, ts: Date.now() }),
        );
      } catch (e) {
        console.error(e);
      }
    }

    if (newCurrency === BASE_CURRENCY) {
      setState({ locale: newLocale, currency: newCurrency, rate: 1, ready: true });
      return;
    }

    const rates = await getRates();
    const rate = rates?.[newCurrency];
    if (rate && rate > 0) {
      setState({ locale: newLocale, currency: newCurrency, rate, ready: true });
    } else {
      setState({ locale: newLocale, currency: newCurrency, rate: 1, ready: true });
    }
  }

  function format(amount: number) {
    if (!state.ready) {
      return formatMoney(amount, DEFAULT_LOCALE, BASE_CURRENCY);
    }
    return formatMoney(amount * state.rate, state.locale, state.currency);
  }

  return (
    <CurrencyContext.Provider
      value={{
        format,
        currency: state.currency,
        locale: state.locale,
        setCurrencyAndLocale,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
