import { describe, expect, it } from "vitest";

import { BEHAVIORAL_CSS, insertStructuralStyles } from "../structural-styles.mjs";

/**
 * Verifies BEHAVIORAL_CSS contains only functional invariants with no visual defaults.
 */
describe("BEHAVIORAL_CSS", () => {
  /** Checks that the selector targets the correct attribute. */
  it("contains :where([data-tipviz-tooltip-box]) selector", () => {
    expect(BEHAVIORAL_CSS).toContain(":where([data-tipviz-tooltip-box])");
  });

  /** Checks functional box-model property. */
  it("sets box-sizing: border-box", () => {
    expect(BEHAVIORAL_CSS).toContain("box-sizing: border-box");
  });

  /** Checks positioning invariant. */
  it("sets position: absolute", () => {
    expect(BEHAVIORAL_CSS).toContain("position: absolute");
  });

  /** Checks default hidden opacity. */
  it("sets opacity: 0 (hidden state)", () => {
    expect(BEHAVIORAL_CSS).toContain("opacity: 0");
  });

  /** Checks pointer-events disabled in hidden state. */
  it("sets pointer-events: none", () => {
    expect(BEHAVIORAL_CSS).toContain("pointer-events: none");
  });

  /** Checks transition uses CSS custom property with correct fallback. */
  it("uses transition with --tip-transition-duration custom property and 200ms fallback", () => {
    expect(BEHAVIORAL_CSS).toContain(
      "transition: opacity var(--tip-transition-duration, 200ms)"
    );
  });

  // Negative assertions: forbidden visual properties
  /** Verifies no color-related properties are present. */
  it("does NOT contain color or color-related properties", () => {
    const forbidden = [
      "color:",
      "background:",
      "background-color:",
      "border:",
      "border-color:",
      "border-radius:",
      "box-shadow:",
      "font-family:",
      "font-size:",
      "font-weight:",
      "line-height:",
      "padding:",
      "margin:",
      "text-align:",
      "z-index:",
    ];
    for (const prop of forbidden) {
      expect(BEHAVIORAL_CSS).not.toContain(prop);
    }
  });

  /** Verifies no typography properties are present. */
  it("does NOT contain typography-related properties", () => {
    const typography = [
      "font-style:",
      "font-variant:",
      "letter-spacing:",
      "text-decoration:",
      "text-transform:",
      "word-spacing:",
    ];
    for (const prop of typography) {
      expect(BEHAVIORAL_CSS).not.toContain(prop);
    }
  });

  /** Verifies no border-related properties are present. */
  it("does NOT contain border or border-radius properties", () => {
    const borders = [
      "border-bottom:",
      "border-left:",
      "border-right:",
      "border-top:",
      "border-width:",
      "border-style:",
      "border-radius:",
    ];
    for (const prop of borders) {
      expect(BEHAVIORAL_CSS).not.toContain(prop);
    }
  });

  /** Verifies box-shadow is absent. */
  it("does NOT contain box-shadow", () => {
    expect(BEHAVIORAL_CSS).not.toContain("box-shadow:");
  });

  /** Verifies width/height are absent (they are set per-instance inline). */
  it("does NOT contain explicit pixel or rem sizing properties", () => {
    expect(BEHAVIORAL_CSS).not.toContain("width:");
    expect(BEHAVIORAL_CSS).not.toContain("height:");
  });
});

/**
 * Verifies insertStructuralStyles adopts constructable sheets or falls back to a
 * <style data-tipviz-structural> element.
 */
describe("insertStructuralStyles", () => {
  /** Adopts CSSStyleSheet when constructable sheets are available in the environment. */
  it("adopts a CSSStyleSheet when constructable sheets are available", () => {
    // Only run if constructable stylesheets are fully supported in this environment.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    let isConstructableSheetsAvailable = false;
    try {
      const s = new CSSStyleSheet();
      s.replaceSync(":root {}");
      isConstructableSheetsAvailable = true;
    } catch {
      // Not supported — skip this test path.
    }
    if (!isConstructableSheetsAvailable) {
      return;
    }

    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const ownerDoc = shadow.ownerDocument ?? document;

    const result = insertStructuralStyles(shadow, ownerDoc);

    expect(result).toBeInstanceOf(CSSStyleSheet);
    const sheet = result as CSSStyleSheet;
    expect(shadow.adoptedStyleSheets).toContain(sheet);
  });

  /** Falls back to <style data-tipviz-structural> when CSSStyleSheet constructor throws. */
  it("falls back to <style data-tipviz-structural> when CSSStyleSheet constructor throws", () => {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const ownerDoc = shadow.ownerDocument ?? document;

    const originalCSSStyleSheet = globalThis.CSSStyleSheet;
    // Simulate constructable stylesheet unavailability.
    const mockGlobal = globalThis as typeof globalThis & {
      CSSStyleSheet: typeof CSSStyleSheet;
    };
    mockGlobal.CSSStyleSheet = function () {
      throw new Error("Constructable stylesheets not supported");
    } as unknown as typeof CSSStyleSheet;

    try {
      const result = insertStructuralStyles(shadow, ownerDoc);

      expect(result).toBeInstanceOf(HTMLStyleElement);
      const styleEl = result as HTMLStyleElement;
      expect(styleEl.getAttribute("data-tipviz-structural")).toBe("");
      expect(styleEl.textContent).toBe(BEHAVIORAL_CSS);
      expect(shadow.querySelector("[data-tipviz-structural]")).toBe(styleEl);
    } finally {
      mockGlobal.CSSStyleSheet = originalCSSStyleSheet;
    }
  });

  /** Falls back to <style data-tipviz-structural> when replaceSync throws. */
  it("falls back to <style data-tipviz-structural> when replaceSync throws", () => {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const ownerDoc = shadow.ownerDocument ?? document;

    const originalCSSStyleSheet = globalThis.CSSStyleSheet;
    const mockGlobal = globalThis as typeof globalThis & {
      CSSStyleSheet: typeof CSSStyleSheet;
    };
    mockGlobal.CSSStyleSheet = function () {
      return {
        replaceSync: () => {
          throw new Error("replaceSync not supported");
        },
      };
    } as unknown as typeof CSSStyleSheet;

    try {
      const result = insertStructuralStyles(shadow, ownerDoc);

      expect(result).toBeInstanceOf(HTMLStyleElement);
      const styleEl = result as HTMLStyleElement;
      expect(styleEl.getAttribute("data-tipviz-structural")).toBe("");
      expect(shadow.querySelector("[data-tipviz-structural]")).toBe(styleEl);
    } finally {
      mockGlobal.CSSStyleSheet = originalCSSStyleSheet;
    }
  });

  /** Verifies fallback uses data-tipviz-structural (not data-tipviz) to avoid setStyles conflicts. */
  it("does NOT use data-tipviz attribute in fallback (would conflict with setStyles cleanup)", () => {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const ownerDoc = shadow.ownerDocument ?? document;

    const originalCSSStyleSheet = globalThis.CSSStyleSheet;
    const mockGlobal = globalThis as typeof globalThis & {
      CSSStyleSheet: typeof CSSStyleSheet;
    };
    mockGlobal.CSSStyleSheet = function () {
      throw new Error("unavailable");
    } as unknown as typeof CSSStyleSheet;

    try {
      const result = insertStructuralStyles(shadow, ownerDoc);
      const styleEl = result as HTMLStyleElement;
      expect(styleEl.hasAttribute("data-tipviz-structural")).toBe(true);
      expect(styleEl.hasAttribute("data-tipviz")).toBe(false);
    } finally {
      mockGlobal.CSSStyleSheet = originalCSSStyleSheet;
    }
  });
});
