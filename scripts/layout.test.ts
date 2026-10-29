import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { CARD_H, CARD_W, LAYER_COLUMN_X, TITLE, WORLD_FRAME, WORLD_H, WORLD_W, arrange, fitFrame, lensLayout, phoneLayerLayout, phoneSprintLayout, phoneSprintPlans } from "../src/lib/layout.ts";
import { LAYER_ORDER, type Card, type Layer, type Stage } from "../src/types.ts";

const deck = (counts: Partial<Record<Layer, number>>): Card[] =>
  LAYER_ORDER.flatMap((layer) =>
    Array.from({ length: counts[layer] ?? 0 }, (_, i) => ({ id: `${layer}:${i}`, layer, name: `n${String(i).padStart(2, "0")}`, title: "", description: "", path: "", out: 0, in: 0 })),
  );
const pstack = deck({ router: 1, playbook: 23, skill: 33, principle: 24, agent: 2 });

test("without a phone board every lens keeps its fixed-world poses and frame", () => {
  for (const lens of ["layer", "tree", "scatter"] as const) {
    const a = arrange(pstack, lens);
    assert.deepEqual(a.poses, lensLayout(pstack, lens));
    assert.equal(a.frame, WORLD_FRAME);
    assert.equal(a.compact, false);
  }
});

test("the desktop Layer poses match the original column formula", () => {
  const poses = arrange(pstack, "layer").poses;
  LAYER_ORDER.forEach((layer, col) => {
    const list = pstack.filter((c) => c.layer === layer);
    const step = list.length > 1 ? Math.min(34 * 1.2, (WORLD_H - 100 - CARD_H - 8) / (list.length - 1)) : 0;
    list.forEach((c, i) => {
      const p = poses.get(c.id)!;
      assert.equal(p.x, (WORLD_W * (col + 0.5)) / 5 - CARD_W / 2);
      assert.equal(p.x, LAYER_COLUMN_X(col));
      assert.equal(p.y, 100 + i * step);
    });
  });
});

test("fitting the world frame equals the original min(w/WORLD_W, h/WORLD_H) fit", () => {
  for (const [w, h] of [[1280, 800], [1920, 1080], [390, 744], [700, 900]]) {
    const scale = Math.min(w / WORLD_W, h / WORLD_H);
    assert.deepEqual(fitFrame(WORLD_FRAME, { w, h }), { scale, x: (w - WORLD_W * scale) / 2, y: (h - WORLD_H * scale) / 2 });
  }
});

test("the other lenses ignore a phone board", () => {
  assert.deepEqual(arrange(pstack, "tree", [], { w: 390, h: 744 }).poses, lensLayout(pstack, "tree"));
});

const boards = [{ w: 390, h: 744 }, { w: 360, h: 640 }, { w: 430, h: 832 }];

test("a phone board is filled by the frame and the whole pile is inside it", () => {
  for (const board of boards) {
    const a = phoneLayerLayout(pstack, board);
    const fit = fitFrame(a.frame, board);
    assert.ok(Math.abs(a.frame.w / a.frame.h - board.w / board.h) < 1e-9);
    for (const p of a.poses.values()) {
      assert.ok(p.x >= a.frame.x && p.x + CARD_W <= a.frame.x + a.frame.w + 1e-9);
      assert.ok(p.y + CARD_H <= a.frame.h + 1e-9);
    }
    assert.ok(fit.scale * CARD_W > board.w / 5 - 12, "cards are about a fifth of the width");
  }
});

test("on a portrait phone the five columns' width limits the scale, and every pile keeps a title strip per card", () => {
  for (const board of boards) {
    const a = phoneLayerLayout(pstack, board);
    const scale = fitFrame(a.frame, board).scale;
    assert.ok(Math.abs(scale - board.w / (4 * (CARD_W + 6) + CARD_W + 12)) < 1e-9);
    for (const layer of LAYER_ORDER) {
      const ys = pstack.filter((c) => c.layer === layer).map((c) => a.poses.get(c.id)!.y);
      const step = ys.length > 1 ? ys[1] - ys[0] : Infinity;
      assert.ok(step >= TITLE.pad + a.lines.get(pstack.find((c) => c.layer === layer)!.id)! * TITLE.px * TITLE.lead - 1e-9, `${layer} step ${step}`);
    }
  }
});

test("a short board is limited by height instead and still keeps one-line strips", () => {
  const board = { w: 430, h: 420 };
  const a = phoneLayerLayout(pstack, board);
  const scale = fitFrame(a.frame, board).scale;
  assert.ok(scale < board.w / (4 * (CARD_W + 6) + CARD_W + 12));
  const ys = pstack.filter((c) => c.layer === "skill").map((c) => a.poses.get(c.id)!.y);
  assert.ok(ys[1] - ys[0] >= TITLE.pad + TITLE.px * TITLE.lead - 1e-9);
  assert.ok(ys.at(-1)! + CARD_H <= a.frame.h + 1e-9);
});

test("a deck with one layer lays out one column and a missing layer gets no column", () => {
  const a = phoneLayerLayout(deck({ skill: 33 }), { w: 390, h: 744 });
  assert.deepEqual(Object.keys(a.columns), ["skill"]);
});

const sprint = (counts: number[]) => {
  let n = 0;
  const stages: Stage[] = counts.map((c, i) => ({ id: `s${i}`, label: `S${i}`, utility: i === counts.length - 1, cards: Array.from({ length: c }, () => `skill:${n++}`) }));
  const cards: Card[] = stages.flatMap((s) => s.cards).map((id) => ({ id, layer: "skill", name: id, title: "", description: "", path: "", out: 0, in: 0 }));
  return { cards, stages };
};
const gstack = sprint([1, 5, 3, 4, 3, 5, 4, 8]);
const digest = (v: unknown) => createHash("sha1").update(JSON.stringify(v)).digest("hex").slice(0, 12);

test("the desktop Sprint poses and stage slots are byte-identical to the original two-row formula", () => {
  const a = arrange(gstack.cards, "sprint", gstack.stages);
  assert.equal(digest([...a.poses]), "6e267bef9a64");
  assert.equal(digest(a.slots.map(({ stage, xs, y0, height, labelX }) => ({ id: stage.id, xs, y0, height, labelX }))), "a273c20f8a8c");
  assert.deepEqual(a.slots.map((s) => s.labelY), a.slots.map((s) => s.y0 + 40));
  assert.equal(a.frame, WORLD_FRAME);
  assert.equal(a.compact, false);
  assert.equal(a.lines.size, 0);
  assert.deepEqual(arrange(gstack.cards, "sprint", gstack.stages, undefined).poses, lensLayout(gstack.cards, "sprint", gstack.stages));
  assert.deepEqual(arrange(gstack.cards, "layer").slots, []);
});

const phones = [{ w: 390, h: 744 }, { w: 360, h: 640 }, { w: 430, h: 832 }];
const decks = [gstack, sprint([1, 1, 1, 3, 2, 2, 2, 3]), sprint([4, 6, 2, 3]), sprint([5, 4, 5, 5, 5, 5, 7])];

test("the phone Sprint takes the column count with the largest scale, ties to fewer columns", () => {
  for (const board of phones) for (const d of decks) {
    const plans = phoneSprintPlans(d.stages, board);
    const best = Math.max(...plans.map((p) => p.scale));
    const a = phoneSprintLayout(d.stages, board);
    assert.ok(Math.abs(fitFrame(a.frame, board).scale - best) < 1e-9);
    assert.ok(plans.find((p) => p.scale === best)!.perRow <= Math.min(...plans.filter((p) => best - p.scale < 1e-12).map((p) => p.perRow)));
  }
});

test("gstack on a 390x744 board picks 3 columns, limited by height, and beats the fixed world 2.3 times over", () => {
  const board = { w: 390, h: 744 };
  const plans = phoneSprintPlans(gstack.stages, board);
  assert.deepEqual(plans.slice(0, 5).map((p) => [p.perRow, p.rows.length]), [[1, 8], [2, 5], [3, 3], [4, 3], [5, 2]]);
  assert.equal(plans.reduce((a, b) => (b.scale > a.scale ? b : a)).perRow, 3);
  assert.ok(fitFrame(phoneSprintLayout(gstack.stages, board).frame, board).scale > 2.3 * fitFrame(WORLD_FRAME, board).scale);
});

test("the phone Sprint keeps every card and label inside its frame, each stage labelled once, stacks never hiding a title", () => {
  for (const board of phones) for (const d of decks) {
    const a = phoneSprintLayout(d.stages, board);
    assert.equal(a.poses.size, d.cards.length);
    assert.ok(a.compact);
    for (const p of a.poses.values()) {
      assert.ok(p.x >= a.frame.x - 1e-9 && p.x + CARD_W <= a.frame.x + a.frame.w + 1e-9);
      assert.ok(p.y + CARD_H <= a.frame.y + a.frame.h + 1e-9 && p.y >= a.frame.y - 1e-9);
    }
    assert.deepEqual(a.slots.map((s) => s.stage.id), d.stages.map((s) => s.id));
    for (const s of a.slots) {
      const ys = s.stage.cards.map((id) => a.poses.get(id)!.y);
      assert.ok(s.labelY < Math.min(...ys), "label sits above its cards");
      const col = (id: string) => a.poses.get(id)!.x;
      const first = s.stage.cards.filter((id) => col(id) === col(s.stage.cards[0]));
      if (first.length > 1) assert.ok(a.poses.get(first[1])!.y - a.poses.get(first[0])!.y >= TITLE.pad + a.lines.get(first[0])! * TITLE.px * TITLE.lead - 1e-9);
    }
  }
});

test("cards of different columns or rows never share a spot", () => {
  const a = phoneSprintLayout(gstack.stages, { w: 390, h: 744 });
  const seen = new Set<string>();
  for (const p of a.poses.values()) {
    const key = `${p.x}|${p.y}`;
    assert.ok(!seen.has(key));
    seen.add(key);
  }
});
