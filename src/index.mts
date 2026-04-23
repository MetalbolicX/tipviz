export { TipVizTooltip } from "./components/tooltip/tooltip.mjs";

export { sanitize } from "./components/tooltip/sanitize.mjs";

import { TipVizTooltip as _T } from "./components/tooltip/tooltip.mjs";
if (!customElements.get("tip-viz-tooltip")) {
  customElements.define("tip-viz-tooltip", _T);
}

export type { Direction, Offset, HtmlCallback, OffsetCallback, DirectionFn, SanitizerFn } from "./components/tooltip/types.mjs";
