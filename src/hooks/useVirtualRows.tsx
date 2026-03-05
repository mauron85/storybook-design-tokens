import React, { useState, useEffect } from 'react';

// ── Virtualizer ──────────────────────────────────────────────────────
export const ROW_HEIGHT = 48;
export const OVERSCAN = 10;

export function useVirtualRows(containerRef: React.RefObject<HTMLDivElement | null>, totalCount: number) {
  const [range, setRange] = useState({ start: 0, end: 30 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const calculate = () => {
      const scrollTop = el.scrollTop;
      const height = el.clientHeight;
      const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
      const end = Math.min(totalCount - 1, Math.ceil((scrollTop + height) / ROW_HEIGHT) + OVERSCAN);
      setRange({ start, end });
    };

    calculate();
    const observer = new ResizeObserver(calculate);
    observer.observe(el);
    el.addEventListener('scroll', calculate, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', calculate);
    };
  }, [containerRef, totalCount]);

  return {
    startIndex: range.start,
    endIndex: range.end,
    topPadding: range.start * ROW_HEIGHT,
    bottomPadding: Math.max(0, (totalCount - range.end - 1) * ROW_HEIGHT),
  };
}
