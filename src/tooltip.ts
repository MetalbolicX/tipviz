
import { select, type Selection } from "d3";

export type Direction = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";
export type Offset = [number, number];
export type DirectionCallback = (target: SVGGraphicsElement) => {
  top: number;
  left: number;
};
export type HtmlCallback = (...args: any[]) => string;
export type OffsetCallback = (...args: any[]) => Offset;
export type DirectionFn = (...args: any[]) => Direction;

/**
 * TipViz is a tooltip utility for D3.js SVG visualizations (TypeScript, d3 v7)
 */
export class TipViz {
  private direction: DirectionFn = () => "n";
  private offset: OffsetCallback = () => [0, 0];
  private html: HtmlCallback = () => " ";
  private rootElement: HTMLElement = document.body;
  private node: HTMLDivElement | null = null;
  private svg: SVGSVGElement | null = null;
  private point: DOMPoint | null = null;
  private target: SVGGraphicsElement | null = null;
  private directionCallbacks: Map<Direction, DirectionCallback>;
  private directions: Direction[];

  constructor() {
    this.directionCallbacks = new Map<Direction, DirectionCallback>([
      ["n", (target) => this.#moveToNorth(target)],
      ["s", (target) => this.#moveToSouth(target)],
      ["e", (target) => this.#moveToEast(target)],
      ["w", (target) => this.#moveToWest(target)],
      ["nw", (target) => this.#moveToNorthWest(target)],
      ["ne", (target) => this.#moveToNorthEast(target)],
      ["sw", (target) => this.#moveToSouthWest(target)],
      ["se", (target) => this.#moveToSouthEast(target)],
    ]);
    this.directions = Array.from(this.directionCallbacks.keys());
    this.#initNode();
  }

  /**
   * Attaches the tooltip to a D3 SVG selection. Initializes the SVG point for coordinate calculations.
   * @param vis - D3 selection of the SVG element
   */
  public attachTo(
    vis: Selection<SVGSVGElement, unknown, null, undefined>
  ): void {
    this.svg = this.#getSVGNode(vis);
    if (!this.svg) return;
    this.point = this.svg.createSVGPoint();
    if (this.node && !this.rootElement.contains(this.node)) {
      this.rootElement.appendChild(this.node);
    }
  }

  /**
   * Shows the tooltip with the given data and event context. The last argument should be the SVG element to anchor the tooltip.
   * @param args - Data, event, and the SVG element (last argument)
   * @returns The D3Tip instance
   */
  public show(...args: any[]): this {
    // if (args.length && args[args.length - 1] instanceof SVGElement) {
    //   this.target = args.pop();
    // }
    const lastArg = args.at(-1);
    this.target = lastArg instanceof SVGGraphicsElement ? lastArg : null;
    const params = this.target ? args.slice(0, -1) : args;

    const content = this.html.apply(this, params);
    const poffset = this.offset.apply(this, params);
    const dir = this.direction.apply(this, params) as Direction;
    const nodel = this.#getNodeEl();
    let i = this.directions.length;
    const coords = this.directionCallbacks.get(dir)!(this.target!);
    const scrollTop =
      document.documentElement.scrollTop || this.rootElement.scrollTop;
    const scrollLeft =
      document.documentElement.scrollLeft || this.rootElement.scrollLeft;
    nodel.html(content).style("opacity", 1).style("pointer-events", "all");
    while (i--) nodel.classed(this.directions[i], false);
    nodel
      .classed(dir, true)
      .style("top", `${coords.top + poffset[0] + scrollTop}px`)
      .style("left", `${coords.left + poffset[1] + scrollLeft}px`);
    return this;
  }

  /**
   * Hides the tooltip.
   * @returns The D3Tip instance
   */
  public hide(): this {
    const nodel = this.#getNodeEl();
    nodel.style("opacity", 0).style("pointer-events", "none");
    return this;
  }

  /**
   * Gets or sets an attribute on the tooltip node.
   * @param name - Attribute name
   * @param value - Attribute value (optional)
   * @returns The D3Tip instance or the attribute value
   */
  public attr(name: string, value?: string): this | string | null {
    const nodel = this.#getNodeEl();
    if (value === undefined) return nodel.attr(name);
    nodel.attr(name, value);
    return this;
  }

  /**
   * Gets or sets a style property on the tooltip node.
   * @param name - Style property name
   * @param value - Style property value (optional)
   * @returns The D3Tip instance or the style value
   */
  public style(name: string, value?: string): this | string | null {
    const nodel = this.#getNodeEl();
    if (value === undefined) return nodel.style(name);
    nodel.style(name, value);
    return this;
  }

  /**
   * Sets the direction callback for the tooltip.
   * @param fn - Function returning the direction string
   * @returns The D3Tip instance
   */
  public setDirection(fn: DirectionFn): this {
    this.direction = fn;
    return this;
  }

  /**
   * Sets the offset callback for the tooltip.
   * @param fn - Function returning the [x, y] offset
   * @returns The D3Tip instance
   */
  public setOffset(fn: OffsetCallback): this {
    this.offset = fn;
    return this;
  }

  /**
   * Sets the HTML content callback for the tooltip.
   * @param fn - Function returning the HTML string
   * @returns The D3Tip instance
   */
  public setHtml(fn: HtmlCallback): this {
    this.html = fn;
    return this;
  }

  /**
   * Sets the root element to which the tooltip node will be appended.
   * @param el - The root HTML element
   * @returns The D3Tip instance
   */
  public setRootElement(el: HTMLElement): this {
    this.rootElement = el;
    return this;
  }

  /**
   * Destroys the tooltip node and removes it from the DOM.
   * @returns The D3Tip instance
   */
  public destroy(): this {
    if (this.node) {
      this.#getNodeEl().remove();
      this.node = null;
    }
    return this;
  }

  /**
   * Calculates the tooltip position for the 'north' direction.
   * @param target - The SVG element to anchor the tooltip
   * @returns The top and left coordinates
   */
  #moveToNorth(target: SVGGraphicsElement): { top: number; left: number } {
    const bbox = this.#getScreenBBox(target);
    return {
      top: bbox.n.y - (this.node?.offsetHeight ?? 0),
      left: bbox.n.x - (this.node?.offsetWidth ?? 0) / 2,
    };
  }
  /**
   * Calculates the tooltip position for the 'south' direction.
   * @param target - The SVG element to anchor the tooltip
   * @returns The top and left coordinates
   */
  #moveToSouth(target: SVGGraphicsElement): { top: number; left: number } {
    const bbox = this.#getScreenBBox(target);
    return {
      top: bbox.s.y,
      left: bbox.s.x - (this.node?.offsetWidth ?? 0) / 2,
    };
  }
  /**
   * Calculates the tooltip position for the 'east' direction.
   * @param target - The SVG element to anchor the tooltip
   * @returns The top and left coordinates
   */
  #moveToEast(target: SVGGraphicsElement): { top: number; left: number } {
    const bbox = this.#getScreenBBox(target);
    return {
      top: bbox.e.y - (this.node?.offsetHeight ?? 0) / 2,
      left: bbox.e.x,
    };
  }
  /**
   * Calculates the tooltip position for the 'west' direction.
   * @param target - The SVG element to anchor the tooltip
   * @returns The top and left coordinates
   */
  #moveToWest(target: SVGGraphicsElement): { top: number; left: number } {
    const bbox = this.#getScreenBBox(target);
    return {
      top: bbox.w.y - (this.node?.offsetHeight ?? 0) / 2,
      left: bbox.w.x - (this.node?.offsetWidth ?? 0),
    };
  }
  /**
   * Calculates the tooltip position for the 'northwest' direction.
   * @param target - The SVG element to anchor the tooltip
   * @returns The top and left coordinates
   */
  #moveToNorthWest(target: SVGGraphicsElement): { top: number; left: number } {
    const bbox = this.#getScreenBBox(target);
    return {
      top: bbox.nw.y - (this.node?.offsetHeight ?? 0),
      left: bbox.nw.x - (this.node?.offsetWidth ?? 0),
    };
  }
  /**
   * Calculates the tooltip position for the 'northeast' direction.
   * @param target - The SVG element to anchor the tooltip
   * @returns The top and left coordinates
   */
  #moveToNorthEast(target: SVGGraphicsElement): { top: number; left: number } {
    const bbox = this.#getScreenBBox(target);
    return {
      top: bbox.ne.y - (this.node?.offsetHeight ?? 0),
      left: bbox.ne.x,
    };
  }
  /**
   * Calculates the tooltip position for the 'southwest' direction.
   * @param target - The SVG element to anchor the tooltip
   * @returns The top and left coordinates
   */
  #moveToSouthWest(target: SVGGraphicsElement): { top: number; left: number } {
    const bbox = this.#getScreenBBox(target);
    return {
      top: bbox.sw.y,
      left: bbox.sw.x - (this.node?.offsetWidth ?? 0),
    };
  }
  /**
   * Calculates the tooltip position for the 'southeast' direction.
   * @param target - The SVG element to anchor the tooltip
   * @returns The top and left coordinates
   */
  #moveToSouthEast(target: SVGGraphicsElement): { top: number; left: number } {
    const bbox = this.#getScreenBBox(target);
    return {
      top: bbox.se.y,
      left: bbox.se.x,
    };
  }

  /**
   * Initializes the tooltip node and appends it to the root element.
   */
  #initNode(): void {
    const selection = select(this.rootElement)
      .selectAll<HTMLDivElement, null>(".d3-tooltip")
      .data([null]);

    const div = selection.join(
      (enter) =>
        enter
          .append("div")
          .attr("class", "d3-tooltip")
          .style("position", "absolute")
          .style("top", "0px")
          .style("opacity", "0")
          .style("pointer-events", "none")
          .style("box-sizing", "border-box"),
      (update) => update,
      (exit) => exit.remove()
    );

    this.node = div.node() as HTMLDivElement;
  }

  /**
   * Gets the SVG node from a D3 selection.
   * @param element - D3 selection of the SVG element
   * @returns The SVGSVGElement or null
   */
  #getSVGNode(
    element: Selection<SVGSVGElement, unknown, null, undefined>
  ): SVGSVGElement | null {
    const svgNode = element.node();
    if (!svgNode) return null;
    if (svgNode.tagName.toLowerCase() === "svg")
      return svgNode as SVGSVGElement;
    // @ts-ignore
    return svgNode.ownerSVGElement;
  }

  /**
   * Gets the D3 selection of the tooltip node, initializing it if necessary.
   * @returns D3 selection of the tooltip node
   */
  #getNodeEl(): Selection<HTMLDivElement, unknown, null, undefined> {
    if (!this.node) {
      this.#initNode();
    }
    return select(this.node!);
  }

  /**
   * Calculates the bounding box screen coordinates for the target SVG element.
   * @param targetShape - The SVG element to anchor the tooltip
   * @returns An object with DOMPoints for each direction
   */
  #getScreenBBox(targetShape: SVGGraphicsElement): Record<Direction, DOMPoint> {
    let targetel: any = this.target || targetShape;
    while (
      targetel &&
      typeof targetel.getScreenCTM !== "function" &&
      targetel.parentNode != null
    ) {
      targetel = targetel.parentNode;
    }
    if (!targetel || typeof targetel.getScreenCTM !== "function") {
      throw new Error(
        "D3Tooltip: target element for tooltip is not a valid SVGGraphicsElement."
      );
    }
    const matrix = targetel.getScreenCTM();
    if (!matrix) {
      throw new Error(
        "D3Tooltip: getScreenCTM() returned null. The element may not be in the DOM."
      );
    }
    const tbbox = targetel.getBBox();
    const { width, height } = tbbox;
    let { x, y } = tbbox;
    if (!this.point) throw new Error("SVGPoint not initialized");
    const bbox: Record<string, DOMPoint> = {};
    Object.assign(this.point, { x, y });
    bbox.nw = this.point.matrixTransform(matrix);
    this.point.x += width;
    bbox.ne = this.point.matrixTransform(matrix);
    this.point.y += height;
    bbox.se = this.point.matrixTransform(matrix);
    this.point.x -= width;
    bbox.sw = this.point.matrixTransform(matrix);
    this.point.y -= height / 2;
    bbox.w = this.point.matrixTransform(matrix);
    this.point.x += width;
    bbox.e = this.point.matrixTransform(matrix);
    this.point.x -= width / 2;
    this.point.y -= height / 2;
    bbox.n = this.point.matrixTransform(matrix);
    this.point.y += height;
    bbox.s = this.point.matrixTransform(matrix);
    return bbox as Record<Direction, DOMPoint>;
  }
}
