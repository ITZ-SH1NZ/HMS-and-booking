"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  BASE_CURRENCY,
  DEFAULT_LOCALE,
  formatMoney,
  getRates,
  localeToCurrency,
} from "@/lib/currency";

interface CurrencyState {
  locale: string;
  currency: string;
  rate: number; // BASE_CURRENCY → currency multiplier
  ready: boolean;
}

const CurrencyContext = createContext<{
  format: (amount: number) => string;
}>({
  // Default before the client has detected locale / loaded rates. Deterministic
  // so server and first client render match (avoids hydration mismatch).
  format: (amount) => formatMoney(amount, DEFAULT_LOCALE, BASE_CURRENCY),
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
      const locale = navigator.language || DEFAULT_LOCALE;
      const currency = localeToCurrency(locale);

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

  function format(amount: number) {
    if (!state.ready) {
      return formatMoney(amount, DEFAULT_LOCALE, BASE_CURRENCY);
    }
    return formatMoney(amount * state.rate, state.locale, state.currency);
  }

  return (
    <CurrencyContext.Provider value={{ format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
