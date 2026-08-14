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

describe("Sanitizer Characterization", () => {
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

  describe("default config — element removal", () => {
    it("removes script elements", () => {
      tooltip.setTemplate("<div><script>alert(1)</script><span>safe</span></div>");
      const tooltipBox = getTooltipBox(tooltip);
      expect(tooltipBox.querySelector("script")).toBeNull();
      expect(tooltipBox.querySelector("span")?.textContent).toBe("safe");
    });

    it("removes iframe elements", () => {
      tooltip.setTemplate("<div><iframe srcdoc='<h1>evil</h1>'></iframe><p>ok</p></div>");
      const tooltipBox = getTooltipBox(tooltip);
      expect(tooltipBox.querySelector("iframe")).toBeNull();
      expect(tooltipBox.querySelector("p")?.textContent).toBe("ok");
    });

    it("removes object elements", () => {
      tooltip.setTemplate("<div><object data='/embed.swf'></object><span>safe</span></div>");
      const tooltipBox = getTooltipBox(tooltip);
      expect(tooltipBox.querySelector("object")).toBeNull();
      expect(tooltipBox.querySelector("span")?.textContent).toBe("safe");
    });
  });

  describe("default config — attribute removal on element removal", () => {
    it("removes iframe element entirely (srcdoc attribute is moot — parent gone)", () => {
      tooltip.setTemplate("<iframe srcdoc='<h1>evil</h1>' width='200'></iframe>");
      const tooltipBox = getTooltipBox(tooltip);
      expect(tooltipBox.querySelector("iframe")).toBeNull();
    });

    it("removes button element entirely (formaction attribute is moot — parent gone)", () => {
      tooltip.setTemplate("<button formaction='https://evil.com'>submit</button>");
      const tooltipBox = getTooltipBox(tooltip);
      expect(tooltipBox.querySelector("button")).toBeNull();
    });
  });

  describe("defense-in-depth — attribute rule works when element survives", () => {
    it("strips srcdoc from iframe when iframe is NOT in removeElements", () => {
      // Custom config: keep iframe but strip srcdoc attribute
      tooltip.setSanitizerConfig({ removeElements: ["script", "object", "embed", "link", "meta", "base", "form", "input", "button", "textarea", "select"], removeAttributes: ["srcdoc", "formaction"] });
      tooltip.setTemplate("<iframe srcdoc='<h1>content</h1>' width='200'></iframe>");

      const tooltipBox = getTooltipBox(tooltip);
      const iframe = tooltipBox.querySelector("iframe");
      expect(iframe).not.toBeNull();
      expect(iframe?.getAttribute("srcdoc")).toBeNull();
    });

    it("strips formaction from button when button is NOT in removeElements", () => {
      // Custom config: keep button but strip formaction attribute
      tooltip.setSanitizerConfig({ removeElements: ["script", "iframe", "object", "embed", "link", "meta", "base", "form", "input", "textarea", "select"], removeAttributes: ["srcdoc", "formaction"] });
      tooltip.setTemplate("<button formaction='https://evil.com'>submit</button>");

      const tooltipBox = getTooltipBox(tooltip);
      const button = tooltipBox.querySelector("button");
      expect(button).not.toBeNull();
      expect(button?.getAttribute("formaction")).toBeNull();
    });
  });

  describe("RED cases for Plan 002", () => {
    it.skip("strips on* event-handler attributes by default", () => {
      // Plan 002 must implement stripping of on* attributes from all elements
      tooltip.setTemplate("<img src='x' onerror='alert(1)' alt='x'>");
      const tooltipBox = getTooltipBox(tooltip);
      expect(tooltipBox.querySelector("img")?.getAttribute("onerror")).toBeNull();
    });

    it.skip("strips javascript: URLs from href by default", () => {
      // Plan 002 must implement javascript: URL stripping from href and similar attributes
      tooltip.setTemplate("<a href='javascript:alert(1)'>click</a>");
      const tooltipBox = getTooltipBox(tooltip);
      const href = tooltipBox.querySelector("a")?.getAttribute("href");
      expect(href).toBeNull();
    });
  });
});
