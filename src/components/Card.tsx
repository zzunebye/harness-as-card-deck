import { memo, useRef, type KeyboardEvent, type MouseEvent } from "react";
import { motion } from "motion/react";
import { LAYER_INFO, type Card as CardData } from "../types.ts";
import { CARD_H, CARD_W, type Pose } from "../lib/layout.ts";
import { useInteraction } from "../context.ts";

interface Props {
  card: CardData;
  pose: Pose;
  delay: number;
  focused: boolean;
  glow: boolean;
}

function Face({ card }: { card: CardData }) {
  const info = LAYER_INFO[card.layer];
  const stat =
    card.layer === "router" ? `${card.out} routes` : card.layer === "playbook" ? `uses ${card.out}` : card.layer === "agent" ? `reads ${card.out}` : "";
  return (
    <>
      <header>
        <span className="suit">{info.suit}</span>
        <span className="name">{card.name}</span>
      </header>
      <p className={`body body-${card.layer}`}>{card.layer === "router" ? `${stat} · ${card.in} cite it` : card.description}</p>
      <footer>
        <span>OUT {card.out}</span>
        {stat && card.layer !== "router" && <span className="tag">{stat}</span>}
        <span>IN {card.in}</span>
      </footer>
    </>
  );
}

export const CardView = memo(function CardView({ card, pose, delay, focused, glow }: Props) {
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
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select(card.id);
    }
  };

  return (
    <motion.div
      className={`card-slot${pose.muted && !raised ? " muted" : ""}`}
      style={{ width: CARD_W, height: CARD_H, zIndex: raised ? 500 : pose.z, pointerEvents: pose.dim ? "none" : "auto" }}
      initial={false}
      animate={{ x: pose.x, y: pose.y, rotate: pose.rotate, scale: pose.scale, opacity: pose.dim ? 0.2 : 1 }}
      transition={{ type: "spring", stiffness: 140, damping: 20, mass: 0.9, delay }}
    >
      <div
        className={`card-hover layer-${card.layer}${raised ? " glow" : ""}${focused ? " focused" : ""}`}
        role="button"
        tabIndex={pose.dim ? -1 : 0}
        aria-label={`${card.layer} ${card.name}`}
        onClick={() => !pose.faceDown && select(card.id)}
        onKeyDown={onKey}
        onMouseEnter={() => setHovered(card.id)}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <div className="tilt" ref={tilt}>
          <div className={`flip${pose.faceDown ? " down" : ""}`}>
            <article className="face front">
              <Face card={card} />
              <i className="sheen" />
            </article>
            <div className="face back" />
          </div>
        </div>
      </div>
    </motion.div>
  );
});
