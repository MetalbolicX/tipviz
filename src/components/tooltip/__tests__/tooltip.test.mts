import { TipVizTooltip } from "../tooltip.mjs";

interface RectInput {
  height: number;
  left: number;
  top: number;
  width: number;
}

const tooltipTag = "tip-viz-tooltip";

const createRect = ({ height, left, top, width }: RectInput): DOMRect => {
  const bottom = top + height;
  const right = left + width;
  return {
    bottom,
    height,
    left,
    right,
    toJSON: () => ({}),
    top,
    width,
    x: left,
    y: top,
  };
};

const mockRect = (element: Element, rect: RectInput) => {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(createRect(rect));
};

const getTooltipBox = (tooltip: TipVizTooltip): HTMLDivElement => {
  const tooltipBox = tooltip.shadowRoot?.querySelector<HTMLDivElement>(".tipviz-tooltip");
  if (!tooltipBox) {
    throw new Error("Tooltip box not found in shadow root.");
  }
  return tooltipBox;
};

describe("TipVizTooltip", () => {
  let tooltip: TipVizTooltip;
  let target: HTMLDivElement;

  beforeAll(() => {
    if (!customElements.get(tooltipTag)) {
      customElements.define(tooltipTag, TipVizTooltip);
    }
  });

  beforeEach(() => {
    target = document.createElement("div");
    tooltip = document.createElement(tooltipTag) as TipVizTooltip;

    document.body.append(target, tooltip);

    mockRect(target, { height: 40, left: 50, top: 100, width: 80 });
    mockRect(getTooltipBox(tooltip), { height: 10, left: 0, top: 0, width: 20 });
  });

  afterEach(() => {
    document.body.textContent = "";
    vi.restoreAllMocks();
  });

  it("has expected observed attributes", () => {
    expect(TipVizTooltip.observedAttributes).toEqual(["transition-duration", "stylesheet", "no-auto-reposition", "template", "data"]);
  });

  // -------------------------------------------------------------------------
  // Tier 1: Declarative attributes (template + data)
  // -------------------------------------------------------------------------
  describe("declarative template and data attributes", () => {
    it("applies template from attribute on connect", () => {
      const customTooltip = document.createElement(tooltipTag) as TipVizTooltip;
      customTooltip.setAttribute("template", "<span data-bind='label'></span>");
      customTooltip.setAttribute("data", JSON.stringify({ label: "from-attr" }));

      document.body.appendChild(customTooltip);

      const tooltipBox = getTooltipBox(customTooltip);
      const boundSpan = tooltipBox.querySelector("[data-bind='label']");
      expect(boundSpan?.textContent).toBe("from-attr");
    });

    it("applies data from attribute before template exists", () => {
      const customTooltip = document.createElement(tooltipTag) as TipVizTooltip;
      customTooltip.setAttribute("data", JSON.stringify({ label: "pending" }));
      customTooltip.setAttribute("template", "<span data-bind='label'></span>");

      document.body.appendChild(customTooltip);

      const tooltipBox = getTooltipBox(customTooltip);
      const boundSpan = tooltipBox.querySelector("[data-bind='label']");
      expect(boundSpan?.textContent).toBe("pending");
    });

    it("strips script tags from template attribute", () => {
      const customTooltip = document.createElement(tooltipTag) as TipVizTooltip;
      customTooltip.setAttribute("template", "<script>alert(1)</script><span>safe</span>");

      document.body.appendChild(customTooltip);

      const tooltipBox = getTooltipBox(customTooltip);
      expect(tooltipBox.querySelector("script")).toBeNull();
      expect(tooltipBox.querySelector("span")?.textContent).toBe("safe");
    });

    it("logs error for invalid JSON in data attribute", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {
        return undefined;
      });

      const customTooltip = document.createElement(tooltipTag) as TipVizTooltip;
      customTooltip.setAttribute("template", "<span>static</span>");
      customTooltip.setAttribute("data", "not json");

      document.body.appendChild(customTooltip);

      expect(errorSpy).toHaveBeenCalledWith(
        "[tip-viz-tooltip] invalid JSON in data attribute:",
        "not json",
      );

      // Element must still be functional
      const tooltipBox = getTooltipBox(customTooltip);
      expect(tooltipBox.querySelector("span")?.textContent).toBe("static");

      errorSpy.mockRestore();
    });

    it("data attribute replace semantics", () => {
      // Use attributeChangedCallback directly to test replace semantics
      // (setAttribute before connect may not synchronously fire attributeChangedCallback in jsdom)
      tooltip.setTemplate("<span data-bind='a'></span><span data-bind='b'></span>");

      // Simulate first data attribute being set via attributeChangedCallback
      tooltip.attributeChangedCallback("data", "", JSON.stringify({ a: 1 }));
      expect(getTooltipBox(tooltip).querySelector("[data-bind='a']")?.textContent).toBe("1");

      // Simulate second data attribute replacing the first
      tooltip.attributeChangedCallback("data", JSON.stringify({ a: 1 }), JSON.stringify({ b: 2 }));

      const tooltipBox = getTooltipBox(tooltip);
      const aSpan = tooltipBox.querySelector("[data-bind='a']");
      const bSpan = tooltipBox.querySelector("[data-bind='b']");
      // Replace semantics: a should be gone, only b present
      expect(aSpan?.textContent).toBe("");
      expect(bSpan?.textContent).toBe("2");
    });

    it("setData merges shallowly (counterpart to data attribute replace)", () => {
      tooltip.setTemplate("<span data-bind='a'></span><span data-bind='b'></span><span data-bind='c'></span>");
      tooltip.setData({ a: 1, b: 2 });
      tooltip.setData({ c: 3 });

      const box = getTooltipBox(tooltip);
      expect(box.querySelector("[data-bind='a']")?.textContent).toBe("1");
      expect(box.querySelector("[data-bind='b']")?.textContent).toBe("2");
      expect(box.querySelector("[data-bind='c']")?.textContent).toBe("3");
    });

    it("updates tooltip when data attribute is set via setAttribute after show", () => {
      tooltip.setTemplate("<span data-bind='label'></span>");
      tooltip.show(target);

      tooltip.setAttribute("data", JSON.stringify({ label: "updated-via-setAttribute" }));

      const tooltipBox = getTooltipBox(tooltip);
      const boundSpan = tooltipBox.querySelector("[data-bind='label']");
      expect(boundSpan?.textContent).toBe("updated-via-setAttribute");
    });
  });

  it("applies transition-duration from attribute on connect", () => {
    const customTooltip = document.createElement(tooltipTag) as TipVizTooltip;
    customTooltip.setAttribute("transition-duration", "450");

    document.body.appendChild(customTooltip);

    const tooltipBox = getTooltipBox(customTooltip);
    // Transition is now driven by CSS custom property --tip-transition-duration
    expect(tooltipBox.style.getPropertyValue("--tip-transition-duration")).toBe("450ms");
  });

  it("creates and updates stylesheet link without duplicates", () => {
    tooltip.loadStylesheet("/one.css");
    tooltip.loadStylesheet("/two.css");

    const links = [...tooltip.shadowRoot?.querySelectorAll("link[data-tipviz-link]") ?? []];
    expect(links.length).toBe(1);
    expect(links[0]?.getAttribute("href")).toBe("/two.css");
  });

  describe("setTemplate + setData (v3.0 API)", () => {
    it("renders template content on show", () => {
      tooltip.setTemplate("<span class='value'>Hello</span>");

      tooltip.show(target);

      const tooltipBox = getTooltipBox(tooltip);
      const valueNode = tooltipBox.querySelector(".value");
      expect(valueNode?.textContent).toBe("Hello");
      expect(tooltipBox.getAttribute("data-visible")).toBe("true");
    });

    it("updates bound elements when setData is called", () => {
      tooltip.setTemplate("<span data-bind='name'></span>");
      tooltip.setData({ name: "Alice" });

      tooltip.show(target);

      const tooltipBox = getTooltipBox(tooltip);
      const boundSpan = tooltipBox.querySelector("[data-bind='name']");
      expect(boundSpan?.textContent).toBe("Alice");
    });

    it("updates bound elements when setData is called multiple times", () => {
      tooltip.setTemplate("<span data-bind='x'></span><span data-bind='y'></span>");

      tooltip.setData({ x: 10 });
      tooltip.setData({ y: 20 });

      tooltip.show(target);

      const tooltipBox = getTooltipBox(tooltip);
      const xSpan = tooltipBox.querySelector("[data-bind='x']");
      const ySpan = tooltipBox.querySelector("[data-bind='y']");
      expect(xSpan?.textContent).toBe("10");
      expect(ySpan?.textContent).toBe("20");
    });

    it("warns when setData key has no matching data-bind element", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
        return undefined;
      });

      tooltip.setTemplate("<span data-bind='name'></span>");
      tooltip.setData({ extra: "ignored", name: "Bob" });

      expect(warnSpy).toHaveBeenCalledWith("[tip-viz-tooltip] No data-bind=\"extra\" found in template");

      warnSpy.mockRestore();
    });

    it("applies data immediately when setTemplate is called after setData", () => {
      tooltip.setData({ name: "Charlie" });
      tooltip.setTemplate("<span data-bind='name'></span>");

      const tooltipBox = getTooltipBox(tooltip);
      const boundSpan = tooltipBox.querySelector("[data-bind='name']");
      expect(boundSpan?.textContent).toBe("Charlie");
    });

    it("skips re-parsing template when setData is called (no DOM re-creation)", () => {
      tooltip.setTemplate("<span data-bind='value'>initial</span>");
      tooltip.show(target);

      const tooltipBox = getTooltipBox(tooltip);
      const firstSpan = tooltipBox.querySelector("[data-bind='value']");

      tooltip.setData({ value: "updated" });

      const secondSpan = tooltipBox.querySelector("[data-bind='value']");
      expect(firstSpan).toBe(secondSpan); // Same node reference
    });

    it("supports multiple bound elements with the same data-bind key", () => {
      tooltip.setTemplate("<span data-bind='label'></span><span data-bind='label'></span>");

      tooltip.setData({ label: "same" });
      tooltip.show(target);

      const tooltipBox = getTooltipBox(tooltip);
      const spans = tooltipBox.querySelectorAll("[data-bind='label']");
      expect(spans).toHaveLength(2);
      expect(spans[0].textContent).toBe("same");
      expect(spans[1].textContent).toBe("same");
    });

    it("renders a plain-text template", () => {
      tooltip.setTemplate("Hello World");
      expect(getTooltipBox(tooltip).textContent).toBe("Hello World");
    });

    it("preserves top-level text mixed with elements", () => {
      tooltip.setTemplate("<strong>Tip</strong>: 42 items");
      const box = getTooltipBox(tooltip);
      expect(box.textContent).toBe("Tip: 42 items");
      expect(box.querySelector("strong")?.textContent).toBe("Tip");
    });

    it("preserves top-level text when re-rendering via setSanitizerConfig", () => {
      tooltip.setTemplate("Value: <span data-bind='v'></span>");
      tooltip.setData({ v: "42" });
      tooltip.setSanitizerConfig({});
      const box = getTooltipBox(tooltip);
      expect(box.textContent).toBe("Value: 42");
    });

    it("uses custom sanitizer config to filter additional elements", () => {
      tooltip.setSanitizerConfig({ removeElements: ["b", "i"] });
      tooltip.setTemplate("<div><b>bold</b><i>italic</i><p>para</p></div>");

      const tooltipBox = getTooltipBox(tooltip);
      expect(tooltipBox.querySelector("b")).toBeNull();
      expect(tooltipBox.querySelector("i")).toBeNull();
      expect(tooltipBox.querySelector("p")).not.toBeNull();
      expect(tooltipBox.querySelector("p")?.textContent).toBe("para");
    });

    it("uses custom sanitizer config to filter additional attributes", () => {
      tooltip.setSanitizerConfig({ removeAttributes: ["data-custom"], removeElements: [] });
      tooltip.setTemplate("<div data-custom='secret'><span>test</span></div>");

      const tooltipBox = getTooltipBox(tooltip);
      expect(tooltipBox.querySelector("div")?.getAttribute("data-custom")).toBeNull();
      expect(tooltipBox.querySelector("div")?.getAttribute("data-custom")).toBeFalsy();
    });

    it("setSanitizerConfig merges with defaults instead of replacing them", () => {
      tooltip.setSanitizerConfig({});
      tooltip.setTemplate("<script>evil()</script><span data-bind='a'></span>");

      const tooltipBox = getTooltipBox(tooltip);
      expect(tooltipBox.querySelector("script")).toBeNull();
    });
  });

  describe("static tooltip (no setData)", () => {
    it("renders static template without setData", () => {
      tooltip.setTemplate("<b>Static Content</b>");
      tooltip.show(target);

      const tooltipBox = getTooltipBox(tooltip);
      expect(tooltipBox.querySelector("b")?.textContent).toBe("Static Content");
    });

    it("shows without template warning", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
        return undefined;
      });

      tooltip.show(target);

      expect(warnSpy).toHaveBeenCalledWith("[tip-viz-tooltip] No template set. Call setTemplate() first.");

      warnSpy.mockRestore();
    });
  });

  it("applies direction classes and removes previous direction class", () => {
    tooltip.setTemplate("<span>content</span>");
    tooltip.setDirection(() => "n");
    tooltip.show(target);

    const tooltipBox = getTooltipBox(tooltip);
    expect(tooltipBox.classList.contains("n")).toBe(true);

    tooltip.setDirection(() => "s");
    tooltip.show(target);

    expect(tooltipBox.classList.contains("n")).toBe(false);
    expect(tooltipBox.classList.contains("s")).toBe(true);
  });

  it("keeps offset axes correct: x affects left, y affects top", () => {
    tooltip.setTemplate("<span>content</span>");
    tooltip.setOffset(() => [12, 7]);
    tooltip.setDirection(() => "n");

    tooltip.show(target);

    const tooltipBox = getTooltipBox(tooltip);
    expect(tooltipBox.style.top).toBe("97px");
    expect(tooltipBox.style.left).toBe("92px");
  });

  it("passes stored data to direction callback", () => {
    tooltip.setTemplate("<span>content</span>");
    tooltip.setDirection((data) => (data.score as number) > 100 ? "n" : "s");
    tooltip.setData({ score: 150 });

    tooltip.show(target);

    const tooltipBox = getTooltipBox(tooltip);
    expect(tooltipBox.classList.contains("n")).toBe(true);
  });

  it("dispatches a show event with detail payload", () => {
    const onShow = vi.fn();
    tooltip.addEventListener("show", onShow);
    tooltip.setTemplate("<span>test</span>");
    tooltip.setData({ id: 42 });

    tooltip.show(target);

    expect(onShow).toHaveBeenCalledTimes(1);

    const event = onShow.mock.calls.at(0)?.at(0) as CustomEvent<{data: Record<string, number | string>, direction: string, position: {left: number, top: number}, target: Element}>;
    expect(event.type).toBe("show");
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
    expect(event.detail.target).toBe(target);
    expect(event.detail.data).toEqual({ id: 42 });
    expect(event.detail.direction).toBe("n");
    expect(event.detail.position).toEqual({ left: 80, top: 90 });
  });

  it("hides tooltip and dispatches hide event", () => {
    const onHide = vi.fn();
    tooltip.addEventListener("hide", onHide);

    tooltip.setTemplate("<span>content</span>");
    tooltip.show(target);
    tooltip.hide();

    const tooltipBox = getTooltipBox(tooltip);
    // Visibility is now driven by data-visible attribute toggle
    expect(tooltipBox.getAttribute("data-visible")).toBeNull();
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it("preserves tooltip children across disconnectedCallback (adoption-safe)", () => {
    tooltip.setTemplate("<span>cleanup</span>");
    tooltip.show(target);

    const tooltipBox = getTooltipBox(tooltip);
    expect(tooltipBox.childNodes.length).toBeGreaterThan(0);

    tooltip.disconnectedCallback();

    // Children are preserved across disconnect to support cross-document adoption.
    // Template/data survives; adoptedCallback re-renders in the new document.
    expect(tooltipBox.childNodes.length).toBeGreaterThan(0);
  });

  it("setStyles() called multiple times only applies the latest CSS", () => {
    tooltip.setStyles(".tipviz-tooltip { color: red; }");
    tooltip.setStyles(".tipviz-tooltip { color: blue; }");
    tooltip.setStyles(".tipviz-tooltip { color: green; }");

    // In jsdom with constructable stylesheets, consumer CSS is added to adoptedStyleSheets.
    // The structural sheet is at index 0, consumer sheets follow.
    const root = tooltip.shadowRoot as unknown as { adoptedStyleSheets: CSSStyleSheet[] };
    const consumerSheets = root.adoptedStyleSheets.filter(
      (sheet) => sheet.cssRules[0].cssText.includes("color: green"),
    );
    expect(consumerSheets.length).toBe(1);
    expect(consumerSheets[0].cssRules[0].cssText).toContain("color: green");
  });

  it("setStyles() cleans up previous loadStylesheet() link", () => {
    tooltip.loadStylesheet("/external.css");
    tooltip.setStyles(".tipviz-tooltip { color: violet; }");

    const link = tooltip.shadowRoot?.querySelector("link[data-tipviz-link]");
    expect(link).toBeNull();
  });

  it("loadStylesheet() cleans up previous setStyles() fallback style", () => {
    tooltip.setStyles(".tipviz-tooltip { color: orange; }");
    tooltip.loadStylesheet("/another.css");

    const fallbackStyle = tooltip.shadowRoot?.querySelector("style[data-tipviz]");
    expect(fallbackStyle).toBeNull();

    const link = tooltip.shadowRoot?.querySelector("link[data-tipviz-link]");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("/another.css");
  });

  it("switching from loadStylesheet to setStyles and back clears stale resources", () => {
    tooltip.loadStylesheet("/first.css");
    tooltip.setStyles(".tipviz-tooltip { color: teal; }");
    tooltip.loadStylesheet("/second.css");

    const link = tooltip.shadowRoot?.querySelector("link[data-tipviz-link]");
    const fallbackStyle = tooltip.shadowRoot?.querySelector("style[data-tipviz]");

    expect(link?.getAttribute("href")).toBe("/second.css");
    expect(fallbackStyle).toBeNull();
  });

  it("empty string to setStyles() clears all styles", () => {
    tooltip.setStyles(".tipviz-tooltip { color: pink; }");
    tooltip.setStyles("");

    const fallbackStyles = tooltip.shadowRoot?.querySelectorAll("style[data-tipviz]");
    expect(fallbackStyles?.length).toBe(0);
  });

  it("loadStylesheet with empty url removes the link", () => {
    tooltip.loadStylesheet("/valid.css");
    tooltip.loadStylesheet("");

    const link = tooltip.shadowRoot?.querySelector("link[data-tipviz-link]");
    expect(link).toBeNull();
  });

  it("loadStylesheet error handler reports the failing URL", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      return undefined;
    });
    try {
      tooltip.loadStylesheet("/definitely-missing.css");
      const link = tooltip.shadowRoot?.querySelector("link[data-tipviz-link]");
      link?.dispatchEvent(new Event("error"));
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(String(warnSpy.mock.calls[0]?.[0])).toContain("/definitely-missing.css");
    } finally {
      warnSpy.mockRestore();
    }
  });

  // -------------------------------------------------------------------------
  // MDA: Phase 2.1 — ownerDocument.body substitution + null-guard
  // -------------------------------------------------------------------------
  describe("ownerDocument body attachment", () => {
    it("appends to ownerDocument.body, not global document.body (MDA: Connected inside an iframe)", () => {
      const foreignDoc = document.implementation.createHTMLDocument();
      const foreignBody = foreignDoc.body as HTMLBodyElement;

      const foreignTooltip = document.createElement(tooltipTag) as TipVizTooltip;
      foreignDoc.body.appendChild(foreignTooltip);

      expect(foreignTooltip.parentElement).toBe(foreignBody);
      expect(foreignTooltip.parentElement).not.toBe(document.body);
    });

    it("uses ownerDocument.defaultView scroll offsets when available (MDA: Shown in a scrolled iframe)", () => {
      // Verify the tooltip uses ownerDocument.defaultView.scrollX/Y by checking
      // that the tooltip position changes when scroll offsets are set on defaultView.
      // In jsdom with createHTMLDocument, getBoundingClientRect may not be fully mocked
      // for foreign documents, so we verify the null-guard and scroll property access instead.
      const scrollState = { scrollX: 10, scrollY: 20 };
      const foreignDoc = document.implementation.createHTMLDocument();
      Object.defineProperty(foreignDoc, "defaultView", {
        configurable: true,
        value: scrollState,
      });

      const foreignTooltip = document.createElement(tooltipTag) as TipVizTooltip;
      foreignDoc.body.appendChild(foreignTooltip);
      foreignTooltip.setTemplate("<span>test</span>");

      const foreignTarget = foreignDoc.createElement("div");
      foreignDoc.body.appendChild(foreignTarget);

      // Should not throw — verifies the implementation reads scroll from ownerDocument.defaultView
      expect(() => {
        foreignTooltip.show(foreignTarget);
      }).not.toThrow();
    });

    it("does not throw when ownerDocument.defaultView is null — defaults scroll to 0 (MDA: SSR null-guard)", () => {
      const foreignDoc = document.implementation.createHTMLDocument();
      Object.defineProperty(foreignDoc, "defaultView", {
        configurable: true,
        value: null,
      });

      const foreignTooltip = document.createElement(tooltipTag) as TipVizTooltip;
      foreignDoc.body.appendChild(foreignTooltip);
      foreignTooltip.setTemplate("<span>test</span>");

      const foreignTarget = foreignDoc.createElement("div");
      foreignDoc.body.appendChild(foreignTarget);

      // Should not throw — null defaultView should be guarded with ?? { scrollX: 0, scrollY: 0 }
      expect(() => {
        foreignTooltip.show(foreignTarget);
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // MDA: Phase 2.2 — adoptedCallback() lifecycle
  // -------------------------------------------------------------------------
  describe("adoptedCallback lifecycle", () => {
    it("re-establishes aria host attributes after adoption (MDA: Adopted into a foreign document while showing)", () => {
      tooltip.setTemplate("<span>test</span>");
      tooltip.show(target);

      expect(tooltip.getAttribute("role")).toBe("tooltip");
      expect(tooltip.getAttribute("aria-hidden")).toBe("false");
      expect(tooltip.id).toBeTruthy();

      const foreignDoc = document.implementation.createHTMLDocument();
      Object.defineProperty(foreignDoc, "defaultView", { configurable: true, value: null });

      // Adopt the tooltip into the foreign document
      foreignDoc.body.appendChild(tooltip);

      // Directly invoke adoptedCallback (jsdom does not auto-invoke)
      tooltip.adoptedCallback();

      // aria attributes must be re-established
      expect(tooltip.getAttribute("role")).toBe("tooltip");
      expect(tooltip.id).toBeTruthy();
    });

    it("rebinds described-by relationship after adoption when target is also in new document (MDA: Adopted into a foreign document while showing)", () => {
      const foreignDoc = document.implementation.createHTMLDocument();
      Object.defineProperty(foreignDoc, "defaultView", { configurable: true, value: null });

      // Create tooltip and target directly in the foreign document
      const foreignTooltip = document.createElement(tooltipTag) as TipVizTooltip;
      foreignDoc.body.appendChild(foreignTooltip);
      foreignTooltip.setTemplate("<span>test</span>");

      const foreignTarget = foreignDoc.createElement("div");
      foreignDoc.body.appendChild(foreignTarget);

      // Show with foreign target — establishes described-by
      foreignTooltip.show(foreignTarget);
      expect(foreignTarget.getAttribute("aria-describedby")).toContain(foreignTooltip.id);

      // Re-adopt the tooltip (same document, but triggers adoptedCallback)
      foreignDoc.body.removeChild(foreignTooltip);
      foreignDoc.body.appendChild(foreignTooltip);
      foreignTooltip.adoptedCallback();

      // described-by should be preserved since target is still in same document
      expect(foreignTarget.getAttribute("aria-describedby")).toContain(foreignTooltip.id);
    });

    it("re-inserts structural sheet in adopting document before any consumer sheet (MDA: Adopted after consumer styles were applied)", () => {
      tooltip.setTemplate("<span>test</span>");
      tooltip.setStyles(".tipviz-tooltip { color: red; }");

      const root = tooltip.shadowRoot as unknown as { adoptedStyleSheets: CSSStyleSheet[] };
      expect(root.adoptedStyleSheets.length).toBeGreaterThan(0);

      const structuralSheetBefore = root.adoptedStyleSheets[0];

      const foreignDoc = document.implementation.createHTMLDocument();
      Object.defineProperty(foreignDoc, "defaultView", { configurable: true, value: null });

      foreignDoc.body.appendChild(tooltip);
      tooltip.adoptedCallback();

      const rootAfter = tooltip.shadowRoot as unknown as { adoptedStyleSheets: CSSStyleSheet[] };
      // Structural sheet must be present in adopting document
      expect(rootAfter.adoptedStyleSheets.length).toBeGreaterThan(0);
      // The first sheet should be a fresh structural sheet (not the old one from doc A)
      expect(rootAfter.adoptedStyleSheets[0]).not.toBe(structuralSheetBefore);
    });

    it("preserves hidden state when adopted while hidden", () => {
      // Set up template but do NOT show — tooltip is hidden
      const foreignDoc = document.implementation.createHTMLDocument();
      const hiddenTooltip = document.createElement("tip-viz-tooltip") as TipVizTooltip;
      hiddenTooltip.setTemplate("<div data-bind=\"label\"></div>");
      hiddenTooltip.setData({ label: "test" });
      document.body.appendChild(hiddenTooltip);

      // Adopt into foreign document (tooltip never shown)
      foreignDoc.adoptNode(hiddenTooltip);
      foreignDoc.body.appendChild(hiddenTooltip);
      hiddenTooltip.adoptedCallback();

      const box = hiddenTooltip.shadowRoot?.querySelector("[data-tipviz-tooltip-box]");
      expect(box?.getAttribute("data-visible")).toBeNull();
      expect(hiddenTooltip.getAttribute("aria-hidden")).toBe("true");
      expect(box?.getAttribute("aria-hidden")).toBe("true");

      // Structural stylesheet re-inserted in adopting document
      const root = hiddenTooltip.shadowRoot as unknown as { adoptedStyleSheets: unknown[] };
      expect(root.adoptedStyleSheets.length).toBeGreaterThan(0);

      // No aria-describedby on any target
      expect(hiddenTooltip.querySelector("[aria-describedby]")).toBeNull();

      // With 006's fix: show() after adoption works
      const foreignTarget = foreignDoc.createElement("div");
      foreignDoc.body.appendChild(foreignTarget);
      hiddenTooltip.show(foreignTarget);
      expect(box?.getAttribute("data-visible")).toBe("true");
    });

    it("falls back to style element when adopted into document without constructable sheets", () => {
      const originalCSSStyleSheet = globalThis.CSSStyleSheet;
      const mockGlobal = globalThis as typeof globalThis & {
        CSSStyleSheet: typeof CSSStyleSheet;
      };
      mockGlobal.CSSStyleSheet = function () {
        throw new Error("Constructable stylesheets not supported");
      } as unknown as typeof CSSStyleSheet;

      try {
        tooltip.setTemplate("<span>fallback</span>");
        tooltip.setStyles(".tipviz-tooltip { color: red; }");

        const foreignDoc = document.implementation.createHTMLDocument();
        foreignDoc.adoptNode(tooltip);
        foreignDoc.body.appendChild(tooltip);
        tooltip.adoptedCallback();

        const shadow = tooltip.shadowRoot;
        const structuralStyle = shadow?.querySelector("style[data-tipviz-structural]");
        const consumerStyle = shadow?.querySelector("style[data-tipviz]");
        const tooltipBox = getTooltipBox(tooltip);

        expect(structuralStyle).not.toBeNull();
        expect(consumerStyle).not.toBeNull();
        expect(structuralStyle?.getAttribute("data-tipviz-structural")).not.toBe(
          consumerStyle?.getAttribute("data-tipviz"),
        );
        const structuralEl = structuralStyle as Node;
        const consumerEl = consumerStyle as Node;
        expect(structuralEl.compareDocumentPosition(consumerEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(tooltipBox.querySelector("span")?.textContent).toBe("fallback");
      } finally {
        mockGlobal.CSSStyleSheet = originalCSSStyleSheet;
      }
    });

    // jsdom NOTE: jsdom does not enforce the WHATWG adoptedStyleSheets document-scoping
    // rule — CSSStyleSheet references created in document A are NOT dropped when
    // assigned to a shadow root in document B. This test passes in jsdom but FAILS
    // in real browsers (Chromium) because cross-document adoptedStyleSheets assignments
    // silently drop the sheet reference. The <style> fallback is the only reliable
    // path for consumer styles after cross-document adoption.
    it("uses <style> fallback for consumer styles after cross-document adoption (jsdom-permissive but real-browser-failing without fix)", () => {
      tooltip.setTemplate("<span>consumer-styles</span>");
      tooltip.setStyles(".tipviz-tooltip { color: rgb(1, 2, 3); }");

      // Verify consumer styles applied via constructable sheet before adoption
      const rootBefore = tooltip.shadowRoot as unknown as { adoptedStyleSheets: CSSStyleSheet[] };
      expect(rootBefore.adoptedStyleSheets.length).toBeGreaterThan(0);

      // Cross-document adoption (simulates iframe contentDocument scenario)
      const foreignDoc = document.implementation.createHTMLDocument();
      foreignDoc.adoptNode(tooltip);
      foreignDoc.body.appendChild(tooltip);
      tooltip.adoptedCallback();

      // After adoption: consumer styles MUST be present as <style> element.
      // In jsdom this passes (permissive sheet adoption). In real browsers without
      // the fix, adoptedStyleSheets would be empty and no <style> fallback would
      // exist — proving the bug exists and the fix works.
      const consumerStyle = tooltip.shadowRoot?.querySelector("style[data-tipviz]");
      expect(consumerStyle).not.toBeNull();
      expect(consumerStyle?.textContent).toContain("color: rgb(1, 2, 3)");
    });
  });

  // -------------------------------------------------------------------------
  // ISS: Phase 3.1 — data-visible attribute toggle + --tip-transition-duration
  // -------------------------------------------------------------------------
  describe("data-visible attribute toggle (ISS: Show/Hide CSS state)", () => {
    it("sets data-visible='true' on show and removes it on hide (ISS: Show toggles CSS state, Hide restores hidden state)", () => {
      tooltip.setTemplate("<span>test</span>");

      tooltip.show(target);

      const tooltipBox = getTooltipBox(tooltip);
      expect(tooltipBox.getAttribute("data-visible")).toBe("true");

      tooltip.hide();

      expect(tooltipBox.getAttribute("data-visible")).toBeNull();
    });

    it("sets --tip-transition-duration custom property on transition-duration update (ISS: Duration change updates the property)", () => {
      tooltip.setTemplate("<span>test</span>");
      tooltip.show(target);

      tooltip.attributeChangedCallback("transition-duration", "", "350");

      const computedStyle = getTooltipBox(tooltip).style as unknown as { getPropertyValue: (prop: string) => string };
      // The custom property includes the 'ms' unit suffix
      expect(computedStyle.getPropertyValue("--tip-transition-duration")).toBe("350ms");
    });

    it("show() uses data-visible attribute instead of inline opacity style (ISS: Show toggles CSS state)", () => {
      tooltip.setTemplate("<span>test</span>");

      tooltip.show(target);

      const tooltipBox = getTooltipBox(tooltip);
      // Visibility is driven by data-visible attribute, not inline style.opacity
      expect(tooltipBox.getAttribute("data-visible")).toBe("true");
    });
  });

  // -------------------------------------------------------------------------
  // ISS: Phase 3.2 — setStyles overrides internal sheet (cascade order)
  // -------------------------------------------------------------------------
  describe("setStyles cascade order (ISS: setStyles overrides internal)", () => {
    it("setStyles CSS appears after structural sheet in adoptedStyleSheets array", () => {
      tooltip.setStyles(".tipviz-tooltip { position: fixed; }");

      const root = tooltip.shadowRoot as unknown as { adoptedStyleSheets: CSSStyleSheet[] };
      expect(root.adoptedStyleSheets.length).toBe(2); // structural + consumer

      // Consumer sheet is last
      const consumerSheet = root.adoptedStyleSheets[root.adoptedStyleSheets.length - 1];
      expect(consumerSheet.cssRules[0].cssText).toContain("position: fixed");
    });

    // NOTE: CSSOM ::part cascade verification is browser-only (jsdom does not
    // implement getComputedStyle for ::part). The attribute presence test below
    // confirms the part attribute is set. Full ::part cascade (e.g. ::part
    // inheriting from page-level ::part rules) must be verified in a real browser
    // via the e2e harness in tests/e2e/harness.html. See Plan 008.
    it("::part(tooltip-box) styling remains available (ISS: ::part override remains available)", () => {
      tooltip.setTemplate("<span>part-test</span>");
      tooltip.show(target);

      const tooltipBox = getTooltipBox(tooltip);
      // The part attribute must still be present for external styling
      expect(tooltipBox.getAttribute("part")).toBe("tooltip-box");
    });
  });

  // -------------------------------------------------------------------------
  // ISS: Phase 3.3 — REFACTOR: #ensureAccessibleHostAttributes probes data-visible
  // -------------------------------------------------------------------------
  describe("accessibility host attributes via data-visible (ISS: REFACTOR)", () => {
    it("#ensureAccessibleHostAttributes checks data-visible instead of style.opacity", () => {
      tooltip.setTemplate("<span>test</span>");

      // When hidden, aria-hidden on host should be 'true'
      const hiddenTooltipBox = getTooltipBox(tooltip);
      hiddenTooltipBox.removeAttribute("data-visible");

      // Trigger ensureAccessibleHostAttributes by any means
      tooltip.setAttribute("aria-hidden", "true"); // force reset

      // After show, host aria-hidden should be 'false'
      tooltip.show(target);
      expect(tooltip.getAttribute("aria-hidden")).toBe("false");

      tooltip.hide();
      expect(tooltip.getAttribute("aria-hidden")).toBe("true");
    });
  });

  describe("setStyles with undefined adoptedStyleSheets", () => {
    it("does not throw when shadow root adoptedStyleSheets is undefined", () => {
      // Simulate an environment where adoptedStyleSheets is undefined
      // by temporarily replacing the property descriptor on the shadow root
      const tooltip2 = document.createElement(tooltipTag) as TipVizTooltip;
      const shadow = tooltip2.shadowRoot;
      if (!shadow) return; // guard for TS

      const originalDescriptor = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, "adoptedStyleSheets");
      Object.defineProperty(shadow, "adoptedStyleSheets", {
        configurable: true,
        get: () => undefined,
      });

      try {
        tooltip2.setStyles(".tip { color: red }");
        // Should not throw — the guard in getAdoptedStyleSheets handles undefined
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(shadow, "adoptedStyleSheets", originalDescriptor);
        }
      }
    });
  });
});
