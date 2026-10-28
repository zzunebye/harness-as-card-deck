import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertEdgeTypes, assertLegendSource, edgeFromAdd } from "../src/lib/edges.ts";
import { extractRefs } from "../src/lib/markdown.ts";
import { createResolver } from "../src/lib/refs.ts";
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

test("a namespaced skill name resolves in prose and inline code, and only with the namespace", () => {
  const targets = [
    { id: "skill:writing-plans", layer: "skill" as const, name: "writing-plans", title: "Writing Plans" },
    { id: "skill:brainstorming", layer: "skill" as const, name: "brainstorming", title: "Brainstorming" },
  ];
  const md = "Use superpowers:writing-plans, then `superpowers:brainstorming`. Not superpowers:writing-plans-extra.";
  assert.deepEqual(extractRefs(md, createResolver(targets, "superpowers"), "skill:other"), ["skill:writing-plans", "skill:brainstorming"]);
  assert.deepEqual(extractRefs("Use superpowers:writing-plans.", createResolver(targets), "skill:other"), []);
});
