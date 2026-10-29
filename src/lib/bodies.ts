import { useEffect, useState } from "react";
import type { Bodies } from "../types.ts";

// Card markdown is ~95% of the deck data, so each deck's bodies are a separate chunk fetched only once that deck is opened.
// A translation is its own chunk under <lang>/, fetched only once that language is selected.
const chunks = {
  ...import.meta.glob<Bodies>("../data/bodies/*.json", { import: "default" }),
  ...import.meta.glob<Bodies>("../data/bodies/*/*.json", { import: "default" }),
};

const pending = new Map<string, Promise<Bodies>>();
const loaded = new Map<string, Bodies>();

const keyOf = (source: string, lang: string) => (lang === "en" ? source : `${lang}/${source}`);

export function loadBodies(source: string, lang = "en"): Promise<Bodies> {
  const key = keyOf(source, lang);
  const cached = pending.get(key);
  if (cached) return cached;
  const chunk = chunks[`../data/bodies/${key}.json`];
  if (!chunk) throw new Error(`No card bodies for ${key}. Run npm run deck.`);
  const p = chunk().then(
    (bodies) => {
      loaded.set(key, bodies);
      return bodies;
    },
    (err) => {
      pending.delete(key);
      throw err;
    },
  );
  pending.set(key, p);
  return p;
}

/** The deck's bodies, or null until they arrive. Already-loaded decks return synchronously, so the panel never flashes a placeholder for them. */
export function useBodies(source: string, lang = "en"): Bodies | null {
  const bodies = loaded.get(keyOf(source, lang)) ?? null;
  const [, arrived] = useState(0);
  useEffect(() => {
    if (bodies) return;
    let live = true;
    loadBodies(source, lang).then(() => live && arrived((n) => n + 1));
    return () => {
      live = false;
    };
  }, [source, lang, bodies]);
  return bodies;
}
