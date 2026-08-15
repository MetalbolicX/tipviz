import type { Direction } from "./types.mjs";

export function getCoordinates(
  dir: Direction,
  targetRect: DOMRect,
  tooltipRect: DOMRect,
): { left: number; top: number } {
  const t = targetRect;
  const w = tooltipRect.width;
  const h = tooltipRect.height;

  switch (dir) {
    case "e": return { left: t.right, top: t.top + t.height / 2 - h / 2 };
    case "n": return { left: t.left + t.width / 2 - w / 2, top: t.top - h };
    case "ne": return { left: t.right, top: t.top - h };
    case "nw": return { left: t.left - w, top: t.top - h };
    case "s": return { left: t.left + t.width / 2 - w / 2, top: t.bottom };
    case "se": return { left: t.right, top: t.bottom };
    case "sw": return { left: t.left - w, top: t.bottom };
    case "w": return { left: t.left - w, top: t.top + t.height / 2 - h / 2 };
    default: return { left: t.left + t.width / 2 - w / 2, top: t.top - h };
  }
}
