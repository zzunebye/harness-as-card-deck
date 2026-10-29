import { memo, useRef, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { motion } from "motion/react";
import { LAYER_INFO, type Card as CardData } from "../types.ts";
import { useT } from "../i18n/index.ts";
import { CARD_H, CARD_SCALE, CARD_W, TITLE, type Pose } from "../lib/layout.ts";
import { useInteraction } from "../context.ts";

interface Props {
  card: CardData;
  pose: Pose;
  delay: number;
  /** Stiffer spring so a pick settles quickly (phones). */
  fast: boolean;
  /** Pose to start from on mount, so the card glides into place. Omit to appear in place. */
  from?: { x: number; y: number; rotate: number; scale: number };
  /** Draw only the title, in at most this many lines. */
  lines?: number;
  focused: boolean;
  glow: boolean;
  /** Roving tabindex: only one card on the board is a tab stop. */
  tabbable: boolean;
  onNavigate(id: string, key: string): void;
  onFocusCard(id: string): void;
}

function Face({ card, lines }: { card: CardData; lines?: number }) {
  const t = useT();
  if (lines) return <span className="name">{card.name}</span>;
  const info = LAYER_INFO[card.layer];
  const stat =
    card.layer === "router" ? t.card.routes(card.out) : card.layer === "playbook" ? t.card.uses(card.out) : card.layer === "agent" ? t.card.reads(card.out) : "";
  return (
    <>
      <header>
        <span className="suit">{info.suit}</span>
        <span className="name">{card.name}</span>
      </header>
      <p className={`body body-${card.layer}`}>{card.layer === "router" ? `${stat} · ${t.card.citedBy(card.in)}` : card.description}</p>
      <footer>
        <span>{t.card.out(card.out)}</span>
        {stat && card.layer !== "router" && <span className="tag">{stat}</span>}
        <span>{t.card.in(card.in)}</span>
      </footer>
    </>
  );
}

export const CardView = memo(function CardView({ card, pose, delay, fast, from, lines, focused, glow, tabbable, onNavigate, onFocusCard }: Props) {
  const t = useT();
  const { setHovered, select } = useInteraction();
  const tilt = useRef<HTMLDivElement>(null);
  const raised = glow && !pose.dim;

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = tilt.current;
    if (!el) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${px * 18}deg`);
    el.style.setProperty("--rx", `${-py * 18}deg`);
    el.style.setProperty("--gx", `${(px + 0.5) * 100}%`);
    el.style.setProperty("--gy", `${(py + 0.5) * 100}%`);
  };
  const onLeave = () => {
    tilt.current?.style.setProperty("--rx", "0deg");
    tilt.current?.style.setProperty("--ry", "0deg");
    setHovered(null);
  };
  const onKey = (e: KeyboardEvent) => {
    if (pose.faceDown) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select(card.id);
    } else if (e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      onNavigate(card.id, e.key);
    }
  };

  return (
    <motion.div
      className={`card-slot${pose.muted && !raised ? " muted" : ""}`}
      style={{ "--u": CARD_SCALE, ...(lines && { "--lines": lines, "--title-px": `${TITLE.px}px`, "--title-lead": TITLE.lead, "--title-pad": `${TITLE.pad}px` }), width: CARD_W, height: CARD_H, zIndex: raised ? 500 : pose.z, pointerEvents: pose.dim ? "none" : "auto" } as CSSProperties}
      initial={from ? { ...from, opacity: 1 } : false}
      animate={{ x: pose.x, y: pose.y, rotate: pose.rotate, scale: pose.scale, opacity: pose.dim ? 0.2 : 1 }}
      transition={{ type: "spring", stiffness: fast ? 300 : 140, damping: fast ? 29 : 20, mass: 0.9, delay: fast ? delay / 2 : delay }}
    >
      <div
        className={`card-hover layer-${card.layer}${raised ? " glow" : ""}${focused ? " focused" : ""}`}
        role="button"
        tabIndex={tabbable && !pose.dim && !pose.faceDown ? 0 : -1}
        data-card-id={card.id}
        onFocus={() => onFocusCard(card.id)}
        aria-label={`${t.layers[card.layer]} ${card.name}`}
        onClick={() => !pose.faceDown && select(card.id)}
        onKeyDown={onKey}
        onMouseEnter={() => setHovered(card.id)}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <div className="tilt" ref={tilt}>
          <div className={`flip${pose.faceDown ? " down" : ""}`}>
            <article className={`face front${lines ? " title-only" : ""}`}>
              <Face card={card} lines={lines} />
              <i className="sheen" />
            </article>
            <div className="face back" />
          </div>
        </div>
      </div>
    </motion.div>
  );
});
