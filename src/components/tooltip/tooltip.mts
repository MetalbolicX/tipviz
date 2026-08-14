import {
  Direction,
  OffsetCallback,
  DirectionFn,
  TooltipData,
} from "./types.mjs";
import {
  DEFAULT_DIRECTION, DEFAULT_OFFSET, DEFAULT_TRANSITION_DURATION,
  SANITIZER_CONFIG,
} from "./constants.mjs";
import { sanitizeHtml } from "./sanitizer.mjs";

export class TipVizTooltip extends HTMLElement {
  static #idCounter = 0;

  public static get observedAttributes() {
    return ["transition-duration", "stylesheet", "no-auto-reposition"];
  }

  #boundElements: Map<string, HTMLElement[]> = new Map();
  #data: Record<string, string | number> = {};
  #sanitizerConfig: SanitizerConfig = SANITIZER_CONFIG;
  #templateSet = false;
  #templateApplied = false;
  #templateHtml = "";

  #stylesText = "";
  #adoptedStylesheet: CSSStyleSheet | null = null;
  #directionCallback: DirectionFn = () => DEFAULT_DIRECTION;
  #offsetCallback: OffsetCallback = () => DEFAULT_OFFSET;
  #activeTarget: Element | null = null;

  #shadow: ShadowRoot;
  #tooltipDiv: HTMLDivElement;
  #transitionDuration = DEFAULT_TRANSITION_DURATION;
  #currentDirection: Direction | null = null;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: "open" });
    this.#tooltipDiv = document.createElement("div");
    this.#tooltipDiv.className = "tipviz-tooltip";
    this.#tooltipDiv.setAttribute("part", "tooltip-box");
    this.#tooltipDiv.setAttribute("role", "tooltip");
    this.#tooltipDiv.setAttribute("aria-hidden", "true");

    Object.assign(this.#tooltipDiv.style, {
      position: "absolute",
      top: "0px",
      left: "0px",
      opacity: "0",
      pointerEvents: "none",
      boxSizing: "border-box",
      transition: `opacity ${this.#transitionDuration}ms`,
    });

    this.#shadow.appendChild(this.#tooltipDiv);
  }

  public connectedCallback() {
    this.#ensureAccessibleHostAttributes();

    if (!this.hasAttribute("no-auto-reposition") && this.parentElement !== document.body) {
      document.body.appendChild(this);
    }

    const duration = this.getAttribute("transition-duration");
    if (duration) this.#updateTransitionDuration(duration);

    const stylesheet = this.getAttribute("stylesheet");
    if (stylesheet) this.loadStylesheet(stylesheet);
  }

  public attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === "transition-duration" && newValue) {
      this.#updateTransitionDuration(newValue);
    }

    if (name === "stylesheet" && newValue) {
      this.loadStylesheet(newValue);
    }
  }

  public disconnectedCallback() {
    this.#clearDescribedBy();
    this.#removeStylesheetLink();
    this.#removeInlineStyles();
    this.#removeAdoptedStylesheet();

    this.#boundElements.clear();
    this.#data = {};
    this.#templateSet = false;
    this.#templateApplied = false;
    this.#templateHtml = "";

    for (const child of [...this.#tooltipDiv.childNodes]) {
      child.remove();
    }

    this.#stylesText = "";
    if (this.#currentDirection) {
      this.#tooltipDiv.classList.remove(this.#currentDirection);
      this.#currentDirection = null;
    }
  }

  #updateTransitionDuration(duration: string) {
    const nextDuration = parseInt(duration, 10);
    if (!Number.isNaN(nextDuration)) {
      this.#transitionDuration = nextDuration;
    }

    this.#tooltipDiv.style.transition = `opacity ${this.#transitionDuration}ms`;
  }

  public loadStylesheet(url: string) {
    this.#stylesText = "";
    this.#removeInlineStyles();
    this.#removeAdoptedStylesheet();

    const stylesheetUrl = url.trim();
    if (!stylesheetUrl) {
      this.#removeStylesheetLink();
      return;
    }

    let link = this.#shadow.querySelector<HTMLLinkElement>("link[data-tipviz-link]");
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "stylesheet");
      link.setAttribute("data-tipviz-link", "");
      link.addEventListener("error", () => {
        console.warn(`[tip-viz-tooltip] Failed to load stylesheet: ${link?.href}`);
      });
      this.#shadow.insertBefore(link, this.#tooltipDiv);
    }
    link.href = stylesheetUrl;
  }

  /**
   * Sets the HTML template for the tooltip.
   * @param htmlString - The HTML string to use as the tooltip template.
   *                      May contain data-bind attributes to bind data values.
   * @remarks
   * Parses the HTML with DOMParser and sanitizes it via the internal #sanitize step
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
    this.#tooltipDiv.innerHTML = sanitizeHtml(htmlString, this.#sanitizerConfig);
    this.#cacheBoundElements();
    this.#templateSet = true;
    this.#templateApplied = true;

    if (Object.keys(this.#data).length > 0) {
      this.#applyDataToBoundElements();
    }
  }

  /**
   * Sets the data values for the tooltip template bindings.
   * @param data - A record mapping binding keys to string | number values.
   * @remarks
   * Updates the textContent of cached [data-bind] elements that match the data keys.
   * If no template is set yet, stores the data and applies it when setTemplate is called.
   * Emits a console.warn for keys that have no corresponding data-bind element.
   * @example
   * ```typescript
   * tooltip.setData({ name: "Alice", score: 42 });
   * ```
   */
  public setData(data: Record<string, string | number>): void {
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
  public setSanitizerConfig(config: SanitizerConfig): void {
    this.#sanitizerConfig = config;

    if (this.#templateSet && this.#templateHtml) {
      this.#tooltipDiv.innerHTML = sanitizeHtml(this.#templateHtml, this.#sanitizerConfig);
      this.#cacheBoundElements();
      if (Object.keys(this.#data).length > 0) {
        this.#applyDataToBoundElements();
      }
    }
  }

  /**
   * Caches references to DOM elements with data-bind attributes.
   */
  #cacheBoundElements(): void {
    this.#boundElements.clear();

    const nodes = this.#tooltipDiv.querySelectorAll<HTMLElement>("[data-bind]");

    for (const node of nodes) {
      const dataKey = node.dataset.bind;
      if (dataKey) {
        const existing = this.#boundElements.get(dataKey);
        if (existing) {
          existing.push(node);
        } else {
          this.#boundElements.set(dataKey, [node]);
        }
      }
    }
  }

  /**
   * Applies stored data to cached bound elements.
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

  public setDirection<TData extends TooltipData>(fn: DirectionFn<TData>) {
    this.#directionCallback = fn as DirectionFn;
  }

  public setOffset<TData extends TooltipData>(fn: OffsetCallback<TData>) {
    this.#offsetCallback = fn as OffsetCallback;
  }

  public setStyles(css: string) {
    this.#stylesText = css;

    this.#removeStylesheetLink();
    this.#removeInlineStyles();
    this.#removeAdoptedStylesheet();

    if (!this.#stylesText) return;

    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(this.#stylesText);

      const root = this.#shadow as unknown as { adoptedStyleSheets: CSSStyleSheet[] };
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      this.#adoptedStylesheet = sheet;
    } catch (error) {
      const style = document.createElement("style");
      style.setAttribute("data-tipviz", "");
      style.textContent = this.#stylesText;
      this.#shadow.appendChild(style);
      console.debug("[tip-viz-tooltip] adoptedStyleSheets unavailable, using <style> injection:", error);
    }
  }

  #removeInlineStyles() {
    const oldStyle = this.#shadow.querySelector("style[data-tipviz]");
    if (oldStyle) oldStyle.remove();
  }

  #removeStylesheetLink() {
    const link = this.#shadow.querySelector("link[data-tipviz-link]");
    if (link) link.remove();
  }

  #removeAdoptedStylesheet() {
    if (!this.#adoptedStylesheet) return;
    const root = this.#shadow as unknown as { adoptedStyleSheets: CSSStyleSheet[] };
    root.adoptedStyleSheets = root.adoptedStyleSheets.filter(
      (sheet) => sheet !== this.#adoptedStylesheet,
    );
    this.#adoptedStylesheet = null;
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
    if (!target || !target.isConnected) return;

    if (!this.#templateSet) {
      console.warn("[tip-viz-tooltip] No template set. Call setTemplate() first.");
      return;
    }

    const dir = this.#directionCallback(this.#data as TooltipData, target) as Direction;
    const [offsetX = 0, offsetY = 0] = this.#offsetCallback(this.#data as TooltipData, target);

    if (this.#currentDirection && this.#currentDirection !== dir) {
      this.#tooltipDiv.classList.remove(this.#currentDirection);
    }
    this.#tooltipDiv.classList.add(dir);
    this.#currentDirection = dir;

    const coordinates = this.#getCoordinates(dir, target);

    this.#tooltipDiv.style.top = `${coordinates.top + offsetY + window.scrollY}px`;
    this.#tooltipDiv.style.left = `${coordinates.left + offsetX + window.scrollX}px`;

    this.#tooltipDiv.style.opacity = "1";
    this.#tooltipDiv.style.pointerEvents = "all";
    this.#tooltipDiv.setAttribute("aria-hidden", "false");
    this.setAttribute("aria-hidden", "false");
    this.#setDescribedBy(target);

    this.dispatchEvent(new CustomEvent("show", {
      detail: { target, data: this.#data, direction: dir, position: coordinates },
      bubbles: true, composed: true,
    }));
  }

  public hide() {
    this.#tooltipDiv.style.opacity = "0";
    this.#tooltipDiv.style.pointerEvents = "none";
    this.#tooltipDiv.setAttribute("aria-hidden", "true");
    this.setAttribute("aria-hidden", "true");
    this.#clearDescribedBy();
    this.dispatchEvent(new CustomEvent("hide", { bubbles: true, composed: true }));
  }

  #ensureAccessibleHostAttributes() {
    this.setAttribute("role", "tooltip");
    this.setAttribute("aria-hidden", this.#tooltipDiv.style.opacity === "1" ? "false" : "true");

    if (this.id) {
      return;
    }

    TipVizTooltip.#idCounter += 1;
    this.id = `tip-viz-tooltip-${TipVizTooltip.#idCounter}`;
  }

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

  #clearDescribedBy() {
    if (!(this.#activeTarget instanceof HTMLElement)) {
      this.#activeTarget = null;
      return;
    }

    const currentDescribedBy = this.#activeTarget.getAttribute("aria-describedby") ?? "";
    const ids = currentDescribedBy.split(/\s+/).filter(Boolean);
    const nextIds = ids.filter((id) => id !== this.id);

    if (nextIds.length > 0) {
      this.#activeTarget.setAttribute("aria-describedby", nextIds.join(" "));
    } else {
      this.#activeTarget.removeAttribute("aria-describedby");
    }

    this.#activeTarget = null;
  }

  #getCoordinates(dir: Direction, target: Element): { top: number; left: number } {
    const rect = target.getBoundingClientRect();

    // Forces synchronous layout recalc after template/data changes
    const tooltipRect = this.#tooltipDiv.getBoundingClientRect();

    switch (dir) {
      case "n": return { top: rect.top - tooltipRect.height, left: rect.left + rect.width / 2 - tooltipRect.width / 2 };
      case "s": return { top: rect.bottom, left: rect.left + rect.width / 2 - tooltipRect.width / 2 };
      case "e": return { top: rect.top + rect.height / 2 - tooltipRect.height / 2, left: rect.right };
      case "w": return { top: rect.top + rect.height / 2 - tooltipRect.height / 2, left: rect.left - tooltipRect.width };
      case "nw": return { top: rect.top - tooltipRect.height, left: rect.left - tooltipRect.width };
      case "ne": return { top: rect.top - tooltipRect.height, left: rect.right };
      case "sw": return { top: rect.bottom, left: rect.left - tooltipRect.width };
      case "se": return { top: rect.bottom, left: rect.right };
      default: return { top: rect.top - tooltipRect.height, left: rect.left + rect.width / 2 - tooltipRect.width / 2 };
    }
  }
}
