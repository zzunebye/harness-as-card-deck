import { useEffect, useRef, useState } from "react";
import { FONT_STEPS, SIZE_STEPS, type ReadingPrefs } from "../lib/readingPrefs.ts";
import { useT } from "../i18n/index.ts";

type Group = { key: keyof ReadingPrefs; steps: Record<string, { label: string }> };

const GROUPS: Group[] = [
  { key: "size", steps: SIZE_STEPS },
  { key: "font", steps: FONT_STEPS },
];

export function ReadingControls({ prefs, onChange }: { prefs: ReadingPrefs; onChange(next: ReadingPrefs): void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
    };
    const onDown = (e: MouseEvent) => root.current?.contains(e.target as Node) || setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <div className="reading" ref={root}>
      <button type="button" className="reading-btn" aria-label={t.reading.settings} aria-expanded={open} onClick={() => setOpen(!open)}>
        Aa
      </button>
      {open && (
        <div className="reading-pop">
          {GROUPS.map((g) => (
            <div key={g.key} className="reading-row">
              <span className="reading-label">{t.reading[g.key]}</span>
              <div className="lang-toggle" role="group" aria-label={t.reading[g.key]}>
                {Object.entries(g.steps).map(([step, { label }]) => (
                  <button key={step} type="button" aria-pressed={prefs[g.key] === step} className={prefs[g.key] === step ? "on" : ""} onClick={() => onChange({ ...prefs, [g.key]: step })}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
