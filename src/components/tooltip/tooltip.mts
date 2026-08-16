import {
  defaultDirection,
  defaultOffset,
  defaultTransitionDuration,
  sanitizerConfig,
} from "./constants.mjs";
import { getCoordinates } from "./positioner.mjs";
import { sanitizeHtml } from "./sanitizer.mjs";
import {
  getAdoptedStyleSheets,
  insertStructuralStyles,
  setAdoptedStyleSheets,
} from "./structural-styles.mjs";
import {
  Direction,
  DirectionFn,
  OffsetCallback,
  TooltipData,
} from "./types.mjs";

/**
 *
 */
export class TipVizTooltip extends HTMLElement {
  /**
   *
   */
  public static get observedAttributes() {
    return ["transition-duration", "stylesheet", "no-auto-reposition", "template", "data"];
  }

  static #idCounter = 0;

  #activeTarget: Element | null = null;
  #adoptedStylesheet: CSSStyleSheet | null = null;
  #boundElements = new Map<string, HTMLElement[]>();
  #currentDirection: Direction | null = null;
  #data: Record<string, number | string> = {};
  #sanitizerConfig: SanitizerConfig = sanitizerConfig;
  #shadow: ShadowRoot;
  #structuralSheet: CSSStyleSheet | null = null;
  #structuralStyleEl: HTMLStyleElement | null = null;
  #stylesText = "";
  #templateHtml = "";
  #templateSet = false;
  #tooltipDiv: HTMLDivElement;
  #transitionDuration = defaultTransitionDuration;

  /**
   *
   */
  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: "open" });
    this.#tooltipDiv = document.createElement("div");
    this.#tooltipDiv.className = "tipviz-tooltip";
    this.#tooltipDiv.setAttribute("aria-hidden", "true");
    this.#tooltipDiv.setAttribute("data-tipviz-tooltip-box", "");
    this.#tooltipDiv.setAttribute("part", "tooltip-box");
    this.#tooltipDiv.setAttribute("role", "tooltip");

    const structural = insertStructuralStyles(this.#shadow, this.ownerDocument);
    if (structural instanceof CSSStyleSheet) {
      this.#structuralSheet = structural;
    } else {
      this.#structuralStyleEl = structural;
    }

    this.#shadow.appendChild(this.#tooltipDiv);
  }

  /**
   * Fires when the element is adopted into a new document.
   * Re-establishes structural styles, consumer styles, accessibility attributes,
   * and re-renders the template in the new document context.
   */
  public adoptedCallback() {
    // Re-establish accessibility host attributes in the new document
    this.#ensureAccessibleHostAttributes();

    // Re-insert structural stylesheet in the adopting document
    this.#removeStructuralStylesheet();
    const structural = insertStructuralStyles(this.#shadow, this.ownerDocument);
    if (structural instanceof CSSStyleSheet) {
      this.#structuralSheet = structural;
    } else {
      this.#structuralStyleEl = structural;
    }

    // Re-apply consumer styles in the adopting document context.
    // #stylesText is preserved through the disconnect/adopt transition
    // (disconnectedCallback no longer wipes it).
    //
    // WHY always <style> fallback on adoption: adoptedStyleSheets is document-
    // scoped per WHATWG. A CSSStyleSheet created in document A is silently
    // dropped when assigned to a shadow root in document B (e.g. an iframe's
    // contentDocument). This is NOT reproduced by jsdom, which is why the
    // RED test is needed. The structural sheet avoids this by being re-created
    // fresh in each insertStructuralStyles() call, but consumer sheets use the
    // same pattern without that guarantee. <style> carries only CSS text and
    // survives cross-document adoption without issue.
    if (this.#stylesText) {
      this.#injectConsumerStyleElement();
    }

    // Refresh described-by for the new document context
    this.#refreshDescribedBy();

    // WHY: #templateHtml (the HTML string) is preserved across the disconnect/adopt
    // transition. When non-empty, the template needs to be re-parsed and re-rendered
    // in the new document context so [data-bind] references resolve correctly.
    if (this.#templateHtml) {
      const tmpl = this.#templateHtml;
      const frag = this.ownerDocument.createRange().createContextualFragment(
        sanitizeHtml(tmpl, this.#sanitizerConfig),
      );
      this.#tooltipDiv.replaceChildren(...frag.children);
      this.#templateSet = true;
      this.#cacheBoundElements();
      this.#applyDataToBoundElements();
    }
  }

  /**
   * Handles attribute changes for observed attributes.
   * `transition-duration` and `stylesheet` are re-applied when changed.
   */
  public attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === "transition-duration" && newValue) {
      this.#updateTransitionDuration(newValue);
    }

    if (name === "stylesheet" && newValue) {
      this.loadStylesheet(newValue);
    }

    if (name === "template" && newValue) {
      this.setTemplate(newValue);
    }

    if (name === "data" && newValue) {
      try {
        const parsed = JSON.parse(newValue) as Record<string, number | string>;
        this.#data = { ...parsed };
        if (this.#templateSet) {
          // Replace semantics: clear all bound elements before applying new data
          // so that removed keys don't leave stale textContent behind
          for (const [, elements] of this.#boundElements) {
            for (const el of elements) {
              el.textContent = "";
            }
          }
          this.#applyDataToBoundElements();
        }
      } catch {
        console.error("[tip-viz-tooltip] invalid JSON in data attribute:", newValue);
      }
    }
  }

  /**
   * Fires when the element is inserted into the DOM.
   * Ensures host accessibility attributes, applies transition-duration/stylesheet
   * attributes, and auto-repositions into body if not disabled.
   */
  public connectedCallback() {
    this.#ensureAccessibleHostAttributes();

    if (!this.hasAttribute("no-auto-reposition") && this.parentElement !== this.ownerDocument.body) {
      this.ownerDocument.body.appendChild(this);
    }

    const duration = this.getAttribute("transition-duration");
    if (duration) this.#updateTransitionDuration(duration);

    const stylesheet = this.getAttribute("stylesheet");
    if (stylesheet) this.loadStylesheet(stylesheet);

    const templateAttr = this.getAttribute("template");
    if (templateAttr) this.setTemplate(templateAttr);

    const dataAttr = this.getAttribute("data");
    if (dataAttr) {
      try {
        const parsed = JSON.parse(dataAttr) as Record<string, number | string>;
        this.#data = { ...parsed };
        if (this.#templateSet) {
          for (const [, elements] of this.#boundElements) {
            for (const el of elements) {
              el.textContent = "";
            }
          }
          this.#applyDataToBoundElements();
        }
      } catch {
        console.error("[tip-viz-tooltip] invalid JSON in data attribute:", dataAttr);
      }
    }
  }

  /**
   * Fires when the element is removed from the DOM.
   * Cleans up described-by, styles, and structural styles but preserves adoption
   * state (template, data, stylesText) for cross-document moves.
   */
  public disconnectedCallback() {
    // Only clear described-by, not the active target.
    // If adoptedCallback follows (element moved to new document),
    // the target will be re-used for re-resolution in the new context.
    this.#clearDescribedByOnly();
    this.#removeAdoptedStylesheet();
    this.#removeStructuralStylesheet();
    this.#removeInlineStyles();
    this.#removeStylesheetLink();

    // WHY: Template/data/styles are adoption state, not connection state.
    // Cross-document adoption fires disconnectedCallback then adoptedCallback.
    // Clearing #stylesText here caused consumer styles to be lost after
    // adoption — adoptedCallback never re-applied them. The physical removal
    // of style elements from the old document is correct (clean exit), but
    // the #stylesText string must survive so adoptedCallback can re-apply it
    // in the new document context. #boundElements, #data, #templateHtml,
    // #templateSet, #stylesText, and #tooltipDiv children are all adoption
    // state that must persist across the disconnect/adopt transition.

    if (this.#currentDirection) {
      this.#tooltipDiv.classList.remove(this.#currentDirection);
      this.#currentDirection = null;
    }
  }

  /**
   * Hides the tooltip and clears its aria-describedby binding on the active target.
   */
  public hide() {
    this.#tooltipDiv.removeAttribute("data-visible");
    this.#tooltipDiv.setAttribute("aria-hidden", "true");
    this.setAttribute("aria-hidden", "true");
    this.#clearDescribedBy();
    this.dispatchEvent(new CustomEvent("hide", { bubbles: true, composed: true }));
  }

  /**
   * Loads an external stylesheet URL into the tooltip's shadow root.
   * Clears any previously-set inline styles first.
   */
  public loadStylesheet(url: string) {
    this.#stylesText = "";
    this.#removeAdoptedStylesheet();
    this.#removeInlineStyles();
    this.#removeStylesheetLink();

    const stylesheetUrl = url.trim();
    if (!stylesheetUrl) {
      this.#removeStylesheetLink();
      return;
    }

    let link = this.#shadow.querySelector<HTMLLinkElement>("link[data-tipviz-link]");
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("data-tipviz-link", "");
      link.setAttribute("rel", "stylesheet");
      const linkHref = link.href;
      link.addEventListener("error", () => {
        console.warn(`[tip-viz-tooltip] Failed to load stylesheet: ${linkHref}`);
      });
      this.#shadow.insertBefore(link, this.#tooltipDiv);
    }
    link.href = stylesheetUrl;
  }

  /**
   *
   */
  public setData(data: Record<string, number | string>): void {
    this.#data = { ...this.#data, ...data };

    if (this.#templateSet) {
      this.#applyDataToBoundElements();
    }
  }

  /**
   * Sets the direction callback that returns which way the tooltip should point.
   * @param fn - Callback receiving data and target element; returns a Direction string.
   */
   public setDirection<TData extends TooltipData>(fn: DirectionFn<TData>) {
     this.#directionCallback = fn as DirectionFn;
   }

  /**
   * Sets the offset callback that returns [x, y] pixel adjustment from the anchor point.
   * @param fn - Callback receiving data and target element; returns [offsetX, offsetY].
   */
  public setOffset<TData extends TooltipData>(fn: OffsetCallback<TData>) {
    this.#offsetCallback = fn as OffsetCallback;
  }

  /**
   *
   */
  public setSanitizerConfig(config: SanitizerConfig): void {
    // WHY: partial configs must not silently drop the default element and
    // attribute denylists — the documented usage passes a single flag.
    this.#sanitizerConfig = { ...sanitizerConfig, ...config };

    if (this.#templateSet && this.#templateHtml) {
      const fragment = this.ownerDocument
        .createRange()
        .createContextualFragment(sanitizeHtml(this.#templateHtml, this.#sanitizerConfig));
      this.#tooltipDiv.replaceChildren(...fragment.childNodes);
      this.#cacheBoundElements();
      if (Object.keys(this.#data).length > 0) {
        this.#applyDataToBoundElements();
      }
    }
  }

  /**
   *
   */
  public setStyles(css: string) {
    this.#stylesText = css;

    this.#removeAdoptedStylesheet();
    this.#removeInlineStyles();
    this.#removeStylesheetLink();

    if (!this.#stylesText) return;

    this.#applyConsumerStyles();
  }

  /**
   * Sets the HTML template for the tooltip.
   * @param htmlString - The HTML string to use as the tooltip template.
   *                      May contain data-bind attributes to bind data values.
   * @remarks
   * Parses the HTML with DOMParser and sanitizes it via `sanitizeHtml`
   * (default config strips on* event handlers, dangerous elements, and unsafe URL schemes).
   * Caches references to [data-bind] elements for O(1) updates on data changes.
   * If data was set before the template, applies it immediately.
   * @example
   * ```typescript
   * tooltip.setTemplate('<span data-bind="name"></span>');
   * ```
   */
  public setTemplate(htmlString: string): void {
    this.#templateHtml = htmlString;
    const fragment = this.ownerDocument
      .createRange()
      .createContextualFragment(sanitizeHtml(htmlString, this.#sanitizerConfig));
    this.#tooltipDiv.replaceChildren(...fragment.childNodes);
    this.#cacheBoundElements();
    this.#templateSet = true;

    if (Object.keys(this.#data).length > 0) {
      this.#applyDataToBoundElements();
    }
  }

  /**
   * Displays the tooltip positioned relative to the target element.
   * @param target - The DOM element that the tooltip should be positioned relative to
   * @remarks
   * If no template has been set, emits a console.warn and returns early.
   * If the template was just set (or changed), applies the template with current data.
   * Then calculates position using direction/offset callbacks and reveals the tooltip.
   * @example
   * ```typescript
   * tooltip.setTemplate('<span data-bind="name"></span>');
   * tooltip.setData({ name: "Alice" });
   * tooltip.show(targetElement);
   * ```
   */
  public show(target: Element): void {
    if (!target.isConnected) return;

    if (!this.#templateSet) {
      console.warn("[tip-viz-tooltip] No template set. Call setTemplate() first.");
      return;
    }

    const dir = this.#directionCallback(this.#data, target);
    const [offsetX, offsetY] = this.#offsetCallback(this.#data, target);

    if (this.#currentDirection && this.#currentDirection !== dir) {
      this.#tooltipDiv.classList.remove(this.#currentDirection);
    }
    this.#tooltipDiv.classList.add(dir);
    this.#currentDirection = dir;

    const targetRect = target.getBoundingClientRect();

    // Forces synchronous layout recalc after template/data changes
    const tooltipRect = this.#tooltipDiv.getBoundingClientRect();
    const coordinates = getCoordinates(dir, targetRect, tooltipRect);

    const view = this.ownerDocument.defaultView ?? { scrollX: 0, scrollY: 0 };
    this.#tooltipDiv.style.left = `${String(coordinates.left + offsetX + view.scrollX)}px`;
    this.#tooltipDiv.style.top = `${String(coordinates.top + offsetY + view.scrollY)}px`;

    this.#tooltipDiv.setAttribute("data-visible", "true");
    this.#tooltipDiv.setAttribute("aria-hidden", "false");
    this.setAttribute("aria-hidden", "false");
    this.#setDescribedBy(target);

    this.dispatchEvent(new CustomEvent("show", {
      bubbles: true,
      composed: true,
      detail: { data: this.#data, direction: dir, position: coordinates, target },
    }));
  }

  /**
   * Re-applies consumer CSS using the same adopted-sheet-or-<style> fallback
   * path as setStyles(). Used by adoptedCallback to re-establish consumer
   * styles in the adopting document's context.
   */
  #applyConsumerStyles() {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(this.#stylesText);

      setAdoptedStyleSheets(this.#shadow, [...getAdoptedStyleSheets(this.#shadow), sheet]);
      this.#adoptedStylesheet = sheet;
    } catch (error) {
      const style = document.createElement("style");
      style.setAttribute("data-tipviz", "1");
      style.textContent = this.#stylesText;
      this.#shadow.appendChild(style);
      console.debug("[tip-viz-tooltip] adoptedStyleSheets unavailable, using <style> injection:", error);
    }
  }

  /**
   *
   */
  #applyDataToBoundElements(): void {
    for (const [key, value] of Object.entries(this.#data)) {
      const elements = this.#boundElements.get(key);
      if (elements) {
        for (const el of elements) {
          el.textContent = String(value);
        }
      } else {
        console.warn(`[tip-viz-tooltip] No data-bind="${key}" found in template`);
      }
    }
  }

  /**
   *
   */
  #cacheBoundElements(): void {
    this.#boundElements.clear();

    const nodes = this.#tooltipDiv.querySelectorAll<HTMLElement>("[data-bind]");

    for (const node of nodes) {
      const dataKey = node.dataset.bind;
      if (dataKey) {
        const existing = this.#boundElements.get(dataKey);
        if (existing) {
          this.#boundElements.set(dataKey, [...existing, node]);
        } else {
          this.#boundElements.set(dataKey, [node]);
        }
      }
    }
  }

  /**
   *
   */
  #clearDescribedBy() {
    if (!(this.#activeTarget instanceof HTMLElement)) {
      this.#activeTarget = null;
      return;
    }
    this.#removeIdFromDescribedBy(this.#activeTarget, true);
  }

  // Clears the aria-describedby attribute WITHOUT clearing #activeTarget.
  // Used during adoption to preserve the target for re-resolution.
  /**
   *
   */
  #clearDescribedByOnly() {
    if (!(this.#activeTarget instanceof HTMLElement)) {
      return;
    }
    this.#removeIdFromDescribedBy(this.#activeTarget, false);
  }

  /**
   *
   */
  #directionCallback: DirectionFn = () => defaultDirection;

  /**
   *
   */
  #ensureAccessibleHostAttributes() {
    this.setAttribute("aria-hidden", this.#tooltipDiv.getAttribute("data-visible") === "true" ? "false" : "true");
    this.setAttribute("role", "tooltip");

    if (this.id) {
      return;
    }

    TipVizTooltip.#idCounter += 1;
    this.id = `tip-viz-tooltip-${String(TipVizTooltip.#idCounter)}`;
  }

  /**
   * Injects consumer CSS as a <style> element into the shadow root.
   * Used exclusively during cross-document adoption where constructable
   * CSSStyleSheet references are silently dropped per WHATWG adoptedStyleSheets
   * document-scoping rules. <style> carries only text and survives adoption.
   */
  #injectConsumerStyleElement() {
    this.#removeInlineStyles();
    const style = this.ownerDocument.createElement("style");
    style.setAttribute("data-tipviz", "1");
    style.textContent = this.#stylesText;
    this.#shadow.appendChild(style);
  }

  /**
   *
   */
  #offsetCallback: OffsetCallback = () => defaultOffset;

  /**
   * Re-resolves aria-describedby after cross-document adoption.
   * Keeps the binding only if the target is still in our ownerDocument.
   */
  #refreshDescribedBy() {
    if (
      this.#activeTarget &&
      this.#activeTarget.isConnected &&
      this.#activeTarget.ownerDocument === this.ownerDocument
    ) {
      if (this.#activeTarget instanceof HTMLElement && this.id) {
        const currentDescribedBy = this.#activeTarget.getAttribute("aria-describedby") ?? "";
        const ids = currentDescribedBy.split(/\s+/).filter((id) => Boolean(id));
        if (!ids.includes(this.id)) {
          this.#activeTarget.setAttribute("aria-describedby", [...ids, this.id].join(" "));
        }
      }
    } else {
      this.#activeTarget = null;
    }
  }

  /**
   *
   */
  #removeAdoptedStylesheet() {
    if (!this.#adoptedStylesheet) return;
    setAdoptedStyleSheets(
      this.#shadow,
      getAdoptedStyleSheets(this.#shadow).filter((sheet) => sheet !== this.#adoptedStylesheet),
    );
    this.#adoptedStylesheet = null;
  }

  /**
   * Removes this tooltip's id from the target's aria-describedby attribute.
   * Clears #activeTarget when clearTarget is true (used by hide()).
   */
  #removeIdFromDescribedBy(el: HTMLElement, clearTarget: boolean) {
    const currentDescribedBy = el.getAttribute("aria-describedby") ?? "";
    const ids = currentDescribedBy.split(/\s+/).filter(Boolean);
    const nextIds = ids.filter((id) => id !== this.id);

    if (nextIds.length > 0) {
      el.setAttribute("aria-describedby", nextIds.join(" "));
    } else {
      el.removeAttribute("aria-describedby");
    }

    if (clearTarget) {
      this.#activeTarget = null;
    }
  }

  /**
   *
   */
  #removeInlineStyles() {
    const oldStyle = this.#shadow.querySelector("style[data-tipviz]");
    if (oldStyle) oldStyle.remove();
  }

  /**
   *
   */
  #removeStructuralStylesheet() {
    if (this.#structuralSheet) {
      setAdoptedStyleSheets(
        this.#shadow,
        getAdoptedStyleSheets(this.#shadow).filter((sheet) => sheet !== this.#structuralSheet),
      );
      this.#structuralSheet = null;
    }
    if (this.#structuralStyleEl) {
      this.#structuralStyleEl.remove();
      this.#structuralStyleEl = null;
    }
  }

  /**
   *
   */
  #removeStylesheetLink() {
    const link = this.#shadow.querySelector("link[data-tipviz-link]");
    if (link) link.remove();
  }

  /**
   * Sets aria-describedby on the target element, removing any stale self-reference first.
   */
  #setDescribedBy(target: Element) {
    this.#clearDescribedBy();
    this.#activeTarget = target;

    if (!(target instanceof HTMLElement)) return;

    const currentDescribedBy = target.getAttribute("aria-describedby") ?? "";
    const ids = currentDescribedBy.split(/\s+/).filter(Boolean);
    if (!ids.includes(this.id)) {
      target.setAttribute("aria-describedby", [...ids, this.id].join(" "));
    }
  }

  /**
   *
   */
  #updateTransitionDuration(duration: string) {
    const nextDuration = parseInt(duration, 10);
    if (!Number.isNaN(nextDuration)) {
      this.#transitionDuration = nextDuration;
    }

    this.#tooltipDiv.style.setProperty("--tip-transition-duration", `${String(this.#transitionDuration)}ms`);
  }
}
