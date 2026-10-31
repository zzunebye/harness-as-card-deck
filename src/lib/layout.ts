import type { Card, Deck, Edge, Layer, Stage } from "../types.ts";
import { LAYER_ORDER } from "../types.ts";

export const WORLD_W = 1300;
// Tall enough that the longest layer pile (33 skills) keeps each card's first header line uncovered.
export const WORLD_H = 1080;
/** Card size relative to the 120x168 design the card CSS was drawn at; card text scales with it via `--u`. */
export const CARD_SCALE = 1.2;
export const CARD_W = Math.round(120 * CARD_SCALE);
export const CARD_H = Math.round(168 * CARD_SCALE);

export type Lens = "layer" | "tree" | "sprint" | "scatter";

export const LENSES: { id: Lens }[] = [
  { id: "layer" },
  { id: "tree" },
  { id: "sprint" },
  { id: "scatter" },
];

/** Scatter works for any deck; the other lenses need the deck's layers (layer, tree) or stages (sprint). */
export const lensesFor = (d: Deck) =>
  LENSES.filter((l) => (l.id === "scatter" ? true : l.id === "sprint" ? !!d.stages : !d.stages));

/** Where a deck sat on screen when it was picked: center and card width in viewport px. */
export interface Launch {
  cx: number;
  cy: number;
  w: number;
}

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

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Board {
  w: number;
  h: number;
}
export const WORLD_FRAME: Rect = { x: 0, y: 0, w: WORLD_W, h: WORLD_H };

/** Scale and offset that centre `frame` in a board, as much of it as fits. */
export function fitFrame(frame: Rect, board: Board) {
  const scale = Math.min(board.w / frame.w, board.h / frame.h);
  return { scale, x: (board.w - frame.w * scale) / 2 - frame.x * scale, y: (board.h - frame.h * scale) / 2 - frame.y * scale };
}

export const LAYER_COLUMN_X = (i: number) => (WORLD_W * (i + 0.5)) / LAYER_ORDER.length - CARD_W / 2;

/** The stacked deck is drawn this much larger than a dealt card, so the one thing to click on the empty table reads as the call to action. */
export const STACK_SCALE = 1.5;

const MAX_PILE_LAYERS = 12;
/** How many cards a pile of `cards` shows: about the square root, between 3 and 12. */
export const pileLayers = (cards: number) => Math.min(MAX_PILE_LAYERS, Math.max(3, Math.ceil(Math.sqrt(cards))));

/** Offset of visible layer `i` of `count`, in px of a 140px-wide card. Each layer below the top sinks 2px and drifts by a fixed pseudo-random offset, so the pile looks hand-stacked and renders the same every time. */
export function pileOffset(i: number, count: number) {
  const depth = count - 1 - i;
  if (depth === 0) return { x: 0, y: 0, rotate: 0 };
  return { x: Math.sin(i * 12.9) * 4.5, y: depth * 2 + Math.sin(i * 5.1) * 0.8, rotate: Math.sin(i * 7.3) * 3 };
}

/** The same pile as the lobby deck, scaled up and centered on the top card. */
function stackLayout(cards: Card[]): Map<string, Pose> {
  const count = pileLayers(cards.length);
  const unit = (CARD_W * STACK_SCALE) / 140;
  return new Map(
    cards.map((c, i) => {
      const o = pileOffset(Math.floor((i * count) / cards.length), count);
      return [c.id, pose((WORLD_W - CARD_W) / 2 + o.x * unit, (WORLD_H - CARD_H) / 2 + o.y * unit, i, { rotate: o.rotate, scale: STACK_SCALE, faceDown: true })];
    }),
  );
}

function layerLayout(cards: Card[]): Map<string, Pose> {
  const groups = byLayer(cards);
  const out = new Map<string, Pose>();
  LAYER_ORDER.forEach((layer, col) => {
    const list = groups[layer];
    const step = list.length > 1 ? Math.min(34 * CARD_SCALE, (WORLD_H - 100 - CARD_H - 8) / (list.length - 1)) : 0;
    list.forEach((c, i) => out.set(c.id, pose(LAYER_COLUMN_X(col), 100 + i * step, i)));
  });
  return out;
}

/** The phone card face is its title alone, set in this type so a stacked card's strip stays readable at the width of five columns. */
export const TITLE = { px: 16, lead: 1.1, pad: 5, width: CARD_W - 2 * 7 * CARD_SCALE - 2 };
const titleStrip = (lines: number) => TITLE.pad + lines * TITLE.px * TITLE.lead;
export const MAX_TITLE_LINES = 3;

/** Advance of each glyph of the title font (Fraunces 700 at 16px, whose optical size widens it) in em, measured in the browser. Names are lowercase slugs, so anything else gets the wider fallback. */
const GLYPH_EM: Record<string, number> = { a: 0.579, b: 0.628, c: 0.538, d: 0.639, e: 0.544, f: 0.423, g: 0.596, h: 0.661, i: 0.333, j: 0.333, k: 0.637, l: 0.339, m: 0.981, n: 0.661, o: 0.607, p: 0.642, q: 0.628, r: 0.505, s: 0.508, t: 0.413, u: 0.649, v: 0.569, w: 0.859, x: 0.574, y: 0.586, z: 0.509, "-": 0.402, " ": 0.21 };
const FALLBACK_EM = 0.9;
const textWidth = (s: string) => TITLE.px * [...s].reduce((w, ch) => w + (GLYPH_EM[ch] ?? FALLBACK_EM), 0);

/**
 * Lines `name` takes in the phone title face, by greedy wrapping of glyph advances into `width`.
 * Lines break after a space or hyphen, and a word wider than a line breaks wherever it must.
 */
export function titleLineCount(name: string, width = TITLE.width) {
  let lines = 1;
  let used = 0;
  for (const part of name.split(/(?<=[-\s])/)) {
    const word = part.trimEnd();
    const w = textWidth(word);
    if (used && used + w > width) (lines++, (used = 0));
    const wraps = Math.max(0, Math.ceil(w / width) - 1);
    lines += wraps;
    used += w - wraps * width + textWidth(part.slice(word.length));
  }
  return lines;
}

/** Title lines each card shows, at most MAX_TITLE_LINES. */
export type Titles = ReadonlyMap<string, number>;
const phoneTitles = (cards: Card[]): Titles => new Map(cards.map((c) => [c.id, Math.min(MAX_TITLE_LINES, titleLineCount(c.name))]));
const needOf = (titles: Titles) => (id: string) => titleStrip(titles.get(id) ?? 1);
/** A stacked card's strip: what its title needs, plus up to `extra` of the spare height while it stays within stepCap. */
const strip = (need: number, extra: number) => need + Math.min(extra, Math.max(0, PHONE.stepCap - need));
const PHONE = { gap: 6, edge: 6, top: 64, bottom: 8, stepCap: 34 * CARD_SCALE };

export interface Column {
  x: number;
}

export interface StageSlot {
  stage: Stage;
  xs: number[];
  y0: number;
  height: number;
  labelX: number;
  labelY: number;
}

export interface Arrangement {
  poses: Map<string, Pose>;
  /** The part of the world that fills the board. */
  frame: Rect;
  columns: Partial<Record<Layer, Column>>;
  slots: StageSlot[];
  /** Cards listed here show only their title, in at most this many lines. */
  lines: Map<string, number>;
  /** Cards show only their titles, so the board needs the phone label and face styles. */
  compact: boolean;
}

/**
 * Layer lens for a portrait board: only the occupied layers, columns one card apart, and a frame with the board's aspect.
 * Each stacked card shows the lines its own title needs. Width sets the scale until the tallest pile cannot fit those strips; spare height widens one-line strips.
 */
export function phoneLayerLayout(cards: Card[], board: Board, titles: Titles = new Map()): Arrangement {
  const need = needOf(titles);
  const groups = byLayer(cards);
  const layers = LAYER_ORDER.filter((l) => groups[l].length);
  const pitch = CARD_W + PHONE.gap;
  const contentW = (layers.length - 1) * pitch + CARD_W + 2 * PHONE.edge;
  const stacked = (list: Card[]) => list.slice(0, -1).reduce((h, c) => h + need(c.id), 0);
  const tallest = Math.max(0, ...layers.map((l) => stacked(groups[l])));
  const scale = Math.min(board.w / contentW, board.h / (PHONE.top + CARD_H + PHONE.bottom + tallest));
  const frame = { x: (contentW - board.w / scale) / 2, y: 0, w: board.w / scale, h: board.h / scale };
  const room = frame.h - PHONE.top - CARD_H - PHONE.bottom;
  const poses = new Map<string, Pose>();
  const columns: Arrangement["columns"] = {};
  const lines = new Map<string, number>();
  layers.forEach((layer, col) => {
    const list = groups[layer];
    const x = PHONE.edge + col * pitch;
    const extra = list.length > 1 ? Math.max(0, (room - stacked(list)) / (list.length - 1)) : 0;
    columns[layer] = { x };
    let y = PHONE.top;
    list.forEach((c, i) => {
      poses.set(c.id, pose(x, y, i));
      lines.set(c.id, titles.get(c.id) ?? 1);
      y += strip(need(c.id), extra);
    });
  });
  return { poses, frame, columns, slots: [], lines, compact: true };
}

interface Run {
  stage: Stage;
  cols: number;
}

/** One way to break a sprint into rows of at most `perRow` columns, and the scale it fits the board at. */
export interface SprintPlan {
  perRow: number;
  rows: Run[][];
  widest: number;
  /** World height with every stacked card showing exactly the lines its title needs. */
  height: number;
  scale: number;
}

const rowCols = (row: Run[]) => row.reduce((n, r) => n + r.cols, 0);
const runColumns = ({ stage, cols }: Run) => {
  const per = Math.ceil(stage.cards.length / cols);
  return Array.from({ length: cols }, (_, j) => stage.cards.slice(j * per, (j + 1) * per));
};
const rowColumns = (row: Run[]) => row.flatMap(runColumns);
const rowGaps = (row: Run[]) => Math.max(0, ...rowColumns(row).map((c) => c.length - 1));
const rowStack = (row: Run[], need: (id: string) => number, extra: number) =>
  Math.max(0, ...rowColumns(row).map((c) => c.slice(0, -1).reduce((h, id) => h + strip(need(id), extra), 0)));

export function phoneSprintPlan(stages: Stage[], board: Board, perRow: number, titles: Titles = new Map()): SprintPlan {
  const rows: Run[][] = [];
  for (const stage of stages) {
    const run = { stage, cols: Math.min(perRow, Math.max(1, Math.ceil(stage.cards.length / MAX_PER_COL))) };
    const last = rows.at(-1);
    if (last && rowCols(last) + run.cols <= perRow) last.push(run);
    else rows.push([run]);
  }
  const widest = Math.max(...rows.map(rowCols));
  const contentW = (widest - 1) * (CARD_W + PHONE.gap) + CARD_W + 2 * PHONE.edge;
  const need = needOf(titles);
  const height = rows.reduce((h, r) => h + PHONE.top + CARD_H + PHONE.gap + rowStack(r, need, 0), PHONE.bottom - PHONE.gap);
  return { perRow, rows, widest, height, scale: Math.min(board.w / contentW, board.h / height) };
}

/** Every column count from one to the total the stages can fill in a single row, with the scale each reaches. */
export const phoneSprintPlans = (stages: Stage[], board: Board, titles: Titles = new Map()) =>
  Array.from({ length: stages.reduce((n, s) => n + Math.max(1, Math.ceil(s.cards.length / MAX_PER_COL)), 0) }, (_, i) => phoneSprintPlan(stages, board, i + 1, titles));

/**
 * Sprint lens for a portrait board: stages in reading order, wrapped into rows of the column count that fits the biggest cards.
 * Width limits the scale for few columns and height for many, so the best count sits where they cross. Spare height widens one-line strips.
 */
export function phoneSprintLayout(stages: Stage[], board: Board, titles: Titles = new Map()): Arrangement {
  const plan = phoneSprintPlans(stages, board, titles).reduce((a, b) => (b.scale > a.scale ? b : a));
  const need = needOf(titles);
  const pitch = CARD_W + PHONE.gap;
  const contentW = (plan.widest - 1) * pitch + CARD_W + 2 * PHONE.edge;
  const frameW = board.w / plan.scale;
  const frameH = board.h / plan.scale;
  const gaps = plan.rows.reduce((n, r) => n + rowGaps(r), 0);
  const extra = gaps ? Math.max(0, (frameH - plan.height) / gaps) : 0;
  const poses = new Map<string, Pose>();
  const lines = new Map<string, number>();
  const slots: StageSlot[] = [];
  let y = 0;
  for (const row of plan.rows) {
    const height = PHONE.top + CARD_H + rowStack(row, need, extra);
    let col = (plan.widest - rowCols(row)) / 2;
    for (const run of row) {
      const xs = Array.from({ length: run.cols }, (_, j) => PHONE.edge + (col + j) * pitch);
      runColumns(run).forEach((ids, j) => {
        let cy = y + PHONE.top;
        ids.forEach((id, i) => {
          poses.set(id, pose(xs[j], cy, i));
          lines.set(id, titles.get(id) ?? 1);
          cy += strip(need(id), extra);
        });
      });
      slots.push({ stage: run.stage, xs, y0: y, height, labelX: (xs[0] + xs[run.cols - 1]) / 2, labelY: y + 6 });
      col += run.cols;
    }
    y += height + PHONE.gap;
  }
  const used = y - PHONE.gap + PHONE.bottom;
  const frame = { x: (contentW - frameW) / 2, y: Math.min(0, (used - frameH) / 2), w: frameW, h: frameH };
  return { poses, frame, columns: {}, slots, lines, compact: true };
}

/** Where a lens puts the cards. A phone board re-lays the Layer lens to its shape. The other lenses use the fixed world. */
export function arrange(cards: Card[], lens: Lens, stages: Stage[] = [], phone?: Board): Arrangement {
  if (phone && lens === "layer" && cards.length) return phoneLayerLayout(cards, phone, phoneTitles(cards));
  if (phone && lens === "sprint" && stages.length) return phoneSprintLayout(stages, phone, phoneTitles(cards));
  const columns = Object.fromEntries(LAYER_ORDER.map((l, i) => [l, { x: LAYER_COLUMN_X(i) }]));
  return { poses: lensLayout(cards, lens, stages), frame: WORLD_FRAME, columns, slots: lens === "sprint" ? stageSlots(stages) : [], lines: new Map(), compact: false };
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

export const stageX = (i: number, n: number) => (WORLD_W * (i + 0.5)) / n - CARD_W / 2;

const MAX_PER_COL = 6;
const WRAP_AT = 7;
const ROW_H = WORLD_H / 2;

/** Long stages wrap into several columns, and a wide sprint breaks into two rows at the most balanced stage boundary. */
export function stageSlots(stages: Stage[]): StageSlot[] {
  const cols = stages.map((st) => Math.max(1, Math.ceil(st.cards.length / MAX_PER_COL)));
  const total = cols.reduce((a, b) => a + b, 0);
  let split = stages.length;
  if (total >= WRAP_AT) {
    let best = Infinity;
    let head = 0;
    for (let i = 1; i < stages.length; i++) {
      head += cols[i - 1];
      const gap = Math.abs(total - 2 * head);
      if (gap < best) [best, split] = [gap, i];
    }
  }
  const rows = [stages.slice(0, split), stages.slice(split)].filter((r) => r.length);
  const rowCols = rows.map((_, r) => cols.slice(r ? split : 0, r ? undefined : split).reduce((a, b) => a + b, 0));
  let idx = 0;
  return rows.flatMap((row, r) => {
    const y0 = rows.length > 1 ? r * ROW_H : 0;
    const height = rows.length > 1 ? ROW_H : WORLD_H;
    let k = 0;
    return row.map((stage) => {
      const xs = Array.from({ length: cols[idx] }, (_, j) => stageX(k + j, rowCols[r]));
      k += cols[idx++];
      return { stage, xs, y0, height, labelX: (xs[0] + xs[xs.length - 1]) / 2, labelY: y0 + 40 };
    });
  });
}

function sprintLayout(stages: Stage[]): Map<string, Pose> {
  const out = new Map<string, Pose>();
  for (const { stage, xs, y0, height } of stageSlots(stages)) {
    const perCol = Math.ceil(stage.cards.length / xs.length);
    const step = perCol > 1 ? Math.min(CARD_H * 0.8, (height - 100 - CARD_H - 40) / (perCol - 1)) : 0;
    stage.cards.forEach((id, i) => out.set(id, pose(xs[Math.floor(i / perCol)], y0 + 100 + (i % perCol) * step, i % perCol)));
  }
  return out;
}

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h ^ (h >>> 15)) >>> 0;
};
const unit = (id: string, salt: string) => hash(id + salt) / 0xffffffff - 0.5;

// Jittered grid with random tilt: cards look tossed on the table but stay deterministic and mostly visible.
function scatterLayout(cards: Card[]): Map<string, Pose> {
  const cols = Math.ceil(Math.sqrt((cards.length * WORLD_W) / WORLD_H));
  const rows = Math.ceil(cards.length / cols);
  const cw = (WORLD_W - 80) / cols;
  const ch = (WORLD_H - 80) / rows;
  const order = [...cards].sort((a, b) => hash(a.id) - hash(b.id));
  return new Map(
    order.map((c, i) => {
      const x = 40 + (i % cols) * cw + (cw - CARD_W) / 2 + unit(c.id, "x") * (cw - CARD_W * 0.7);
      const y = 40 + Math.floor(i / cols) * ch + (ch - CARD_H) / 2 + unit(c.id, "y") * (ch - CARD_H * 0.7);
      return [c.id, pose(x, y, i, { rotate: unit(c.id, "r") * 44 })];
    }),
  );
}

export function lensLayout(cards: Card[], lens: Lens, stages: Stage[] = []): Map<string, Pose> {
  if (lens === "sprint" && stages.length) return sprintLayout(stages);
  if (lens === "scatter") return scatterLayout(cards);
  return lens === "tree" ? treeLayout(cards) : layerLayout(cards);
}

/** The call-to-action pill under the pile, in world px. */
export const STACK_CTA = { w: 320, gap: 60, h: 96 };
const PILE_SHARE = 0.4;

function bounds(poses: Iterable<Pose>): Rect {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of poses) {
    const [hw, hh] = [(CARD_W * p.scale) / 2, (CARD_H * p.scale) / 2];
    const [c, s] = [Math.abs(Math.cos((p.rotate * Math.PI) / 180)), Math.abs(Math.sin((p.rotate * Math.PI) / 180))];
    const [ex, ey] = [hw * c + hh * s, hw * s + hh * c];
    x0 = Math.min(x0, p.x + CARD_W / 2 - ex);
    x1 = Math.max(x1, p.x + CARD_W / 2 + ex);
    y0 = Math.min(y0, p.y + CARD_H / 2 - ey);
    y1 = Math.max(y1, p.y + CARD_H / 2 + ey);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * The face-down pile and the frame that shows it. On a phone board the pile fills PILE_SHARE of the width,
 * or less when pile plus call to action would not fit the height, and both sit centred in the board.
 */
export function pileArrangement(cards: Card[], phone?: Board): { poses: Map<string, Pose>; frame: Rect } {
  const poses = stackLayout(cards);
  if (!phone) return { poses, frame: WORLD_FRAME };
  const pile = bounds(poses.values());
  const contentH = WORLD_H / 2 + (CARD_H * STACK_SCALE) / 2 + STACK_CTA.gap + STACK_CTA.h - pile.y;
  const scale = Math.min((PILE_SHARE * phone.w) / pile.w, phone.h / contentH);
  const [w, h] = [phone.w / scale, phone.h / scale];
  return { poses, frame: { x: pile.x + pile.w / 2 - w / 2, y: pile.y + contentH / 2 - h / 2, w, h } };
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
    const step = CARD_H * 0.655 * s + 30;
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
    const ringStep = CARD_H * 0.655 * scale + 30;
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

const FOCUS_PAD = 36;

/**
 * Phone frame for a focused card: the box around it and the cards it links to, so a narrow board zooms in on them
 * instead of fitting the whole world. Never narrower than the focus card with room for a neighbour on each side.
 */
export function focusFrame(poses: Map<string, Pose>, focusId: string, related: Set<string>): Rect {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const id of [focusId, ...related]) {
    const p = poses.get(id);
    if (!p) continue;
    const b = cardBox(p);
    x0 = Math.min(x0, b.x - b.hw);
    x1 = Math.max(x1, b.x + b.hw);
    y0 = Math.min(y0, b.y - b.hh);
    y1 = Math.max(y1, b.y + b.hh);
  }
  const focus = cardBox(poses.get(focusId)!);
  const minW = focus.hw * 2 * 1.6;
  const minH = focus.hh * 2 * 1.3;
  const w = Math.max(x1 - x0, minW) + FOCUS_PAD * 2;
  const h = Math.max(y1 - y0, minH) + FOCUS_PAD * 2;
  return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h };
}

/** The same poses pushed a full table width to one side: -1 is off the left edge, 1 off the right. */
export function offstage(poses: Map<string, Pose>, side: -1 | 1): Map<string, Pose> {
  const shift = side * (WORLD_W + CARD_W * STACK_SCALE);
  return new Map([...poses].map(([id, p]) => [id, { ...p, x: p.x + shift, rotate: p.rotate + side * 8 }]));
}

export const cardCenter = (p: Pose) => ({ x: p.x + CARD_W / 2, y: p.y + CARD_H / 2 });

export const cardBox = (p: Pose) => ({ ...cardCenter(p), hw: (CARD_W * p.scale) / 2, hh: (CARD_H * p.scale) / 2 });
export type CardBox = ReturnType<typeof cardBox>;

/** Where the ray from a box's center toward `target` leaves the box. Returns the center when the target is inside the box or on its center. */
export function clipToBorder(box: CardBox, target: { x: number; y: number }): { x: number; y: number } {
  const dx = target.x - box.x;
  const dy = target.y - box.y;
  const t = Math.min(dx === 0 ? Infinity : box.hw / Math.abs(dx), dy === 0 ? Infinity : box.hh / Math.abs(dy));
  if (!Number.isFinite(t) || t >= 1) return { x: box.x, y: box.y };
  return { x: box.x + dx * t, y: box.y + dy * t };
}
