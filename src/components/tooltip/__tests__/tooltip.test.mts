import { TipVizTooltip } from "../tooltip.mjs";

type RectInput = {
  height: number;
  left: number;
  top: number;
  width: number;
};

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
    expect(TipVizTooltip.observedAttributes).toEqual(["transition-duration", "stylesheet", "no-auto-reposition"]);
  });

  it("applies transition-duration from attribute on connect", () => {
    const customTooltip = document.createElement(tooltipTag) as TipVizTooltip;
    customTooltip.setAttribute("transition-duration", "450");

    document.body.appendChild(customTooltip);

    const tooltipBox = getTooltipBox(customTooltip);
    expect(tooltipBox.style.transition).toContain("450ms");
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
      expect(tooltipBox.style.opacity).toBe("1");
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
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

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
      expect(spans[0]?.textContent).toBe("same");
      expect(spans[1]?.textContent).toBe("same");
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
      tooltip.setSanitizerConfig({ removeElements: [], removeAttributes: ["data-custom"] });
      tooltip.setTemplate("<div data-custom='secret'><span>test</span></div>");

      const tooltipBox = getTooltipBox(tooltip);
      expect(tooltipBox.querySelector("div")?.getAttribute("data-custom")).toBeNull();
      expect(tooltipBox.querySelector("div")?.getAttribute("data-custom")).toBeFalsy();
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
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

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
    tooltip.setDirection((data) => (data["score"] as number) > 100 ? "n" : "s");
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

    const event = onShow.mock.calls.at(0)?.at(0) as CustomEvent;
    expect(event.type).toBe("show");
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
    expect(event.detail.target).toBe(target);
    expect(event.detail.data).toEqual({ id: 42 });
    expect(event.detail.direction).toBe("n");
    expect(event.detail.position).toEqual({ top: 90, left: 80 });
  });

  it("hides tooltip and dispatches hide event", () => {
    const onHide = vi.fn();
    tooltip.addEventListener("hide", onHide);

    tooltip.setTemplate("<span>content</span>");
    tooltip.show(target);
    tooltip.hide();

    const tooltipBox = getTooltipBox(tooltip);
    expect(tooltipBox.style.opacity).toBe("0");
    expect(tooltipBox.style.pointerEvents).toBe("none");
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it("clears tooltip children on disconnectedCallback", () => {
    tooltip.setTemplate("<span>cleanup</span>");
    tooltip.show(target);

    const tooltipBox = getTooltipBox(tooltip);
    expect(tooltipBox.childNodes.length).toBeGreaterThan(0);

    tooltip.disconnectedCallback();

    expect(tooltipBox.childNodes.length).toBe(0);
  });

  it("setStyles() called multiple times only applies the latest CSS", () => {
    tooltip.setStyles(".tipviz-tooltip { color: red; }");
    tooltip.setStyles(".tipviz-tooltip { color: blue; }");
    tooltip.setStyles(".tipviz-tooltip { color: green; }");

    const fallbackStyles = tooltip.shadowRoot?.querySelectorAll("style[data-tipviz]");
    expect(fallbackStyles?.length).toBe(1);
    expect(fallbackStyles?.item(0)?.textContent).toContain("color: green");
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
});