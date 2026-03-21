export { TipVizTooltip } from "./components/tooltip/tooltip.mjs";

// ensure the element is defined when this module is imported
import { TipVizTooltip as _T } from "./components/tooltip/tooltip.mjs";
if (!customElements.get("tip-viz-tooltip")) {
  customElements.define("tip-viz-tooltip", _T);
}

export type { Direction, Offset, HtmlCallback, OffsetCallback, DirectionFn } from "./components/tooltip/types.mjs";
