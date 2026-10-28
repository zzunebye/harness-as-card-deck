import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PREFS, FONT_STEPS, SIZE_STEPS, loadPrefs, parsePrefs, prefsStyle, savePrefs } from "../src/lib/readingPrefs.ts";

test("garbage input parses to the defaults", () => {
  for (const raw of [null, undefined, 42, "x", [], { size: 1, font: {} }, { size: "huge", font: "comic" }, { size: "toString", font: "__proto__" }]) {
    assert.deepEqual(parsePrefs(raw), DEFAULT_PREFS);
  }
});

test("a partial object keeps the valid field and defaults the other", () => {
  assert.deepEqual(parsePrefs({ size: "xl" }), { size: "xl", font: "sans" });
  assert.deepEqual(parsePrefs({ size: "bogus", font: "serif" }), { size: "m", font: "serif" });
});

test("a value stored before fonts existed still parses", () => {
  assert.deepEqual(parsePrefs({ size: "l", width: "narrow" }), { size: "l", font: "sans" });
});

test("every step in the tables round-trips", () => {
  for (const size of Object.keys(SIZE_STEPS)) {
    for (const font of Object.keys(FONT_STEPS)) assert.deepEqual(parsePrefs({ size, font }), { size, font });
  }
});

test("every step has a label and a css value", () => {
  for (const table of [SIZE_STEPS, FONT_STEPS]) {
    for (const step of Object.values(table)) assert.ok(step.label && step.css);
  }
});

test("prefsStyle maps steps to css variables", () => {
  assert.deepEqual(prefsStyle({ size: "l", font: "mono" }), { "--md-size": "16.5px", "--md-font": "var(--mono)" });
});

test("storage being unavailable does not throw", () => {
  assert.deepEqual(loadPrefs(), DEFAULT_PREFS);
  assert.doesNotThrow(() => savePrefs(DEFAULT_PREFS));
});
