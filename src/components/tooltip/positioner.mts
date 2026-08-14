import type { Direction } from "./types.mjs";

export function getCoordinates(
  dir: Direction,
  targetRect: DOMRect,
  tooltipRect: DOMRect,
): { top: number; left: number } {
  const t = targetRect;
  const w = tooltipRect.width;
  const h = tooltipRect.height;

  switch (dir) {
    case "n": return { top: t.top - h, left: t.left + t.width / 2 - w / 2 };
    case "s": return { top: t.bottom, left: t.left + t.width / 2 - w / 2 };
    case "e": return { top: t.top + t.height / 2 - h / 2, left: t.right };
    case "w": return { top: t.top + t.height / 2 - h / 2, left: t.left - w };
    case "nw": return { top: t.top - h, left: t.left - w };
    case "ne": return { top: t.top - h, left: t.right };
    case "sw": return { top: t.bottom, left: t.left - w };
    case "se": return { top: t.bottom, left: t.right };
    default: return { top: t.top - h, left: t.left + t.width / 2 - w / 2 };
  }
}
