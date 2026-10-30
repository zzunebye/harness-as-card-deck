import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import decksJson from "./data/decks.json";
import repo from "./data/repo.json";
import { EDGE_INFO, edgeDefinition, type Deck, type EdgeType } from "./types.ts";
import { lensesFor, type Launch, type Lens } from "./lib/layout.ts";
import { Analytics, type BeforeSend } from "@vercel/analytics/react";
import { analyticsPage, parseUrlState, serializeUrlState, trailFor, type FlowState } from "./lib/urlState.ts";
import { loadBodies } from "./lib/bodies.ts";
import { InteractionContext } from "./context.ts";
import { Table, type Phase } from "./components/Table.tsx";
import { FlowBar } from "./components/FlowBar.tsx";
import { Panel } from "./components/Panel.tsx";
import { Breadcrumbs } from "./components/Breadcrumbs.tsx";
import { Lobby } from "./components/Lobby.tsx";
import { Search } from "./components/Search.tsx";
import { I18nProvider, useT } from "./i18n/index.ts";
import { chosenLocale, LOCALES, matchLocale, systemLocale, type Locale } from "./i18n/locale.ts";

// The one topbar or board popover that is open on a phone. They are exclusive, so one value replaces three booleans.
type Popover = "search" | "menu" | "legend";

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

function readLang() {
  try {
    return localStorage.getItem("lang");
  } catch {
    return null;
  }
}

function saveLang(lang: Locale) {
  try {
    localStorage.setItem("lang", lang);
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
const skipsIntro = (search: string, state: ReturnType<typeof parseUrlState>) => state !== null && (state.card !== null || state.flow !== null || new URLSearchParams(search).has("lens"));

const initial = parseUrlState(location.search, decks);
const initialDeck = decks.find((d) => d.meta.id === initial?.source);
const initialTrail = initialDeck ? trailFor(history.state, initial?.card ?? null, initialDeck) : [];

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

// The reader's explicit pick, or null to follow the browser. Only a pick is stored and written to the URL.
export function App() {
  const [choice, setChoice] = useState(() => chosenLocale(location.search, readLang()));
  const locale = choice ?? systemLocale(navigator.languages ?? [navigator.language]);
  const onChoice = useCallback((l: Locale) => (setChoice(l), saveLang(l)), []);
  return (
    <I18nProvider locale={locale}>
      <Shell locale={locale} choice={choice} onChoice={onChoice} />
    </I18nProvider>
  );
}

function Shell({ locale, choice, onChoice }: { locale: Locale; choice: Locale | null; onChoice(l: Locale): void }) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>(skipsIntro(location.search, initial) ? "dealt" : "stack");
  const [lens, setLens] = useState<Lens>(initial?.lens ?? lensesFor(decks[0])[0].id);
  // null is the lobby, where every deck sits as its own stack until one is picked.
  const [source, setSource] = useState<string | null>(initial?.source ?? null);
  const [trail, setTrail] = useState<string[]>(initialTrail);
  // The example request being replayed. Named apart from `flow` below, which is the edge in/out toggle.
  const [replay, setReplay] = useState<FlowState | null>(initial?.flow ?? null);
  const [hovered, setHovered] = useState<string | null>(null);
  // Where the picked deck sat in the lobby. Only the Table that mounts for that pick starts from it.
  const [launch, setLaunch] = useState<Launch | null>(null);
  // The outgoing deck's cards are sliding aside; the swap to the next deck lands when they are clear.
  const [leaving, setLeaving] = useState(false);
  const [enter, setEnter] = useState(false);
  const [flow, setFlow] = useState({ in: true, out: true });
  const [panelW, setPanelW] = useState(readPanelW);
  // "View original" shows the English body without changing the interface language.
  const [original, setOriginal] = useState(false);

  const [popover, setPopover] = useState<Popover | null>(null);
  const toggle = (p: Popover) => setPopover((cur) => (cur === p ? null : p));
  const menuRef = useRef<HTMLDivElement>(null);

  const vw = useViewportWidth();
  const overlay = vw <= OVERLAY_MAX;

  const deck = decks.find((d) => d.meta.id === source) ?? null;
  const route = useMemo(() => {
    const f = deck?.flows?.find((f) => f.id === replay?.id);
    return f && replay ? { flow: f, step: replay.step } : null;
  }, [deck, replay]);
  const cards = useMemo(() => new Map((deck?.cards ?? []).map((c) => [c.id, c])), [deck]);
  // A deck without translations in the interface language shows English bodies.
  const lang = !original && deck?.meta.langs.includes(locale) ? locale : "en";
  const pickLocale = useCallback((l: Locale) => (setOriginal(false), onChoice(l)), [onChoice]);
  const chooseLang = useCallback((l: string) => (l === "en" ? setOriginal(true) : pickLocale(matchLocale(l) ?? "en")), [pickLocale]);
  const [panelOpen, setPanelOpen] = useState(true);
  const selected = trail.at(-1) ?? null;
  // The replayed step's card fills the panel until the reader picks another card.
  const stepCard = route ? route.flow.steps[route.step].card : null;
  const shown = selected ?? stepCard;
  // Keep the board visible beside the drawer, except on phones where the drawer covers it.
  const inset = overlay && shown && panelOpen && vw > PHONE_MAX ? Math.min(panelW, vw * 0.55) : 0;

  const showing = useRef(false);
  showing.current = !!shown && panelOpen;
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
    if (overlay && shown && panelOpen) setPanelOpen(false);
    else clear();
  }, [overlay, shown, panelOpen, clear]);

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
    setReplay(null);
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

  const searchPick = useCallback(
    (id: string) => {
      if (phase === "stack") deal();
      setPopover(null);
      select(id);
    },
    [phase, deal, select],
  );

  const trailKey = useRef(initialTrail.join("|"));

  // A deep link would otherwise be the only entry, so Back leaves the site. Put the deck's board behind it.
  useEffect(() => {
    if (!initial?.card || window.innerWidth > OVERLAY_MAX || history.state?.trail !== undefined) return;
    const full = location.href;
    const base = serializeUrlState({ ...initial, card: null, lang: choice, flow: null }, { source: null, lens: null });
    history.replaceState({ trail: [] }, "", location.pathname + withCampaign(base));
    history.pushState({ trail: initialTrail }, "", full);
  }, []);

  // Once dealt, the lens is always written, because a bare URL would reload into the stack intro.
  useEffect(() => {
    const search = deck ? serializeUrlState({ source: deck.meta.id, lens, card: selected, lang: choice, flow: replay }, { source: null, lens: phase === "dealt" ? null : lensesFor(deck)[0].id }) : "";
    const id = deck?.meta.id ?? null;
    const url = location.pathname + withCampaign(search);
    const key = trail.join("|");
    const trailChanged = key !== trailKey.current;
    trailKey.current = key;
    // Overlay widths push per trail step so Back peels cards off the panel. The trail is cleared before a deck swap, so a leaving deck must not push.
    if (id !== urlSource.current) {
      urlSource.current = id;
      history.pushState({ trail }, "", url);
    } else if (trailChanged && overlay && !leaving) {
      history.pushState({ trail }, "", url);
    } else {
      history.replaceState({ trail }, "", url);
    }
  }, [lens, selected, phase, deck, choice, trail, leaving, overlay, replay]);

  useEffect(() => {
    const onPop = () => {
      const state = parseUrlState(location.search, decks);
      const next = decks.find((d) => d.meta.id === state?.source);
      const nextTrail = next ? trailFor(history.state, state?.card ?? null, next) : [];
      trailKey.current = nextTrail.join("|");
      // Lens is a view preference and old entries hold stale values, so stepping within a deck leaves lens and phase alone.
      const sameDeck = (state?.source ?? null) === urlSource.current;
      if (sameDeck) {
        clearTimeout(panelTimer.current);
        clearTimeout(swapTimer.current);
        setLeaving(false);
        setHovered(null);
        setTrail(nextTrail);
        setReplay(state?.flow ?? null);
        setPanelOpen(nextTrail.length > 0);
        return;
      }
      clearTimeout(dealTimer.current);
      clearTimeout(swapTimer.current);
      setLeaving(false);
      setEnter(false);
      urlSource.current = state?.source ?? null;
      setHovered(null);
      setLaunch(null);
      setSource(state?.source ?? null);
      setLens(state?.lens ?? lensesFor(decks[0])[0].id);
      setTrail(nextTrail);
      setReplay(state?.flow ?? null);
      if (nextTrail.length > 0) setPanelOpen(true);
      setPhase(skipsIntro(location.search, state) ? "dealt" : "stack");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.target instanceof HTMLInputElement) return;
      if (popover) setPopover(null);
      else if (replay) setReplay(null);
      else dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismiss, popover, replay]);


  useEffect(() => {
    if (popover !== "menu") return;
    const on = (e: PointerEvent) => menuRef.current?.contains(e.target as Node) || setPopover(null);
    document.addEventListener("pointerdown", on);
    return () => document.removeEventListener("pointerdown", on);
  }, [popover]);

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

  const startReplay = useCallback(
    (id: string) => {
      setReplay({ id, step: 0 });
      if (deck && lensesFor(deck).some((l) => l.id === "tree")) setLens("tree");
      if (overlay) setPanelOpen(false);
    },
    [deck, overlay],
  );

  const legendTypes = useMemo(() => {
    const used = new Set(deck?.edges.map((e) => e.type));
    return (Object.keys(EDGE_INFO) as EdgeType[]).filter((t) => used.has(t));
  }, [deck]);
  const ctx = useMemo(() => ({ hovered, setHovered, select }), [hovered, select]);
  const tabs = deck !== null && phase === "dealt";
  const reading = !!shown && panelOpen;
  const page = analyticsPage({ source, card: selected });

  return (
    <InteractionContext.Provider value={ctx}>
      {/* The outgoing deck drops its card before it slides away, and that in-between view is not one the visitor chose. */}
      <Analytics route={leaving ? undefined : page.route} path={page.path} beforeSend={keepCampaign} />
      <div className={`app${tabs ? " tabs" : ""}${reading ? " reading" : ""}`}>
        <header className={`topbar${deck ? " with-deck" : ""}`}>
          <h1>
            <button className="home" onClick={() => switchSource(null)} aria-label={t.topbar.allDecks}>
              <span>♠♥♦♣</span><b className="title">Harness as Deck</b>
            </button>
          </h1>
          {deck && (
            <select className="source-select" aria-label={t.topbar.deck} value={source ?? ""} onChange={(e) => switchSource(e.target.value)}>
              {decks.map((d) => (
                <option key={d.meta.id} value={d.meta.id}>{d.meta.label}</option>
              ))}
            </select>
          )}
          {tabs && (
            <div className="lenses" role="tablist" aria-label={t.topbar.lens}>
              {lensesFor(deck).map((l) => (
                <button key={l.id} role="tab" aria-selected={lens === l.id} className={lens === l.id ? "on" : ""} onClick={() => setLens(l.id)}>
                  {t.lenses[l.id]}
                </button>
              ))}
            </div>
          )}
          {deck && !leaving && (
            <>
              <button className="icon-btn search-btn" aria-label={t.topbar.openSearch} aria-expanded={popover === "search"} onClick={() => setPopover("search")}>
                <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5 14 14" /></svg>
              </button>
              <Search key={deck.meta.id} deck={deck} onPick={searchPick} expanded={popover === "search"} onClose={() => setPopover(null)} />
            </>
          )}
          <div className={`topbar-menu${popover === "menu" ? " open" : ""}`} ref={menuRef}>
            <button className="icon-btn menu-btn" aria-label={t.topbar.menu} aria-expanded={popover === "menu"} aria-controls="topbar-menu-items" onClick={() => toggle("menu")}>⋯</button>
            <div className="menu-items" id="topbar-menu-items">
          <select className="source-select locale-select" aria-label={t.topbar.language} value={locale} onChange={(e) => (pickLocale(e.target.value as Locale), setPopover(null))}>
            {(Object.keys(LOCALES) as Locale[]).map((l) => (
              <option key={l} value={l}>{LOCALES[l]}</option>
            ))}
          </select>
          <a className="gh-link" href="https://github.com/zzunebye/harness-as-card-deck" target="_blank" rel="noopener noreferrer" aria-label={t.topbar.viewSource}>
            <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
            <span>zzunebye/harness-as-card-deck</span>
            {repo.stars > 0 && <b className="gh-stars">★ {repo.stars}</b>}
          </a>
            </div>
          </div>
        </header>
        {!deck ? (
          <Lobby decks={decks} onPick={switchSource} />
        ) : (
        <main className={`stage${overlay ? " overlay" : ""}${reading ? " open" : ""}`} style={{ "--panel-w": `${panelW}px` } as React.CSSProperties}>
          <section className="left">
            <Breadcrumbs trail={trail} cards={cards} onJump={(i) => setTrail((t) => t.slice(0, i + 1))} onClear={clear} onOpen={overlay && !panelOpen ? () => setPanelOpen(true) : undefined} />
            <Table key={source} deck={deck} launch={launch} leaving={leaving} enter={enter} lens={lens} phase={phase} selected={selected} route={route} flow={flow} onFlow={setFlow} onDeal={deal} onBackground={dismiss} inset={inset} fast={vw <= PHONE_MAX} />
            {phase === "dealt" && !leaving && deck.flows && (
              <FlowBar deck={deck} replay={replay} onStart={startReplay} onStep={(step) => setReplay((r) => r && { ...r, step })} onClose={() => setReplay(null)} onDetails={overlay && !panelOpen ? () => setPanelOpen(true) : undefined} />
            )}
            {legendTypes.length > 0 && (
              <div className={`legend-box${popover === "legend" ? " open" : ""}`}>
                <button className="icon-btn legend-btn" aria-label={t.topbar.legend} aria-expanded={popover === "legend"} aria-controls="edge-legend" onClick={() => toggle("legend")}>ⓘ</button>
                <ul className="edge-legend" id="edge-legend">
                  {legendTypes.map((t) => (
                    <li key={t} title={edgeDefinition(t)}>
                      <i style={{ background: EDGE_INFO[t].color }} />
                      {EDGE_INFO[t].label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          <div className="resizer" role="separator" aria-orientation="vertical" aria-label={t.topbar.resizePanel} onPointerDown={startResize} />
          <Panel deck={deck} phase={phase} card={shown ? cards.get(shown)! : null} step={route && shown === stepCard ? { n: route.step + 1, total: route.flow.steps.length, reason: route.flow.steps[route.step].reason, quote: route.flow.steps[route.step].quote } : null} lang={lang} onLang={chooseLang} onClose={dismiss} />
        </main>
        )}
      </div>
    </InteractionContext.Provider>
  );
}
