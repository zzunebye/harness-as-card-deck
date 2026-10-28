import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { LAYER_INFO, type Card, type Deck } from "../types.ts";
import { createResolver } from "../lib/refs.ts";
import { remarkRefs } from "../lib/markdown.ts";
import { useInteraction } from "../context.ts";

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    import("shiki/bundle/web")
      .then(({ codeToHtml }) => codeToHtml(code, { lang, theme: "github-dark" }))
      .catch(() => null)
      .then((h) => live && setHtml(h));
    return () => {
      live = false;
    };
  }, [code, lang]);
  if (html) return <div className="code" dangerouslySetInnerHTML={{ __html: html }} />;
  return (
    <pre className="code">
      <code>{code}</code>
    </pre>
  );
}

function Chip(props: ComponentProps<"span"> & { "data-target"?: string }) {
  const id = props["data-target"]!;
  const { hovered, setHovered, select } = useInteraction();
  const layer = id.split(":")[0] as keyof typeof LAYER_INFO;
  return (
    <button
      type="button"
      className={`chip chip-${layer}${hovered === id ? " hl" : ""}`}
      data-chip={id}
      onMouseEnter={() => setHovered(id)}
      onMouseLeave={() => setHovered(null)}
      onClick={() => select(id)}
    >
      <span className="chip-suit">{LAYER_INFO[layer].suit}</span>
      {props.children}
    </button>
  );
}

export function Panel({ deck, card, onClose }: { deck: Deck; card: Card | null; onClose(): void }) {
  const resolver = useMemo(() => createResolver(deck.cards.map(({ id, layer, name, title }) => ({ id, layer, name, title })), deck.meta.id), [deck]);
  const scroller = useRef<HTMLDivElement>(null);
  const { hovered } = useInteraction();

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [card?.id]);

  useEffect(() => {
    if (!hovered || !card) return;
    const el = scroller.current?.querySelector(`[data-chip="${CSS.escape(hovered)}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [hovered, card]);

  const components = useMemo<Components>(
    () =>
      ({
        "ref-chip": Chip,
        h1: ({ children }: ComponentProps<"h3">) => <h3 className="lv1">{children}</h3>,
        h2: ({ children }: ComponentProps<"h4">) => <h4 className="lv2">{children}</h4>,
        h3: ({ children }: ComponentProps<"h5">) => <h5 className="lv3">{children}</h5>,
        h4: ({ children }: ComponentProps<"h6">) => <h6 className="lv4">{children}</h6>,
        h5: ({ children }: ComponentProps<"h6">) => <h6 className="lv4">{children}</h6>,
        h6: ({ children }: ComponentProps<"h6">) => <h6 className="lv4">{children}</h6>,
        pre: ({ children }: ComponentProps<"pre">) => <>{children}</>,
        code: ({ className, children }: ComponentProps<"code">) => {
          const text = String(children ?? "");
          const lang = /language-(\w+)/.exec(className ?? "")?.[1];
          return lang || text.includes("\n") ? <CodeBlock code={text.replace(/\n$/, "")} lang={lang ?? "text"} /> : <code>{children}</code>;
        },
        a: ({ href, children }: ComponentProps<"a">) => (
          <a href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        ),
      }) as unknown as Components,
    [],
  );

  const remarkPlugins = useMemo(() => (card ? [remarkGfm, remarkRefs(resolver, card.id)] : [remarkGfm]), [resolver, card]);

  if (!card) {
    return (
      <aside className="panel intro" ref={scroller}>
        <h2>Pick a card</h2>
        <p>
          Each card is a real <code>SKILL.md</code> (or playbook) from {deck.meta.label}. Select one to pull its neighbours out of the deck and read the source here.
          References in the text become chips: hover to find the card, click to jump to it.
        </p>
        <dl className="legend">
          {Object.values(LAYER_INFO).map((l) => (
            <div key={l.label}>
              <dt>{l.suit}</dt>
              <dd>{l.label}</dd>
            </div>
          ))}
        </dl>
        <Attribution deck={deck} />
      </aside>
    );
  }

  const info = LAYER_INFO[card.layer];
  return (
    <aside className="panel" ref={scroller}>
      <div className="panel-head">
        <span className={`badge badge-${card.layer}`}>
          {info.suit} {info.label}
        </span>
        <h2>{card.name}</h2>
        <button className="close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <a className="src" target="_blank" rel="noreferrer" href={`https://github.com/${deck.meta.repo}/blob/${deck.meta.sha}/${[deck.meta.subdir, card.path].filter(Boolean).join("/")}`}>
          {card.path}
        </a>
        <p className="stat">
          OUT {card.out} · IN {card.in}
        </p>
      </div>
      <article className="md">
        <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
          {card.body}
        </ReactMarkdown>
      </article>
      <Attribution deck={deck} />
    </aside>
  );
}

function Attribution({ deck }: { deck: Deck }) {
  return (
    <p className="attribution">
      Content from <a href={`https://github.com/${deck.meta.repo}/tree/${deck.meta.sha}${deck.meta.subdir && `/${deck.meta.subdir}`}`} target="_blank" rel="noreferrer">{deck.meta.repo}</a> · {deck.meta.label} {deck.meta.version} · {deck.meta.sha.slice(0, 7)} ·{" "}
      <a href={`/${deck.meta.id}-LICENSE.txt`} target="_blank" rel="noreferrer">{deck.meta.license} License</a>
    </p>
  );
}
