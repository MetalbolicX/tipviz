import { sanitize } from "./sanitize.mjs";
import {
  Direction,
  HtmlCallback,
  OffsetCallback,
  DirectionFn,
  SanitizerFn,
  TooltipData,
} from "./types.mjs";
import {
  DEFAULT_DIRECTION, DEFAULT_OFFSET, DEFAULT_TRANSITION_DURATION
} from "./constants.mjs";

export class TipVizTooltip extends HTMLElement {
  static #idCounter = 0;

  public static get observedAttributes() {
    return ["transition-duration", "stylesheet", "no-auto-reposition"];
  }

  #htmlCallback: HtmlCallback = () => " ";
  #lastHtml = "";
  #stylesText = "";
  #adoptedStylesheet: CSSStyleSheet | null = null;
  #directionCallback: DirectionFn = () => DEFAULT_DIRECTION;
  #offsetCallback: OffsetCallback = () => DEFAULT_OFFSET;
  #sanitizer: SanitizerFn = sanitize;
  #activeTarget: Element | null = null;

  #shadow: ShadowRoot;
  #tooltipDiv: HTMLDivElement;
  #transitionDuration = DEFAULT_TRANSITION_DURATION;
  #currentDirection: Direction | null = null; // Track the active direction for easy cleanup

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: "open" });
    this.#tooltipDiv = document.createElement("div");
    this.#tooltipDiv.className = "tipviz-tooltip";
    this.#tooltipDiv.setAttribute("part", "tooltip-box");
    this.#tooltipDiv.setAttribute("role", "tooltip");
    this.#tooltipDiv.setAttribute("aria-hidden", "true");

    // Base styles
    Object.assign(this.#tooltipDiv.style, {
      position: "absolute",
      top: "0px",
      left: "0px",
      opacity: "0",
      pointerEvents: "none",
      boxSizing: "border-box",
      transition: `opacity ${this.#transitionDuration}ms`
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

    for (const child of [...this.#tooltipDiv.childNodes]) {
      child.remove();
    }

    this.#lastHtml = "";
    this.#stylesText = "";
    if (this.#currentDirection) {
      this.#tooltipDiv.classList.remove(this.#currentDirection);
      this.#currentDirection = null;
    }
  }

  /**
   * Updates the CSS transition duration for the tooltip's opacity animation.
   * @param duration - The transition duration as a string (in milliseconds).
   * @remarks
   * Parses the duration string to an integer and applies it to the tooltip element's
   * transition style property for opacity changes.
   */
  #updateTransitionDuration(duration: string) {
    const nextDuration = parseInt(duration, 10);
    if (!Number.isNaN(nextDuration)) {
      this.#transitionDuration = nextDuration;
    }

    this.#tooltipDiv.style.transition = `opacity ${this.#transitionDuration}ms`;
  }

  /**
   * Load or update a stylesheet link inside the component's shadow root.
   * @param url - The stylesheet URL to load into the shadow root.
   * @example
   * ```typescript
   * tooltip.loadStylesheet('https://example.com/tooltip-styles.css');
   * ```
   */
  public loadStylesheet(url: string) {
    this.#stylesText = "";
    this.#removeInlineStyles();
    this.#removeAdoptedStylesheet();

    const stylesheetUrl = url.trim();
    if (!stylesheetUrl) {
      this.#removeStylesheetLink();
      return;
    }

    let link = this.#shadow.querySelector<HTMLLinkElement>('link[data-tipviz-link]');
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
   * Sets the HTML content callback for the tooltip.
   * @param fn - A callback function that returns HTML content to be rendered in the tooltip
   * @example
   * ```typescript
   * tooltip.setHtml(() => '<div class="custom-content">Hello World</div>');
   * ```
   */
  public setHtml<TData extends TooltipData>(fn: HtmlCallback<TData>) {
    this.#htmlCallback = fn as HtmlCallback;
  }

  /**
   * Sets the callback function that determines the tooltip direction.
   * @param fn - The direction callback function to be invoked for calculating tooltip placement
   * @remarks
   * The provided callback should return a valid direction string ("n", "s", "e", "w", "nw", "ne", "sw", "se")
   * based on the target element or data context. This direction will be used to position the tooltip accordingly.
   * @example
   * ```typescript
   * tooltip.setDirection((target) => {
   *   const rect = target.getBoundingClientRect();
   *   return rect.top < window.innerHeight / 2 ? "s" : "n";
   * });
   * ```
   */
  public setDirection<TData extends TooltipData>(fn: DirectionFn<TData>) {
    this.#directionCallback = fn as DirectionFn;
  }


  /**
   * Sets a callback function that will be invoked to calculate the tooltip offset.
   * @param fn - A callback function that computes the offset for positioning the tooltip
   * @remarks
   * The provided callback should return an array of two numbers representing the horizontal (x) and vertical (y) offset in pixels.
   * This offset will be applied to the tooltip's calculated position to allow for fine-tuning of its placement relative to the target element.
   * @example
   * ```typescript
   * tooltip.setOffset((target) => {
   *   return [10, 20]; // Example offset values
   * });
   * ```
   */
  public setOffset<TData extends TooltipData>(fn: OffsetCallback<TData>) {
    this.#offsetCallback = fn as OffsetCallback;
  }

  /**
   * Sets a custom sanitizer function for HTML content.
   * @param fn - A function that receives raw HTML and returns sanitized HTML.
   *              Pass `null` to disable sanitization (trusted content only).
   * @example
   * ```typescript
   * // Use default DOMPurify-like sanitizer
   * tooltip.setSanitizer(null); // disable for trusted HTML
   *
   * // Use custom sanitizer
   * tooltip.setSanitizer((html) => mySanitize(html));
   * ```
   */
  public setSanitizer(fn: SanitizerFn | null) {
    this.#sanitizer = fn ?? ((html: string) => html);
  }

  /**
   * Sets custom CSS styles for the tooltip component.
   * @description
   * Attempts to use the modern CSSStyleSheet API with adoptedStyleSheets for better performance.
   * Falls back to creating a `<style>` element if the modern API is not supported or fails.
   * Removes any previously set tooltip styles before applying new ones to prevent duplicates.
   * @param css - The CSS string to apply to the tooltip. Pass an empty string to remove all custom styles.
   * @remarks
   * - Uses the `data-tipviz` attribute to identify and manage tooltip-specific stylesheets.
   * - The modern adoptedStyleSheets approach is preferred when available for better encapsulation.
   * - Gracefully degrades to DOM-based style elements in browsers without CSSStyleSheet support.
   * @example
   * ```typescript
   * tooltip.setStyles(`
   *   .tipviz-tooltip {
   *      background-color: rgba(0, 0, 0, 0.8);
   *      color: white;
   *  }
   * `);
   * ```
   */
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
      (sheet) => sheet !== this.#adoptedStylesheet
    );
    this.#adoptedStylesheet = null;
  }


  /**
   * Displays a tooltip with the provided data positioned relative to the target element.
   * @param data - An object containing the data to be rendered in the tooltip content
   * @param target - The DOM element that the tooltip should be positioned relative to
   * @remarks
   * This method performs the following operations in sequence:
   * - Updates the tooltip content using the HTML callback
   * - Determines the tooltip direction and offset using registered callbacks
   * - Applies appropriate CSS classes for styling based on direction
   * - Calculates tooltip coordinates relative to the target element
   * - Applies scroll offset adjustments (assumes tooltip is appended to document.body)
   * - Makes the tooltip visible and interactive
   * - Dispatches a custom "show" event with positioning and data details
   * @note The tooltip's position calculation assumes the tooltip element is appended to `document.body`.
   * Scroll position (window.scrollY/scrollX) is factored into the final coordinates.
   * @example
   * ```typescript
   * const tooltip = new Tooltip();
   * const targetElement = document.getElementById('my-element');
   * tooltip.show({ message: 'Hello!' }, targetElement);
   * ```
   */
  public show(data: TooltipData, target: Element) {
    if (!target || !target.isConnected) return;

    // 1. Update Content (skip re-render when HTML is unchanged)
    const rawHtml = this.#htmlCallback(data, target);
    const safeHtml = this.#sanitizer(rawHtml);
    if (safeHtml !== this.#lastHtml) {
      this.#lastHtml = safeHtml;
      this.#tooltipDiv.innerHTML = safeHtml;
    }

    // 2. Determine Direction & Offset
    const dir = this.#directionCallback(data, target) as Direction;
    const [offsetX = 0, offsetY = 0] = this.#offsetCallback(data, target);

    // 3. Update Classes efficiently
    if (this.#currentDirection && this.#currentDirection !== dir) {
      this.#tooltipDiv.classList.remove(this.#currentDirection);
    }
    this.#tooltipDiv.classList.add(dir);
    this.#currentDirection = dir;

    // 4. Calculate and Apply Coordinates
    const coordinates = this.#getCoordinates(dir, target);

    // Note: window.scrollY/scrollX assumes <tip-viz-tooltip> is appended to document.body
    // offsetX (horizontal) → left, offsetY (vertical) → top
    this.#tooltipDiv.style.top = `${coordinates.top + offsetY + window.scrollY}px`;
    this.#tooltipDiv.style.left = `${coordinates.left + offsetX + window.scrollX}px`;

    // 5. Reveal
    this.#tooltipDiv.style.opacity = "1";
    this.#tooltipDiv.style.pointerEvents = "all";
    this.#tooltipDiv.setAttribute("aria-hidden", "false");
    this.setAttribute("aria-hidden", "false");
    this.#setDescribedBy(target);

    // 6. Dispatch Event
    this.dispatchEvent(new CustomEvent("show", {
      detail: { target, data, direction: dir, position: coordinates },
      bubbles: true, composed: true
    }));
  }

  /**
   * Hides the tooltip by setting its opacity to 0 and disabling pointer events.
   * Dispatches a custom "hide" event that bubbles and is composed.
   */
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

  /**
   * Calculates the position coordinates for a tooltip based on the specified direction.
   * @param dir - The direction in which the tooltip should be positioned relative to the target element.
   *              Supported directions: "n" (north), "s" (south), "e" (east), "w" (west),
   *              "nw" (northwest), "ne" (northeast), "sw" (southwest), "se" (southeast).
   * @param target - The DOM element that the tooltip is positioned relative to.
   * @returns An object containing the calculated `top` and `left` coordinate values in pixels.
   * @remarks
   * This method triggers a synchronous layout recalculation to account for tooltip dimension changes
   * that may have occurred from innerHTML updates. The positioning calculations account for both the
   * target element's dimensions and the tooltip's dimensions to ensure proper alignment.
   * @example
   * ```ts
   * const coords = tooltip.#getCoordinates("n", targetElement);
   * // Returns: { top: 100, left: 250 }
   * ```
   */
  #getCoordinates(dir: Direction, target: Element): { top: number; left: number } {
    const rect = target.getBoundingClientRect();

    // Getting this forces a synchronous layout, which is necessary because
    // we just updated the tooltip content and need the new dynamic width/height.
    const tooltipRect = this.#tooltipDiv.getBoundingClientRect();

    // The math here remains unchanged, it was already accurate.
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
