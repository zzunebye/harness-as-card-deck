import type { Deck } from "../types.ts";

type Source = Pick<Deck["meta"], "repo" | "subdir" | "sha">;

const blobRoot = ({ repo, sha }: Source) => `https://github.com/${repo}/blob/${sha}/`;

export const sourceUrl = (source: Source, path: string) => blobRoot(source) + [source.subdir, path].filter(Boolean).join("/");

/** Only SKILL.md bodies are vendored, so a relative link in a card opens the file at the deck's pinned commit. */
export function resolveSourceLink(href: string | undefined, source: Source, cardPath: string | undefined) {
  if (!href || !cardPath || /^([a-z][a-z\d+.-]*:|\/\/)/i.test(href)) return href;
  const url = new URL(href, sourceUrl(source, cardPath)).href;
  return url.startsWith(blobRoot(source)) ? url : href;
}
