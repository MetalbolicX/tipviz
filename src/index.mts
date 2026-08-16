export { defineTooltip } from "./components/tooltip/index.mjs";
export { TipVizTooltip } from "./components/tooltip/tooltip.mjs";

import { TipVizTooltip as _T } from "./components/tooltip/tooltip.mjs";
if (!customElements.get("tip-viz-tooltip")) {
  customElements.define("tip-viz-tooltip", _T);
}

export type { Direction, DirectionFn, Offset, OffsetCallback, TooltipData } from "./components/tooltip/types.mjs";