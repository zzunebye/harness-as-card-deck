import assert from "node:assert/strict";
import test from "node:test";
import { analyticsPage, parseUrlState, serializeUrlState, trailFor } from "../src/lib/urlState.ts";
import type { Deck } from "../src/types.ts";

const deck = (id: string, cards: string[], stages?: unknown, langs: string[] = [], flows?: unknown) => ({ meta: { id, langs }, cards: cards.map((c) => ({ id: c })), stages, flows }) as unknown as Deck;
const flows = [{ id: "bug-fix", steps: [{}, {}, {}] }];
const decks = [deck("pstack", ["skill:how"], undefined, ["ko"], flows), deck("gstack", ["skill:browse"], [])];
const defaults = { source: "pstack", lens: "layer" } as const;

test("a shared view round-trips", () => {
  const state = { source: "gstack", lens: "scatter", card: "skill:browse", lang: "ko", flow: null } as const;
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

test("a picked language is written, English included, and a detected one is not", () => {
  const state = { source: "pstack", lens: "layer", card: null, lang: "ko", flow: null } as const;
  assert.equal(serializeUrlState(state, defaults), "?lang=ko");
  assert.equal(serializeUrlState({ ...state, lang: "en" }, defaults), "?lang=en");
  assert.equal(serializeUrlState({ ...state, lang: null }, defaults), "");
  assert.equal(parseUrlState("?source=pstack&lang=ko", decks)?.lang, "ko");
});

test("a language the interface lacks parses to null", () => {
  assert.equal(parseUrlState("?source=pstack&lang=xx", decks)?.lang, null);
  assert.equal(parseUrlState("?source=pstack", decks)?.lang, null);
});

test("params equal to defaults are omitted", () => {
  assert.equal(serializeUrlState({ source: "pstack", lens: "layer", card: null, lang: null, flow: null }, defaults), "");
  assert.equal(serializeUrlState({ source: "pstack", lens: "layer", card: null, lang: null, flow: null }, { ...defaults, lens: null }), "?lens=layer");
});

test("a null default source always writes the source", () => {
  assert.equal(serializeUrlState({ source: "pstack", lens: "layer", card: null, lang: null, flow: null }, { source: null, lens: "layer" }), "?source=pstack");
});

test("a flow step round-trips with a one-based step in the URL", () => {
  const state = { source: "pstack", lens: "tree", card: null, lang: null, flow: { id: "bug-fix", stepIndex: 1 } } as const;
  const search = serializeUrlState(state, defaults);
  assert.equal(search, "?lens=tree&flow=bug-fix&step=2");
  assert.deepEqual(parseUrlState(search, decks), state);
});

test("a flow link alone is a shared view", () => {
  assert.deepEqual(parseUrlState("?flow=bug-fix", decks)?.flow, { id: "bug-fix", stepIndex: 0 });
});

test("a step outside the flow is clamped, and an unknown or foreign flow becomes null", () => {
  assert.equal(parseUrlState("?flow=bug-fix&step=99", decks)?.flow?.stepIndex, 2);
  assert.equal(parseUrlState("?flow=bug-fix&step=0", decks)?.flow?.stepIndex, 0);
  assert.equal(parseUrlState("?flow=bug-fix&step=x", decks)?.flow?.stepIndex, 0);
  assert.equal(parseUrlState("?source=pstack&flow=nope", decks)?.flow, null);
  assert.equal(parseUrlState("?source=gstack&flow=bug-fix", decks)?.flow, null);
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

test("a history entry's trail is kept when it ends at the URL's card", () => {
  const two = deck("pstack", ["skill:how", "skill:why"]);
  assert.deepEqual(trailFor({ trail: ["skill:how", "skill:why"] }, "skill:why", two), ["skill:how", "skill:why"]);
  assert.deepEqual(trailFor({ trail: [] }, null, two), []);
});

test("a trail naming a card the deck lacks falls back to the URL's card", () => {
  assert.deepEqual(trailFor({ trail: ["skill:gone", "skill:how"] }, "skill:how", decks[0]), ["skill:how"]);
});

test("a trail that does not end at the URL's card falls back to the URL's card", () => {
  const two = deck("pstack", ["skill:how", "skill:why"]);
  assert.deepEqual(trailFor({ trail: ["skill:how", "skill:why"] }, "skill:how", two), ["skill:how"]);
  assert.deepEqual(trailFor({ trail: ["skill:how"] }, null, two), []);
});

test("a history state without a trail array falls back to the URL's card", () => {
  assert.deepEqual(trailFor({ trail: "skill:how" }, "skill:how", decks[0]), ["skill:how"]);
  assert.deepEqual(trailFor({ trail: [1] }, null, decks[0]), []);
  assert.deepEqual(trailFor(null, "skill:how", decks[0]), ["skill:how"]);
  assert.deepEqual(trailFor(undefined, null, decks[0]), []);
});
