import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root } from "mdast";
import { replaceRefs, type Resolver } from "./refs.ts";

export const remarkRefs = (resolver: Resolver, self: string) => () => (tree: Root) =>
  replaceRefs(tree, resolver, self, () => {});

export function extractRefs(markdown: string, resolver: Resolver, self: string): string[] {
  const refs: string[] = [];
  const processor = unified().use(remarkParse).use(remarkGfm);
  const tree = processor.runSync(processor.parse(markdown)) as Root;
  replaceRefs(tree, resolver, self, (id) => refs.push(id));
  return refs;
}
