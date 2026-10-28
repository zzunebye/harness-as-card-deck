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
  body: string;
  out: number;
  in: number;
}

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
  meta: { id: string; label: string; repo: string; subdir: string; sha: string; version: string; license: string };
  cards: Card[];
  edges: Edge[];
}

export const LAYER_INFO: Record<Layer, { suit: string; label: string; color: string }> = {
  router: { suit: "♠", label: "Router", color: "#23232b" },
  playbook: { suit: "♥", label: "Playbook", color: "#b5322b" },
  skill: { suit: "♦", label: "Skill", color: "#2b6cb5" },
  principle: { suit: "♣", label: "Principle", color: "#1f6b46" },
  agent: { suit: "★", label: "Agent", color: "#7b3fb5" },
};

export const EDGE_INFO: Record<EdgeType, { label: string; color: string }> = {
  "routes-to": { label: "routes-to", color: "#f2c14e" },
  "cites-principle": { label: "cites-principle", color: "#5be0a0" },
  "delegates-to-agent": { label: "delegates-to-agent", color: "#b48cff" },
};
