import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertEdgeTypes, assertLegendSource, edgeFromAdd } from "../src/lib/edges.ts";
import type { Deck } from "../src/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("a hand-set relationship is rejected", () => {
  assert.throws(
    () => edgeFromAdd({ from: "skill:architect", to: "skill:how", type: "cites-principle" }, { id: "skill:how", layer: "skill" }),
    /edgeTypeFor/,
  );
});

test("next-in-sprint does not match a playbook target", () => {
  assert.throws(
    () =>
      assertEdgeTypes(
        [{ id: "playbook:feature", layer: "playbook" }],
        [{ from: "router:poteto-mode", to: "playbook:feature", type: "next-in-sprint" }],
      ),
    /edgeTypeFor/,
  );
});

test("built decks use the target layer", () => {
  const decks = JSON.parse(readFileSync(join(root, "src/data/decks.json"), "utf8")) as Deck[];
  for (const deck of decks) assertEdgeTypes(deck.cards, deck.edges);
});

test("the legend lists every relationship", () => {
  assertLegendSource(readFileSync(join(root, "src/App.tsx"), "utf8"));
});
