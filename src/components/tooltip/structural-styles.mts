import { defaultTransitionDuration } from "./constants.mjs";

/**
 * Returns the adoptedStyleSheets array from a shadow root, guarding against
 * undefined (some jsdom versions / iframes return undefined at runtime even
 * though the TS type says CSSStyleSheet[]).
 */
export function getAdoptedStyleSheets(shadow: ShadowRoot): CSSStyleSheet[] {
  // Guard: jsdom may return undefined at runtime even though the TS type says CSSStyleSheet[].
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return shadow.adoptedStyleSheets ?? [];
}

/**
 * Sets adoptedStyleSheets on a shadow root, guarding against environments
 * that do not support the constructable sheets API or where the property
 * is undefined at runtime.
 */
export function setAdoptedStyleSheets(shadow: ShadowRoot, sheets: CSSStyleSheet[]): void {
  try {
    shadow.adoptedStyleSheets = sheets;
  } catch {
    // Silently ignore — the outer try/catch in insertStructuralStyles or
    // #applyConsumerStyles will fall back to <style> injection.
  }
}

/**
 * Behavioral CSS invariants for the tooltip box — zero visual properties.
 * Used via constructable CSSStyleSheet or <style> fallback injected into shadow root.
 * Consumers can always override via setStyles(), loadStylesheet(), or ::part(tooltip-box).
 */
const behavioralCss = `
:where([data-tipviz-tooltip-box]) {
  box-sizing: border-box;
  left: 0;
  top: 0;
  opacity: 0;
  pointer-events: none;
  position: absolute;
  transition: opacity var(--tip-transition-duration, ${String(defaultTransitionDuration)}ms);
}
:where([data-tipviz-tooltip-box][data-visible="true"]) {
  opacity: 1;
  pointer-events: all;
}
`;

// Named export matches the design contract name; internal variable is camelCase.
export { behavioralCss as BEHAVIORAL_CSS };

/**
 * Inserts the structural stylesheet into the given shadow root.
 *
 * Primary path: constructable CSSStyleSheet + shadow.adoptedStyleSheets.
 * Fallback path: <style data-tipviz-structural> injected as first child of shadow.
 *   The data-tipviz-structural attribute ensures consumer setStyles() cleanup
 *   (which uses data-tipviz) does not accidentally remove the structural sheet.
 *
 * @param shadow  - The shadow root to inject styles into.
 * @param ownerDoc - The document to use for creating fallback <style> element.
 * @returns The CSSStyleSheet when using constructable sheets, or the HTMLStyleElement fallback.
 */
export function insertStructuralStyles(
  shadow: ShadowRoot,
  ownerDoc: Document
): CSSStyleSheet | HTMLStyleElement {
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(behavioralCss);
    // Insert internal sheet first — consumer sheets appended after win by cascade order.
    setAdoptedStyleSheets(shadow, [...getAdoptedStyleSheets(shadow), sheet]);
    return sheet;
  } catch {
    // Constructable sheets unavailable (e.g., older browser or iframe sandbox).
    // Fall back to a <style> element with the structural CSS.
    const styleEl = ownerDoc.createElement("style");
    styleEl.setAttribute("data-tipviz-structural", "");
    styleEl.textContent = behavioralCss;
    const firstChild = shadow.firstChild;
    if (firstChild) {
      shadow.insertBefore(styleEl, firstChild);
    } else {
      shadow.appendChild(styleEl);
    }
    return styleEl;
  }
}
