import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import { en, type Messages } from "./en.tsx";
import type { Locale } from "./locale.ts";

export type { Messages };

export const I18nContext = createContext<Messages>(en);

const LocaleContext = createContext<Locale>("en");

export const useT = () => useContext(I18nContext);
export const useLocale = () => useContext(LocaleContext);

const loaders = import.meta.glob<{ default: Messages }>(["./*.tsx", "!./en.tsx"]);

/** Shows English until the locale's chunk arrives, so the first paint never waits on it. */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [loaded, setLoaded] = useState<{ locale: Locale; messages: Messages } | null>(null);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (locale === "en") return;
    let live = true;
    loaders[`./${locale}.tsx`]().then((m) => live && setLoaded({ locale, messages: m.default }));
    return () => {
      live = false;
    };
  }, [locale]);

  const messages = loaded?.locale === locale ? loaded.messages : en;
  return createElement(LocaleContext.Provider, { value: locale }, createElement(I18nContext.Provider, { value: messages }, children));
}
