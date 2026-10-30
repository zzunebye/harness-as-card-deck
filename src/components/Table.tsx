import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EDGE_INFO, LAYER_INFO, LAYER_ORDER, type Deck, type Edge, type Flow } from "../types.ts";
import {
  CARD_H,
  WORLD_H,
  WORLD_W,
  cardBox,
  cardCenter,
  clipToBorder,
  type CardBox,
  WORLD_FRAME,
  arrange,
  pileArrangement,
  STACK_CTA,
  fitFrame,
  focusLayout,
  offstage,
  CARD_W,
  STACK_SCALE,
  type Board,
  type Launch,
  type Lens,
  type Pose,
} from "../lib/layout.ts";
import { CardView } from "./Card.tsx";
import { useInteraction } from "../context.ts";
import { useT } from "../i18n/index.ts";
import { backStyle } from "../lib/backs.ts";
import { usePanZoom, type Fit } from "../lib/usePanZoom.ts";

interface EdgePath {
  key: string;
  d: string;
  color: string;
  arrows: { x: number; y: number; angle: number }[];
  dashed?: boolean;
  badge?: { x: number; y: number; n: number };
  age?: number;
}

const LINE_BY_AGE = [
  { opacity: 1, width: 3, halo: 9 },
  { opacity: 0.45, width: 2, halo: 5 },
  { opacity: 0.25, width: 1.5, halo: 4 },
];
const BADGE_OPACITY = [1, 0.7, 0.55];
const OLD_BADGE_OPACITY = 0.3;
const BADGE_HISTORY = 5;

export interface Route {
  flow: Flow;
  stepIndex: number;
}

const ROUTE_COLOR = EDGE_INFO["routes-to"].color;

function curve(a: CardBox, b: CardBox) {
  const mx = (a.x + b.x) / 2 - (b.y - a.y) * 0.12;
  const my = (a.y + b.y) / 2 + (b.x - a.x) * 0.12;
  const control = { x: mx, y: my };
  let from = clipToBorder(a, control);
  let to = clipToBorder(b, control);
  if ((to.x - from.x) * (b.x - a.x) + (to.y - from.y) * (b.y - a.y) <= 0) [from, to] = [a, b];
  const at = (t: number, toward = false) => {
    const u = 1 - t;
    const dx = 2 * u * (mx - from.x) + 2 * t * (to.x - mx);
    const dy = 2 * u * (my - from.y) + 2 * t * (to.y - my);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + (toward ? 180 : 0);
    return { x: u * u * from.x + 2 * u * t * mx + t * t * to.x, y: u * u * from.y + 2 * u * t * my + t * t * to.y, angle };
  };
  return { d: `M${from.x},${from.y} Q${mx},${my} ${to.x},${to.y}`, at };
}

const Edges = memo(function Edges({ edges, fast }: { edges: EdgePath[]; fast: boolean }) {
  const still = useReducedMotion();
  const [wait, span, arrow] = fast ? [0.1, 0.3, 0.3] : [0.35, 0.5, 0.6];
  return (
    <svg className="edges" width={WORLD_W} height={WORLD_H}>
      {edges.map((e, i) => {
        const transition = still ? { duration: 0 } : { delay: wait + i * 0.012, duration: span };
        if (e.dashed) {
          // Animating pathLength would overwrite strokeDasharray, so these fade in instead.
          return (
            <motion.path key={e.key} d={e.d} fill="none" stroke={e.color} strokeWidth={2} strokeLinecap="round" strokeDasharray="6 8" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={transition} />
          );
        }
        const age = e.age ?? 0;
        const line = LINE_BY_AGE[age];
        const fade = still ? { duration: 0 } : age === 0 ? transition : { duration: 0.3 };
        const draw = (width: number) => ({
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: line?.opacity ?? 0, strokeWidth: width },
          transition: fade,
        });
        const badgeOpacity = BADGE_OPACITY[age] ?? (age < BADGE_HISTORY ? OLD_BADGE_OPACITY : 0);
        return (
          <g key={e.key}>
            <motion.path d={e.d} fill="none" stroke={e.color} strokeLinecap="round" strokeOpacity={0.18} {...draw(line?.halo ?? 0)} />
            <motion.path d={e.d} fill="none" stroke={e.color} strokeLinecap="round" strokeOpacity={0.9} {...draw(line?.width ?? 0)} />
            {e.arrows.map((a, k) => (
              <motion.path
                key={k}
                d="M-5,-4 L5,0 L-5,4 Z"
                fill={e.color}
                transform={`translate(${a.x},${a.y}) rotate(${a.angle})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: line ? line.opacity : 0 }}
                transition={still ? { duration: 0 } : age === 0 ? { delay: arrow + i * 0.012 } : { duration: 0.3 }}
              />
            ))}
            {e.badge && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: badgeOpacity }} transition={still ? { duration: 0 } : age === 0 ? { delay: arrow + i * 0.012 } : { duration: 0.3 }}>
                <circle cx={e.badge.x} cy={e.badge.y} r={15} fill={ROUTE_COLOR} stroke="#0a0f0d" strokeWidth={3} />
                <text x={e.badge.x} y={e.badge.y} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={700} fill="#0a0f0d">
                  {e.badge.n}
                </text>
              </motion.g>
            )}
          </g>
        );
      })}
    </svg>
  );
});

export type Phase = "stack" | "shuffling" | "dealt";

interface Props {
  deck: Deck;
  lens: Lens;
  phase: Phase;
  selected: string | null;
  route?: Route | null;
  flow: { in: boolean; out: boolean };
  onFlow: (update: (f: { in: boolean; out: boolean }) => { in: boolean; out: boolean }) => void;
  /** Where the deck sat in the lobby, when the Table opens from a pick. */
  launch: Launch | null;
  /** The deck is being swapped out: its cards slide off to the left. */
  leaving: boolean;
  /** The deck replaces another: its pile slides in from the right. */
  enter: boolean;
  onDeal(): void;
  onBackground(): void;
  /** Right-hand px covered by the overlay panel; the world fits into the rest. */
  inset: number;
  /** Phone: picks and edge draws run on a quicker spring so they finish before the panel covers the board. */
  fast: boolean;
}

const NO_FIT: Fit = { scale: 1, x: 0, y: 0 };

export function Table({ deck, lens, phase, selected, route, flow, onFlow, launch, leaving, enter, onDeal, onBackground, inset, fast }: Props) {
  const t = useT();
  const { hovered } = useInteraction();
  const wrap = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  // Null until measured. The world mounts after that, so its first paint is already fitted and cards can start from true world coordinates.
  const [board, setBoard] = useState<Board | null>(null);
  const [deckHot, setDeckHot] = useState(false);
  const hotProps = {
    onMouseEnter: () => setDeckHot(true),
    onMouseLeave: () => setDeckHot(false),
    onFocus: () => setDeckHot(true),
    onBlur: () => setDeckHot(false),
  };

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const next = { w: Math.max(el.clientWidth - inset, 0), h: el.clientHeight };
      setBoard((b) => (b && b.w === next.w && b.h === next.h ? b : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [inset]);

  const pile = useMemo(() => pileArrangement(deck.cards, fast ? (board ?? undefined) : undefined), [deck, fast, board]);
  const stack = pile.poses;
  const arrangement = useMemo(() => arrange(deck.cards, lens, deck.stages, fast ? (board ?? undefined) : undefined), [deck, lens, fast, board]);
  const base = arrangement.poses;

  const edgesShown = useMemo(
    () => deck.edges.filter((e) => (e.from === selected && flow.out) || (e.to === selected && flow.in)),
    [deck.edges, selected, flow],
  );

  const focus = useMemo(
    () => (selected && phase === "dealt" ? focusLayout(base, deck.cards, edgesShown, selected) : null),
    [base, deck, edgesShown, selected, phase],
  );

  const settled = phase === "dealt" && !focus ? arrangement : null;
  const fit = useMemo(() => (board ? fitFrame(settled?.frame ?? (phase === "dealt" ? WORLD_FRAME : pile.frame), board) : null), [board, settled?.frame, phase, pile.frame]);
  const { view, live, panning, zoomBy, reset, reveal, bind } = usePanZoom(wrap, fit ?? NO_FIT, inset, `${lens}|${selected}|${phase}`);

  // Each card starts as the stack pose moved and scaled so the pile sits where the lobby deck was.
  const starts = useMemo(() => {
    const box = wrap.current?.getBoundingClientRect();
    if (still) return null;
    if (enter && !launch) return new Map([...offstage(stack, 1)].map(([id, p]) => [id, { x: p.x, y: p.y, rotate: p.rotate, scale: p.scale }]));
    if (!fit || !launch || !box) return null;
    const cx = (launch.cx - box.left - fit.x) / fit.scale;
    const cy = (launch.cy - box.top - fit.y) / fit.scale;
    // The lobby shows the pile's top card, so that card anchors the move.
    const top = stack.get(deck.cards.at(-1)!.id)!;
    const s = launch.w / (CARD_W * top.scale * fit.scale);
    return new Map(
      [...stack].map(([id, p]) => [
        id,
        { x: cx + (p.x - top.x) * s - CARD_W / 2, y: cy + (p.y - top.y) * s - CARD_H / 2, rotate: p.rotate, scale: p.scale * s },
      ]),
    );
  }, [fit, launch, enter, still, stack, deck]);

  const placed: Map<string, Pose> =
    phase === "dealt"
      ? (focus?.poses ?? base)
      : new Map(
          [...stack].map(([id, p]) => [
            id,
            phase === "shuffling" ? { ...p, x: p.x + (Math.sin(p.z * 12.9) * 180), rotate: p.rotate + Math.sin(p.z * 7.3) * 25 } : p,
          ]),
        );

  const routed = route && phase === "dealt" && !focus && !leaving ? route : null;
  const routeIds = useMemo(() => {
    if (!routed) return null;
    const steps = routed.flow.steps.map((s) => s.card);
    return { visited: new Set(steps.slice(0, routed.stepIndex + 1)), current: steps[routed.stepIndex] };
  }, [routed]);

  const poses = leaving
    ? offstage(placed, -1)
    : routeIds
      ? new Map([...placed].map(([id, p]) => [id, { ...p, dim: !routeIds.visited.has(id) }]))
      : placed;

  // Keyboard model: one tab stop on the board, arrow keys move to the nearest card in that direction.
  const interactive = useMemo(
    () => [...poses].filter(([, p]) => !p.dim && !p.faceDown).map(([id, p]) => ({ id, ...cardCenter(p) })),
    [poses],
  );
  const [tabbable, setTabbable] = useState<string | null>(null);
  const tabId = interactive.some((c) => c.id === tabbable)
    ? tabbable
    : (interactive.find((c) => c.id === selected) ?? interactive.reduce<(typeof interactive)[number] | null>((a, c) => (!a || c.x < a.x || (c.x === a.x && c.y < a.y) ? c : a), null))?.id ?? null;

  const navigate = useCallback(
    (id: string, key: string) => {
      const cur = interactive.find((c) => c.id === id);
      if (!cur) return;
      let best: (typeof interactive)[number] | undefined;
      if (key === "Home" || key === "End") {
        const sorted = [...interactive].sort((a, b) => a.x - b.x || a.y - b.y);
        best = key === "Home" ? sorted[0] : sorted.at(-1);
      } else {
        const horizontal = key === "ArrowLeft" || key === "ArrowRight";
        const sign = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
        let bestScore = Infinity;
        for (const c of interactive) {
          const along = ((horizontal ? c.x - cur.x : c.y - cur.y)) * sign;
          if (c.id === id || along <= 1) continue;
          const score = along + 2 * Math.abs(horizontal ? c.y - cur.y : c.x - cur.x);
          if (score < bestScore) [best, bestScore] = [c, score];
        }
      }
      if (!best) return;
      setTabbable(best.id);
      reveal(best.x, best.y);
      wrap.current?.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(best.id)}"]`)?.focus({ preventScroll: true });
    },
    [interactive, reveal],
  );

  const routeEdges = useMemo<EdgePath[]>(() => {
    if (!routed) return [];
    const centers = (id: string) => cardBox(base.get(id)!);
    const { steps, later } = routed.flow;
    const numbered = steps.slice(1, routed.stepIndex + 1).map((s, i) => {
      const { d, at } = curve(centers(steps[i].card), centers(s.card));
      return { key: `route:${i}`, d, color: ROUTE_COLOR, arrows: [at(0.75)], badge: { ...at(0.5), n: i + 2 }, age: routed.stepIndex - 1 - i };
    });
    const caller = steps[routed.stepIndex];
    const dashed = deck.cards.find((c) => c.id === caller.card)?.layer === "playbook"
      ? later.map((l) => ({ key: `later:${caller.card}>${l.card}`, d: curve(centers(caller.card), centers(l.card)).d, color: ROUTE_COLOR, arrows: [], dashed: true }))
      : [];
    return [...numbered, ...dashed];
  }, [routed, base, deck.cards]);

  const edges = useMemo(() => {
    if (!focus || !selected) return [];
    const from = cardBox(focus.poses.get(selected)!);
    const byOther = new Map<string, { in?: Edge; out?: Edge }>();
    for (const e of edgesShown) {
      const other = e.from === selected ? e.to : e.from;
      const pair = byOther.get(other) ?? {};
      pair[e.from === selected ? "out" : "in"] = e;
      byOther.set(other, pair);
    }
    return [...byOther].map(([other, { in: inEdge, out: outEdge }]) => {
      const { d, at } = curve(from, cardBox(focus.poses.get(other)!));
      const arrows = inEdge && outEdge ? [at(0.42, true), at(0.58, false)] : inEdge ? [at(0.5, true)] : [];
      const edge = (inEdge ?? outEdge)!;
      return { key: `${edge.from}>${edge.to}`, d, color: EDGE_INFO[edge.type].color, arrows };
    });
  }, [focus, selected, edgesShown]);

  return (
    <div className={`table${panning ? " panning" : ""}`} ref={wrap}
      role="group"
      aria-label={t.table.cards}
      onFocus={() => wrap.current?.scrollTo(0, 0)}
      onClick={(e) => e.target === e.currentTarget && onBackground()}
      {...bind}
    >
      {fit && (
      <div
        className={`world${settled?.compact ? " compact" : ""}${phase !== "dealt" ? " stacked" : ""}${deckHot && phase === "stack" ? " deck-hot" : ""}`}
        style={{
          width: WORLD_W,
          height: WORLD_H,
          ...backStyle(deck.meta.id),
          transform: `translate(${fit.x + view.x}px, ${fit.y + view.y}px) scale(${fit.scale * view.k})`,
          ...(live && { transition: "none" }),
        }}
        onClick={(e) => e.target === e.currentTarget && onBackground()}
      >
        {phase === "dealt" && !leaving && lens === "layer" && !selected &&
          LAYER_ORDER.map((layer) => arrangement.columns[layer] && deck.cards.some((c) => c.layer === layer) && (
            <div key={layer} className="pile-label" style={{ left: arrangement.columns[layer].x, width: CARD_W }}>
              <b style={{ color: layer === "playbook" ? "#ff8a80" : layer === "skill" ? "#8ab8ff" : layer === "principle" ? "#7be0ab" : layer === "agent" ? "#d0aaff" : "#e8e8ee" }}>
                {LAYER_INFO[layer].suit}
              </b>
              {t.layers[layer]}
            </div>
          ))}

        {phase === "dealt" && !leaving && lens === "sprint" && !selected &&
          (() => {
            let n = 0;
            return arrangement.slots.map(({ stage: st, labelX, labelY }) => (
              <div key={st.id} className="pile-label" style={{ left: labelX, top: labelY, width: CARD_W }}>
                <b style={{ color: st.utility ? "#9fb3aa" : "#8ab8ff" }}>{st.utility ? "·" : ++n}</b>
                {st.label}
              </div>
            ));
          })()}

        {phase === "dealt" && !leaving && lens === "tree" && !selected &&
          (["router", "playbook", "skill", "principle"] as const).map((layer, i) => deck.cards.some((c) => c.layer === layer) && (
            <div key={layer} className="row-label" style={{ top: [20, 250, 480, 710][i] + CARD_H + 4 }}>
              {LAYER_INFO[layer].suit} {t.layers[layer]}
            </div>
          ))}

        <Edges edges={leaving ? [] : routed ? routeEdges : edges} fast={fast && phase === "dealt"} />

        {deck.cards.map((card, i) => (
          <CardView
            key={card.id}
            card={card}
            lines={settled?.lines.get(card.id)}
            pose={poses.get(card.id)!}
            from={starts?.get(card.id)}
            delay={leaving ? 0 : phase === "dealt" && !selected ? i * 0.008 : phase === "dealt" ? 0.02 + (focus?.related.has(card.id) ? i * 0.004 : 0) : 0}
            fast={fast && phase === "dealt"}
            focused={card.id === selected}
            glow={hovered === card.id || routeIds?.current === card.id}
            tabbable={card.id === tabId}
            onNavigate={navigate}
            onFocusCard={setTabbable}
          />
        ))}

        {phase !== "dealt" && !leaving && (
          <button
            className="deck-cta"
            onClick={onDeal}
            {...hotProps}
            disabled={phase === "shuffling"}
            style={{ left: (WORLD_W - STACK_CTA.w) / 2, top: WORLD_H / 2 + (CARD_H * STACK_SCALE) / 2 + STACK_CTA.gap }}
          >
            {phase === "stack" ? t.table.dealHint : t.table.shuffling}
          </button>
        )}
        {phase === "stack" && !leaving && <button className="deck-hit" aria-label={t.table.dealDeck} onClick={onDeal} {...hotProps} style={{ left: (WORLD_W - CARD_W * STACK_SCALE) / 2 - 20, top: (WORLD_H - CARD_H * STACK_SCALE) / 2 - 20, width: CARD_W * STACK_SCALE + 40, height: CARD_H * STACK_SCALE + 40, zIndex: 999 }} />}
      </div>
      )}
      {phase === "dealt" && (
        <div className="zoom-ctl" role="group" aria-label={t.table.zoom}>
          <button onClick={() => zoomBy(1.4)} aria-label={t.table.zoomIn}>
            +
          </button>
          <button onClick={() => zoomBy(1 / 1.4)} aria-label={t.table.zoomOut} disabled={view.k <= 1}>
            −
          </button>
          <button onClick={reset} disabled={view.k <= 1}>
            {t.table.fit}
          </button>
          <span className="zoom-sep" aria-hidden="true" />
          {(["in", "out"] as const).map((k) => (
            <button key={k} className={`flow${flow[k] ? " on" : ""}`} aria-label={k === "in" ? t.table.inflowLabel : t.table.outflowLabel} aria-pressed={flow[k]} onClick={() => onFlow((f) => ({ ...f, [k]: !f[k] }))}>
              {k === "in" ? t.table.inflow : t.table.outflow}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
