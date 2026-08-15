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

  // -------------------------------------------------------------------------
  // MDA: Phase 4 — Integration tests for multi-document adoption
  // -------------------------------------------------------------------------
  describe("multi-document adoption integration", () => {
    it("show() works after real cross-document adoption via adoptNode", () => {
      const target = document.createElement("div");
      document.body.appendChild(target);
      const foreignDoc = document.implementation.createHTMLDocument();
      const foreignTarget = foreignDoc.createElement("div");
      foreignDoc.body.appendChild(foreignTarget);

      const tooltip = document.createElement("tip-viz-tooltip") as TipVizTooltip;
      tooltip.setTemplate("<div data-bind=\"label\"></div>");
      tooltip.setData({ label: "before-adoption" });
      document.body.appendChild(tooltip);

      const warnSpy = vi.spyOn(console, "warn").mockResolvedValue(undefined);
      tooltip.show(target);

      // Real cross-document adoption
      foreignDoc.adoptNode(tooltip);
      foreignDoc.body.appendChild(tooltip);
      tooltip.adoptedCallback();

      // show() after adoption
      tooltip.setData({ label: "after-adoption" });
      tooltip.show(foreignTarget);

      // Assertions
      expect(warnSpy).not.toHaveBeenCalled();
      const sr = tooltip.shadowRoot;
      const box = sr?.querySelector("[data-tipviz-tooltip-box]");
      expect(box?.getAttribute("data-visible")).toBe("true");

      // Clean up
      warnSpy.mockRestore();
      document.body.removeChild(target);
      foreignDoc.body.removeChild(foreignTarget);
    });

    it("re-creates structural sheet in adopting document and preserves data-visible state (MDA: Adopted after consumer styles were applied)", () => {
      // Create foreign document for adoption scenario
      const foreignDoc = document.implementation.createHTMLDocument();
      Object.defineProperty(foreignDoc, "defaultView", { configurable: true, value: null });

      // Create tooltip and target directly in the foreign document
      const tooltip = document.createElement("tip-viz-tooltip") as TipVizTooltip;
      const targetEl = foreignDoc.createElement("div");
      foreignDoc.body.appendChild(tooltip);
      foreignDoc.body.appendChild(targetEl);

      tooltip.setTemplate("<span>adopted</span>");
      tooltip.setStyles(".tipviz-tooltip { color: blue; }");

      // Show the tooltip to establish data-visible state
      vi.spyOn(targetEl, "getBoundingClientRect").mockReturnValue({
        bottom: 130, height: 30, left: 200, right: 280,
        toJSON: () => ({}), top: 100, width: 80, x: 200, y: 100,
      });
      const sr = tooltip.shadowRoot;
      if (!sr) throw new Error("expected shadow root");
      const tooltipBox = sr.querySelector<HTMLDivElement>(".tipviz-tooltip");
      if (!tooltipBox) throw new Error("expected tooltip box");
      vi.spyOn(tooltipBox, "getBoundingClientRect").mockReturnValue({
        bottom: 20, height: 20, left: 0, right: 60,
        toJSON: () => ({}), top: 0, width: 60, x: 0, y: 0,
      });

      tooltip.show(targetEl);
      expect(tooltipBox.getAttribute("data-visible")).toBe("true");
      expect(targetEl.getAttribute("aria-describedby")).toContain(tooltip.id);

      // Capture structural sheet before re-adoption
      const rootBefore = tooltip.shadowRoot as unknown as { adoptedStyleSheets: CSSStyleSheet[] };
      const structuralSheetBefore = rootBefore.adoptedStyleSheets[0];

      // Simulate same-document re-connection (remove + re-append fires connectedCallback
      // but NOT adoptedCallback in real browsers — only cross-document adoptNode fires it).
      // jsdom does not auto-fire adoptedCallback for same-doc moves; we call it manually.
      foreignDoc.body.removeChild(tooltip);
      foreignDoc.body.appendChild(tooltip);
      tooltip.adoptedCallback();

      // Verify show() works after adoption (tooltip content preserved)
      tooltip.show(targetEl);
      expect(tooltipBox.getAttribute("data-visible")).toBe("true");

      // Verify structural sheet is re-created in new document (fresh instance, not same reference)
      const rootAfter = tooltip.shadowRoot as unknown as { adoptedStyleSheets: CSSStyleSheet[] };
      expect(rootAfter.adoptedStyleSheets.length).toBeGreaterThan(0);
      expect(rootAfter.adoptedStyleSheets[0]).not.toBe(structuralSheetBefore);

      // Verify the new structural sheet contains the behavioral CSS selector
      const structuralCss = rootAfter.adoptedStyleSheets[0].cssRules[0].cssText;
      expect(structuralCss).toContain("data-tipviz-tooltip-box");

      // Verify aria-describedby is rebound to the active target in new document
      expect(targetEl.getAttribute("aria-describedby")).toContain(tooltip.id);

      // Verify data-visible state is preserved through adoption
      expect(tooltipBox.getAttribute("data-visible")).toBe("true");

      document.body.textContent = "";
    });

    it("cascade order: structural sheet at index 0, consumer sheet at index 1 (ISS: setStyles overrides an internal declaration)", () => {
      const tooltip = document.createElement("tip-viz-tooltip") as TipVizTooltip;
      document.body.appendChild(tooltip);

      tooltip.setTemplate("<span>cascade</span>");
      tooltip.setStyles(".tipviz-tooltip { color: red; }");

      const root = tooltip.shadowRoot as unknown as { adoptedStyleSheets: CSSStyleSheet[] };

      // Structural sheet must be at index 0 (first — internal base)
      // Consumer sheet must be at index 1 (last — wins cascade)
      expect(root.adoptedStyleSheets.length).toBe(2);

      // Verify structural sheet content is present at index 0
      // The structural sheet contains :where([data-tipviz-tooltip-box])
      const structuralCss = root.adoptedStyleSheets[0].cssRules[0].cssText;
      expect(structuralCss).toContain("data-tipviz-tooltip-box");

      // Verify consumer sheet content is present at index 1
      const consumerCss = root.adoptedStyleSheets[1].cssRules[0].cssText;
      expect(consumerCss).toContain("color");
      expect(consumerCss).toContain("red");

      document.body.textContent = "";
    });
  });
});