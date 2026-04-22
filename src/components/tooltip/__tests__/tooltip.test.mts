import { TipVizTooltip } from "../tooltip.mjs";

type RectInput = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const TOOLTIP_TAG = "tip-viz-tooltip";

const createRect = ({ top, left, width, height }: RectInput): DOMRect => {
  const right = left + width;
  const bottom = top + height;
  return {
    x: left,
    y: top,
    top,
    left,
    right,
    bottom,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect;
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
    if (!customElements.get(TOOLTIP_TAG)) {
      customElements.define(TOOLTIP_TAG, TipVizTooltip);
    }
  });

  beforeEach(() => {
    target = document.createElement("div");
    tooltip = document.createElement(TOOLTIP_TAG) as TipVizTooltip;

    document.body.append(target, tooltip);

    mockRect(target, { top: 100, left: 50, width: 80, height: 40 });
    mockRect(getTooltipBox(tooltip), { top: 0, left: 0, width: 20, height: 10 });
  });

  afterEach(() => {
    document.body.textContent = "";
    vi.restoreAllMocks();
  });

  it("has expected observed attributes", () => {
    expect(TipVizTooltip.observedAttributes).toEqual(["transition-duration", "stylesheet", "no-auto-reposition"]);
  });

  it("applies transition-duration from attribute on connect", () => {
    const customTooltip = document.createElement(TOOLTIP_TAG) as TipVizTooltip;
    customTooltip.setAttribute("transition-duration", "450");

    document.body.appendChild(customTooltip);

    const tooltipBox = getTooltipBox(customTooltip);
    expect(tooltipBox.style.transition).toContain("450ms");
  });

  it("creates and updates stylesheet link without duplicates", () => {
    tooltip.loadStylesheet("/one.css");
    tooltip.loadStylesheet("/two.css");

    const links = tooltip.shadowRoot?.querySelectorAll("link[data-tipviz-link]") ?? [];
    expect(links.length).toBe(1);
    expect(links.item(0).getAttribute("href")).toBe("/two.css");
  });

  it("renders html content on show", () => {
    tooltip.setHtml(() => "<span class='value'>Hello</span>");

    tooltip.show({}, target);

    const tooltipBox = getTooltipBox(tooltip);
    const valueNode = tooltipBox.querySelector(".value");
    expect(valueNode?.textContent).toBe("Hello");
    expect(tooltipBox.style.opacity).toBe("1");
    expect(tooltipBox.style.pointerEvents).toBe("all");
  });

  it("uses setHTML when available", () => {
    const tooltipBox = getTooltipBox(tooltip);
    const setHTML = vi.fn((html: string) => {
      tooltipBox.textContent = html;
    });

    Object.defineProperty(tooltipBox, "setHTML", {
      value: setHTML,
      configurable: true,
      writable: true,
    });

    tooltip.setHtml(() => "<strong>Safe HTML</strong>");
    tooltip.show({}, target);

    expect(setHTML).toHaveBeenCalledWith("<strong>Safe HTML</strong>", { sink: "div" });
  });

  it("applies direction classes and removes previous direction class", () => {
    tooltip.setDirection(() => "n");
    tooltip.show({}, target);

    const tooltipBox = getTooltipBox(tooltip);
    expect(tooltipBox.classList.contains("n")).toBe(true);

    tooltip.setDirection(() => "s");
    tooltip.show({}, target);

    expect(tooltipBox.classList.contains("n")).toBe(false);
    expect(tooltipBox.classList.contains("s")).toBe(true);
  });

  it("keeps offset axes correct: x affects left, y affects top", () => {
    tooltip.setOffset(() => [12, 7]);
    tooltip.setDirection(() => "n");

    tooltip.show({}, target);

    const tooltipBox = getTooltipBox(tooltip);
    expect(tooltipBox.style.top).toBe("97px");
    expect(tooltipBox.style.left).toBe("92px");
  });

  it("dispatches a show event with detail payload", () => {
    const onShow = vi.fn();
    tooltip.addEventListener("show", onShow as EventListener);
    tooltip.setDirection(() => "e");

    tooltip.show({ id: 42 }, target);

    expect(onShow).toHaveBeenCalledTimes(1);

    const event = onShow.mock.calls.at(0)?.at(0) as CustomEvent;
    expect(event.type).toBe("show");
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
    expect(event.detail.target).toBe(target);
    expect(event.detail.data).toEqual({ id: 42 });
    expect(event.detail.direction).toBe("e");
    expect(event.detail.position).toEqual({ top: 115, left: 130 });
  });

  it("hides tooltip and dispatches hide event", () => {
    const onHide = vi.fn();
    tooltip.addEventListener("hide", onHide as EventListener);

    tooltip.show({}, target);
    tooltip.hide();

    const tooltipBox = getTooltipBox(tooltip);
    expect(tooltipBox.style.opacity).toBe("0");
    expect(tooltipBox.style.pointerEvents).toBe("none");
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it("clears tooltip children on disconnectedCallback", () => {
    tooltip.setHtml(() => "<span>cleanup</span>");
    tooltip.show({}, target);

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
