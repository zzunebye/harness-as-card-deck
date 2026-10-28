import assert from "node:assert/strict";
import test from "node:test";
import { extractHeadings } from "../src/lib/markdown.ts";

const texts = (md: string) => extractHeadings(md).map((h) => `${h.depth}:${h.text}`);

test("nested depths are all returned in document order", () => {
  assert.deepEqual(texts("# A\n\n## B\n\n### C\n\n#### D\n\n## E\n"), ["1:A", "2:B", "3:C", "4:D", "2:E"]);
});

test("# lines inside fenced code are not headings", () => {
  const md = "## Real\n\n```\n# not a heading\n```\n\n~~~\n## nor this\n~~~\n\n```bash\n# comment\necho hi\n```\n\n## Also real\n";
  assert.deepEqual(texts(md), ["2:Real", "2:Also real"]);
});

test("duplicate headings get distinct ids", () => {
  const ids = extractHeadings("## Setup\n\n## Setup\n\n## Setup\n").map((h) => h.id);
  assert.equal(new Set(ids).size, 3);
  assert.equal(ids[0], "setup");
});

test("inline code and emphasis contribute their text", () => {
  const [h] = extractHeadings("## Run `npm test` for **all** _packages_\n");
  assert.equal(h.text, "Run npm test for all packages");
  assert.equal(h.id, "run-npm-test-for-all-packages");
});

test("Korean headings keep their letters in the id", () => {
  const [h] = extractHeadings("## 설치 방법\n");
  assert.equal(h.text, "설치 방법");
  assert.equal(h.id, "설치-방법");
});

test("a heading with no sluggable text still gets a non-empty unique id", () => {
  const ids = extractHeadings("## Intro\n\n## ???\n\n## !!!\n").map((h) => h.id);
  assert.ok(ids.every((id) => id.length > 0));
  assert.equal(new Set(ids).size, 3);
});

test("offset points at the heading line in the source", () => {
  const md = "intro\n\n```\n# fake\n```\n\n## Real one\n\ntext\n\n### Sub\n";
  for (const h of extractHeadings(md)) assert.ok(md.slice(h.offset).startsWith("#".repeat(h.depth) + " " + h.text));
});

test("a body without headings yields none, and h1-only bodies carry no h2 or h3", () => {
  assert.deepEqual(extractHeadings("just text\n\n- a list\n"), []);
  assert.equal(extractHeadings("# Title\n\ntext\n").filter((h) => h.depth === 2 || h.depth === 3).length, 0);
});
