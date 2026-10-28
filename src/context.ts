import { createContext, useContext } from "react";

export interface Interaction {
  hovered: string | null;
  setHovered(id: string | null): void;
  select(id: string): void;
}

export const InteractionContext = createContext<Interaction>({
  hovered: null,
  setHovered: () => {},
  select: () => {},
});

export const useInteraction = () => useContext(InteractionContext);
