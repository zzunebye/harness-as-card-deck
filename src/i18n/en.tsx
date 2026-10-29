import type { ReactNode } from "react";
import type { Layer } from "../types.ts";
import type { Lens } from "../lib/layout.ts";

export const en = {
  topbar: {
    allDecks: "All decks",
    deck: "Deck",
    lens: "Lens",
    language: "Language",
    viewSource: "View source on GitHub",
    resizePanel: "Resize panel",
    openSearch: "Search",
    closeSearch: "Close search",
    menu: "More",
    legend: "Edge legend",
  },
  layers: { router: "Router", playbook: "Playbook", skill: "Skill", principle: "Principle", agent: "Agent" } satisfies Record<Layer, string>,
  lenses: { layer: "Layer", tree: "Route Tree", sprint: "Sprint", scatter: "Scatter" } satisfies Record<Lens, string>,
  lobby: {
    pickDeck: "Pick a deck!",
    cardCount: (n: number) => `${n} cards`,
  },
  skills: {
    title: "What is a skill?",
    docsNav: "Claude skills documentation",
    intro: (
      <>
        A skill is a folder with a <code>SKILL.md</code> file. Claude keeps only the skill's name and description in context. When a request matches the description, Claude reads the <code>SKILL.md</code> body, and it reads bundled files only if the body points to them.
      </>
    ),
    links: {
      overview: "Agent Skills overview",
      claudeCode: "Skills in Claude Code",
      bestPractices: "Authoring best practices",
      whatAre: "What are Skills?",
      repo: "anthropics/skills",
    },
  },
  search: {
    label: "Search cards",
    placeholder: "Search cards",
    empty: (query: string) => `No card matches “${query}”.`,
  },
  crumbs: {
    path: "Path",
    read: "read ▸",
    clear: "clear",
  },
  toc: { label: "Table of contents" },
  reading: { settings: "Reading settings", size: "Size", font: "Font" },
  table: {
    cards: "Cards. Arrow keys move between cards, Enter opens one.",
    dealHint: "Click the deck to deal",
    shuffling: "Shuffling…",
    dealDeck: "Deal the deck",
    zoom: "Zoom",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    fit: "Fit",
    inflow: "Inflow",
    outflow: "Outflow",
  },
  card: {
    out: (n: number) => `OUT ${n}`,
    in: (n: number) => `IN ${n}`,
    routes: (n: number) => `${n} routes`,
    uses: (n: number) => `uses ${n}`,
    reads: (n: number) => `reads ${n}`,
    citedBy: (n: number) => `${n} cite it`,
  },
  translation: {
    active: "AI translation",
    banner: "This is an AI machine translation of the original SKILL.md. The English original is authoritative and may differ.",
    viewOriginal: "View original",
    notTranslated: "Not translated yet. Showing the English original.",
    footer: "The text shown is a machine translation of the English original.",
  },
  panel: {
    pickCard: "Pick a card",
    pickCardIntro: (deckLabel: string): ReactNode => (
      <>
        Each card is a real <code>SKILL.md</code> (or playbook) from {deckLabel}. Select one to pull its neighbours out of the deck and read the source here.
        References in the text become chips: hover to find the card, click to jump to it.
      </>
    ),
    close: "Close",
    language: "Language",
    copy: "Copy",
    copied: "Copied",
    copyCode: "Copy code",
    loading: (path: string) => `Loading ${path}…`,
    contentFrom: "Content from",
    license: (name: string) => `${name} License`,
  },
};

export type Messages = typeof en;
