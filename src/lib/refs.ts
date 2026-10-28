import { toString } from "mdast-util-to-string";
import { visit, SKIP } from "unist-util-visit";
import type { Root, RootContent, PhrasingContent } from "mdast";
import type { Layer } from "../types.ts";

export interface RefTarget {
  id: string;
  layer: Layer;
  name: string;
  title: string;
}

const PRIORITY: Layer[] = ["skill", "principle", "playbook", "agent", "router"];

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");

export interface Resolver {
  byCode(value: string): string | undefined;
  byBold(text: string): string | undefined;
  byLink(url: string): string | undefined;
  slashPattern: RegExp;
  namespacePattern?: RegExp;
}

export function createResolver(targets: RefTarget[], namespace?: string): Resolver {
  const rank = (t: RefTarget) => PRIORITY.indexOf(t.layer);
  const sorted = [...targets].sort((a, b) => rank(a) - rank(b));
  const aliases = new Map<string, string>();
  const add = (alias: string, id: string) => {
    if (alias && !aliases.has(alias)) aliases.set(alias, id);
  };
  const dirs = new Map<string, string>();
  const playbookFiles = new Map<string, string>();

  for (const t of sorted) {
    add(t.name, t.id);
    add(slugify(t.title), t.id);
    if (t.layer === "principle") add(`principle-${t.name}`, t.id);
    if (t.layer === "playbook") playbookFiles.set(t.name, t.id);
    if (t.layer === "skill" || t.layer === "principle" || t.layer === "router") {
      dirs.set(t.layer === "principle" ? `principle-${t.name}` : t.name, t.id);
    }
  }

  const byPath = (raw: string) => {
    const v = raw.replace(/^\.\//, "");
    const pb = v.match(/(?:^|\/)playbooks\/([\w-]+)\.md$/);
    if (pb) return playbookFiles.get(pb[1]);
    const sk = v.match(/(?:^|\/)([\w-]+)\/SKILL\.md$/);
    if (sk) return dirs.get(sk[1]);
    return undefined;
  };

  const names = [...aliases.keys()].filter((a) => /^[a-z][a-z0-9-]*$/.test(a));
  const slashPattern = new RegExp(`(?<![\\w./-])/(${names.sort((a, b) => b.length - a.length).join("|")})(?![\\w-])`, "g");

  const nsPrefix = namespace ? `${namespace}:` : "";
  const namespacePattern = namespace
    ? new RegExp(`(?<![\\w-])${nsPrefix}(${names.join("|")})(?![\\w-])`, "g")
    : undefined;

  return {
    byCode(value) {
      const v = value.trim().replace(/^\//, "").replace(nsPrefix, "");
      return byPath(v) ?? aliases.get(v) ?? aliases.get(slugify(v));
    },
    byBold(text) {
      return aliases.get(slugify(text.replace(/[.:,;]+$/, "")));
    },
    byLink: byPath,
    slashPattern,
    namespacePattern,
  };
}

const PLAIN_PRINCIPLE = /(?<![\w-])principle-[a-z][a-z-]*[a-z]/g;

function chip(id: string, children: PhrasingContent[]): PhrasingContent {
  return {
    type: "emphasis",
    data: { hName: "ref-chip", hProperties: { dataTarget: id } },
    children,
  };
}

function splitText(value: string, resolver: Resolver, self: string, onRef: (id: string) => void): PhrasingContent[] | null {
  const hits: { start: number; end: number; id: string }[] = [];
  for (const m of value.matchAll(new RegExp(resolver.slashPattern))) {
    const id = resolver.byCode(m[1]);
    if (id && id !== self) hits.push({ start: m.index!, end: m.index! + m[0].length, id });
  }
  if (resolver.namespacePattern) {
    for (const m of value.matchAll(new RegExp(resolver.namespacePattern))) {
      const id = resolver.byCode(m[1]);
      if (id && id !== self) hits.push({ start: m.index!, end: m.index! + m[0].length, id });
    }
  }
  for (const m of value.matchAll(PLAIN_PRINCIPLE)) {
    const id = resolver.byCode(m[0]);
    if (id && id !== self) hits.push({ start: m.index!, end: m.index! + m[0].length, id });
  }
  if (!hits.length) return null;
  hits.sort((a, b) => a.start - b.start);
  const out: PhrasingContent[] = [];
  let at = 0;
  for (const h of hits) {
    if (h.start < at) continue;
    if (h.start > at) out.push({ type: "text", value: value.slice(at, h.start) });
    out.push(chip(h.id, [{ type: "text", value: value.slice(h.start, h.end) }]));
    onRef(h.id);
    at = h.end;
  }
  if (at < value.length) out.push({ type: "text", value: value.slice(at) });
  return out;
}

export function replaceRefs(tree: Root, resolver: Resolver, self: string, onRef: (id: string) => void) {
  visit(tree, (node, index, parent) => {
    if (!parent || index === undefined) return;
    const siblings = parent.children as RootContent[];
    let id: string | undefined;
    let label: PhrasingContent[] | undefined;

    if (node.type === "inlineCode") {
      id = resolver.byCode(node.value);
      label = [{ type: "text", value: node.value }];
    } else if (node.type === "strong") {
      id = resolver.byBold(toString(node));
      label = node.children;
    } else if (node.type === "link") {
      id = resolver.byLink(node.url);
      label = node.children;
    } else if (node.type === "text") {
      const parts = splitText(node.value, resolver, self, onRef);
      if (!parts) return;
      siblings.splice(index, 1, ...(parts as RootContent[]));
      return [SKIP, index + parts.length];
    }

    if (id && id !== self && label) {
      onRef(id);
      siblings[index] = chip(id, label) as RootContent;
      return [SKIP, index + 1];
    }
  });
}
