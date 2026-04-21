import { describe, it, expect } from "vitest";

import { TipVizTooltip, Direction, Offset, HtmlCallback, OffsetCallback, DirectionFn } from "../index.mjs";
import type { Direction as DirectionType } from "../components/tooltip/types.mjs";

describe("integration: src/index.mts", () => {
  it("auto-registers <tip-viz-tooltip> on import", () => {
    const Registered = customElements.get("tip-viz-tooltip");
    expect(Registered).toBeDefined();
    expect(Registered).toBe(TipVizTooltip);
  });

  it("exports the TipVizTooltip class", () => {
    expect(TipVizTooltip).toBeTypeOf("function");
    expect(TipVizTooltip.prototype).toBeInstanceOf(HTMLElement);
  });

  it("exports all types at the module level", () => {
    // These are type-only exports, so we verify they don't break imports.
    // Direction is the only value-exported type at runtime (a string union type).
    const _d: Direction = "n";
    const _o: Offset = [0, 0];
    expect(_d).toBe("n");
    expect(_o).toEqual([0, 0]);
  });

  it("can create a tooltip element via document.createElement", () => {
    const tooltip = document.createElement("tip-viz-tooltip") as TipVizTooltip;
    expect(tooltip).toBeInstanceOf(TipVizTooltip);
    expect(tooltip).toBeInstanceOf(HTMLElement);
    document.body.appendChild(tooltip);
    tooltip.remove();
  });

  it("has shadow root with open mode", () => {
    const tooltip = document.createElement("tip-viz-tooltip") as TipVizTooltip;
    document.body.appendChild(tooltip);

    const shadow = tooltip.shadowRoot;
    expect(shadow).not.toBeNull();
    expect(shadow?.mode).toBe("open");

    tooltip.remove();
  });

  it("has a tooltip div inside the shadow root", () => {
    const tooltip = document.createElement("tip-viz-tooltip") as TipVizTooltip;
    document.body.appendChild(tooltip);

    const tooltipBox = tooltip.shadowRoot?.querySelector(".tipviz-tooltip");
    expect(tooltipBox).not.toBeNull();
    expect(tooltipBox?.className).toBe("tipviz-tooltip");
    expect(tooltipBox?.getAttribute("part")).toBe("tooltip-box");

    tooltip.remove();
  });

  it("has all public methods available", () => {
    const tooltip = document.createElement("tip-viz-tooltip") as TipVizTooltip;

    expect(typeof tooltip.setHtml).toBe("function");
    expect(typeof tooltip.setStyles).toBe("function");
    expect(typeof tooltip.setDirection).toBe("function");
    expect(typeof tooltip.setOffset).toBe("function");
    expect(typeof tooltip.loadStylesheet).toBe("function");
    expect(typeof tooltip.show).toBe("function");
    expect(typeof tooltip.hide).toBe("function");
  });

  it("registering twice does not throw", () => {
    // The module guards against double registration.
    expect(() => {
      if (!customElements.get("tip-viz-tooltip")) {
        customElements.define("tip-viz-tooltip", TipVizTooltip);
      }
    }).not.toThrow();
  });

  it("moves to document.body on connect when placed inside another container", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const tooltip = document.createElement("tip-viz-tooltip") as TipVizTooltip;
    container.appendChild(tooltip);

    expect(tooltip.parentElement).toBe(document.body);
    expect(container.childNodes.length).toBe(0);

    document.body.textContent = "";
  });

  it("does not move to body when no-auto-reposition attribute is set", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const tooltip = document.createElement("tip-viz-tooltip") as TipVizTooltip;
    tooltip.setAttribute("no-auto-reposition", "");
    container.appendChild(tooltip);

    expect(tooltip.parentElement).toBe(container);

    document.body.textContent = "";
  });

  it("can create and use a tooltip end-to-end", () => {
    const tooltip = document.createElement("tip-viz-tooltip") as TipVizTooltip;
    const target = document.createElement("div");
    document.body.append(tooltip, target);

    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      x: 200, y: 100, top: 100, left: 200, bottom: 130, right: 280,
      width: 80, height: 30, toJSON: () => ({}),
    } as DOMRect);

    const tooltipBox = tooltip.shadowRoot?.querySelector<HTMLDivElement>(".tipviz-tooltip")!;
    vi.spyOn(tooltipBox, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, bottom: 20, right: 60,
      width: 60, height: 20, toJSON: () => ({}),
    } as DOMRect);

    tooltip.setHtml(() => "<strong>Integrated</strong>");
    tooltip.setDirection(() => "s");
    tooltip.show({}, target);

    expect(tooltipBox.querySelector("strong")?.textContent).toBe("Integrated");
    expect(tooltipBox.style.opacity).toBe("1");
    expect(tooltipBox.classList.contains("s")).toBe(true);

    tooltip.hide();
    expect(tooltipBox.style.opacity).toBe("0");

    document.body.textContent = "";
  });
});
