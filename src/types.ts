export const LAYER_ORDER = ["router", "playbook", "skill", "principle", "agent"] as const;
export type Layer = (typeof LAYER_ORDER)[number];

export const EDGE_TYPE_BY_LAYER = {
  router: "routes-to",
  playbook: "routes-to",
  skill: "routes-to",
  principle: "cites-principle",
  agent: "delegates-to-agent",
} as const satisfies Record<Layer, string>;
export type EdgeType = (typeof EDGE_TYPE_BY_LAYER)[Layer];

export function edgeTypeFor(layer: Layer): EdgeType {
  return EDGE_TYPE_BY_LAYER[layer];
}

export function edgeDefinition(type: EdgeType): string {
  const layers = LAYER_ORDER.filter((layer) => EDGE_TYPE_BY_LAYER[layer] === type);
  return `Target layer: ${layers.join(", ")}.`;
}

export interface Card {
  id: string;
  layer: Layer;
  name: string;
  title: string;
  description: string;
  path: string;
  out: number;
  in: number;
}

/** Card markdown by card id. One lazily loaded chunk per deck, see `src/lib/bodies.ts`. */
export type Bodies = Record<string, string>;

/** Committed translations in `data/translations/<lang>/<deck>.json`. `src` is the first 12 hex chars of sha256 of the English body the entry was translated from. */
export type Translations = Record<string, { src: string; body: string }>;

/** Languages `npm run translate` can write card bodies in. The interface languages are `LOCALES` in `src/i18n/locale.ts`, and a body is shown only when its language is one of those. */
export const LANGUAGES: Record<string, string> = { ko: "한국어", ja: "日本語", zh: "中文", es: "Español" };

export interface Edge {
  from: string;
  to: string;
  type: EdgeType;
  weight: number;
}

export interface Stage {
  id: string;
  label: string;
  /** Not a step in the sequence (shown without a number). */
  utility?: boolean;
  cards: string[];
}

export interface Deck {
  /** Ordered workflow stages; only decks without meaningful layers set this. */
  stages?: Stage[];
  meta: { id: string; label: string; repo: string; subdir: string; sha: string; version: string; license: string;
    /** Languages with at least one fresh translation in this deck. */
    langs: string[];
  };
  /** Markdown introducing the harness itself, from `data/about/<id>.md`. */
  about: string;
  cards: Card[];
  edges: Edge[];
}

export const LAYER_INFO: Record<Layer, { suit: string; color: string }> = {
  router: { suit: "♠", color: "#23232b" },
  playbook: { suit: "♥", color: "#b5322b" },
  skill: { suit: "♦", color: "#2b6cb5" },
  principle: { suit: "♣", color: "#1f6b46" },
  agent: { suit: "★", color: "#7b3fb5" },
};

export const EDGE_INFO: Record<EdgeType, { label: string; color: string }> = {
  "routes-to": { label: "routes-to", color: "#f2c14e" },
  "cites-principle": { label: "cites-principle", color: "#5be0a0" },
  "delegates-to-agent": { label: "delegates-to-agent", color: "#b48cff" },
};
