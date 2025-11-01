import { useEffect, useRef, useState } from "react";

export type Point = { x: number; y: number };

export type UseDragComponentOpts = {
  initialPos?: Point;
  viewportPadding?: number;
  grid?: { x: number; y: number };
  lockAxis?: "x" | "y";
  persistKey?: string;
  enabled?: boolean;
  z?: number;
  onDragStart?: (pos: Point) => void;
  onDragMove?: (pos: Point) => void;
  onDragEnd?: (pos: Point) => void;
};

// Adds drag-to-move behavior to any absolutely/fixed-positioned element.
export function useDragComponent({
  initialPos = { x: 16, y: 16 },
  viewportPadding = 8,
  grid,
  lockAxis,
  persistKey,
  enabled = true,
  z,
  onDragStart,
  onDragMove,
  onDragEnd,
}: UseDragComponentOpts = {}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLElement | null>(null);

  const [pos, setPos] = useState<Point>(() => {
    if (persistKey) {
      try {
        const raw = localStorage.getItem(persistKey);
        if (raw) return JSON.parse(raw) as Point;
      } catch {}
    }
    return initialPos;
  });

  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  // keep state in sync if parent changes initialPos
  useEffect(() => {
    if (!persistKey) setPos(initialPos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPos.x, initialPos.y]);

  // persist on change
  useEffect(() => {
    if (!persistKey) return;
    try {
      localStorage.setItem(persistKey, JSON.stringify(pos));
    } catch {}
  }, [persistKey, pos.x, pos.y]);

  // core drag handlers (mouse + touch)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const handle = handleRef.current ?? (el as unknown as HTMLElement);
    if (!enabled) return;

    const getViewportBounded = (next: Point) => {
      const pad = viewportPadding;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect = el.getBoundingClientRect();
      let x = next.x;
      let y = next.y;

      // snap to grid if requested
      if (grid) {
        x = Math.round(x / grid.x) * grid.x;
        y = Math.round(y / grid.y) * grid.y;
      }

      // axis lock
      if (lockAxis === "x") y = pos.y;
      if (lockAxis === "y") x = pos.x;

      // clamp to viewport bounds
      x = Math.min(Math.max(pad, x), vw - rect.width - pad);
      y = Math.min(Math.max(pad, y), vh - rect.height - pad);

      return { x, y };
    };

    const onPointerDown = (cx: number, cy: number, ev: Event) => {
      draggingRef.current = true;
      offsetRef.current = { x: cx - pos.x, y: cy - pos.y };
      onDragStart?.(pos);
      ev.preventDefault();
    };

    const onPointerMove = (cx: number, cy: number) => {
      if (!draggingRef.current) return;
      const next = getViewportBounded({ x: cx - offsetRef.current.x, y: cy - offsetRef.current.y });
      setPos(next);
      onDragMove?.(next);
    };

    const onPointerUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      onDragEnd?.(pos);
    };

    // Mouse
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      onPointerDown(e.clientX, e.clientY, e);
    };
    const onMouseMove = (e: MouseEvent) => onPointerMove(e.clientX, e.clientY);
    const onMouseUp = () => onPointerUp();

    // Touch
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      onPointerDown(t.clientX, t.clientY, e);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      onPointerMove(t.clientX, t.clientY);
    };
    const onTouchEnd = () => onPointerUp();

    handle.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    handle.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      handle.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      handle.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [
    enabled,
    viewportPadding,
    grid?.x,
    grid?.y,
    lockAxis,
    pos.x,
    pos.y,
    onDragStart,
    onDragMove,
    onDragEnd,
  ]);

  // style to spread onto the root container
  const style: React.CSSProperties = {
    position: "fixed",
    left: pos.x,
    top: pos.y,
    zIndex: z,
    pointerEvents: "auto",
  };

  // helper for “bring-to-front” if parent manages stacking
  const bindFocus =
    (bringToFront?: () => void) =>
    () => {
      if (bringToFront) bringToFront();
    };

  return {
    rootRef,
    handleRef,
    pos,
    setPos,
    style,
    bindFocus,
  };
}
