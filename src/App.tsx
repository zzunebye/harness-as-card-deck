import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import decksJson from "./data/decks.json";
import repo from "./data/repo.json";
import { EDGE_INFO, edgeDefinition, type Deck, type EdgeType } from "./types.ts";
import { lensesFor, type Launch, type Lens } from "./lib/layout.ts";
import { Analytics, type BeforeSend } from "@vercel/analytics/react";
import { analyticsPage, parseUrlState, serializeUrlState } from "./lib/urlState.ts";
import { loadBodies } from "./lib/bodies.ts";
import { InteractionContext } from "./context.ts";
import { Table, type Phase } from "./components/Table.tsx";
import { Panel } from "./components/Panel.tsx";
import { Breadcrumbs } from "./components/Breadcrumbs.tsx";
import { Lobby } from "./components/Lobby.tsx";

const decks = decksJson as Deck[];

function readPanelW() {
  try {
    return Number(localStorage.getItem("panelW")) || 520;
  } catch {
    return 520;
  }
}

function savePanelW(w: number) {
  try {
    localStorage.setItem("panelW", String(Math.round(w)));
  } catch {}
}

const OVERLAY_MAX = 1100;
const PHONE_MAX = 640;
// How long a phone waits after a card pick before the panel slides over the board: the fast spring and edge draw below have mostly landed by then.
const PANEL_DELAY_MS = 450;
const SLIDE_MS = 450;

function useViewportWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return w;
}

// A link that names a lens or card skips the shuffle intro.
const skipsIntro = (search: string, state: ReturnType<typeof parseUrlState>) => state !== null && (state.card !== null || new URLSearchParams(search).has("lens"));

const initial = parseUrlState(location.search, decks);

// Campaign tags from the landing URL ride along on every URL rewrite, so analytics still sees where the visit came from.
const campaign = [...new URLSearchParams(location.search)].filter(([k]) => k.startsWith("utm_"));
const withCampaign = (search: string) => {
  if (campaign.length === 0) return search;
  const params = new URLSearchParams(search);
  for (const [k, v] of campaign) params.set(k, v);
  return `?${params}`;
};

// The script drops the query once a custom path differs from location.pathname, so the campaign tags are put back here.
const keepCampaign: BeforeSend = (event) => {
  const url = new URL(event.url);
  url.search = withCampaign("");
  return { ...event, url: url.href };
};

export function App() {
  const [phase, setPhase] = useState<Phase>(skipsIntro(location.search, initial) ? "dealt" : "stack");
  const [lens, setLens] = useState<Lens>(initial?.lens ?? lensesFor(decks[0])[0].id);
  // null is the lobby, where every deck sits as its own stack until one is picked.
  const [source, setSource] = useState<string | null>(initial?.source ?? null);
  const [trail, setTrail] = useState<string[]>(initial?.card ? [initial.card] : []);
  const [hovered, setHovered] = useState<string | null>(null);
  // Where the picked deck sat in the lobby. Only the Table that mounts for that pick starts from it.
  const [launch, setLaunch] = useState<Launch | null>(null);
  // The outgoing deck's cards are sliding aside; the swap to the next deck lands when they are clear.
  const [leaving, setLeaving] = useState(false);
  const [enter, setEnter] = useState(false);
  const [flow, setFlow] = useState({ in: true, out: true });
  const [panelW, setPanelW] = useState(readPanelW);

  const vw = useViewportWidth();
  const overlay = vw <= OVERLAY_MAX;

  const deck = decks.find((d) => d.meta.id === source) ?? null;
  const cards = useMemo(() => new Map((deck?.cards ?? []).map((c) => [c.id, c])), [deck]);
  const [panelOpen, setPanelOpen] = useState(true);
  const selected = trail.at(-1) ?? null;
  // Keep the board visible beside the drawer, except on phones where the drawer covers it.
  const inset = overlay && selected && panelOpen && vw > PHONE_MAX ? Math.min(panelW, vw * 0.55) : 0;

  const showing = useRef(false);
  showing.current = !!selected && panelOpen;
  const panelTimer = useRef<number>(0);

  const select = useCallback((id: string) => {
    setHovered(null);
    clearTimeout(panelTimer.current);
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // On phones the panel covers the board, so a first pick lets the cards and edges start moving before it slides over them.
    if (window.innerWidth <= PHONE_MAX && !showing.current && !calm) {
      setPanelOpen(false);
      panelTimer.current = window.setTimeout(() => setPanelOpen(true), PANEL_DELAY_MS);
    } else {
      setPanelOpen(true);
    }
    setTrail((t) => (t.at(-1) === id ? t : [...t, id]));
  }, []);
  const clear = useCallback(() => {
    clearTimeout(panelTimer.current);
    setTrail([]);
  }, []);
  // In drawer mode the first dismiss only hides the panel so the selected card's relations stay on the board.
  const dismiss = useCallback(() => {
    clearTimeout(panelTimer.current);
    if (overlay && selected && panelOpen) setPanelOpen(false);
    else clear();
  }, [overlay, selected, panelOpen, clear]);

  // Fetch the deck's card text while the stack and shuffle play, so it is there by the time a card can be opened.
  useEffect(() => {
    if (source) loadBodies(source);
  }, [source]);

  const dealTimer = useRef<number>(0);
  // The deck the URL last named. A change pushes a history entry so Back returns to the previous deck or the lobby.
  const urlSource = useRef<string | null>(initial?.source ?? null);

  const swapTimer = useRef<number>(0);

  const commitSource = useCallback((id: string | null, from: Launch | null, slideIn: boolean) => {
    clearTimeout(dealTimer.current);
    clearTimeout(swapTimer.current);
    setHovered(null);
    setTrail([]);
    setPhase("stack");
    setLaunch(from);
    setLeaving(false);
    setEnter(slideIn);
    if (id) setLens(lensesFor(decks.find((d) => d.meta.id === id)!)[0].id);
    setSource(id);
  }, []);

  const switchSource = useCallback(
    (id: string | null, from: Launch | null = null) => {
      if (source && id && id !== source && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        clearTimeout(dealTimer.current);
        clearTimeout(swapTimer.current);
        setHovered(null);
        setTrail([]);
        setLeaving(true);
        swapTimer.current = window.setTimeout(() => commitSource(id, null, true), SLIDE_MS);
        return;
      }
      commitSource(id, from, false);
    },
    [source, commitSource],
  );

  const deal = useCallback(() => {
    setPhase("shuffling");
    dealTimer.current = window.setTimeout(() => setPhase("dealt"), 900);
  }, []);

  useEffect(() => () => (clearTimeout(dealTimer.current), clearTimeout(swapTimer.current)), []);

  // Once dealt, the lens is always written, because a bare URL would reload into the stack intro.
  useEffect(() => {
    const search = deck ? serializeUrlState({ source: deck.meta.id, lens, card: selected }, { source: null, lens: phase === "dealt" ? null : lensesFor(deck)[0].id }) : "";
    const id = deck?.meta.id ?? null;
    const url = location.pathname + withCampaign(search);
    if (id !== urlSource.current) {
      urlSource.current = id;
      history.pushState(null, "", url);
    } else {
      history.replaceState(null, "", url);
    }
  }, [lens, selected, phase, deck]);

  useEffect(() => {
    const onPop = () => {
      const state = parseUrlState(location.search, decks);
      clearTimeout(dealTimer.current);
      clearTimeout(swapTimer.current);
      setLeaving(false);
      setEnter(false);
      urlSource.current = state?.source ?? null;
      setHovered(null);
      setLaunch(null);
      setSource(state?.source ?? null);
      setLens(state?.lens ?? lensesFor(decks[0])[0].id);
      setTrail(state?.card ? [state.card] : []);
      setPhase(skipsIntro(location.search, state) ? "dealt" : "stack");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismiss]);

  const startResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const move = (ev: PointerEvent) => {
      const w = Math.min(Math.max(window.innerWidth - ev.clientX, 320), window.innerWidth * 0.8);
      setPanelW(w);
      savePanelW(w);
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
  const page = analyticsPage({ source, card: selected });

  return (
    <InteractionContext.Provider value={ctx}>
      {/* The outgoing deck drops its card before it slides away, and that in-between view is not one the visitor chose. */}
      <Analytics route={leaving ? undefined : page.route} path={page.path} beforeSend={keepCampaign} />
      <div className="app">
        <header className="topbar">
          <h1>
            <button className="home" onClick={() => switchSource(null)} aria-label="All decks">
              <span>♠♥♦♣</span><b className="title">Harness as Deck</b>
            </button>
          </h1>
          {deck && (
            <select className="source-select" aria-label="Deck" value={source ?? ""} onChange={(e) => switchSource(e.target.value)}>
              {decks.map((d) => (
                <option key={d.meta.id} value={d.meta.id}>{d.meta.label}</option>
              ))}
            </select>
          )}
          {deck && (
            <div className="lenses source-tabs" role="tablist" aria-label="Source">
            {decks.map((d) => (
              <button key={d.meta.id} role="tab" aria-selected={source === d.meta.id} className={source === d.meta.id ? "on" : ""} onClick={() => switchSource(d.meta.id)}>
                {d.meta.label}
              </button>
            ))}
          </div>
          )}
          {deck && phase === "dealt" && (
            <div className="lenses" role="tablist" aria-label="Lens">
              {lensesFor(deck).map((l) => (
                <button key={l.id} role="tab" aria-selected={lens === l.id} className={lens === l.id ? "on" : ""} onClick={() => setLens(l.id)}>
                  {l.label}
                </button>
              ))}
            </div>
          )}
          {deck && (
            <ul className="edge-legend">
              {(Object.keys(EDGE_INFO) as EdgeType[]).map((t) => (
                  <li key={t} title={edgeDefinition(t)}>
                    <i style={{ background: EDGE_INFO[t].color }} />
                    {EDGE_INFO[t].label}
                  </li>
                ))}
            </ul>
          )}
          <a className="gh-link" href="https://github.com/zzunebye/harness-as-card-deck" target="_blank" rel="noopener noreferrer" aria-label="View source on GitHub">
            <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
            <span>zzunebye/harness-as-card-deck</span>
            {repo.stars > 0 && <b className="gh-stars">★ {repo.stars}</b>}
          </a>
        </header>
        {!deck ? (
          <Lobby decks={decks} onPick={switchSource} />
        ) : (
        <main className={`stage${overlay ? " overlay" : ""}${selected && panelOpen ? " open" : ""}`} style={{ "--panel-w": `${panelW}px` } as React.CSSProperties}>
          <section className="left">
            <Breadcrumbs trail={trail} cards={cards} onJump={(i) => setTrail((t) => t.slice(0, i + 1))} onClear={clear} onOpen={overlay && !panelOpen ? () => setPanelOpen(true) : undefined} />
            <Table key={source} deck={deck} launch={launch} leaving={leaving} enter={enter} lens={lens} phase={phase} selected={selected} flow={flow} onFlow={setFlow} onDeal={deal} onBackground={dismiss} inset={inset} fast={vw <= PHONE_MAX} />
          </section>
          <div className="resizer" role="separator" aria-orientation="vertical" aria-label="Resize panel" onPointerDown={startResize} />
          <Panel deck={deck} phase={phase} card={selected ? cards.get(selected)! : null} onClose={dismiss} />
        </main>
        )}
      </div>
    </InteractionContext.Provider>
  );
}
