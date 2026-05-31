"use client";

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  defaultLocale,
  dictionary,
  localeFlags,
  type Locale,
} from "@/data/i18n";

interface LanguageContextValue {
  flag: string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (typeof dictionary)[Locale];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const storageKey = "portfolio-locale";

export function LanguageProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(storageKey);

    if (storedLocale === "en" || storedLocale === "id") {
      setLocaleState(storedLocale);
      document.documentElement.lang = storedLocale;
      return;
    }

    document.documentElement.lang = defaultLocale;
  }, []);

  function setLocale(nextLocale: Locale) {
    setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale;
    window.localStorage.setItem(storageKey, nextLocale);
  }

  function toggleLocale() {
    setLocale(locale === "en" ? "id" : "en");
  }

  const value = useMemo(
    () => ({
      flag: localeFlags[locale],
      locale,
      setLocale,
      toggleLocale,
      t: dictionary[locale],
    }),
    [locale],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}
