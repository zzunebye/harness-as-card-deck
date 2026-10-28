import type { CSSProperties } from "react";

const BACKS: Record<string, { suit: string; color: string }> = {
  pstack: { suit: "♠", color: "#5a1d1d" },
  gstack: { suit: "♦", color: "#1d3a5a" },
  superpowers: { suit: "♣", color: "#1d5a3a" },
};

export const backStyle = (deckId: string) => {
  const { suit, color } = BACKS[deckId] ?? BACKS.pstack;
  return { "--back": color, "--suit": `"${suit}"` } as CSSProperties;
};
