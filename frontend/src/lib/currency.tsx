'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

export const CURRENCY_OPTIONS = [
  { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (A$)' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar (C$)' },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen (¥)' },
] as const;

export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]['code'];

export function currencySymbol(code?: string | null): string {
  if (!code) return '£';
  return CURRENCY_OPTIONS.find((c) => c.code === code)?.symbol ?? code;
}

interface PropertyCurrency {
  currency: string;
}

interface CurrencyContextValue {
  currency: string;
  symbol: string;
  setCurrency: (code: string) => void;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'GBP',
  symbol: '£',
  setCurrency: () => {},
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState('GBP');

  useEffect(() => {
    let cancelled = false;
    api
      .get<PropertyCurrency>('/property')
      .then((p) => {
        if (!cancelled && p?.currency) setCurrencyState(p.currency);
      })
      .catch(() => {
        /* not logged in / no property yet — keep default */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = useCallback((code: string) => setCurrencyState(code), []);

  return (
    <CurrencyContext.Provider value={{ currency, symbol: currencySymbol(currency), setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
