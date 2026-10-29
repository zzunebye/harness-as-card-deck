import { useEffect, useState } from "react";
import type { Deck } from "../types.ts";
import type { Locale } from "../i18n/locale.ts";

const chunks = import.meta.glob<string>("../../data/about/*/*.md", { query: "?raw", import: "default" });

const loaded = new Map<string, string>();

const keyOf = (locale: Locale, source: string) => `../../data/about/${locale}/${source}.md`;

/** The deck's intro in the locale, or the English `deck.about` until it arrives or when the locale has none. */
export function useAbout(deck: Deck, locale: Locale): string {
  const key = keyOf(locale, deck.meta.id);
  const text = loaded.get(key);
  const [, arrived] = useState(0);
  useEffect(() => {
    const chunk = chunks[key];
    if (!chunk || loaded.has(key)) return;
    let live = true;
    chunk().then((md) => {
      loaded.set(key, md.trim());
      if (live) arrived((n) => n + 1);
    });
    return () => {
      live = false;
    };
  }, [key]);
  return text ?? deck.about;
}
