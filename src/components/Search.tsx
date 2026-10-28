import { useEffect, useMemo, useRef, useState } from "react";
import { LAYER_INFO, type Deck } from "../types.ts";
import { useBodies } from "../lib/bodies.ts";
import { searchCards } from "../lib/search.ts";

interface Props {
  deck: Deck;
  onPick(id: string): void;
}

const isTyping = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

export function Search({ deck, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const bodies = useBodies(deck.meta.id);
  const cards = useMemo(() => new Map(deck.cards.map((c) => [c.id, c])), [deck]);
  const hits = useMemo(() => searchCards(deck.cards, bodies, query), [deck, bodies, query]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((k === "k" && (e.metaKey || e.ctrlKey)) || (k === "/" && !isTyping(e.target))) {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (id: string) => {
    setQuery("");
    setOpen(false);
    input.current?.blur();
    onPick(id);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (hits.length) setActive((i) => (i + (e.key === "ArrowDown" ? 1 : hits.length - 1)) % hits.length);
    } else if (e.key === "Enter" && hits[active]) {
      pick(hits[active].id);
    } else if (e.key === "Escape") {
      setQuery("");
      setOpen(false);
      input.current?.blur();
    }
  };

  const showList = open && query.trim() !== "";

  return (
    <div className="search">
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-label="Search cards"
        aria-expanded={showList}
        aria-controls="search-results"
        aria-activedescendant={showList && hits[active] ? `search-hit-${active}` : undefined}
        placeholder="Search cards"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(e) => (setQuery(e.target.value), setOpen(true))}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      <kbd aria-hidden="true">/</kbd>
      {showList && (
        <ul id="search-results" role="listbox" className="search-results">
          {hits.length === 0 && <li className="search-empty">No card matches “{query.trim()}”.</li>}
          {hits.map((hit, i) => {
            const card = cards.get(hit.id)!;
            const info = LAYER_INFO[card.layer];
            return (
              // mousedown, not click, because the input's blur would close the list before a click lands.
              <li key={hit.id} id={`search-hit-${i}`} role="option" aria-selected={i === active} className={i === active ? "on" : ""} onMouseDown={(e) => (e.preventDefault(), pick(hit.id))} onMouseEnter={() => setActive(i)}>
                <span className="search-suit" style={{ color: card.layer === "router" ? "var(--cream)" : info.color }} title={info.label}>{info.suit}</span>
                <span className="search-text">
                  <b>{card.name}</b>
                  <small>{hit.snippet ?? card.description}</small>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
