import type { Deck } from "../types.ts";
import { lensesFor, type Lens } from "./layout.ts";
import { matchLocale, type Locale } from "../i18n/locale.ts";

export type FlowState = { id: string; step: number };

export type UrlState = { source: string; lens: Lens; card: string | null; lang: Locale | null; flow: FlowState | null };

// A null default lens means the lens is always written.
type Defaults = { source: string | null; lens: Lens | null };

export function parseUrlState(search: string, decks: Deck[]): UrlState | null {
  const params = new URLSearchParams(search);
  if (!["source", "lens", "card", "flow"].some((k) => params.has(k))) return null;
  const deck = decks.find((d) => d.meta.id === params.get("source")) ?? decks[0];
  const lenses = lensesFor(deck);
  const lens = lenses.find((l) => l.id === params.get("lens"))?.id ?? lenses[0].id;
  const card = params.get("card");
  const flow = deck.flows?.find((f) => f.id === params.get("flow"));
  const n = Math.trunc(Number(params.get("step")));
  return {
    source: deck.meta.id,
    lens,
    card: card && deck.cards.some((c) => c.id === card) ? card : null,
    lang: matchLocale(params.get("lang")),
    flow: flow ? { id: flow.id, step: Math.min(Math.max(n || 1, 1), flow.steps.length) - 1 } : null,
  };
}

export function serializeUrlState(state: UrlState, defaults: Defaults): string {
  const params = new URLSearchParams();
  if (state.source !== defaults.source) params.set("source", state.source);
  if (state.lens !== defaults.lens) params.set("lens", state.lens);
  if (state.card) params.set("card", state.card);
  if (state.flow) {
    params.set("flow", state.flow.id);
    params.set("step", String(state.flow.step + 1));
  }
  // Only a language the reader picked is written. A detected one stays out, so a shared link does not force it on someone else.
  if (state.lang) params.set("lang", state.lang);
  const query = params.toString();
  return query ? `?${query}` : "";
}

// The trail a history entry carries, trusted only while it still matches the URL's card and the deck's cards.
export function trailFor(historyState: unknown, urlCard: string | null, deck: Deck): string[] {
  const trail = (historyState as { trail?: unknown } | null)?.trail;
  if (Array.isArray(trail) && trail.every((id) => typeof id === "string" && deck.cards.some((c) => c.id === id)) && (trail.at(-1) ?? null) === urlCard) return trail;
  return urlCard ? [urlCard] : [];
}

export type AnalyticsPage = { route: string; path: string };

export function analyticsPage({ source, card }: { source: string | null; card: string | null }): AnalyticsPage {
  if (!source) return { route: "/", path: "/" };
  if (!card) return { route: "/[deck]", path: `/${source}` };
  return { route: "/[deck]/[card]", path: `/${source}/${card.replace(":", "-")}` };
}
