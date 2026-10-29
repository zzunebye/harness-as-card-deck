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

function literals(markdown: string) {
  const out = { code: [] as string[], inline: [] as string[], urls: [] as string[] };
  visit(parse(markdown), (node) => {
    if (node.type === "code") out.code.push(`${node.lang ?? ""}\n${node.value}`);
    else if (node.type === "inlineCode") out.inline.push(node.value);
    else if (node.type === "link" || node.type === "definition") out.urls.push(node.url);
  });
  return out;
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
// Word order differs between languages, so inline code and URLs may move within a sentence but not change.
const sameBag = (a: string[], b: string[]) => sameList([...a].sort(), [...b].sort());
const sameSet = (a: string[], b: string[]) => sameList([...new Set(a)].sort(), [...new Set(b)].sort());

/** Why a translation cannot replace the English body, or null when it can. A translated token that resolves a chip or a changed code block would silently break the panel. */
export function translationProblem(english: string, translated: string, resolver: Resolver, self: string): string | null {
  const en = literals(english);
  const tr = literals(translated);
  if (!sameList(en.code, tr.code)) return "fenced code blocks differ";
  if (!sameBag(en.inline, tr.inline)) return "inline code differs";
  if (!sameBag(en.urls, tr.urls)) return "link URLs differ";
  const enRefs = extractRefs(english, resolver, self);
  const trRefs = extractRefs(translated, resolver, self);
  if (!sameSet(enRefs, trRefs)) return `card references differ (${[...new Set(enRefs)].filter((r) => !trRefs.includes(r)).join(", ") || "extra"})`;
  return null;
}
