import type { Deck } from "../types.ts";
import { backStyle } from "../lib/backs.ts";
import { pileLayers, pileOffset, type Launch } from "../lib/layout.ts";
import { SkillsFooter } from "./SkillsFooter.tsx";

const layerStyle = (i: number, count: number): React.CSSProperties => {
  const o = pileOffset(i, count);
  return { transform: `translate(${o.x}px, ${o.y}px) rotate(${o.rotate}deg)` };
};

export function Lobby({ decks, onPick }: { decks: Deck[]; onPick(id: string, from: Launch): void }) {
  return (
    <main className="lobby">
      <h2>Pick a deck!</h2>
      <SkillsFooter compact />
      <ul>
        {decks.map((d) => {
          const count = pileLayers(d.cards.length);
          return (
          <li key={d.meta.id}>
            <button
              className="lobby-deck"
              onClick={(e) => {
                const r = e.currentTarget.querySelector(".lobby-stack")!.getBoundingClientRect();
                onPick(d.meta.id, { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width });
              }}
              style={backStyle(d.meta.id)}
            >
              <span className="lobby-stack" aria-hidden>
                {Array.from({ length: count }, (_, i) => (
                  <i key={i} className={i === count - 1 ? "top" : undefined} style={layerStyle(i, count)} />
                ))}
              </span>
              <b>{d.meta.label}</b>
              <small>
                {d.cards.length} cards · {d.meta.repo}
              </small>
            </button>
          </li>
          );
        })}
      </ul>
      <SkillsFooter />
    </main>
  );
}
