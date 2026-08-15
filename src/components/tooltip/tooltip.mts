import {
  defaultDirection,
  defaultOffset,
  defaultTransitionDuration,
  sanitizerConfig,
} from "./constants.mjs";
import { getCoordinates } from "./positioner.mjs";
import { sanitizeHtml } from "./sanitizer.mjs";
import { insertStructuralStyles } from "./structural-styles.mjs";
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
    return ["transition-duration", "stylesheet", "no-auto-reposition"];
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

    /**
     *
     */
    const structural = insertStructuralStyles(this.#shadow, this.ownerDocument);
    if (structural instanceof CSSStyleSheet) {
      this.#structuralSheet = structural;
    } else {
      this.#structuralStyleEl = structural;
    }

    this.#shadow.appendChild(this.#tooltipDiv);
  }

  /**
   *
   */
  public adoptedCallback() {
    // Re-establish accessibility host attributes in the new document
    this.#ensureAccessibleHostAttributes();

    // Re-insert structural stylesheet in the adopting document
    this.#removeStructuralStylesheet();
    /**
     *
     */
    const structural = insertStructuralStyles(this.#shadow, this.ownerDocument);
    if (structural instanceof CSSStyleSheet) {
      this.#structuralSheet = structural;
    } else {
      this.#structuralStyleEl = structural;
    }

    // Refresh described-by for the new document context
    this.#refreshDescribedBy();
  }

  /**
   *
   */
  public attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === "transition-duration" && newValue) {
      this.#updateTransitionDuration(newValue);
    }

    if (name === "stylesheet" && newValue) {
      this.loadStylesheet(newValue);
    }
  }

  /**
   *
   */
  public connectedCallback() {
    this.#ensureAccessibleHostAttributes();

    if (!this.hasAttribute("no-auto-reposition") && this.parentElement !== this.ownerDocument.body) {
      this.ownerDocument.body.appendChild(this);
    }

    /**
     *
     */
    const duration = this.getAttribute("transition-duration");
    if (duration) this.#updateTransitionDuration(duration);

    /**
     *
     */
    const stylesheet = this.getAttribute("stylesheet");
    if (stylesheet) this.loadStylesheet(stylesheet);
  }

  /**
   *
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

    this.#boundElements.clear();
    this.#data = {};
    this.#templateHtml = "";
    this.#templateSet = false;

    for (/**
          *
          */
    const child of [...this.#tooltipDiv.childNodes]) {
      child.remove();
    }

    this.#stylesText = "";
    if (this.#currentDirection) {
      this.#tooltipDiv.classList.remove(this.#currentDirection);
      this.#currentDirection = null;
    }
  }

  /**
   *
   */
  public hide() {
    this.#tooltipDiv.removeAttribute("data-visible");
    this.#tooltipDiv.setAttribute("aria-hidden", "true");
    this.setAttribute("aria-hidden", "true");
    this.#clearDescribedBy();
    this.dispatchEvent(new CustomEvent("hide", { bubbles: true, composed: true }));
  }

  /**
   *
   */
  public loadStylesheet(url: string) {
    this.#stylesText = "";
    this.#removeAdoptedStylesheet();
    this.#removeInlineStyles();
    this.#removeStylesheetLink();

    /**
     *
     */
    const stylesheetUrl = url.trim();
    if (!stylesheetUrl) {
      this.#removeStylesheetLink();
      return;
    }

    /**
     *
     */
    let link = this.#shadow.querySelector<HTMLLinkElement>("link[data-tipviz-link]");
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("data-tipviz-link", "");
      link.setAttribute("rel", "stylesheet");
      /**
       *
       */
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
   * Sets a custom SanitizerConfig for HTML sanitization.
   * @param config - A SanitizerConfig object defining what elements/attributes to allow or remove.
   * @remarks
   * The default config removes dangerous elements (script, iframe, etc.), strips on* event
   * handler attributes, and blocks javascript:/vbscript: URL schemes in href/src/poster/etc.
   * If a template has already been set, re-apply it with the new sanitizer config.
   * @example
   * ```typescript
   * tooltip.setSanitizerConfig({ removeElements: ["script"] });
   * ```
   */
   public setDirection<TData extends TooltipData>(fn: DirectionFn<TData>) {
    this.#directionCallback = fn as DirectionFn;
  }

  /**
   *
   */
  public setOffset<TData extends TooltipData>(fn: OffsetCallback<TData>) {
    this.#offsetCallback = fn as OffsetCallback;
  }

  /**
   *
   */
  public setSanitizerConfig(config: SanitizerConfig): void {
    this.#sanitizerConfig = config;

    if (this.#templateSet && this.#templateHtml) {
      /**
       *
       */
      const fragment = document
        .createRange()
        .createContextualFragment(sanitizeHtml(this.#templateHtml, this.#sanitizerConfig));
      this.#tooltipDiv.replaceChildren(...fragment.children);
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

    try {
      /**
       *
       */
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(this.#stylesText);

      /**
       *
       */
      const root = this.#shadow as unknown as { adoptedStyleSheets: CSSStyleSheet[] };
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      this.#adoptedStylesheet = sheet;
    } catch (error) {
      /**
       *
       */
      const style = document.createElement("style");
      style.setAttribute("data-tipviz", "");
      style.textContent = this.#stylesText;
      this.#shadow.appendChild(style);
      console.debug("[tip-viz-tooltip] adoptedStyleSheets unavailable, using <style> injection:", error);
    }
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
    /**
     *
     */
    const fragment = document
      .createRange()
      .createContextualFragment(sanitizeHtml(htmlString, this.#sanitizerConfig));
    this.#tooltipDiv.replaceChildren(...fragment.children);
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

    /**
     *
     */
    const dir = this.#directionCallback(this.#data, target);
    /**
     *
     */
    const [offsetX, offsetY] = this.#offsetCallback(this.#data, target);

    if (this.#currentDirection && this.#currentDirection !== dir) {
      this.#tooltipDiv.classList.remove(this.#currentDirection);
    }
    this.#tooltipDiv.classList.add(dir);
    this.#currentDirection = dir;

    /**
     *
     */
    const targetRect = target.getBoundingClientRect();

    // Forces synchronous layout recalc after template/data changes
    /**
     *
     */
    const tooltipRect = this.#tooltipDiv.getBoundingClientRect();
    /**
     *
     */
    const coordinates = getCoordinates(dir, targetRect, tooltipRect);

    /**
     *
     */
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
   *
   */
  #applyDataToBoundElements(): void {
    for (/**
          *
          */
    const [key, value] of Object.entries(this.#data)) {
      /**
       *
       */
      const elements = this.#boundElements.get(key);
      if (elements) {
        for (/**
              *
              */
        const el of elements) {
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

    /**
     *
     */
    const nodes = this.#tooltipDiv.querySelectorAll<HTMLElement>("[data-bind]");

    for (/**
          *
          */
    const node of nodes) {
      /**
       *
       */
      const dataKey = node.dataset.bind;
      if (dataKey) {
        /**
         *
         */
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

    /**
     *
     */
    const currentDescribedBy = this.#activeTarget.getAttribute("aria-describedby") ?? "";
    /**
     *
     */
    const ids = currentDescribedBy.split(/\s+/).filter(Boolean);
    /**
     *
     */
    const nextIds = ids.filter((id) => id !== this.id);

    if (nextIds.length > 0) {
      this.#activeTarget.setAttribute("aria-describedby", nextIds.join(" "));
    } else {
      this.#activeTarget.removeAttribute("aria-describedby");
    }

    this.#activeTarget = null;
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

    /**
     *
     */
    const currentDescribedBy = this.#activeTarget.getAttribute("aria-describedby") ?? "";
    /**
     *
     */
    const ids = currentDescribedBy.split(/\s+/).filter(Boolean);
    /**
     *
     */
    const nextIds = ids.filter((id) => id !== this.id);

    if (nextIds.length > 0) {
      this.#activeTarget.setAttribute("aria-describedby", nextIds.join(" "));
    } else {
      this.#activeTarget.removeAttribute("aria-describedby");
    }
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
   *
   */
  #offsetCallback: OffsetCallback = () => defaultOffset;

  /**
   *
   */
  #refreshDescribedBy() {
    // Re-resolve described-by against the new owner document context
    // Only keep the binding if the target is still in our ownerDocument
    if (this.#activeTarget && this.#activeTarget.isConnected && this.#activeTarget.ownerDocument === this.ownerDocument) {
      // Target still valid in new document — re-establish aria described-by
      if (this.#activeTarget instanceof HTMLElement && this.id) {
        /**
         *
         */
        const currentDescribedBy = this.#activeTarget.getAttribute("aria-describedby") ?? "";
        /**
         *
         */
        const ids = currentDescribedBy.split(/\s+/).filter((id) => Boolean(id));
        if (!ids.includes(this.id)) {
          this.#activeTarget.setAttribute("aria-describedby", [...ids, this.id].join(" "));
        }
      }
    } else {
      // Target is gone or in a different document — clear
      this.#activeTarget = null;
    }
  }

  /**
   *
   */
  #removeAdoptedStylesheet() {
    if (!this.#adoptedStylesheet) return;
    /**
     *
     */
    const root = this.#shadow as unknown as { adoptedStyleSheets: CSSStyleSheet[] };
    root.adoptedStyleSheets = root.adoptedStyleSheets.filter(
      (sheet) => {
        return sheet !== this.#adoptedStylesheet;
      },
    );
    this.#adoptedStylesheet = null;
  }

  /**
   *
   */
  #removeInlineStyles() {
    /**
     *
     */
    const oldStyle = this.#shadow.querySelector("style[data-tipviz]");
    if (oldStyle) oldStyle.remove();
  }

  /**
   *
   */
  #removeStructuralStylesheet() {
    if (this.#structuralSheet) {
      /**
       *
       */
      const root = this.#shadow as unknown as { adoptedStyleSheets: CSSStyleSheet[] };
      root.adoptedStyleSheets = root.adoptedStyleSheets.filter(
        (sheet) => sheet !== this.#structuralSheet,
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
    /**
     *
     */
    const link = this.#shadow.querySelector("link[data-tipviz-link]");
    if (link) link.remove();
  }

  /**
   *
   */
  #setDescribedBy(target: Element) {
    this.#clearDescribedBy();
    this.#activeTarget = target;

    if (!(target instanceof HTMLElement)) return;

    /**
     *
     */
    const currentDescribedBy = target.getAttribute("aria-describedby") ?? "";
    /**
     *
     */
    const ids = currentDescribedBy.split(/\s+/).filter(Boolean);
    if (!ids.includes(this.id)) {
      target.setAttribute("aria-describedby", [...ids, this.id].join(" "));
    }
  }

  /**
   *
   */
  #updateTransitionDuration(duration: string) {
    /**
     *
     */
    const nextDuration = parseInt(duration, 10);
    if (!Number.isNaN(nextDuration)) {
      this.#transitionDuration = nextDuration;
    }

    this.#tooltipDiv.style.setProperty("--tip-transition-duration", `${String(this.#transitionDuration)}ms`);
  }
}
