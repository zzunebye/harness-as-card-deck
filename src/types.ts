export type Layer = "router" | "playbook" | "skill" | "principle" | "agent";
export type EdgeType = "routes-to" | "cites-principle" | "delegates-to-agent" | "next-in-sprint";

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

export interface Deck {
  meta: { id: string; label: string; repo: string; subdir: string; sha: string; version: string; license: string };
  cards: Card[];
  edges: Edge[];
}

export const LAYER_ORDER: Layer[] = ["router", "playbook", "skill", "principle", "agent"];

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
  "next-in-sprint": { label: "next-in-sprint", color: "#6ec1ff" },
};
