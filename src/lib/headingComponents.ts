import { createElement, type ComponentType, type ReactNode } from "react";
import type { Element } from "hast";
import type { Heading } from "./markdown.ts";

export const headingDomId = (id: string) => `sec-${id}`;

type HeadingProps = { node?: Element; children?: ReactNode };

const LEVELS = [
  ["h3", "lv1"],
  ["h4", "lv2"],
  ["h5", "lv3"],
  ["h6", "lv4"],
  ["h6", "lv4"],
  ["h6", "lv4"],
] as const;

export function headingComponents(headings: Heading[]): Record<`h${1 | 2 | 3 | 4 | 5 | 6}`, ComponentType<HeadingProps>> {
  const idAt = new Map(headings.map((h) => [h.offset, headingDomId(h.id)]));
  const level = ([tag, className]: (typeof LEVELS)[number]) => ({ node, children }: HeadingProps) =>
    createElement(tag, { id: idAt.get(node?.position?.start.offset ?? -1), className }, children);
  const [h1, h2, h3, h4, h5, h6] = LEVELS.map(level);
  return { h1, h2, h3, h4, h5, h6 };
}
