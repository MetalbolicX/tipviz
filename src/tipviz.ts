type Direction = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";
type Offset = [number, number];
type DirectionCallback = (target: Element) => { top: number; left: number };
type HtmlCallback = (...args: any[]) => string;
type OffsetCallback = (...args: any[]) => Offset;
type DirectionFn = (...args: any[]) => Direction;

const DEFAULT_DIRECTION: Direction = "n";
const DEFAULT_OFFSET: Offset = [0, 0];
const DEFAULT_TRANSITION_DURATION = 200;

class TipVizTooltip extends HTMLElement {
  public static get observedAttributes() {
    return ["transition-duration"];
  }
  #htmlCallback: HtmlCallback = () => " ";
  #stylesText = "";
  #directionCallback: DirectionFn = () => DEFAULT_DIRECTION;
  #offsetCallback: OffsetCallback = () => DEFAULT_OFFSET;
  #shadow: ShadowRoot;
  #tooltipDiv: HTMLDivElement;
  #transitionDuration = DEFAULT_TRANSITION_DURATION;
  #directions: Direction[] = [
    "n",
    "s",
    "e",
    "w",
    "nw",
    "ne",
    "sw",
    "se",
  ];

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: "open" });
    this.#tooltipDiv = document.createElement("div");
    this.#tooltipDiv.className = "tipviz-tooltip";
    this.#tooltipDiv.style.position = "absolute";
    this.#tooltipDiv.style.top = "0px";
    this.#tooltipDiv.style.opacity = "0";
    this.#tooltipDiv.style.pointerEvents = "none";
    this.#tooltipDiv.style.boxSizing = "border-box";
    this.#tooltipDiv.style.transition = `opacity ${this.#transitionDuration}ms`;
    this.#shadow.appendChild(this.#tooltipDiv);
  }

  public connectedCallback() {
    // Apply transition duration from attribute if set
    const duration = this.getAttribute("transition-duration");
    if (duration) {
      this.#transitionDuration = parseInt(duration, 10);
      this.#tooltipDiv.style.transition = `opacity ${this.#transitionDuration}ms`;
    }
  }

  public attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === "transition-duration" && newValue) {
      this.#transitionDuration = parseInt(newValue, 10);
      this.#tooltipDiv.style.transition = `opacity ${this.#transitionDuration}ms`;
    }
  }

  public disconnectedCallback() {
    // Clean up if necessary
    while (this.#tooltipDiv.firstChild) {
      this.#tooltipDiv.removeChild(this.#tooltipDiv.firstChild);
    }
  }

  /**
   * Sets the HTML content for the tooltip.
   * @param fn - A function that takes a point and returns HTML content for the tooltip.
   * @example
   * ```typescript
   * tooltip.setHtml((point) => `<div>${point.x}, ${point.y}</div>`);
   * ```
   */
  public setHtml(fn: HtmlCallback) {
    this.#htmlCallback = fn;
  }

  /**
   * Sets the CSS styles for the tooltip.
   * @param css - A string containing CSS styles to apply to the tooltip.
   * @example
   * ```typescript
   * tooltip.setStyles(`
   *   .tooltip-content {
   *     background: black;
   *     color: white;
   *     padding: 5px;
   *     border-radius: 3px;
   *   }
   * `);
   * ```
   */
  public setStyles(css: string) {
    this.#stylesText = css;
    this.#applyStyles();
  }

  /**
   * Sets the direction callback for the tooltip.
   * @param fn - A function that takes a target element and returns a direction.
   * @example
   * ```typescript
   * tooltip.setDirection((target) => {
   *   return target.getBoundingClientRect().top < window.innerHeight / 2 ? "n" : "s";
   * });
   * ```
   */
  public setDirection(fn: DirectionFn) {
    this.#directionCallback = fn;
  }

  /**
   * Sets the offset callback for the tooltip.
   * @param fn - A function that takes a target element and returns an offset array [top, left].
   * @example
   * ```typescript
   * tooltip.setOffset((target) => {
   *   return [10, 20]; // 10px top, 20px left
   * });
   * ```
   */
  public setOffset(fn: OffsetCallback) {
    this.#offsetCallback = fn;
  }

  /**
   * Shows the tooltip at the specified target element with the provided data.
   * @param data - The data to display in the tooltip.
   * @param target - The target element to position the tooltip relative to.
   * @example
   * ```typescript
   * tooltip.show({ x: 100, y: 200 }, document.getElementById("myElement"));
   * ```
   */
  public show(data: Record<string, unknown>, target: Element) {
    if (!target) return;
    let content = this.#htmlCallback(data, target);
    if (this.#stylesText) {
      const scopedCss = this.#stylesText.replace(
        /(^|\})\s*([^\{\}]+)\s*\{/g,
        (m, brace, selector) => {
          if (selector.trim().startsWith("@")) return m;
          const scoped = selector
            .split(",")
            .map((s) => `.tipviz-tooltip ` + s.trim())
            .join(", ");
          return `${brace} ${scoped} {`;
        }
      );
      content = `<style>${scopedCss}</style>` + content;
    }
    while (this.#tooltipDiv.firstChild) {
      this.#tooltipDiv.removeChild(this.#tooltipDiv.firstChild);
    }
    const template = document.createElement("template");
    template.innerHTML = content;
    const fragment = document.createDocumentFragment();
    Array.from(template.content.childNodes).forEach((node) => {
      fragment.appendChild(node);
    });
    this.#tooltipDiv.appendChild(fragment);
    this.#tooltipDiv.style.opacity = "1";
    this.#tooltipDiv.style.pointerEvents = "all";
    // Remove all direction classes
    this.#directions.forEach((dir) => this.#tooltipDiv.classList.remove(dir));
    // Positioning
    const offset = this.#offsetCallback(data, target);
    const dir = this.#directionCallback(data, target) as Direction;
    const coords = this.#getCoordinates(dir, target);
    this.#tooltipDiv.classList.add(dir);
    this.#tooltipDiv.style.top = `${coords.top + offset[0] + window.scrollY}px`;
    this.#tooltipDiv.style.left = `${
      coords.left + offset[1] + window.scrollX
    }px`;

    // Dispatch show event
    this.dispatchEvent(new CustomEvent("show", {
      detail: {
        target,
        data,
        direction: dir,
        position: coords
      },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Hides the tooltip.
   * @example
   * ```typescript
   * tooltip.hide();
   * ```
   */
  public hide() {
    this.#tooltipDiv.style.opacity = "0";
    this.#tooltipDiv.style.pointerEvents = "none";

    // Dispatch hide event
    this.dispatchEvent(new CustomEvent("hide", {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Applies the styles to the tooltip.
   * This method creates a <style> element in the shadow DOM with the provided styles.
   */
  #applyStyles() {
    // Remove old style
    const old = this.#shadow.querySelector("style[data-tipviz]");
    if (old) old.remove();
    if (this.#stylesText) {
      const style = document.createElement("style");
      style.setAttribute("data-tipviz", "");
      style.textContent = this.#stylesText;
      this.#shadow.appendChild(style);
    }
  }

  /**
   * Calculates the coordinates for the tooltip based on the direction and target element.
   * @param dir - The direction to position the tooltip.
   * @param target - The target element to position the tooltip relative to.
   * @returns An object with top and left coordinates for the tooltip.
   */
  #getCoordinates(dir: Direction, target: Element): { top: number; left: number } {
    const rect = target.getBoundingClientRect();
    const tooltipRect = this.#tooltipDiv.getBoundingClientRect();
    switch (dir) {
      case "n":
        return {
          top: rect.top - tooltipRect.height,
          left: rect.left + rect.width / 2 - tooltipRect.width / 2,
        };
      case "s":
        return {
          top: rect.bottom,
          left: rect.left + rect.width / 2 - tooltipRect.width / 2,
        };
      case "e":
        return {
          top: rect.top + rect.height / 2 - tooltipRect.height / 2,
          left: rect.right,
        };
      case "w":
        return {
          top: rect.top + rect.height / 2 - tooltipRect.height / 2,
          left: rect.left - tooltipRect.width,
        };
      case "nw":
        return {
          top: rect.top - tooltipRect.height,
          left: rect.left - tooltipRect.width,
        };
      case "ne":
        return { top: rect.top - tooltipRect.height, left: rect.right };
      case "sw":
        return { top: rect.bottom, left: rect.left - tooltipRect.width };
      case "se":
        return { top: rect.bottom, left: rect.right };
      default:
        return {
          top: rect.top - tooltipRect.height,
          left: rect.left + rect.width / 2 - tooltipRect.width / 2,
        };
    }
  }
}

customElements.define("tip-viz-tooltip", TipVizTooltip);
