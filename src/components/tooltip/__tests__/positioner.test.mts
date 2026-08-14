import { getCoordinates } from "../positioner.mjs";
import type { Direction } from "../types.mjs";

/**
 * Creates a mock DOMRect from literal values.
 */
const makeRect = (top: number, left: number, width: number, height: number): DOMRect => {
  const right = left + width;
  const bottom = top + height;
  return {
    top, left, right, bottom, width, height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
};

// Fixed rects per spec:
// target: {top:100, left:50, width:80, height:40}
// tooltip: {width:20, height:10}
const TARGET_RECT = makeRect(100, 50, 80, 40);
const TOOLTIP_RECT = makeRect(0, 0, 20, 10);

describe("getCoordinates — direct-call unit tests", () => {
  it("positions tooltip to the north (n)", () => {
    const coords = getCoordinates("n" as Direction, TARGET_RECT, TOOLTIP_RECT);
    // top = t.top - tt.height = 100 - 10 = 90
    // left = t.left + t.width/2 - tt.width/2 = 50 + 40 - 10 = 80
    expect(coords).toEqual({ top: 90, left: 80 });
  });

  it("positions tooltip to the south (s)", () => {
    const coords = getCoordinates("s" as Direction, TARGET_RECT, TOOLTIP_RECT);
    // top = t.bottom = 140
    // left = t.left + t.width/2 - tt.width/2 = 50 + 40 - 10 = 80
    expect(coords).toEqual({ top: 140, left: 80 });
  });

  it("positions tooltip to the east (e)", () => {
    const coords = getCoordinates("e" as Direction, TARGET_RECT, TOOLTIP_RECT);
    // top = t.top + t.height/2 - tt.height/2 = 100 + 20 - 5 = 115
    // left = t.right = 130
    expect(coords).toEqual({ top: 115, left: 130 });
  });

  it("positions tooltip to the west (w)", () => {
    const coords = getCoordinates("w" as Direction, TARGET_RECT, TOOLTIP_RECT);
    // top = t.top + t.height/2 - tt.height/2 = 100 + 20 - 5 = 115
    // left = t.left - tt.width = 50 - 20 = 30
    expect(coords).toEqual({ top: 115, left: 30 });
  });

  it("positions tooltip to the northwest (nw)", () => {
    const coords = getCoordinates("nw" as Direction, TARGET_RECT, TOOLTIP_RECT);
    // top = t.top - tt.height = 100 - 10 = 90
    // left = t.left - tt.width = 50 - 20 = 30
    expect(coords).toEqual({ top: 90, left: 30 });
  });

  it("positions tooltip to the northeast (ne)", () => {
    const coords = getCoordinates("ne" as Direction, TARGET_RECT, TOOLTIP_RECT);
    // top = t.top - tt.height = 100 - 10 = 90
    // left = t.right = 130
    expect(coords).toEqual({ top: 90, left: 130 });
  });

  it("positions tooltip to the southwest (sw)", () => {
    const coords = getCoordinates("sw" as Direction, TARGET_RECT, TOOLTIP_RECT);
    // top = t.bottom = 140
    // left = t.left - tt.width = 50 - 20 = 30
    expect(coords).toEqual({ top: 140, left: 30 });
  });

  it("positions tooltip to the southeast (se)", () => {
    const coords = getCoordinates("se" as Direction, TARGET_RECT, TOOLTIP_RECT);
    // top = t.bottom = 140
    // left = t.right = 130
    expect(coords).toEqual({ top: 140, left: 130 });
  });
});
