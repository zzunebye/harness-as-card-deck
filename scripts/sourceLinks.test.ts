import assert from "node:assert/strict";
import test from "node:test";
import { resolveSourceLink, sourceUrl } from "../src/lib/sourceLinks.ts";

const root = { repo: "o/r", subdir: "", sha: "abc" };
const nested = { repo: "o/r", subdir: "pstack", sha: "abc" };
const blob = "https://github.com/o/r/blob/abc";

test("the source URL includes the deck's subdir only when it has one", () => {
  assert.equal(sourceUrl(root, "skills/a/SKILL.md"), `${blob}/skills/a/SKILL.md`);
  assert.equal(sourceUrl(nested, "skills/a/SKILL.md"), `${blob}/pstack/skills/a/SKILL.md`);
});

test("a sibling file resolves next to the card at the pinned commit", () => {
  assert.equal(resolveSourceLink("tests.md", root, "skills/engineering/tdd/SKILL.md"), `${blob}/skills/engineering/tdd/tests.md`);
  assert.equal(resolveSourceLink("./domain.md", root, "skills/s/SKILL.md"), `${blob}/skills/s/domain.md`);
});

test("parent paths resolve through the deck's subdir", () => {
  assert.equal(resolveSourceLink("../../README.md", nested, "skills/a/SKILL.md"), `${blob}/pstack/README.md`);
});

test("a heading anchor points into the card's source file", () => {
  assert.equal(resolveSourceLink("#ticket-types", root, "skills/a/SKILL.md"), `${blob}/skills/a/SKILL.md#ticket-types`);
});

test("absolute links and other schemes are left alone", () => {
  for (const href of ["https://example.com/a.md", "mailto:a@example.com", "//example.com/a"]) {
    assert.equal(resolveSourceLink(href, root, "skills/a/SKILL.md"), href);
  }
});

test("a link that leaves the repository is left alone", () => {
  assert.equal(resolveSourceLink("../../../../x.md", root, "skills/a/SKILL.md"), "../../../../x.md");
  assert.equal(resolveSourceLink("/x.md", root, "skills/a/SKILL.md"), "/x.md");
});

test("no card or no href leaves the link unchanged", () => {
  assert.equal(resolveSourceLink("a.md", root, undefined), "a.md");
  assert.equal(resolveSourceLink(undefined, root, "skills/a/SKILL.md"), undefined);
});
