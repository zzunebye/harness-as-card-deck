import type { CSSProperties } from "react";

export const BACKS: Record<string, { suit: string; color: string }> = {
  pstack: { suit: "♠", color: "#5a1d1d" },
  gstack: { suit: "♦", color: "#1d3a5a" },
  superpowers: { suit: "♣", color: "#1d5a3a" },
  anthropic: { suit: "♥", color: "#4a2a12" },
  compound: { suit: "✦", color: "#3a1d5a" },
};

export const backStyle = (deckId: string) => {
  const { suit, color } = BACKS[deckId] ?? BACKS.pstack;
  return { "--back": color, "--suit": `"${suit}"` } as CSSProperties;
};
