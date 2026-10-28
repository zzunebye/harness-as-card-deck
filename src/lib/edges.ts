import { edgeTypeFor, type Edge, type Layer } from "../types.ts";

export function makeEdge(from: string, to: { id: string; layer: Layer }, weight: number): Edge {
  return { from, to: to.id, type: edgeTypeFor(to.layer), weight };
}

export function edgeFromAdd(raw: unknown, target: { id: string; layer: Layer } | undefined): Edge {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("addEdges entries are { from, to }. makeEdge assigns the relationship via edgeTypeFor(target.layer) in src/types.ts.");
  }
  const row = raw as Record<string, unknown>;
  if ("type" in row) {
    throw new Error(
      `addEdges ${String(row.from)} -> ${String(row.to)} sets "type" ("${String(row.type)}"). Remove it. makeEdge assigns the relationship via edgeTypeFor(target.layer) in src/types.ts.`,
    );
  }
  if (typeof row.from !== "string" || typeof row.to !== "string") {
    throw new Error("addEdges entries are { from, to }. makeEdge assigns the relationship via edgeTypeFor(target.layer) in src/types.ts.");
  }
  if (!target || target.id !== row.to) {
    throw new Error(`addEdges target ${row.to} is not a card. edgeTypeFor needs that card's layer from src/types.ts.`);
  }
  return makeEdge(row.from, target, 1);
}

export function assertEdgeTypes(cards: { id: string; layer: Layer }[], edges: { from: string; to: string; type: string }[]): void {
  const layerOf = new Map(cards.map((card) => [card.id, card.layer]));
  for (const edge of edges) {
    const layer = layerOf.get(edge.to);
    if (!layer) {
      throw new Error(`edge ${edge.from} -> ${edge.to} has no target card. Relationships come from edgeTypeFor(target.layer) in src/types.ts.`);
    }
    const expected = edgeTypeFor(layer);
    if (edge.type !== expected) {
      throw new Error(
        `edge ${edge.from} -> ${edge.to} has type "${edge.type}" but target layer "${layer}" is "${expected}". Use edgeTypeFor() in src/types.ts. Do not set Edge.type by hand.`,
      );
    }
  }
}

export function assertLegendSource(source: string): void {
  const at = source.indexOf('className="edge-legend"');
  if (at < 0) {
    throw new Error("src/App.tsx is missing the edge legend. Render every key of EDGE_INFO. The relationship list is EDGE_TYPE_BY_LAYER in src/types.ts.");
  }
  const end = source.indexOf("</ul>", at);
  const legend = source.slice(at, end === -1 ? undefined : end);
  if (legend.includes(".filter(") || legend.includes("next-in-sprint")) {
    throw new Error(
      "src/App.tsx legend must list every EDGE_INFO key. The relationship list is EDGE_TYPE_BY_LAYER in src/types.ts. Do not filter one out.",
    );
  }
}
