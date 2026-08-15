import { getCoordinates } from "../positioner.mjs";
import type { Direction } from "../types.mjs";

/**
 * Creates a mock DOMRect from literal values.
 */
const makeRect = (height: number, left: number, top: number, width: number): DOMRect => {
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
  } as DOMRect;
};

// Fixed rects per spec:
// target: {top:100, left:50, width:80, height:40}
// tooltip: {width:20, height:10}
const targetRect = makeRect(40, 50, 100, 80);
const tooltipRect = makeRect(10, 0, 0, 20);

describe("getCoordinates — direct-call unit tests", () => {
  it("positions tooltip to the north (n)", () => {
    const coords = getCoordinates("n" as Direction, targetRect, tooltipRect);
    // top = t.top - tt.height = 100 - 10 = 90
    // left = t.left + t.width/2 - tt.width/2 = 50 + 40 - 10 = 80
    expect(coords).toEqual({ top: 90, left: 80 });
  });

  it("positions tooltip to the south (s)", () => {
    const coords = getCoordinates("s" as Direction, targetRect, tooltipRect);
    // top = t.bottom = 140
    // left = t.left + t.width/2 - tt.width/2 = 50 + 40 - 10 = 80
    expect(coords).toEqual({ top: 140, left: 80 });
  });

  it("positions tooltip to the east (e)", () => {
    const coords = getCoordinates("e" as Direction, targetRect, tooltipRect);
    // top = t.top + t.height/2 - tt.height/2 = 100 + 20 - 5 = 115
    // left = t.right = 130
    expect(coords).toEqual({ top: 115, left: 130 });
  });

  it("positions tooltip to the west (w)", () => {
    const coords = getCoordinates("w" as Direction, targetRect, tooltipRect);
    // top = t.top + t.height/2 - tt.height/2 = 100 + 20 - 5 = 115
    // left = t.left - tt.width = 50 - 20 = 30
    expect(coords).toEqual({ top: 115, left: 30 });
  });

  it("positions tooltip to the northwest (nw)", () => {
    const coords = getCoordinates("nw" as Direction, targetRect, tooltipRect);
    // top = t.top - tt.height = 100 - 10 = 90
    // left = t.left - tt.width = 50 - 20 = 30
    expect(coords).toEqual({ top: 90, left: 30 });
  });

  it("positions tooltip to the northeast (ne)", () => {
    const coords = getCoordinates("ne" as Direction, targetRect, tooltipRect);
    // top = t.top - tt.height = 100 - 10 = 90
    // left = t.right = 130
    expect(coords).toEqual({ top: 90, left: 130 });
  });

  it("positions tooltip to the southwest (sw)", () => {
    const coords = getCoordinates("sw" as Direction, targetRect, tooltipRect);
    // top = t.bottom = 140
    // left = t.left - tt.width = 50 - 20 = 30
    expect(coords).toEqual({ top: 140, left: 30 });
  });

  it("positions tooltip to the southeast (se)", () => {
    const coords = getCoordinates("se" as Direction, targetRect, tooltipRect);
    // top = t.bottom = 140
    // left = t.right = 130
    expect(coords).toEqual({ top: 140, left: 130 });
  });
});
