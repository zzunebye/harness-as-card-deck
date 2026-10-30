import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { LANGUAGES, LAYER_INFO, LAYER_ORDER, type Card, type Deck } from "../types.ts";
import { createResolver } from "../lib/refs.ts";
import { extractHeadings, remarkDropComments, remarkRefs } from "../lib/markdown.ts";
import { useBodies } from "../lib/bodies.ts";
import { useInteraction } from "../context.ts";
import type { Phase } from "./Table.tsx";
import { ReadingControls } from "./ReadingControls.tsx";
import { loadPrefs, prefsStyle, savePrefs, type ReadingPrefs } from "../lib/readingPrefs.ts";
import { Toc, tocHeadings } from "./Toc.tsx";
import { headingComponents } from "../lib/headingComponents.ts";
import { useLocale, useT } from "../i18n/index.ts";
import { matchLocale } from "../i18n/locale.ts";
import { useAbout } from "../lib/about.ts";

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
  return (
    <div className="code-wrap">
      {html ? (
        <div className="code" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="code">
          <code>{code}</code>
        </pre>
      )}
      <CopyButton text={code} />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      className={`copy${copied ? " done" : ""}`}
      aria-label={copied ? t.panel.copied : t.panel.copyCode}
      onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true), () => {})}
    >
      {copied ? t.panel.copied : t.panel.copy}
    </button>
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
      onMouseEnter={() => setHovered(id)}
      onMouseLeave={() => setHovered(null)}
      onClick={() => select(id)}
    >
      <span className="chip-suit">{LAYER_INFO[layer].suit}</span>
      {props.children}
    </button>
  );
}

export function Panel({ deck, phase, card, step, lang, onLang, onClose }: { deck: Deck; phase: Phase; card: Card | null; step?: { n: number; total: number; reason: string; quote?: string } | null; lang: string; onLang(lang: string): void; onClose(): void }) {
  const t = useT();
  const about = useAbout(deck, useLocale());
  // Bodies can exist in languages the interface lacks, which the toggle cannot select.
  const langs = deck.meta.langs.filter((l) => matchLocale(l) === l);
  const resolver = useMemo(() => createResolver(deck.cards.map(({ id, layer, name, title }) => ({ id, layer, name, title })), deck.meta.id), [deck]);
  const scroller = useRef<HTMLDivElement>(null);
  const bodies = useBodies(deck.meta.id);
  const translations = useBodies(deck.meta.id, lang);
  const translated = card && lang !== "en" ? translations?.[card.id] : undefined;
  const body = card ? (translated ?? bodies?.[card.id]) : undefined;
  const headings = useMemo(() => (body ? extractHeadings(body) : []), [body]);
  const toc = useMemo(() => tocHeadings(headings), [headings]);

  const [prefs, setPrefs] = useState(loadPrefs);
  const changePrefs = (next: ReadingPrefs) => {
    setPrefs(next);
    savePrefs(next);
  };

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [card?.id, deck.meta.id]);

  const components = useMemo<Components>(() => {
    return {
        "ref-chip": Chip,
        ...headingComponents(headings),
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
    } as unknown as Components;
  }, [headings]);

  const remarkPlugins = useMemo(() => (card ? [remarkGfm, remarkDropComments, remarkRefs(resolver, card.id)] : [remarkGfm, remarkDropComments]), [resolver, card]);

  if (!card && phase !== "dealt") {
    return (
      <aside className="panel intro" ref={scroller}>
        <h2>{deck.meta.label}</h2>
        <article className="md about">
          <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
            {about}
          </ReactMarkdown>
        </article>
        <Attribution deck={deck} />
      </aside>
    );
  }

  if (!card) {
    return (
      <aside className="panel intro" ref={scroller}>
        <h2>{t.panel.pickCard}</h2>
        <p>{t.panel.pickCardIntro(deck.meta.label)}</p>
        <dl className="legend">
          {LAYER_ORDER.filter((l) => deck.cards.some((c) => c.layer === l)).map((l) => (
            <div key={l}>
              <dt>{LAYER_INFO[l].suit}</dt>
              <dd>{t.layers[l]}</dd>
            </div>
          ))}
        </dl>
        <section className="about-after">
          <h2>{deck.meta.label}</h2>
          <article className="md about">
            <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
              {about}
            </ReactMarkdown>
          </article>
        </section>
        <Attribution deck={deck} />
      </aside>
    );
  }

  const info = LAYER_INFO[card.layer];
  const ui = t.translation;
  return (
    <aside className="panel" ref={scroller} style={prefsStyle(prefs)}>
      <div className="panel-head">
        <span className={`badge badge-${card.layer}`}>
          {info.suit} {t.layers[card.layer]}
        </span>
        <h2>{card.name}</h2>
        <div className="head-actions">
          <ReadingControls prefs={prefs} onChange={changePrefs} />
          <button className="close" onClick={onClose} aria-label={t.panel.close}>
            ✕
          </button>
        </div>
        <a className="src" target="_blank" rel="noreferrer" href={`https://github.com/${deck.meta.repo}/blob/${deck.meta.sha}/${[deck.meta.subdir, card.path].filter(Boolean).join("/")}`}>
          {card.path}
        </a>
        <p className="stat">
          {t.card.out(card.out)} · {t.card.in(card.in)}
        </p>
        {langs.length > 0 && (
          <div className="lang-toggle" role="group" aria-label={t.panel.language}>
            {["en", ...langs].map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} className={lang === l ? "on" : ""} onClick={() => onLang(l)}>
                {l === "en" ? "EN" : `${LANGUAGES[l] ?? l}${l === lang && translated !== undefined ? ` · ${ui.active}` : ""}`}
              </button>
            ))}
          </div>
        )}
      </div>
      {step && (
        <section className="flow-step" aria-label={t.flow.heading}>
          <b className="flow-step-n">{t.flow.step(step.n, step.total)}</b>
          <p>{step.reason}</p>
          {step.quote && <blockquote lang="en">{step.quote}</blockquote>}
        </section>
      )}
      {bodies && (lang === "en" || translations) ? (
        <>
          {toc.length >= 3 && <Toc key={`${card.id}:${lang}`} headings={toc} scroller={scroller} onClose={onClose} />}
          {translated !== undefined && (
            <div className="tr-banner" role="note" lang={lang}>
              <p>{ui.banner}</p>
              <button type="button" onClick={() => onLang("en")}>
                {ui.viewOriginal}
              </button>
            </div>
          )}
          {lang !== "en" && translated === undefined && <p className="tr-note">{ui.notTranslated}</p>}
          <article className="md" lang={translated === undefined ? undefined : lang}>
            <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
              {body}
            </ReactMarkdown>
          </article>
        </>
      ) : (
        <p className="md md-loading" aria-busy="true">
          {t.panel.loading(card.path)}
        </p>
      )}
      <Attribution deck={deck} translatedLang={translated === undefined ? undefined : lang} />
    </aside>
  );
}

function Attribution({ deck, translatedLang }: { deck: Deck; translatedLang?: string }) {
  const t = useT();
  return (
    <p className="attribution">
      {translatedLang && (
        <>
          <span lang={translatedLang}>{t.translation.footer}</span>
          <br />
        </>
      )}
      {t.panel.contentFrom} <a href={`https://github.com/${deck.meta.repo}/tree/${deck.meta.sha}${deck.meta.subdir && `/${deck.meta.subdir}`}`} target="_blank" rel="noreferrer">{deck.meta.repo}</a> · {deck.meta.label} {deck.meta.version} · {deck.meta.sha.slice(0, 7)} ·{" "}
      <a href={`/${deck.meta.id}-LICENSE.txt`} target="_blank" rel="noreferrer">{t.panel.license(deck.meta.license)}</a>
    </p>
  );
}
