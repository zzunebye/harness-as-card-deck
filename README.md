# Harness as Deck (MVP)

Interactive card-deck view of [cursor/plugins `pstack/`](https://github.com/cursor/plugins/tree/main/pstack) and [garrytan/gstack](https://github.com/garrytan/gstack), each pinned to the commit in `vendor/<id>.sha`. Switch between them in the topbar.

- `npm run dev`: builds `src/data/decks.json` from `vendor/`, then starts Vite
- `npm run check`: typecheck and relationship checks
- `npm run build`: static build into `dist/`
- `npm run fetch`: re-download the pinned snapshots
- `data/overrides.json`: manual layer and `{ from, to }` edge corrections applied after regex extraction

Lenses: Layer, Route Tree. Click a card to pull its neighbours out; chips in the SKILL.md panel are linked both ways.
Content is MIT-licensed (see `public/pstack-LICENSE.txt`, `public/gstack-LICENSE.txt`).
