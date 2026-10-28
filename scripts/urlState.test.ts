import assert from "node:assert/strict";
import test from "node:test";
import { analyticsPage, parseUrlState, serializeUrlState } from "../src/lib/urlState.ts";
import type { Deck } from "../src/types.ts";

const deck = (id: string, cards: string[], stages?: unknown) => ({ meta: { id }, cards: cards.map((c) => ({ id: c })), stages }) as unknown as Deck;
const decks = [deck("pstack", ["skill:how"]), deck("gstack", ["skill:browse"], [])];
const defaults = { source: "pstack", lens: "layer" } as const;

test("a shared view round-trips", () => {
  const state = { source: "gstack", lens: "scatter", card: "skill:browse" } as const;
  assert.deepEqual(parseUrlState(serializeUrlState(state, defaults), decks), state);
});

test("a bare URL parses to null", () => {
  assert.equal(parseUrlState("", decks), null);
});

test("an unknown source falls back to the first deck", () => {
  assert.equal(parseUrlState("?source=nope", decks)?.source, "pstack");
});

test("a lens outside the deck's set falls back to its first lens", () => {
  assert.equal(parseUrlState("?source=gstack&lens=tree", decks)?.lens, "sprint");
  assert.equal(parseUrlState("?source=pstack&lens=bogus", decks)?.lens, "layer");
});

test("a card missing from the deck becomes null", () => {
  assert.equal(parseUrlState("?source=pstack&card=skill:browse", decks)?.card, null);
});

test("params equal to defaults are omitted", () => {
  assert.equal(serializeUrlState({ source: "pstack", lens: "layer", card: null }, defaults), "");
  assert.equal(serializeUrlState({ source: "pstack", lens: "layer", card: null }, { ...defaults, lens: null }), "?lens=layer");
});

test("a null default source always writes the source", () => {
  assert.equal(serializeUrlState({ source: "pstack", lens: "layer", card: null }, { source: null, lens: "layer" }), "?source=pstack");
});

test("the lobby is one analytics page", () => {
  assert.deepEqual(analyticsPage({ source: null, card: null }), { route: "/", path: "/" });
});

test("an open deck is an analytics page under its id", () => {
  assert.deepEqual(analyticsPage({ source: "gstack", card: null }), { route: "/[deck]", path: "/gstack" });
});

test("a selected card is an analytics page under its deck, with the id's colon made a hyphen", () => {
  assert.deepEqual(analyticsPage({ source: "pstack", card: "principle:prove-it-works" }), { route: "/[deck]/[card]", path: "/pstack/principle-prove-it-works" });
});
