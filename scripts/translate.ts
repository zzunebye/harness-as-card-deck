import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { translationProblem } from "../src/lib/markdown.ts";
import { createResolver, type Resolver } from "../src/lib/refs.ts";
import { LANGUAGES, type Bodies, type Deck, type Translations } from "../src/types.ts";
import { chunkBody, srcHash, triage } from "./translations.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODEL = "claude-sonnet-5-5";
const CONCURRENCY = 4;
const RETRIES = 2;

const { values } = parseArgs({
  options: { lang: { type: "string" }, deck: { type: "string" }, limit: { type: "string" }, stub: { type: "boolean", default: false } },
});
const lang = values.lang;
if (!lang || !LANGUAGES[lang]) {
  console.error(`--lang <code> is required and must be a key of LANGUAGES in src/types.ts (${Object.keys(LANGUAGES).join(", ")}).`);
  process.exit(1);
}
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey && !values.stub) {
  console.error("ANTHROPIC_API_KEY is not set. Export it, or pass --stub to verify the plumbing without calling the API.");
  process.exit(1);
}
let budget = values.limit ? Number(values.limit) : Infinity;
if (Number.isNaN(budget)) {
  console.error("--limit must be a number.");
  process.exit(1);
}

const system = `You translate Markdown documentation from English into ${LANGUAGES[lang]} (language code ${lang}).
Translate prose only. Keep the following exactly as written, character for character:
- fenced code blocks and inline code
- URLs and link targets
- /slash-names such as /how
- bold text that names a skill, playbook, principle or agent
- YAML frontmatter, and HTML comments
Keep the Markdown structure unchanged: same headings, lists, tables, blockquotes and paragraph order.
Use a natural technical register, as an engineer writing for other engineers in ${LANGUAGES[lang]} would.
Leave established English terms (skill, agent, prompt, PR) in English when that is how the ${LANGUAGES[lang]}-speaking developer community writes them.
Reply with the translated Markdown only, with no preamble and no code fence around it.`;

async function callModel(body: string, feedback: string | null): Promise<string> {
  const content = feedback ? `${body}\n\n---\nYour previous attempt was rejected: ${feedback}. Translate the document above again and fix that.` : body;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 16000, system, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  if (json.stop_reason === "max_tokens") throw new Error("output hit max_tokens");
  return String(json.content?.[0]?.text ?? "").trim();
}

const translate = async (body: string, feedback: string | null) => (values.stub ? `> [stub-${lang}]\n\n${body}` : callModel(body, feedback));

async function translateChunk(chunk: string, resolver: Resolver, id: string): Promise<string> {
  let feedback: string | null = null;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const out = await translate(chunk, feedback);
      feedback = translationProblem(chunk, out, resolver, id);
      if (feedback === null) return out;
    } catch (err) {
      feedback = (err as Error).message;
    }
  }
  throw new Error(feedback!);
}

function save(file: string, data: Translations) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(`${file}.tmp`, JSON.stringify(data, null, 2) + "\n");
  renameSync(`${file}.tmp`, file);
}

const decks = (JSON.parse(readFileSync(join(ROOT, "src/data/decks.json"), "utf8")) as Deck[]).filter((d) => !values.deck || d.meta.id === values.deck);
if (!decks.length) {
  console.error(`No deck ${values.deck}.`);
  process.exit(1);
}

for (const deck of decks) {
  const english = JSON.parse(readFileSync(join(ROOT, "src/data/bodies", `${deck.meta.id}.json`), "utf8")) as Bodies;
  const resolver = createResolver(deck.cards.map(({ id, layer, name, title }) => ({ id, layer, name, title })), deck.meta.id);
  const file = join(ROOT, "data/translations", lang, `${deck.meta.id}.json`);
  const saved: Translations = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const t = triage(english, saved, resolver);
  const todo = [...t.missing, ...t.stale, ...t.rejected.map((r) => r.id)].slice(0, budget);
  budget -= todo.length;
  console.log(`${deck.meta.id}/${lang}: ${Object.keys(t.fresh).length} fresh, ${t.stale.length} stale, ${t.missing.length} missing, ${t.rejected.length} rejected; translating ${todo.length}`);

  const failed: string[] = [];
  const queue = [...todo];
  const worker = async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      try {
        const parts: string[] = [];
        for (const chunk of chunkBody(english[id])) parts.push(await translateChunk(chunk, resolver, id));
        saved[id] = { src: srcHash(english[id]), body: parts.join("\n\n") };
        save(file, saved);
        console.log(`  ok ${id}`);
      } catch (err) {
        failed.push(`${id} (${(err as Error).message})`);
        console.warn(`  left untranslated ${id}: ${(err as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (failed.length) console.warn(`${deck.meta.id}/${lang}: ${failed.length} failed\n  ${failed.join("\n  ")}`);
}
