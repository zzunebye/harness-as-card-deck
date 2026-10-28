import { memo, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { EDGE_INFO, LAYER_INFO, LAYER_ORDER, type Deck, type Edge } from "../types.ts";
import {
  CARD_H,
  WORLD_H,
  WORLD_W,
  cardCenter,
  deckLayout,
  focusLayout,
  lensLayout,
  LAYER_COLUMN_X,
  CARD_W,
  type Lens,
  type Pose,
} from "../lib/layout.ts";
import { CardView } from "./Card.tsx";
import { useInteraction } from "../context.ts";

interface EdgePath {
  key: string;
  d: string;
  color: string;
  arrows: { x: number; y: number; angle: number }[];
}

const Edges = memo(function Edges({ edges }: { edges: EdgePath[] }) {
  return (
    <svg className="edges" width={WORLD_W} height={WORLD_H}>
      {edges.map((e, i) => {
        const draw = { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, transition: { delay: 0.35 + i * 0.012, duration: 0.5 } };
        return (
          <g key={e.key}>
            <motion.path d={e.d} fill="none" stroke={e.color} strokeWidth={9} strokeLinecap="round" strokeOpacity={0.18} {...draw} />
            <motion.path d={e.d} fill="none" stroke={e.color} strokeWidth={3} strokeLinecap="round" strokeOpacity={0.9} {...draw} />
            {e.arrows.map((a, k) => (
              <motion.path
                key={k}
                d="M-5,-4 L5,0 L-5,4 Z"
                fill={e.color}
                transform={`translate(${a.x},${a.y}) rotate(${a.angle})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 + i * 0.012 }}
              />
            ))}
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
  flow: { in: boolean; out: boolean };
  onDeal(): void;
  onBackground(): void;
}

export function Table({ deck, lens, phase, selected, flow, onDeal, onBackground }: Props) {
  const { hovered } = useInteraction();
  const wrap = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 0.6, x: 0, y: 0 });
  const [deckHot, setDeckHot] = useState(false);
  const hotProps = {
    onMouseEnter: () => setDeckHot(true),
    onMouseLeave: () => setDeckHot(false),
    onFocus: () => setDeckHot(true),
    onBlur: () => setDeckHot(false),
  };

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const scale = Math.min(el.clientWidth / WORLD_W, el.clientHeight / WORLD_H);
      setFit({ scale, x: (el.clientWidth - WORLD_W * scale) / 2, y: (el.clientHeight - WORLD_H * scale) / 2 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stack = useMemo(() => deckLayout(deck.cards), [deck]);
  const base = useMemo(() => lensLayout(deck.cards, lens), [deck, lens]);

  const edgesShown = useMemo(
    () => deck.edges.filter((e) => (e.from === selected && flow.out) || (e.to === selected && flow.in)),
    [deck.edges, selected, flow],
  );

  const focus = useMemo(
    () => (selected && phase === "dealt" ? focusLayout(base, deck.cards, edgesShown, selected) : null),
    [base, deck, edgesShown, selected, phase],
  );

  const poses: Map<string, Pose> =
    phase === "dealt"
      ? (focus?.poses ?? base)
      : new Map(
          [...stack].map(([id, p]) => [
            id,
            phase === "shuffling" ? { ...p, x: p.x + (Math.sin(p.z * 12.9) * 180), rotate: p.rotate + Math.sin(p.z * 7.3) * 25 } : p,
          ]),
        );

  const edges = useMemo(() => {
    if (!focus || !selected) return [];
    const from = cardCenter(focus.poses.get(selected)!);
    const byOther = new Map<string, { in?: Edge; out?: Edge }>();
    for (const e of edgesShown) {
      const other = e.from === selected ? e.to : e.from;
      const pair = byOther.get(other) ?? {};
      pair[e.from === selected ? "out" : "in"] = e;
      byOther.set(other, pair);
    }
    return [...byOther].map(([other, { in: inEdge, out: outEdge }]) => {
      const to = cardCenter(focus.poses.get(other)!);
      const mx = (from.x + to.x) / 2 - (to.y - from.y) * 0.12;
      const my = (from.y + to.y) / 2 + (to.x - from.x) * 0.12;
      // Point and heading (selected -> other) at parameter t of the quadratic curve.
      const at = (t: number, toward: boolean) => {
        const u = 1 - t;
        const dx = 2 * u * (mx - from.x) + 2 * t * (to.x - mx);
        const dy = 2 * u * (my - from.y) + 2 * t * (to.y - my);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI + (toward ? 180 : 0);
        return { x: u * u * from.x + 2 * u * t * mx + t * t * to.x, y: u * u * from.y + 2 * u * t * my + t * t * to.y, angle };
      };
      const arrows = inEdge && outEdge ? [at(0.42, true), at(0.58, false)] : inEdge ? [at(0.5, true)] : [];
      const edge = (inEdge ?? outEdge)!;
      return { key: `${edge.from}>${edge.to}`, d: `M${from.x},${from.y} Q${mx},${my} ${to.x},${to.y}`, color: EDGE_INFO[edge.type].color, arrows };
    });
  }, [focus, selected, edgesShown]);

  return (
    <div className="table" ref={wrap} onClick={(e) => e.target === e.currentTarget && onBackground()}>
      <div
        className={`world${deckHot && phase === "stack" ? " deck-hot" : ""}`}
        style={{ width: WORLD_W, height: WORLD_H, transform: `translate(${fit.x}px, ${fit.y}px) scale(${fit.scale})` }}
        onClick={(e) => e.target === e.currentTarget && onBackground()}
      >
        {phase === "dealt" && lens === "layer" && !selected &&
          LAYER_ORDER.map((layer, i) => deck.cards.some((c) => c.layer === layer) && (
            <div key={layer} className="pile-label" style={{ left: LAYER_COLUMN_X(i), width: CARD_W }}>
              <b style={{ color: layer === "playbook" ? "#ff8a80" : layer === "skill" ? "#8ab8ff" : layer === "principle" ? "#7be0ab" : layer === "agent" ? "#d0aaff" : "#e8e8ee" }}>
                {LAYER_INFO[layer].suit}
              </b>
              {LAYER_INFO[layer].label}
            </div>
          ))}

        {phase === "dealt" && lens === "tree" && !selected &&
          (["router", "playbook", "skill", "principle"] as const).map((layer, i) => deck.cards.some((c) => c.layer === layer) && (
            <div key={layer} className="row-label" style={{ top: [20, 250, 480, 710][i] + CARD_H + 4 }}>
              {LAYER_INFO[layer].suit} {LAYER_INFO[layer].label}
            </div>
          ))}

        <Edges edges={edges} />

        {deck.cards.map((card, i) => (
          <CardView
            key={card.id}
            card={card}
            pose={poses.get(card.id)!}
            delay={phase === "dealt" && !selected ? i * 0.008 : phase === "dealt" ? 0.02 + (focus?.related.has(card.id) ? i * 0.004 : 0) : 0}
            focused={card.id === selected}
            glow={hovered === card.id}
          />
        ))}

        {phase !== "dealt" && (
          <button
            className="deck-cta"
            onClick={onDeal}
            {...hotProps}
            disabled={phase === "shuffling"}
            style={{ left: WORLD_W / 2 - 160, top: WORLD_H / 2 + CARD_H / 2 + 50 }}
          >
            {phase === "stack" ? "Click the deck to deal" : "Shuffling…"}
          </button>
        )}
        {phase === "stack" && <button className="deck-hit" aria-label="Deal the deck" onClick={onDeal} {...hotProps} style={{ left: (WORLD_W - CARD_W) / 2 - 20, top: (WORLD_H - CARD_H) / 2 - 20, width: CARD_W + 40, height: CARD_H + 40, zIndex: 999 }} />}
      </div>
    </div>
  );
}
