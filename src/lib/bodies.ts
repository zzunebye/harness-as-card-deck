import { useEffect, useState } from "react";
import type { Bodies } from "../types.ts";

// Card markdown is ~95% of the deck data, so each deck's bodies are a separate chunk fetched only once that deck is opened.
const chunks = import.meta.glob<Bodies>("../data/bodies/*.json", { import: "default" });

const pending = new Map<string, Promise<Bodies>>();
const loaded = new Map<string, Bodies>();

export function loadBodies(source: string): Promise<Bodies> {
  const cached = pending.get(source);
  if (cached) return cached;
  const chunk = chunks[`../data/bodies/${source}.json`];
  if (!chunk) throw new Error(`No card bodies for deck ${source}. Run npm run deck.`);
  const p = chunk().then(
    (bodies) => {
      loaded.set(source, bodies);
      return bodies;
    },
    (err) => {
      pending.delete(source);
      throw err;
    },
  );
  pending.set(source, p);
  return p;
}

/** The deck's bodies, or null until they arrive. Already-loaded decks return synchronously, so the panel never flashes a placeholder for them. */
export function useBodies(source: string): Bodies | null {
  const bodies = loaded.get(source) ?? null;
  const [, arrived] = useState(0);
  useEffect(() => {
    if (bodies) return;
    let live = true;
    loadBodies(source).then(() => live && arrived((n) => n + 1));
    return () => {
      live = false;
    };
  }, [source, bodies]);
  return bodies;
}
