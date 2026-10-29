import assert from "node:assert/strict";
import test from "node:test";
import { chosenLocale, matchLocale, systemLocale } from "../src/i18n/locale.ts";

test("a regional tag matches its primary language", () => {
  assert.equal(matchLocale("ko-KR"), "ko");
  assert.equal(matchLocale("EN-us"), "en");
  assert.equal(matchLocale("fr"), null);
  assert.equal(matchLocale(null), null);
});

test("the first supported browser language wins, in the reader's order", () => {
  assert.equal(systemLocale(["fr-FR", "ko-KR", "en"]), "ko");
  assert.equal(systemLocale(["fr", "de"]), "en");
  assert.equal(systemLocale([]), "en");
});

test("a URL pick beats the stored pick, and no pick is null", () => {
  assert.equal(chosenLocale("?lang=en", "ko"), "en");
  assert.equal(chosenLocale("", "ko"), "ko");
  assert.equal(chosenLocale("?lang=xx", "xx"), null);
  assert.equal(chosenLocale("", null), null);
});
