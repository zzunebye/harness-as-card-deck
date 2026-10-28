import type { Deck } from "../types.ts";
import { backStyle } from "../lib/backs.ts";
import type { Launch } from "../lib/layout.ts";
import { SkillsFooter } from "./SkillsFooter.tsx";

const MAX_LAYERS = 12;
const layerCount = (cards: number) => Math.min(MAX_LAYERS, Math.max(3, Math.ceil(Math.sqrt(cards))));

// Each layer below the top sinks 2px and drifts by a fixed pseudo-random offset, so the pile looks hand-stacked and renders the same every time.
const layerStyle = (i: number, count: number): React.CSSProperties => {
  const depth = count - 1 - i;
  const x = depth === 0 ? 0 : Math.sin(i * 12.9) * 4.5;
  const y = depth * 2 + (depth === 0 ? 0 : Math.sin(i * 5.1) * 0.8);
  const r = depth === 0 ? 0 : Math.sin(i * 7.3) * 3;
  return { transform: `translate(${x}px, ${y}px) rotate(${r}deg)` };
};

export function Lobby({ decks, onPick }: { decks: Deck[]; onPick(id: string, from: Launch): void }) {
  return (
    <main className="lobby">
      <h2>Pick a deck!</h2>
      <ul>
        {decks.map((d) => {
          const count = layerCount(d.cards.length);
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
