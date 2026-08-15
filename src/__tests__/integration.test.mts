import { describe, expect, it } from "vitest";

import { Direction, Offset, TipVizTooltip } from "../index.mjs";

describe("integration: src/index.mts", () => {
  it("auto-registers <tip-viz-tooltip> on import", () => {
    const registered = customElements.get("tip-viz-tooltip");
    expect(registered).toBeDefined();
    expect(registered).toBe(TipVizTooltip);
  });

  it("exports the TipVizTooltip class", () => {
    expect(TipVizTooltip).toBeTypeOf("function");
    expect(TipVizTooltip.prototype).toBeInstanceOf(HTMLElement);
  });

  it("exports all types at the module level", () => {
    const d: Direction = "n";
    const o: Offset = [0, 0];
    expect(d).toBe("n");
    expect(o).toEqual([0, 0]);
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

  it("has all public methods available (v3.0 API)", () => {
    const tooltip = document.createElement("tip-viz-tooltip") as TipVizTooltip;

    expect(typeof tooltip.setTemplate).toBe("function");
    expect(typeof tooltip.setData).toBe("function");
    expect(typeof tooltip.setSanitizerConfig).toBe("function");
    expect(typeof tooltip.setStyles).toBe("function");
    expect(typeof tooltip.setDirection).toBe("function");
    expect(typeof tooltip.setOffset).toBe("function");
    expect(typeof tooltip.loadStylesheet).toBe("function");
    expect(typeof tooltip.show).toBe("function");
    expect(typeof tooltip.hide).toBe("function");
  });

  it("registering twice does not throw", () => {
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

    expect(container.childNodes.length).toBe(0);
    expect(tooltip.parentElement).toBe(document.body);

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

  it("can create and use a tooltip end-to-end (v3.0 API)", () => {
    const tooltip = document.createElement("tip-viz-tooltip") as TipVizTooltip;
    const targetEl = document.createElement("div");
    document.body.append(tooltip, targetEl);

    vi.spyOn(targetEl, "getBoundingClientRect").mockReturnValue({
      bottom: 130,
      height: 30,
      left: 200,
      right: 280,
      toJSON: () => ({}),
      top: 100,
      width: 80,
      x: 200,
      y: 100,
    });

    const sr = tooltip.shadowRoot;
    if (!sr) throw new Error("expected shadow root");
    const tooltipBox = sr.querySelector<HTMLDivElement>(".tipviz-tooltip");
    if (!tooltipBox) throw new Error("expected tooltip box");
    vi.spyOn(tooltipBox, "getBoundingClientRect").mockReturnValue({
      bottom: 20,
      height: 20,
      left: 0,
      right: 60,
      toJSON: () => ({}),
      top: 0,
      width: 60,
      x: 0,
      y: 0,
    });

    tooltip.setTemplate("<strong>Integrated</strong>");
    tooltip.setDirection(() => "s");
    tooltip.show(targetEl);

    expect(tooltipBox.querySelector("strong")?.textContent).toBe("Integrated");
    expect(tooltipBox.getAttribute("data-visible")).toBe("true");
    expect(tooltipBox.classList.contains("s")).toBe(true);

    tooltip.hide();
    expect(tooltipBox.hasAttribute("data-visible")).toBe(false);

    document.body.textContent = "";
  });
});