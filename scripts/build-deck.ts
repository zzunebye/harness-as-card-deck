import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { createResolver } from "../src/lib/refs.ts";
import { extractRefs } from "../src/lib/markdown.ts";
import { assertEdgeTypes, edgeFromAdd, makeEdge } from "../src/lib/edges.ts";
import { LAYER_ORDER, type Bodies, type Card, type Deck, type Edge, type Layer, type Stage } from "../src/types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const allOverrides = JSON.parse(readFileSync(join(ROOT, "data/overrides.json"), "utf8"));

type RawCard = Omit<Card, "out" | "in"> & { body: string };

interface Source {
  id: string;
  label: string;
  repo: string;
  subdir: string;
  license: string;
  collect(read: (p: string) => string, dir: string): { cards: RawCard[]; version: string };
}

function splitFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  return m ? { data: parseYaml(m[1]) ?? {}, body: raw.slice(m[0].length).trim() } : { data: {}, body: raw.trim() };
}

const heading = (body: string) => body.match(/^#{1,6}\s+(.+)$/m)?.[1].trim();

const leadParagraph = (body: string) => {
  const para = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith("#") && !p.startsWith("```") && !p.startsWith("-"));
  const plain = (para ?? "").replace(/[*`_]/g, "").replace(/\s+/g, " ");
  return plain.length > 200 ? `${plain.slice(0, 200).replace(/\s\S*$/, "")}…` : plain;
};

const subdirs = (dir: string, sub = "") => readdirSync(join(dir, sub), { withFileTypes: true }).filter((d) => d.isDirectory());

const SOURCES: Source[] = [
  {
    id: "pstack",
    label: "pstack",
    repo: "cursor/plugins",
    subdir: "pstack",
    license: "MIT",
    collect(read, dir) {
      const cards: RawCard[] = [];
      for (const d of subdirs(dir, "skills")) {
        const path = `skills/${d.name}/SKILL.md`;
        if (!existsSync(join(dir, path))) continue;
        const { data, body } = splitFrontmatter(read(path));
        const isPrinciple = d.name.startsWith("principle-");
        const isRouter = d.name === "poteto-mode";
        const layer: Layer = isRouter ? "router" : isPrinciple ? "principle" : "skill";
        const name = isPrinciple ? d.name.slice("principle-".length) : d.name;
        cards.push({
          id: `${layer}:${name}`,
          layer,
          name,
          title: heading(body) ?? name,
          description: String(data.description ?? "").trim(),
          path,
          body,
        });
      }

      for (const f of readdirSync(join(dir, "skills/poteto-mode/playbooks")).filter((f) => f.endsWith(".md"))) {
        const path = `skills/poteto-mode/playbooks/${f}`;
        const { body } = splitFrontmatter(read(path));
        const name = f.replace(/\.md$/, "");
        cards.push({ id: `playbook:${name}`, layer: "playbook", name, title: heading(body) ?? name, description: leadParagraph(body.replace(/^#.*\n/, "")), path, body });
      }

      for (const f of readdirSync(join(dir, "agents")).filter((f) => f.endsWith(".md"))) {
        const path = `agents/${f}`;
        const { data, body } = splitFrontmatter(read(path));
        const name = String(data.name ?? f.replace(/\.md$/, ""));
        cards.push({ id: `agent:${name}`, layer: "agent", name, title: heading(body) ?? name, description: String(data.description ?? "").trim(), path, body });
      }
      return { cards, version: JSON.parse(read("plugin.json")).version };
    },
  },
  {
    id: "gstack",
    label: "gstack",
    repo: "garrytan/gstack",
    subdir: "",
    license: "MIT",
    collect(read, dir) {
      const cards: RawCard[] = [];
      for (const d of subdirs(dir)) {
        const path = `${d.name}/SKILL.md`;
        if (!existsSync(join(dir, path))) continue;
        const { data, body } = splitFrontmatter(read(path));
        cards.push({
          id: `skill:${d.name}`,
          layer: "skill",
          name: d.name,
          title: heading(body) ?? d.name,
          description: String(data.description ?? "").trim(),
          path,
          body,
        });
      }
      return { cards, version: read("VERSION").trim() };
    },
  },
  {
    id: "superpowers",
    label: "superpowers",
    repo: "obra/superpowers",
    subdir: "",
    license: "MIT",
    collect(read, dir) {
      const cards: RawCard[] = [];
      for (const d of subdirs(dir, "skills")) {
        const path = `skills/${d.name}/SKILL.md`;
        if (!existsSync(join(dir, path))) continue;
        const { data, body } = splitFrontmatter(read(path));
        cards.push({
          id: `skill:${d.name}`,
          layer: "skill",
          name: d.name,
          title: heading(body) ?? d.name,
          description: String(data.description ?? "").trim(),
          path,
          body,
        });
      }
      return { cards, version: JSON.parse(read("package.json")).version };
    },
  },
  {
    id: "anthropic",
    label: "anthropic skills",
    repo: "anthropics/skills",
    subdir: "",
    license: "Apache-2.0",
    collect(read, dir) {
      const cards: RawCard[] = [];
      for (const d of subdirs(dir, "skills")) {
        const path = `skills/${d.name}/SKILL.md`;
        if (!existsSync(join(dir, path))) continue;
        const { data, body } = splitFrontmatter(read(path));
        cards.push({
          id: `skill:${d.name}`,
          layer: "skill",
          name: d.name,
          title: heading(body) ?? d.name,
          description: String(data.description ?? "").trim(),
          path,
          body,
        });
      }
      // The upstream repo has no version file, so the pinned commit stands in for one.
      return { cards, version: read("../anthropic.sha").trim().slice(0, 7) };
    },
  },
];

function buildDeck(src: Source): { deck: Deck; bodies: Bodies } {
  const dir = join(ROOT, "vendor", src.id);
  const sha = readFileSync(join(ROOT, "vendor", `${src.id}.sha`), "utf8").trim();
  const overrides = allOverrides[src.id];
  const collected = src.collect((p) => readFileSync(join(dir, p), "utf8"), dir);
  const cards = collected.cards.map((c) => ({ ...c, out: 0, in: 0 }));

  for (const c of cards) if (overrides.layer[c.id]) c.layer = overrides.layer[c.id];

  const byId = new Map(cards.map((c) => [c.id, c]));
  const resolver = createResolver(cards.map(({ id, layer, name, title }) => ({ id, layer, name, title })), src.id);

  const edges = new Map<string, Edge>();
  for (const c of cards) {
    for (const target of extractRefs(c.body, resolver, c.id)) {
      const to = byId.get(target)!;
      const key = `${c.id}>${target}`;
      const e = edges.get(key);
      if (e) e.weight++;
      else edges.set(key, makeEdge(c.id, to, 1));
    }
  }
  for (const r of overrides.removeEdges) edges.delete(`${r.from}>${r.to}`);
  for (const a of overrides.addEdges) {
    const edge = edgeFromAdd(a, byId.get(a.to));
    edges.set(`${edge.from}>${edge.to}`, edge);
  }
  assertEdgeTypes(cards, [...edges.values()]);

  for (const e of edges.values()) {
    byId.get(e.from)!.out++;
    byId.get(e.to)!.in++;
  }

  const count = (l: Layer) => cards.filter((c) => c.layer === l).length;
  console.log(`${src.id}: ${cards.length} cards (${LAYER_ORDER.map((l) => `${l} ${count(l)}`).join(", ")}), ${edges.size} edges`);
  const lonely = cards.filter((c) => !c.in && !c.out).map((c) => c.id);
  if (lonely.length) console.log(`${src.id} no edges: ${lonely.join(", ")}`);

  const stages: Stage[] | undefined = overrides.stages;
  if (stages) {
    const listed = new Set<string>();
    for (const st of stages) {
      for (const id of st.cards) {
        if (!byId.has(id)) throw new Error(`${src.id} stage ${st.id}: unknown card ${id}`);
        if (listed.has(id)) throw new Error(`${src.id} stage ${st.id}: ${id} listed twice`);
        listed.add(id);
      }
    }
    const rest = cards.filter((c) => !listed.has(c.id)).map((c) => c.id);
    if (rest.length) {
      console.log(`${src.id} not in a stage: ${rest.join(", ")}`);
      stages.push({ id: "other", label: "Other", utility: true, cards: rest });
    }
  }

  const deck: Deck = {
    ...(stages && { stages }),
    meta: { id: src.id, label: src.label, repo: src.repo, subdir: src.subdir, sha, version: collected.version, license: src.license },
    about: readFileSync(join(ROOT, "data/about", `${src.id}.md`), "utf8").trim(),
    cards: cards.map(({ body: _, ...card }): Card => card),
    edges: [...edges.values()],
  };
  return { deck, bodies: Object.fromEntries(cards.map((c) => [c.id, c.body])) };
}

const built = SOURCES.map(buildDeck);
writeFileSync(join(ROOT, "src/data/decks.json"), JSON.stringify(built.map((b) => b.deck)));
mkdirSync(join(ROOT, "src/data/bodies"), { recursive: true });
for (const { deck, bodies } of built) writeFileSync(join(ROOT, "src/data/bodies", `${deck.meta.id}.json`), JSON.stringify(bodies));

// Star count is baked in at build time so the client makes no GitHub API call. A failed fetch keeps the previous value.
const REPO = "zzunebye/harness-as-card-deck";
const repoFile = join(ROOT, "src/data/repo.json");
let stars: number = existsSync(repoFile) ? JSON.parse(readFileSync(repoFile, "utf8")).stars : 0;
try {
  const res = await fetch(`https://api.github.com/repos/${REPO}`, { signal: AbortSignal.timeout(5000) });
  if (res.ok) stars = (await res.json()).stargazers_count;
} catch {}
writeFileSync(repoFile, JSON.stringify({ stars }));
