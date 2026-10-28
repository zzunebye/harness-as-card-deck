import { LAYER_INFO, type Card } from "../types.ts";

export function Breadcrumbs({ trail, cards, onJump, onClear }: { trail: string[]; cards: Map<string, Card>; onJump(i: number): void; onClear(): void }) {
  if (!trail.length) return null;
  return (
    <nav className="crumbs" aria-label="Path">
      {trail.map((id, i) => {
        const c = cards.get(id)!;
        return (
          <button key={`${id}-${i}`} className={`crumb layer-${c.layer}${i === trail.length - 1 ? " current" : ""}`} onClick={() => onJump(i)} title={c.name}>
            <span>{LAYER_INFO[c.layer].suit}</span>
            {c.name}
          </button>
        );
      })}
      <button className="crumb-clear" onClick={onClear}>
        clear
      </button>
    </nav>
  );
}
