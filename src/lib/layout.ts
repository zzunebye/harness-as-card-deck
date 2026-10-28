import type { Card, Edge, Layer } from "../types.ts";
import { LAYER_ORDER } from "../types.ts";

export const WORLD_W = 1300;
export const WORLD_H = 1000;
export const CARD_W = 120;
export const CARD_H = 168;

export type Lens = "layer" | "tree";

export interface Pose {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  z: number;
  dim: boolean;
  muted: boolean;
  faceDown: boolean;
}

const byLayer = (cards: Card[]) => {
  const groups = Object.fromEntries(LAYER_ORDER.map((l) => [l, [] as Card[]])) as Record<Layer, Card[]>;
  for (const c of cards) groups[c.layer].push(c);
  for (const l of LAYER_ORDER) groups[l].sort((a, b) => a.name.localeCompare(b.name));
  return groups;
};

const pose = (x: number, y: number, z: number, extra: Partial<Pose> = {}): Pose => ({
  x,
  y,
  rotate: 0,
  scale: 1,
  z,
  dim: false,
  muted: false,
  faceDown: false,
  ...extra,
});

export const LAYER_COLUMN_X = (i: number) => (WORLD_W * (i + 0.5)) / LAYER_ORDER.length - CARD_W / 2;

function stackLayout(cards: Card[]): Map<string, Pose> {
  return new Map(
    cards.map((c, i) => [
      c.id,
      pose((WORLD_W - CARD_W) / 2 + (i % 3) * 0.6, (WORLD_H - CARD_H) / 2 - i * 0.35, i, {
        rotate: ((i * 37) % 7) - 3,
        faceDown: true,
      }),
    ]),
  );
}

function layerLayout(cards: Card[]): Map<string, Pose> {
  const groups = byLayer(cards);
  const out = new Map<string, Pose>();
  LAYER_ORDER.forEach((layer, col) => {
    const list = groups[layer];
    const step = list.length > 1 ? Math.min(34, (WORLD_H - 100 - CARD_H - 20) / (list.length - 1)) : 0;
    list.forEach((c, i) => out.set(c.id, pose(LAYER_COLUMN_X(col), 100 + i * step, i)));
  });
  return out;
}

function treeLayout(cards: Card[]): Map<string, Pose> {
  const groups = byLayer(cards);
  const rows: [Layer, number][] = [
    ["router", 20],
    ["playbook", 250],
    ["skill", 480],
    ["principle", 710],
  ];
  const out = new Map<string, Pose>();
  for (const [layer, y] of rows) {
    const list = groups[layer];
    const span = Math.min(WORLD_W - 200, (list.length - 1) * (CARD_W + 8));
    const step = list.length > 1 ? span / (list.length - 1) : 0;
    const x0 = (WORLD_W - CARD_W - span) / 2;
    list.forEach((c, i) => out.set(c.id, pose(x0 + i * step, y, i)));
  }
  groups.agent.forEach((c, i) => out.set(c.id, pose(WORLD_W - 190 - i * 30, 20 + i * 20, i)));
  return out;
}

export function lensLayout(cards: Card[], lens: Lens): Map<string, Pose> {
  return lens === "layer" ? layerLayout(cards) : treeLayout(cards);
}

export function deckLayout(cards: Card[]) {
  return stackLayout(cards);
}

export const FOCUS_CENTER = { x: 600, y: WORLD_H / 2 };
const FOCUS_SCALE = 1.7;
const RING_START = 330;
const EDGE_FOCUS_X = 220;
const OUT_SPAN = (Math.PI * 140) / 180;
const IN_SPAN = (Math.PI * 80) / 180;
const IN_SCALE = 0.85;

export function focusLayout(
  base: Map<string, Pose>,
  cards: Card[],
  edges: Edge[],
  focusId: string,
): { poses: Map<string, Pose>; related: Set<string>; inflow: Set<string> } {
  const outflow = new Set<string>();
  const inflow = new Set<string>();
  for (const e of edges) {
    if (e.from === focusId) outflow.add(e.to);
    if (e.to === focusId) inflow.add(e.from);
  }
  for (const id of outflow) inflow.delete(id);
  const related = new Set([...outflow, ...inflow]);

  const byId = new Map(cards.map((c) => [c.id, c]));
  const degree = (id: string) => byId.get(id)!.in + byId.get(id)!.out;
  const layerRank = (id: string) => LAYER_ORDER.indexOf(byId.get(id)!.layer);

  const ringsFor = (count: number, s: number, span: number) => {
    if (!count) return { caps: [], step: 0, reach: 0 };
    const spacing = (CARD_W + 14) * s;
    const step = 110 * s + 30;
    const caps: number[] = [];
    for (let left = count, r = RING_START; left > 0; r += step) {
      const cap = Math.max(3, Math.floor((r * span) / spacing));
      caps.push(cap);
      left -= cap;
    }
    return { caps, step, reach: RING_START + (caps.length - 1) * step + (CARD_W * s) / 2 };
  };
  const outSolo = outflow.size > 0 && inflow.size === 0;
  const inSolo = inflow.size > 0 && outflow.size === 0;
  const focusX = outSolo ? EDGE_FOCUS_X : inSolo ? WORLD_W - EDGE_FOCUS_X : FOCUS_CENTER.x;
  const fits = (s: number) =>
    ringsFor(inflow.size, s * IN_SCALE, IN_SPAN).reach <= focusX - 20 && ringsFor(outflow.size, s, OUT_SPAN).reach <= WORLD_W - focusX - 20;
  const s = [1, 0.85, 0.72, 0.62].find(fits) ?? 0.5;

  const poses = new Map<string, Pose>();
  for (const [id, p] of base) poses.set(id, { ...p, dim: true, muted: false, scale: 1, rotate: 0, z: 0, faceDown: false });

  const fan = (ids: Set<string>, side: 1 | -1, span: number, scale: number) => {
    const spacing = (CARD_W + 14) * scale;
    const ringStep = 110 * scale + 30;
    const rings: string[][] = [];
    const rest = [...ids].sort((a, b) => degree(b) - degree(a));
    for (let r = RING_START; rest.length; r += ringStep) {
      rings.push(rest.splice(0, Math.max(3, Math.floor((r * span) / spacing))));
    }
    rings.forEach((ring, k) => {
      const radius = RING_START + k * ringStep;
      ring.sort((a, b) => layerRank(a) - layerRank(b) || byId.get(a)!.name.localeCompare(byId.get(b)!.name));
      ring.forEach((id, i) => {
        const t = ring.length === 1 ? 0 : (i / (ring.length - 1) - 0.5) * span;
        const cx = focusX + side * Math.cos(t) * radius;
        const cy = Math.min(WORLD_H - CARD_H * scale * 0.6, Math.max(CARD_H * scale * 0.6, FOCUS_CENTER.y + Math.sin(t) * radius));
        poses.set(id, { x: cx - CARD_W / 2, y: cy - CARD_H / 2, rotate: (side * (t * 180)) / Math.PI / 8, scale, z: 50 + i, dim: false, muted: side === -1, faceDown: false });
      });
    });
  };
  const grid = (ids: Set<string>, side: 1 | -1) => {
    const sorted = [...ids].sort((a, b) => layerRank(a) - layerRank(b) || byId.get(a)!.name.localeCompare(byId.get(b)!.name));
    const near = focusX + side * ((CARD_W * FOCUS_SCALE) / 2 + 50);
    const width = Math.abs((side > 0 ? WORLD_W - 20 : 20) - near);
    const height = WORLD_H - 40;
    const cell = (k: number) => ({ w: (CARD_W + 16) * k, h: (CARD_H + 16) * k });
    const capacity = (k: number) => Math.floor(width / cell(k).w) * Math.floor(height / cell(k).h);
    const scale = [1.5, 1.3, 1.15, 1, 0.85, 0.72, 0.62, 0.5].find((k) => capacity(k) >= sorted.length) ?? 0.5;
    const rows = Math.max(1, Math.min(Math.floor(height / cell(scale).h), sorted.length));
    const cols = Math.ceil(sorted.length / rows);
    const perRow = Math.ceil(sorted.length / cols);
    const cw = Math.min(width / cols, cell(scale).w * 1.5);
    const ch = Math.min(height / perRow, cell(scale).h * 1.4);
    sorted.forEach((id, i) => {
      const col = Math.floor(i / perRow);
      const row = i % perRow;
      const cx = near + side * (cw * (col + 0.5));
      const cy = WORLD_H / 2 + (row - (perRow - 1) / 2) * ch;
      poses.set(id, { x: cx - CARD_W / 2, y: cy - CARD_H / 2, rotate: 0, scale, z: 50 + i, dim: false, muted: side === -1, faceDown: false });
    });
  };
  if (outSolo) grid(outflow, 1);
  else if (inSolo) grid(inflow, -1);
  else {
    fan(outflow, 1, OUT_SPAN, s);
    fan(inflow, -1, IN_SPAN, s * IN_SCALE);
  }

  poses.set(focusId, {
    x: focusX - CARD_W / 2,
    y: FOCUS_CENTER.y - CARD_H / 2,
    rotate: 0,
    scale: FOCUS_SCALE,
    z: 100,
    dim: false,
    muted: false,
    faceDown: false,
  });
  return { poses, related, inflow };
}

export const cardCenter = (p: Pose) => ({ x: p.x + CARD_W / 2, y: p.y + CARD_H / 2 });
