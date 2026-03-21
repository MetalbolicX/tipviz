export * from "./tooltip.mjs";
export * from "./types.mjs";

/**
 * Defines the `tip-viz-tooltip` custom element if it hasn't been defined yet.
 */
export const defineTooltip = async (): Promise<void> => {
  if (!customElements.get("tip-viz-tooltip")) {
    const mod = await import("./tooltip.mjs");
    customElements.define("tip-viz-tooltip", mod.TipVizTooltip);
  }
}
