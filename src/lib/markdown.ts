import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root } from "mdast";
import { visit, SKIP } from "unist-util-visit";
import { replaceRefs, type Resolver } from "./refs.ts";

const COMMENT = /^<!--[\s\S]*-->$/;

// Without raw HTML rendering, comments would show as text; GitHub hides them. Other HTML nodes are mostly <placeholders> that should stay visible.
export const remarkDropComments = () => (tree: Root) =>
  visit(tree, "html", (node, index, parent) => {
    if (!parent || index === undefined || !COMMENT.test(node.value.trim())) return;
    parent.children.splice(index, 1);
    return [SKIP, index];
  });

export const remarkRefs = (resolver: Resolver, self: string) => () => (tree: Root) =>
  replaceRefs(tree, resolver, self, () => {});

export function extractRefs(markdown: string, resolver: Resolver, self: string): string[] {
  const refs: string[] = [];
  const processor = unified().use(remarkParse).use(remarkGfm);
  const tree = processor.runSync(processor.parse(markdown)) as Root;
  replaceRefs(tree, resolver, self, (id) => refs.push(id));
  return refs;
}
