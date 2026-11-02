# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Harness as Deck: a React + Vite SPA that renders [cursor/plugins `pstack/`](https://github.com/cursor/plugins/tree/main/pstack) (skills, playbooks, principles, agents), [garrytan/gstack](https://github.com/garrytan/gstack), [obra/superpowers](https://github.com/obra/superpowers), [anthropics/skills](https://github.com/anthropics/skills), [EveryInc/compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin), and [mattpocock/skills](https://github.com/mattpocock/skills) (skills) as interactive card decks, switchable in the topbar. Content is MIT-licensed (`public/pstack-LICENSE.txt`, `public/gstack-LICENSE.txt`, `public/superpowers-LICENSE.txt`, `public/compound-LICENSE.txt`, `public/mattpocock-LICENSE.txt`), except anthropics/skills, which is Apache-2.0 (`public/anthropic-LICENSE.txt`); its source-available `docx`, `pdf`, `pptx`, `xlsx` skills are deliberately not vendored.

## Commands

- `npm run dev` — regenerates `src/data/decks.json`, then starts Vite
- `npm run build` — `deck` → `check` → `vite build` into `dist/`
- `npm run check` — `tsc --noEmit` and `node --test` over `scripts/*.test.ts`
- `npm run deck` — regenerate `src/data/decks.json` and `src/data/bodies/*.json` only (`node scripts/build-deck.ts`, runs TS directly via Node)
- `node scripts/bench-load.ts <urlA> <urlB> [runs] [--out runs.json]` — cold-cache first-load benchmark of two `vite preview` builds under Lighthouse-mobile throttling, alternating A and B
- `npm run translate -- --lang ko [--deck gstack] [--limit N] [--stub]` — translate missing or stale card bodies via the Anthropic API (`ANTHROPIC_API_KEY`), writing `data/translations/<lang>/<deck>.json` after each card. `--limit` caps cards per run. `--stub` fakes it for plumbing checks only, never commit its output
- `npm run fetch` — re-download the pinned snapshots into `vendor/pstack` and `vendor/gstack` (commits pinned in `vendor/<id>.sha`; to bump one, edit its SHA then fetch)

## Architecture

Two stages: a build-time data pipeline, and a client that only consumes its output.

**Data pipeline (`scripts/build-deck.ts`)** runs each entry of its `SOURCES` registry (pstack: `vendor/pstack/` skills `SKILL.md`, `playbooks/*.md`, `agents/*.md`; gstack: every top-level `vendor/gstack/<dir>/SKILL.md` as a `skill` card) and emits `src/data/decks.json` (array of `Deck` in `src/types.ts`: meta + body-less cards + weighted edges) plus `src/data/bodies/<id>.json` (`Bodies`, card markdown by card id). Bodies are ~95% of the data, so the client loads each deck's file as its own chunk only once that deck is opened, through `loadBodies` / `useBodies` in `src/lib/bodies.ts`. Nothing else imports the bodies files. Each source is an isolated deck with its own resolver and edges; there are no cross-source edges. Key points:
- Layers: `router` (only `poteto-mode`), `principle` (dirs prefixed `principle-`), `skill`, `playbook`, `agent`.
- Edges are **extracted by regex/markdown parsing**, not declared: `src/lib/markdown.ts#extractRefs` parses each card body with remark and `src/lib/refs.ts` (`createResolver` / `replaceRefs`) resolves `/slash-names`, bold text, inline code, and links/paths to card ids. Alias collisions are resolved by layer `PRIORITY` in `refs.ts`. The relationship is `edgeTypeFor(target.layer)` from `EDGE_TYPE_BY_LAYER` in `src/types.ts`. `makeEdge` in `src/lib/edges.ts` is the writer. `data/overrides.json` `addEdges` are `{ from, to }` only.
- `data/about/<id>.md` is the hand-written introduction to each harness (philosophy, how it works, how to start), copied into `Deck.about`. The panel shows it while the deck is still stacked, before the first deal.
- `data/overrides.json` is the manual curation layer applied after extraction, keyed by source id: `layer` (card id → layer), `removeEdges`, `addEdges`. Fix a wrong edge or layer here rather than in the extractor when it's a one-off.
- `src/lib/refs.ts` is shared: the build script uses it for edge extraction and the client uses the same resolver (via `remarkRefs`) to render linked chips inside the SKILL.md panel, so both directions stay consistent.

**Client (`src/`)**: `App.tsx` owns state (`source`, `phase`: stack → shuffling → dealt, `lens`, selection `trail`, hover) and shares hover/select through `InteractionContext` (`context.ts`). `components/Table.tsx` renders cards positioned by `lib/layout.ts`, which computes a `Pose` per card for each lens (`stack`, `layer`, `tree`) in a fixed `WORLD_W × WORLD_H` coordinate space; animation uses `motion`. `Panel.tsx` renders the selected card's markdown (react-markdown + shiki).

**Interface language (`src/i18n/`)**: `en.tsx` is the source of truth for UI strings, and every other locale (`ko.tsx`) is typed `Messages`, so a missing or extra key fails `npm run check`. Components read strings through `useT()`. Non-English locales are lazy chunks loaded by `I18nProvider`. `locale.ts` holds the pure detection logic: `?lang=` beats the stored pick, which beats `navigator.languages`. Only a picked language is stored and written to the URL. Adding a locale is a `LOCALES` entry plus a file typed `Messages`, and optionally `data/about/<locale>/<id>.md` for the deck intros (lazy chunks via `src/lib/about.ts`, English `Deck.about` until one arrives, structure checked by `scripts/about.test.ts`). A card body is translated only when its language is also a locale (`LANGUAGES` in `src/types.ts` is what `npm run translate` can write).

`src/data/decks.json` and `src/data/bodies/` are generated — don't hand-edit them; `dist/` and `node_modules/` are gitignored build output.

## Rules

| Rule | Enforced by |
| --- | --- |
| A relationship is `edgeTypeFor(target.layer)` (`EDGE_TYPE_BY_LAYER` in `src/types.ts`). `routes-to` targets a router, playbook, or skill. `cites-principle` targets a principle. `delegates-to-agent` targets an agent. Do not set `Edge.type` by hand. | `makeEdge` / `edgeFromAdd` reject an addEdge that includes `type`. `assertEdgeTypes` fails `npm run deck` when a stored type disagrees with the target layer. `npm run check` runs that check on `src/data/decks.json`. |
| The legend renders every relationship the layer map emits, limited to the types the open deck's edges use. | `EdgeType` is the value union of `EDGE_TYPE_BY_LAYER`, so `EDGE_INFO` must have each one. `assertLegendSource` fails `npm run check` when `src/App.tsx` filters the legend. |
