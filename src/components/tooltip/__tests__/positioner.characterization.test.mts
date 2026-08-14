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

describe("Positioner Characterization", () => {
  let tooltip: TipVizTooltip;
  let target: HTMLDivElement;

  // Fixed rects for all tests
  // target: top=100, left=50, width=80, height=40
  // tooltip: top=0, left=0, width=20, height=10
  const TARGET_RECT = { top: 100, left: 50, width: 80, height: 40 };
  const TOOLTIP_RECT = { top: 0, left: 0, width: 20, height: 10 };

  beforeAll(() => {
    if (!customElements.get(TOOLTIP_TAG)) {
      customElements.define(TOOLTIP_TAG, TipVizTooltip);
    }
  });

  beforeEach(() => {
    target = document.createElement("div");
    tooltip = document.createElement(TOOLTIP_TAG) as TipVizTooltip;
    document.body.append(target, tooltip);
    mockRect(target, TARGET_RECT);
    mockRect(getTooltipBox(tooltip), TOOLTIP_RECT);
    tooltip.setTemplate("<span>content</span>");
    tooltip.setOffset(() => [0, 0]);
  });

  afterEach(() => {
    document.body.textContent = "";
    vi.restoreAllMocks();
  });

  const checkPosition = (tooltipEl: TipVizTooltip, expectedTop: number, expectedLeft: number) => {
    const tooltipBox = getTooltipBox(tooltipEl);
    expect(tooltipBox.style.top).toBe(`${expectedTop}px`);
    expect(tooltipBox.style.left).toBe(`${expectedLeft}px`);
  };

  it('positions tooltip to the north (n)', () => {
    tooltip.setDirection(() => "n");
    tooltip.show(target);
    // top = rect.top - tooltipRect.height = 100 - 10 = 90
    // left = rect.left + rect.width/2 - tooltipRect.width/2 = 50 + 40 - 10 = 80
    checkPosition(tooltip, 90, 80);
  });

  it('positions tooltip to the south (s)', () => {
    tooltip.setDirection(() => "s");
    tooltip.show(target);
    // top = rect.bottom = 140
    // left = rect.left + rect.width/2 - tooltipRect.width/2 = 50 + 40 - 10 = 80
    checkPosition(tooltip, 140, 80);
  });

  it('positions tooltip to the east (e)', () => {
    tooltip.setDirection(() => "e");
    tooltip.show(target);
    // top = rect.top + rect.height/2 - tooltipRect.height/2 = 100 + 20 - 5 = 115
    // left = rect.right = 130
    checkPosition(tooltip, 115, 130);
  });

  it('positions tooltip to the west (w)', () => {
    tooltip.setDirection(() => "w");
    tooltip.show(target);
    // top = rect.top + rect.height/2 - tooltipRect.height/2 = 100 + 20 - 5 = 115
    // left = rect.left - tooltipRect.width = 50 - 20 = 30
    checkPosition(tooltip, 115, 30);
  });

  it('positions tooltip to the northwest (nw)', () => {
    tooltip.setDirection(() => "nw");
    tooltip.show(target);
    // top = rect.top - tooltipRect.height = 100 - 10 = 90
    // left = rect.left - tooltipRect.width = 50 - 20 = 30
    checkPosition(tooltip, 90, 30);
  });

  it('positions tooltip to the northeast (ne)', () => {
    tooltip.setDirection(() => "ne");
    tooltip.show(target);
    // top = rect.top - tooltipRect.height = 100 - 10 = 90
    // left = rect.right = 130
    checkPosition(tooltip, 90, 130);
  });

  it('positions tooltip to the southwest (sw)', () => {
    tooltip.setDirection(() => "sw");
    tooltip.show(target);
    // top = rect.bottom = 140
    // left = rect.left - tooltipRect.width = 50 - 20 = 30
    checkPosition(tooltip, 140, 30);
  });

  it('positions tooltip to the southeast (se)', () => {
    tooltip.setDirection(() => "se");
    tooltip.show(target);
    // top = rect.bottom = 140
    // left = rect.right = 130
    checkPosition(tooltip, 140, 130);
  });
});
