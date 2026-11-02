import { LAYER_INFO, type Card } from "../types.ts";
import { useT } from "../i18n/index.ts";

export function Breadcrumbs({ trail, cards, onJump, onClear, onOpen, onBack }: { trail: string[]; cards: Map<string, Card>; onJump(i: number): void; onClear(): void; onOpen?(): void; onBack(): void }) {
  const t = useT();
  if (!trail.length) return null;
  const current = cards.get(trail[trail.length - 1])!;
  return (
    <nav className="crumbs" aria-label={t.crumbs.path}>
      {/* Phones get one fixed-height row: back, the card a read would open, read, clear. The full trail chips are for wider screens. */}
      <div className="crumbs-phone">
        <button className="crumb-back" onClick={onBack} aria-label={t.crumbs.back}>◀</button>
        <span className={`crumb current layer-${current.layer}`} title={current.name}>
          <span>{LAYER_INFO[current.layer].suit}</span>
          <b>{current.name}</b>
          {trail.length > 1 && <i>{trail.length}</i>}
        </span>
        {onOpen && <button className="crumb-open" onClick={onOpen}>{t.crumbs.read}</button>}
        <button className="crumb-clear" onClick={onClear} aria-label={t.crumbs.clear}>✕</button>
      </div>
      {trail.map((id, i) => {
        const c = cards.get(id)!;
        return (
          <button key={`${id}-${i}`} className={`crumb crumb-chip layer-${c.layer}${i === trail.length - 1 ? " current" : ""}`} onClick={() => onJump(i)} title={c.name}>
            <span>{LAYER_INFO[c.layer].suit}</span>
            {c.name}
          </button>
        );
      })}
      {onOpen && (
        <button className="crumb-open crumb-wide" onClick={onOpen}>
          {t.crumbs.read}
        </button>
      )}
      <button className="crumb-clear crumb-wide" onClick={onClear}>
        {t.crumbs.clear}
      </button>
    </nav>
  );
}
