import { createHash } from "node:crypto";
import { translationProblem } from "../src/lib/markdown.ts";
import type { Resolver } from "../src/lib/refs.ts";
import type { Bodies, Translations } from "../src/types.ts";

export const srcHash = (body: string) => createHash("sha256").update(body).digest("hex").slice(0, 12);

export interface Triage {
  fresh: Bodies;
  stale: string[];
  missing: string[];
  rejected: { id: string; reason: string }[];
}

/** Splits at level-2 headings outside code fences, so each piece parses on its own and a long card fits one model response. */
export function chunkBody(body: string, max = 20000): string[] {
  const sections: string[][] = [[]];
  let fence: string | null = null;
  for (const line of body.split("\n")) {
    const open = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (open) fence = fence === null ? open : open[0] === fence[0] && open.length >= fence.length ? null : fence;
    else if (fence === null && line.startsWith("## ") && sections.at(-1)!.length) sections.push([]);
    sections.at(-1)!.push(line);
  }
  const chunks: string[] = [];
  let current = "";
  for (const section of sections.map((lines) => lines.join("\n"))) {
    if (current && current.length + section.length > max) {
      chunks.push(current);
      current = section;
    } else current = current ? `${current}\n${section}` : section;
  }
  chunks.push(current);
  return chunks;
}

/** Sorts every English card into fresh (usable translation), stale (English changed since), missing, or rejected (fails the invariants). */
export function triage(english: Bodies, saved: Translations, resolver: Resolver): Triage {
  const out: Triage = { fresh: {}, stale: [], missing: [], rejected: [] };
  for (const [id, body] of Object.entries(english)) {
    const entry = saved[id];
    if (!entry) out.missing.push(id);
    else if (entry.src !== srcHash(body)) out.stale.push(id);
    else {
      const reason = translationProblem(body, entry.body, resolver, id);
      if (reason) out.rejected.push({ id, reason });
      else out.fresh[id] = entry.body;
    }
  }
  return out;
}
