import assert from "node:assert/strict";
import test from "node:test";
import { searchCards } from "../src/lib/search.ts";
import type { Card } from "../src/types.ts";

const card = (name: string, description = ""): Card => ({ id: `skill:${name}`, layer: "skill", name, title: name, description, path: "", out: 0, in: 0 });
const cards = [card("architect", "Sketch types before code"), card("poteto-mode", "Router for rigorous tasks"), card("arena", "Spawn parallel candidates"), card("swarm", "Verify with architect-style fan-out")];

const ids = (query: string, bodies = null as Record<string, string> | null) => searchCards(cards, bodies, query).map((h) => h.id);

test("a name match outranks a description match", () => {
  assert.deepEqual(ids("architect"), ["skill:architect", "skill:swarm"]);
});

test("a name prefix outranks a name that only contains the text", () => {
  assert.equal(ids("ar")[0], "skill:architect");
  assert.deepEqual(ids("ar").slice(0, 2).sort(), ["skill:architect", "skill:arena"]);
});

test("spaces, hyphens, and a leading slash are interchangeable", () => {
  assert.deepEqual(ids("poteto mode"), ["skill:poteto-mode"]);
  assert.deepEqual(ids("/poteto-mode"), ["skill:poteto-mode"]);
});

test("every token must match", () => {
  assert.deepEqual(ids("sketch arena"), []);
  assert.deepEqual(ids("sketch types"), ["skill:architect"]);
});

test("matching is case-insensitive and a blank query finds nothing", () => {
  assert.deepEqual(ids("ARENA"), ["skill:arena"]);
  assert.deepEqual(ids("   "), []);
});

test("body text is searched once bodies have loaded, with a snippet", () => {
  const bodies = { "skill:swarm": "Intro.\n\nSpawn workers that each check one cell of the coverage matrix." };
  assert.deepEqual(ids("coverage matrix"), []);
  const [hit] = searchCards(cards, bodies, "coverage matrix");
  assert.equal(hit.id, "skill:swarm");
  assert.equal(hit.field, "body");
  assert.match(hit.snippet!, /coverage matrix/);
});

test("a snippet stays on the match after a run of separator characters", () => {
  const bodies = { "skill:swarm": `${"-".repeat(120)}\nsome filler words before the needle word and after it ends here` };
  const [hit] = searchCards(cards, bodies, "needle");
  assert.match(hit.snippet!, /needle/);
});

test("a name or description hit carries no snippet", () => {
  const [hit] = searchCards(cards, { "skill:arena": "arena arena" }, "arena");
  assert.equal(hit.snippet, null);
});

test("results are capped at the limit", () => {
  assert.equal(searchCards(cards, null, "a", 2).length, 2);
});
