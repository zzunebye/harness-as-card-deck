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

const parse = (markdown: string) => {
  const processor = unified().use(remarkParse).use(remarkGfm);
  return processor.runSync(processor.parse(markdown)) as Root;
};

export type Heading = { id: string; depth: number; text: string; offset: number };

const slugify = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");

export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const used = new Set<string>();
  visit(parse(markdown), "heading", (node) => {
    let text = "";
    visit(node, ["text", "inlineCode"], (leaf) => {
      text += (leaf as { value: string }).value;
    });
    text = text.trim();
    const base = slugify(text) || `section-${headings.length + 1}`;
    let id = base;
    for (let n = 1; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    headings.push({ id, depth: node.depth, text, offset: node.position?.start.offset ?? -1 });
  });
  return headings;
}

export function extractRefs(markdown: string, resolver: Resolver, self: string): string[] {
  const refs: string[] = [];
  replaceRefs(parse(markdown), resolver, self, (id) => refs.push(id));
  return refs;
}
