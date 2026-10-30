import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { Bodies, Deck } from "../src/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const decks = JSON.parse(readFileSync(join(root, "src/data/decks.json"), "utf8")) as Deck[];

for (const deck of decks) {
  const ids = new Set(deck.cards.map((c) => c.id));
  const bodies = JSON.parse(readFileSync(join(root, "src/data/bodies", `${deck.meta.id}.json`), "utf8")) as Bodies;
  for (const flow of deck.flows ?? []) {
    test(`${deck.meta.id} flow ${flow.id} has steps`, () => {
      assert.ok(flow.steps.length > 0);
    });

    test(`${deck.meta.id} flow ${flow.id} names only cards in the deck`, () => {
      for (const id of [...flow.steps.map((s) => s.card), ...flow.later.map((l) => l.card)]) assert.ok(ids.has(id), `unknown card ${id}`);
    });

    test(`${deck.meta.id} flow ${flow.id} quotes appear in their cards`, () => {
      for (const s of flow.steps) if (s.quote) assert.ok(bodies[s.card].includes(s.quote), `${s.card} lacks "${s.quote}"`);
    });
  }
}
