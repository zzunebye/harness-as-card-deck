import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Deck } from "../src/types.ts";
import { BACKS } from "../src/lib/backs.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/og.png");
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

interface Pile { label: string; count: number; suit: string; color: string }

const decks: Deck[] = JSON.parse(readFileSync(join(ROOT, "src/data/decks.json"), "utf8"));
const piles: Pile[] = decks.map((d) => ({ label: d.meta.label, count: d.cards.length, ...(BACKS[d.meta.id] ?? BACKS.pstack) }));

const back = (color: string) =>
  `repeating-linear-gradient(45deg, rgba(242,193,78,0.25) 0 2px, transparent 2px 9px), repeating-linear-gradient(-45deg, rgba(242,193,78,0.25) 0 2px, transparent 2px 9px), ${color}`;

// Same deterministic hand-stacked drift as the Lobby, so the image matches what visitors see.
const layer = (i: number, n: number) => {
  const depth = n - 1 - i;
  const x = depth === 0 ? 0 : Math.sin(i * 12.9) * 7;
  const y = depth * 3 + (depth === 0 ? 0 : Math.sin(i * 5.1) * 1.2);
  const r = depth === 0 ? 0 : Math.sin(i * 7.3) * 3;
  return `transform: translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(1)}deg)`;
};

const pileHtml = (p: Pile, tilt: number) => {
  const n = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(p.count))));
  const cards = Array.from({ length: n }, (_, i) =>
    `<i style="background:${back(p.color)};${layer(i, n)}">${i === n - 1 ? p.suit : ""}</i>`).join("");
  return `<figure><div class="stack" style="transform: rotate(${tilt}deg)">${cards}</div><b>${p.label}</b><small>${p.count} cards</small></figure>`;
};

const tilts = piles.map((_, i) => (i - (piles.length - 1) / 2) * 4);

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@500&display=block" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; }
html, body { width: 1200px; height: 630px; overflow: hidden; }
body {
  display: flex; align-items: center; gap: 40px; padding: 0 64px 0 80px; color: #f6f0e2;
  background: radial-gradient(ellipse at 70% 50%, #14503b 0%, #08201a 80%);
  box-shadow: inset 0 0 160px rgba(0,0,0,0.6);
}
.text { flex: 1; }
.suits { font: 600 40px "Fraunces", serif; color: #f2c14e; letter-spacing: 12px; }
h1 { font: 700 112px/0.95 "Fraunces", serif; margin: 18px 0 30px; letter-spacing: -0.01em; }
h1 em { font-style: normal; color: #f2c14e; }
p { font: 500 30px/1.35 "IBM Plex Sans", sans-serif; color: #d9e6df; max-width: 500px; }
.piles { display: flex; gap: 30px; align-items: flex-start; padding-top: 30px; }
figure { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.stack { position: relative; width: 150px; height: 210px; margin-bottom: 30px; }
.stack i {
  position: absolute; inset: 0; border: 6px solid #f6f0e2; border-radius: 12px;
  box-shadow: 0 3px 8px rgba(0,0,0,0.5); display: grid; place-items: center;
  font: 600 64px "Fraunces", serif; font-style: normal; color: #f2c14e;
}
b { font: 600 34px "Fraunces", serif; }
small { font: 500 24px "IBM Plex Mono", monospace; color: #b8c9c1; }
</style></head><body>
<div class="text">
  <div class="suits">♠♥♦♣</div>
  <h1>Harness<br>as <em>Deck</em></h1>
  <p>AI coding-agent harnesses,<br>dealt out as card decks.</p>
</div>
<div class="piles">${piles.map((p, i) => pileHtml(p, tilts[i])).join("")}</div>
</body></html>`;

if (!existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME}. Set CHROME to a Chrome or Chromium binary.`);

const dir = mkdtempSync(join(tmpdir(), "og-"));
try {
  const page = join(dir, "og.html");
  writeFileSync(page, html);
  execFileSync(CHROME, [
    "--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
    "--window-size=1200,630", "--virtual-time-budget=8000", `--user-data-dir=${join(dir, "profile")}`,
    `--screenshot=${OUT}`, `file://${page}`,
  ], { stdio: "pipe" });
} finally {
  rmSync(dir, { recursive: true, force: true });
}
if (!existsSync(OUT)) throw new Error(`Chrome exited without writing ${OUT}`);
console.log(`wrote ${OUT} (${piles.map((p) => `${p.label} ${p.count}`).join(", ")})`);
