import type { Bodies, Card } from "../types.ts";

export type SearchField = "name" | "description" | "body";

export interface SearchHit {
  id: string;
  score: number;
  field: SearchField;
  /** Text around the first body match, only for a hit that matched nowhere but the body. */
  snippet: string | null;
}

const SNIPPET_RADIUS = 40;

const normalize = (s: string) => s.toLowerCase().replace(/[-_:/]/g, " ");

function nameScore(name: string, token: string): number {
  if (name === token) return 100;
  if (name.startsWith(token)) return 80;
  if (name.split(" ").some((w) => w.startsWith(token))) return 70;
  return name.includes(token) ? 60 : 0;
}

/** Every whitespace-separated token must match somewhere in the card. Name beats description beats body. */
export function searchCards(cards: Card[], bodies: Bodies | null, query: string, limit = 8): SearchHit[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const card of cards) {
    const name = normalize(card.name);
    const description = normalize(card.description);
    const body = bodies ? normalize(bodies[card.id] ?? "") : "";
    let score = 0;
    let field: SearchField = "body";
    let best = 0;
    let bodyAt = -1;
    let matched = true;
    for (const token of tokens) {
      const byName = nameScore(name, token);
      const byDescription = description.includes(token) ? 30 : 0;
      const at = body.indexOf(token);
      const byBody = at >= 0 ? 10 : 0;
      const top = Math.max(byName, byDescription, byBody);
      if (top === 0) {
        matched = false;
        break;
      }
      score += top;
      if (top > best) {
        best = top;
        field = byName === top ? "name" : byDescription === top ? "description" : "body";
      }
      if (bodyAt < 0 && top === byBody) bodyAt = at;
    }
    if (!matched) continue;
    hits.push({ id: card.id, score, field, snippet: field === "body" ? snippetAt(bodies![card.id], bodyAt) : null });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

function snippetAt(body: string, at: number): string {
  const start = Math.max(0, at - SNIPPET_RADIUS);
  const text = body.slice(start, at + SNIPPET_RADIUS * 2).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${text}…`;
}
