import type { Deck } from "../types.ts";
import { lensesFor, type Lens } from "./layout.ts";

export type UrlState = { source: string; lens: Lens; card: string | null };

// A null default lens means the lens is always written.
type Defaults = { source: string | null; lens: Lens | null };

export function parseUrlState(search: string, decks: Deck[]): UrlState | null {
  const params = new URLSearchParams(search);
  if (!["source", "lens", "card"].some((k) => params.has(k))) return null;
  const deck = decks.find((d) => d.meta.id === params.get("source")) ?? decks[0];
  const lenses = lensesFor(deck);
  const lens = lenses.find((l) => l.id === params.get("lens"))?.id ?? lenses[0].id;
  const card = params.get("card");
  return { source: deck.meta.id, lens, card: card && deck.cards.some((c) => c.id === card) ? card : null };
}

export function serializeUrlState(state: UrlState, defaults: Defaults): string {
  const params = new URLSearchParams();
  if (state.source !== defaults.source) params.set("source", state.source);
  if (state.lens !== defaults.lens) params.set("lens", state.lens);
  if (state.card) params.set("card", state.card);
  const query = params.toString();
  return query ? `?${query}` : "";
}
