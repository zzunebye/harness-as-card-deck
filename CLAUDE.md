# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Skill Deck Explorer: a React + Vite SPA that renders [cursor/plugins `pstack/`](https://github.com/cursor/plugins/tree/main/pstack) (skills, playbooks, principles, agents) and [garrytan/gstack](https://github.com/garrytan/gstack) (skills) as interactive card decks, switchable in the topbar. Content is MIT-licensed (`public/pstack-LICENSE.txt`, `public/gstack-LICENSE.txt`). Not a git repo; no test or lint setup.

## Commands

- `npm run dev` — regenerates `src/data/decks.json`, then starts Vite
- `npm run build` — `deck` → `tsc --noEmit` → `vite build` into `dist/` (typecheck is the only static check)
- `npm run deck` — regenerate `src/data/decks.json` only (`node scripts/build-deck.ts`, runs TS directly via Node)
- `npm run fetch` — re-download the pinned snapshots into `vendor/pstack` and `vendor/gstack` (commits pinned in `vendor/<id>.sha`; to bump one, edit its SHA then fetch)

## Architecture

Two stages: a build-time data pipeline, and a client that only consumes its output.

**Data pipeline (`scripts/build-deck.ts`)** runs each entry of its `SOURCES` registry (pstack: `vendor/pstack/` skills `SKILL.md`, `playbooks/*.md`, `agents/*.md`; gstack: every top-level `vendor/gstack/<dir>/SKILL.md` as a `skill` card) and emits `src/data/decks.json` (array of `Deck` in `src/types.ts`: meta + cards + weighted edges). Each source is an isolated deck with its own resolver and edges; there are no cross-source edges. Key points:
- Layers: `router` (only `poteto-mode`), `principle` (dirs prefixed `principle-`), `skill`, `playbook`, `agent`.
- Edges are **extracted by regex/markdown parsing**, not declared: `src/lib/markdown.ts#extractRefs` parses each card body with remark and `src/lib/refs.ts` (`createResolver` / `replaceRefs`) resolves `/slash-names`, bold text, inline code, and links/paths to card ids. Alias collisions are resolved by layer `PRIORITY` in `refs.ts`. Edge type is derived from the target's layer (`routes-to`, `cites-principle`, `delegates-to-agent`).
- `data/overrides.json` is the manual curation layer applied after extraction, keyed by source id: `layer` (card id → layer), `removeEdges`, `addEdges`. Fix wrong edges/layers here rather than in the extractor when it's a one-off.
- `src/lib/refs.ts` is shared: the build script uses it for edge extraction and the client uses the same resolver (via `remarkRefs`) to render linked chips inside the SKILL.md panel, so both directions stay consistent.

**Client (`src/`)**: `App.tsx` owns state (`source`, `phase`: stack → shuffling → dealt, `lens`, selection `trail`, hover) and shares hover/select through `InteractionContext` (`context.ts`). `components/Table.tsx` renders cards positioned by `lib/layout.ts`, which computes a `Pose` per card for each lens (`stack`, `layer`, `tree`) in a fixed `WORLD_W × WORLD_H` coordinate space; animation uses `motion`. `Panel.tsx` renders the selected card's markdown (react-markdown + shiki).

`src/data/decks.json` is generated — don't hand-edit it; `dist/` and `node_modules/` are gitignored build output.
