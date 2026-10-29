import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { headingDomId } from "../lib/headingComponents.ts";
import type { Heading } from "../lib/markdown.ts";
import { useT } from "../i18n/index.ts";

const SPY_MARGIN = 8;

export const tocHeadings = (headings: Heading[]) => headings.filter((h) => h.depth === 2 || h.depth === 3);

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Toc({ headings, scroller }: { headings: Heading[]; scroller: RefObject<HTMLElement | null> }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const bar = useRef<HTMLButtonElement>(null);
  const nav = useRef<HTMLElement>(null);
  const listId = useId();

  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const limit = root.getBoundingClientRect().top + (bar.current?.offsetHeight ?? 0) + SPY_MARGIN;
      let at = 0;
      headings.forEach((h, i) => {
        const el = document.getElementById(headingDomId(h.id));
        if (el && el.getBoundingClientRect().top <= limit) at = i;
      });
      setCurrent(at);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [headings, scroller]);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!nav.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const jump = (i: number) => {
    const root = scroller.current;
    const el = document.getElementById(headingDomId(headings[i].id));
    setOpen(false);
    if (!root || !el) return;
    const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - (bar.current?.offsetHeight ?? 0);
    root.scrollTo({ top, behavior: reducedMotion() ? "auto" : "smooth" });
    setCurrent(i);
    bar.current?.focus({ preventScroll: true });
  };

  return (
    <nav
      ref={nav}
      className="toc"
      aria-label={t.toc.label}
      onKeyDown={(e) => {
        if (e.key !== "Escape" || !open) return;
        e.stopPropagation();
        setOpen(false);
        bar.current?.focus({ preventScroll: true });
      }}
    >
      <button ref={bar} type="button" className="toc-bar" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((o) => !o)}>
        <span className="toc-caret" aria-hidden="true">
          {open ? "▴" : "▾"}
        </span>
        <span className="toc-title">{headings[current].text}</span>
        <span className="toc-pos">
          {current + 1}/{headings.length}
        </span>
      </button>
      {open && (
        <ul id={listId} className="toc-list">
          {headings.map((h, i) => (
            <li key={h.id}>
              <button type="button" className={`toc-item d${h.depth}`} aria-current={i === current ? "location" : undefined} onClick={() => jump(i)}>
                {h.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
