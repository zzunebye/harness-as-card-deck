export const SIZE_STEPS = {
  s: { label: "S", css: "13.5px" },
  m: { label: "M", css: "14.5px" },
  l: { label: "L", css: "16.5px" },
  xl: { label: "XL", css: "18.5px" },
} as const;

export const FONT_STEPS = {
  sans: { label: "Sans", css: "var(--sans)" },
  serif: { label: "Serif", css: 'Georgia, "Noto Serif KR", "Nanum Myeongjo", AppleMyungjo, Batang, serif' },
  mono: { label: "Mono", css: "var(--mono)" },
} as const;

export type SizeStep = keyof typeof SIZE_STEPS;
export type FontStep = keyof typeof FONT_STEPS;
export type ReadingPrefs = { size: SizeStep; font: FontStep };

export const DEFAULT_PREFS: ReadingPrefs = { size: "m", font: "sans" };

const STORAGE_KEY = "reading-prefs";

const pick = <T extends string>(table: Record<T, unknown>, value: unknown, fallback: T): T =>
  typeof value === "string" && Object.hasOwn(table, value) ? (value as T) : fallback;

export function parsePrefs(raw: unknown): ReadingPrefs {
  const o = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  return { size: pick(SIZE_STEPS, o.size, DEFAULT_PREFS.size), font: pick(FONT_STEPS, o.font, DEFAULT_PREFS.font) };
}

export function loadPrefs(): ReadingPrefs {
  try {
    return parsePrefs(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"));
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: ReadingPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
}

export function prefsStyle(p: ReadingPrefs): Record<string, string> {
  return { "--md-size": SIZE_STEPS[p.size].css, "--md-font": FONT_STEPS[p.font].css };
}
