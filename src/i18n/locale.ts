export const LOCALES = { en: "English", ko: "한국어" } as const;
export type Locale = keyof typeof LOCALES;

/** The supported locale a language tag names, by its primary subtag ("ko-KR" is "ko"). */
export function matchLocale(tag: string | null | undefined): Locale | null {
  const base = tag?.toLowerCase().split("-")[0] ?? "";
  return (Object.keys(LOCALES) as Locale[]).find((l) => l === base) ?? null;
}

/** The locale the reader picked: `?lang=` wins over the stored pick. Null means they never chose. */
export function chosenLocale(search: string, stored: string | null): Locale | null {
  return matchLocale(new URLSearchParams(search).get("lang")) ?? matchLocale(stored);
}

export function systemLocale(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const hit = matchLocale(tag);
    if (hit) return hit;
  }
  return "en";
}
