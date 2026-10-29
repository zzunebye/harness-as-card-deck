import assert from "node:assert/strict";
import test from "node:test";
import { translationProblem } from "../src/lib/markdown.ts";
import { createResolver } from "../src/lib/refs.ts";
import { chunkBody, srcHash, triage } from "./translations.ts";

const resolver = createResolver(
  [
    { id: "skill:how", layer: "skill", name: "how", title: "How" },
    { id: "principle:prove-it-works", layer: "principle", name: "prove-it-works", title: "Prove It Works" },
  ],
  "pstack",
);

const english = [
  "Run /how first for the overview.",
  "",
  "```sh",
  "npm test",
  "```",
  "",
  "Apply **Prove It Works** and `npm run check`. See [docs](https://example.com/a).",
].join("\n");

const faithful = [
  "개요는 먼저 /how 를 실행하세요.",
  "",
  "```sh",
  "npm test",
  "```",
  "",
  "**Prove It Works** 를 적용하고 `npm run check` 를 실행하세요. [문서](https://example.com/a)를 참고하세요.",
].join("\n");

const problem = (translated: string) => translationProblem(english, translated, resolver, "skill:other");

test("a faithful translation is accepted", () => {
  assert.equal(problem(faithful), null);
});

test("a changed code fence is rejected", () => {
  assert.match(problem(faithful.replace("npm test", "npm 테스트"))!, /code blocks/);
});

test("a translated slash-name is rejected", () => {
  assert.match(problem(faithful.replace("/how", "/어떻게"))!, /card references/);
});

test("a translated card-naming bold token is rejected", () => {
  assert.match(problem(faithful.replace("**Prove It Works**", "**증명하라**"))!, /card references/);
});

test("a changed link URL is rejected", () => {
  assert.match(problem(faithful.replace("example.com/a", "example.com/b"))!, /URLs/);
});

test("inline code that moves within a sentence is accepted", () => {
  const two = "Run `a` then `b`.";
  assert.equal(translationProblem(two, "`b` 를 실행한 뒤 `a` 를 실행하세요.", resolver, "skill:other"), null);
});

test("chunks rejoin to the original and never split inside a code fence", () => {
  const section = (n: number) => `## Part ${n}\n\n\`\`\`sh\n## not a heading ${n}\n\`\`\`\n\n${"word ".repeat(40)}`;
  const body = `intro\n\n${[1, 2, 3, 4].map(section).join("\n\n")}`;
  const chunks = chunkBody(body, 500);
  assert.ok(chunks.length > 1);
  assert.equal(chunks.join("\n"), body);
  assert.ok(chunks.slice(1).every((c) => c.startsWith("## Part")));
  assert.deepEqual(chunkBody(body, 1e9), [body]);
});

test("only translations of the current English body are fresh", () => {
  const bodies = { "skill:how": english, "skill:old": "new text", "skill:todo": "x", "skill:bad": english };
  const saved = {
    "skill:how": { src: srcHash(english), body: faithful },
    "skill:old": { src: srcHash("previous text"), body: "옛 번역" },
    "skill:bad": { src: srcHash(english), body: faithful.replace("npm test", "npm 테스트") },
  };
  const result = triage(bodies, saved, resolver);
  assert.deepEqual(result.fresh, { "skill:how": faithful });
  assert.deepEqual(result.stale, ["skill:old"]);
  assert.deepEqual(result.missing, ["skill:todo"]);
  assert.deepEqual(result.rejected.map((r) => r.id), ["skill:bad"]);
});
