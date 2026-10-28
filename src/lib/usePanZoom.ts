import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { WORLD_H, WORLD_W } from "./layout.ts";

export interface Fit {
  scale: number;
  x: number;
  y: number;
}

interface View {
  /** Zoom relative to the fitted view (1 = whole world visible). */
  k: number;
  /** Pan offset in screen px, applied after the fit translation. */
  x: number;
  y: number;
}

const FIT_VIEW: View = { k: 1, x: 0, y: 0 };
const MAX_K = 6;
const MARGIN = 80;
const DRAG_PX = 4;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Wheel / pinch zoom about the pointer, drag pan, and +/-/fit controls for the fixed-size world. */
export function usePanZoom(wrap: RefObject<HTMLElement | null>, fit: Fit, inset: number, resetKey: unknown) {
  const [view, setView] = useState<View>(FIT_VIEW);
  const [live, setLive] = useState(false);
  const [panning, setPanning] = useState(false);

  const viewRef = useRef(view);
  const fitRef = useRef(fit);
  const insetRef = useRef(inset);
  viewRef.current = view;
  fitRef.current = fit;
  insetRef.current = inset;

  const commit = useCallback(
    (k: number, x: number, y: number) => {
      const el = wrap.current;
      const f = fitRef.current;
      if (!el || k <= 1) return setView(FIT_VIEW);
      const s = f.scale * k;
      const tx = clamp(f.x + x, MARGIN - WORLD_W * s, el.clientWidth - insetRef.current - MARGIN);
      const ty = clamp(f.y + y, MARGIN - WORLD_H * s, el.clientHeight - MARGIN);
      setView({ k, x: tx - f.x, y: ty - f.y });
    },
    [wrap],
  );

  const zoomAt = useCallback(
    (factor: number, px: number, py: number) => {
      const f = fitRef.current;
      const v = viewRef.current;
      const k = clamp(v.k * factor, 1, MAX_K);
      const s1 = f.scale * v.k;
      const s2 = f.scale * k;
      const wx = (px - f.x - v.x) / s1;
      const wy = (py - f.y - v.y) / s1;
      commit(k, px - wx * s2 - f.x, py - wy * s2 - f.y);
    },
    [commit],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const el = wrap.current;
      if (el) zoomAt(factor, (el.clientWidth - insetRef.current) / 2, el.clientHeight / 2);
    },
    [wrap, zoomAt],
  );
  const reset = useCallback(() => setView(FIT_VIEW), []);

  /** Pan so a world point is on screen (keyboard navigation can land on an off-screen card). */
  const reveal = useCallback(
    (wx: number, wy: number) => {
      const el = wrap.current;
      const f = fitRef.current;
      const v = viewRef.current;
      if (!el || v.k <= 1) return;
      const s = f.scale * v.k;
      const w = el.clientWidth - insetRef.current;
      const h = el.clientHeight;
      const sx = f.x + v.x + wx * s;
      const sy = f.y + v.y + wy * s;
      if (sx > MARGIN && sx < w - MARGIN && sy > MARGIN && sy < h - MARGIN) return;
      commit(v.k, w / 2 - wx * s - f.x, h / 2 - wy * s - f.y);
    },
    [wrap, commit],
  );

  useEffect(reset, [resetKey, reset]);

  const wheelTimer = useRef(0);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      setLive(true);
      clearTimeout(wheelTimer.current);
      wheelTimer.current = window.setTimeout(() => setLive(false), 150);
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      clearTimeout(wheelTimer.current);
    };
  }, [wrap, zoomAt]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const down = useRef({ x: 0, y: 0 });
  const dragged = useRef(false);
  const swallowClick = useRef(false);

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest(".zoom-ctl")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      down.current = { x: e.clientX, y: e.clientY };
      dragged.current = false;
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    const r = e.currentTarget.getBoundingClientRect();

    if (pointers.current.size === 2) {
      const other = [...pointers.current].find(([id]) => id !== e.pointerId)![1];
      const before = Math.hypot(prev.x - other.x, prev.y - other.y);
      const after = Math.hypot(cur.x - other.x, cur.y - other.y);
      if (!before) return;
      dragged.current = true;
      setLive(true);
      zoomAt(after / before, (cur.x + other.x) / 2 - r.left, (cur.y + other.y) / 2 - r.top);
      return;
    }

    const v = viewRef.current;
    if (v.k <= 1) return;
    if (!dragged.current) {
      if (Math.hypot(cur.x - down.current.x, cur.y - down.current.y) < DRAG_PX) return;
      dragged.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // pointer already gone; panning still works through the move events
      }
      setPanning(true);
      setLive(true);
    }
    commit(v.k, v.x + cur.x - prev.x, v.y + cur.y - prev.y);
  };

  const onPointerEnd = (e: ReactPointerEvent<HTMLElement>) => {
    if (!pointers.current.delete(e.pointerId)) return;
    if (pointers.current.size) return;
    if (dragged.current) {
      swallowClick.current = true;
      setTimeout(() => (swallowClick.current = false), 0);
    }
    setPanning(false);
    setLive(false);
  };

  const onClickCapture = (e: { stopPropagation(): void; preventDefault(): void }) => {
    if (!swallowClick.current) return;
    e.stopPropagation();
    e.preventDefault();
  };

  return {
    view,
    live,
    panning,
    zoomBy,
    reset,
    reveal,
    bind: { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd, onClickCapture },
  };
}
