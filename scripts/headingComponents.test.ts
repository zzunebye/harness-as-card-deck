import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { headingDomId, headingComponents } from "../src/lib/headingComponents.ts";
import { extractHeadings, remarkDropComments, remarkRefs } from "../src/lib/markdown.ts";
import { createResolver } from "../src/lib/refs.ts";

const resolver = createResolver([{ id: "skill:architect", layer: "skill", name: "architect", title: "architect" }], "pstack");

const render = (md: string) => {
  const headings = extractHeadings(md);
  const html = renderToStaticMarkup(
    createElement(ReactMarkdown, { remarkPlugins: [remarkGfm, remarkDropComments, remarkRefs(resolver, "skill:other")], components: headingComponents(headings) as never }, md),
  );
  return { headings, html };
};

const renderedIds = (html: string) => [...html.matchAll(/<h[3-6] id="([^"]+)"/g)].map((m) => m[1]);

test("every extracted heading renders with the id the table of contents jumps to", () => {
  const md = "# Title\n\n## One\n\ntext\n\n### Two\n\n## One\n\n#### Deep\n";
  const { headings, html } = render(md);
  assert.deepEqual(renderedIds(html), headings.map((h) => headingDomId(h.id)));
});

test("ids survive comments, code fences, and card references around headings", () => {
  const md = "<!-- note -->\n\n## Use /architect first\n\n```bash\n# not a heading\n```\n\n<!-- another -->\n\n## After `code` and **bold**\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n### Last\n";
  const { headings, html } = render(md);
  assert.equal(headings.length, 3);
  assert.deepEqual(renderedIds(html), headings.map((h) => headingDomId(h.id)));
});

test("a heading below the fold keeps its own id when an earlier duplicate exists", () => {
  const { html } = render("## Setup\n\n## Setup\n");
  assert.deepEqual(renderedIds(html), ["sec-setup", "sec-setup-1"]);
});

test("heading levels keep their demoted tag and class", () => {
  const { html } = render("# A\n\n## B\n\n### C\n\n#### D\n\n###### F\n");
  assert.match(html, /<h3 id="sec-a" class="lv1">/);
  assert.match(html, /<h4 id="sec-b" class="lv2">/);
  assert.match(html, /<h5 id="sec-c" class="lv3">/);
  assert.match(html, /<h6 id="sec-d" class="lv4">/);
  assert.match(html, /<h6 id="sec-f" class="lv4">/);
});
