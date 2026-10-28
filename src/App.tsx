import { useCallback, useEffect, useMemo, useState } from "react";
import decksJson from "./data/decks.json";
import { EDGE_INFO, edgeDefinition, type Deck, type EdgeType } from "./types.ts";
import type { Lens } from "./lib/layout.ts";
import { InteractionContext } from "./context.ts";
import { Table, type Phase } from "./components/Table.tsx";
import { Panel } from "./components/Panel.tsx";
import { Breadcrumbs } from "./components/Breadcrumbs.tsx";

const decks = decksJson as Deck[];

const LENSES: { id: Lens; label: string }[] = [
  { id: "layer", label: "Layer" },
  { id: "tree", label: "Route Tree" },
];

export function App() {
  const [phase, setPhase] = useState<Phase>("stack");
  const [lens, setLens] = useState<Lens>("layer");
  const [source, setSource] = useState(decks[0].meta.id);
  const [trail, setTrail] = useState<string[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [flow, setFlow] = useState({ in: true, out: true });
  const [panelW, setPanelW] = useState(() => Number(localStorage.getItem("panelW")) || 520);

  const deck = decks.find((d) => d.meta.id === source)!;
  const cards = useMemo(() => new Map(deck.cards.map((c) => [c.id, c])), [deck]);
  const selected = trail.at(-1) ?? null;

  const select = useCallback((id: string) => {
    setHovered(null);
    setTrail((t) => (t.at(-1) === id ? t : [...t, id]));
  }, []);
  const clear = useCallback(() => setTrail([]), []);

  const switchSource = useCallback((id: string) => {
    setHovered(null);
    setTrail([]);
    setSource(id);
  }, []);

  const deal = useCallback(() => {
    setPhase("shuffling");
    setTimeout(() => setPhase("dealt"), 900);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && clear();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clear]);

  const startResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const move = (ev: PointerEvent) => {
      const w = Math.min(Math.max(window.innerWidth - ev.clientX, 320), window.innerWidth * 0.8);
      setPanelW(w);
      localStorage.setItem("panelW", String(Math.round(w)));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.classList.remove("resizing");
    };
    document.body.classList.add("resizing");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }, []);

  const ctx = useMemo(() => ({ hovered, setHovered, select }), [hovered, select]);

  return (
    <InteractionContext.Provider value={ctx}>
      <div className="app">
        <header className="topbar">
          <h1>
            <span>♠♥♦♣</span> Skill Deck <em>{deck.meta.label}</em>
          </h1>
          <div className="lenses" role="tablist" aria-label="Source">
            {decks.map((d) => (
              <button key={d.meta.id} role="tab" aria-selected={source === d.meta.id} className={source === d.meta.id ? "on" : ""} onClick={() => switchSource(d.meta.id)}>
                {d.meta.label}
              </button>
            ))}
          </div>
          {phase === "dealt" && (
            <div className="lenses" role="tablist" aria-label="Lens">
              {LENSES.map((l) => (
                <button key={l.id} role="tab" aria-selected={lens === l.id} className={lens === l.id ? "on" : ""} onClick={() => setLens(l.id)}>
                  {l.label}
                </button>
              ))}
            </div>
          )}
          {phase === "dealt" && (
            <div className="flow-toggles" role="group" aria-label="Related cards">
              {(["in", "out"] as const).map((k) => (
                <button key={k} aria-pressed={flow[k]} className={flow[k] ? "on" : ""} onClick={() => setFlow((f) => ({ ...f, [k]: !f[k] }))}>
                  {k === "in" ? "Inflow" : "Outflow"}
                </button>
              ))}
            </div>
          )}
          <ul className="edge-legend">
            {(Object.keys(EDGE_INFO) as EdgeType[]).map((t) => (
                <li key={t} title={edgeDefinition(t)}>
                  <i style={{ background: EDGE_INFO[t].color }} />
                  {EDGE_INFO[t].label}
                </li>
              ))}
          </ul>
        </header>
        <main className="stage" style={{ "--panel-w": `${panelW}px` } as React.CSSProperties}>
          <section className="left">
            <Breadcrumbs trail={trail} cards={cards} onJump={(i) => setTrail((t) => t.slice(0, i + 1))} onClear={clear} />
            <Table key={source} deck={deck} lens={lens} phase={phase} selected={selected} flow={flow} onDeal={deal} onBackground={clear} />
          </section>
          <div className="resizer" role="separator" aria-orientation="vertical" aria-label="Resize panel" onPointerDown={startResize} />
          <Panel deck={deck} card={selected ? cards.get(selected)! : null} onClose={clear} />
        </main>
      </div>
    </InteractionContext.Provider>
  );
}
