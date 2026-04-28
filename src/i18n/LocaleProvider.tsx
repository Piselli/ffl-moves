"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { SiteLocale } from "./types";
import { LOCALE_STORAGE_KEY, SITE_LOCALES } from "./types";
import { messages } from "./messages";

type LocaleContextValue = {
  locale: SiteLocale;
  setLocale: (next: SiteLocale) => void;
  /** Re-read `localStorage` and apply (same tab or after external change). */
  reloadLocale: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): SiteLocale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw && SITE_LOCALES.includes(raw as SiteLocale)) return raw as SiteLocale;
  } catch {
    /* ignore */
  }
  return null;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SiteLocale>("en");

  useEffect(() => {
    const stored = readStoredLocale();
    if (stored) setLocaleState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "uk" ? "uk" : "en";
  }, [locale]);

  const setLocale = useCallback((next: SiteLocale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const reloadLocale = useCallback(() => {
    const stored = readStoredLocale();
    if (stored) setLocaleState(stored);
    else setLocaleState("en");
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LOCALE_STORAGE_KEY || e.newValue == null) return;
      if (SITE_LOCALES.includes(e.newValue as SiteLocale)) {
        setLocaleState(e.newValue as SiteLocale);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale, reloadLocale }),
    [locale, setLocale, reloadLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useSiteLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useSiteLocale must be used within LocaleProvider");
  }
  return ctx;
}

export function useSiteMessages() {
  const { locale } = useSiteLocale();
  return messages[locale];
}
