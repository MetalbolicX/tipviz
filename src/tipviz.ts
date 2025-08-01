type Direction = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";
type Offset = [number, number];
type DirectionCallback = (target: Element) => { top: number; left: number };
type HtmlCallback = (...args: any[]) => string;
type OffsetCallback = (...args: any[]) => Offset;
type DirectionFn = (...args: any[]) => Direction;

const DEFAULT_DIRECTION: Direction = "n";
const DEFAULT_OFFSET: Offset = [0, 0];

class TipVizTooltip extends HTMLElement {
  #htmlCallback: HtmlCallback = () => " ";
  #stylesText = "";
  #directionCallback: DirectionFn = () => DEFAULT_DIRECTION;
  #offsetCallback: OffsetCallback = () => DEFAULT_OFFSET;
  #shadow: ShadowRoot;
  #tooltipDiv: HTMLDivElement;
  private directions: Direction[] = [
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
    this.#shadow.appendChild(this.#tooltipDiv);
  }

  public connectedCallback() {
    // No-op for now
  }

  public setHtml(fn: HtmlCallback) {
    this.#htmlCallback = fn;
  }

  public setStyles(css: string) {
    this.#stylesText = css;
    this.#applyStyles();
  }

  public setDirection(fn: DirectionFn) {
    this.#directionCallback = fn;
  }

  public setOffset(fn: OffsetCallback) {
    this.#offsetCallback = fn;
  }

  public show(data: any, target: Element) {
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
    this.#tooltipDiv.innerHTML = content;
    this.#tooltipDiv.style.opacity = "1";
    this.#tooltipDiv.style.pointerEvents = "all";
    // Remove all direction classes
    this.directions.forEach((dir) => this.#tooltipDiv.classList.remove(dir));
    // Positioning
    const offset = this.#offsetCallback(data, target);
    const dir = this.#directionCallback(data, target) as Direction;
    const coords = this.#getCoords(dir, target);
    this.#tooltipDiv.classList.add(dir);
    this.#tooltipDiv.style.top = `${coords.top + offset[0] + window.scrollY}px`;
    this.#tooltipDiv.style.left = `${
      coords.left + offset[1] + window.scrollX
    }px`;
  }

  public hide() {
    this.#tooltipDiv.style.opacity = "0";
    this.#tooltipDiv.style.pointerEvents = "none";
  }

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

  #getCoords(dir: Direction, target: Element): { top: number; left: number } {
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
