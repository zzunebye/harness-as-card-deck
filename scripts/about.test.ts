import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const dir = new URL("../data/about/", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, dir), "utf8");

const fences = (md: string) => md.match(/^```[\s\S]*?^```/gm) ?? [];
const withoutFences = (md: string) => md.replace(/^```[\s\S]*?^```/gm, "");
const codeSpans = (md: string) => (withoutFences(md).match(/`[^`\n]+`/g) ?? []).map((c) => c.replace(/<[^>]*>/g, "<>")).sort();
const urls = (md: string) => (md.match(/\]\(([^)]+)\)/g) ?? []).sort();
const count = (md: string, re: RegExp) => (withoutFences(md).match(re) ?? []).length;

const locales = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const ids = readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3));

for (const locale of locales) {
  for (const id of ids) {
    test(`${locale} intro for ${id} keeps the English structure`, () => {
      assert.ok(existsSync(new URL(`${locale}/${id}.md`, dir)), `data/about/${locale}/${id}.md is missing`);
      const en = read(`${id}.md`);
      const tr = read(`${locale}/${id}.md`);
      assert.deepEqual(fences(tr), fences(en), "code fences must be unchanged");
      assert.deepEqual(codeSpans(tr), codeSpans(en), "inline code must be unchanged");
      assert.deepEqual(urls(tr), urls(en), "link targets must be unchanged");
      assert.equal(count(tr, /^###? /gm), count(en, /^###? /gm), "heading count must match");
      assert.equal(count(tr, /^\d+\. /gm), count(en, /^\d+\. /gm), "numbered item count must match");
    });
  }
}
