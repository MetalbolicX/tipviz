import * as d3 from "d3";
import "./dist/index.mjs";

const SVG_SELECTOR = "#chart";
const SVG_WIDTH = 600;
const SVG_HEIGHT = 400;
const POINT_RADIUS = 5;

interface ScatterPlotPoint {
  x: number;
  y: number;
}

const scatterPlotData: ScatterPlotPoint[] = [
  { x: 34, y: 78 },
  { x: 109, y: 280 },
  { x: 310, y: 120 },
  { x: 79, y: 411 },
  { x: 420, y: 220 },
  { x: 233, y: 145 },
  { x: 333, y: 96 },
  { x: 222, y: 333 },
  { x: 78, y: 320 },
  { x: 21, y: 123 },
];

/**
 * Creates an interactive scatter plot visualization using D3.js with tooltips.
 * @param data - Array of data points to be plotted, each containing x and y coordinates
 * @param svgSelector - CSS selector string for the SVG element where the plot will be rendered
 * @param width - Width of the SVG canvas in pixels
 * @param height - Height of the SVG canvas in pixels
 * @throws {Error} If the SVG element cannot be found at the specified selector
 * @throws {Error} If the tooltip element (tip-viz-tooltip#tooltip) cannot be found in the document
 * @remarks
 * - Scales are automatically calculated based on the data domain with padding for point radius
 * - Circles are rendered with a fixed radius defined by POINT_RADIUS constant
 * - Hover interactions display formatted tooltips showing x and y coordinates
 * - Tooltip styling includes a semi-transparent background with shadow effect
 * @example
 * ```typescript
 * const points: ScatterPlotPoint[] = [
 *   { x: 10, y: 20 },
 *   { x: 30, y: 40 }
 * ];
 * createScatterPlot(points, 'svg#chart', 800, 600);
 * ```
 */
const createScatterPlot = (
  data: ScatterPlotPoint[],
  svgSelector: string,
  width: number,
  height: number
): void => {
  const svg = d3
    .select<SVGSVGElement, unknown>(svgSelector)
    .attr("width", width)
    .attr("height", height);

  if (svg.empty()) {
    throw new Error("SVG element not found in the document.");
  }

  const xScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.x) ?? 0])
    .range([POINT_RADIUS, width - POINT_RADIUS]);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.y) ?? 0])
    .range([height - POINT_RADIUS, POINT_RADIUS]);

  svg
    .selectAll<SVGCircleElement, ScatterPlotPoint>("circle")
    .data(data)
    .join("circle")
    .attr("cx", (d) => xScale(d.x))
    .attr("cy", (d) => yScale(d.y))
    .attr("r", POINT_RADIUS)
    .attr("fill", "steelblue");

  const tooltip = document.querySelector<TipVizTooltip>(
    "tip-viz-tooltip#tooltip"
  );
  if (!tooltip) {
    throw new Error("Tooltip element not found in the document.");
  }

  tooltip.setHtml(
    ({ x, y }: ScatterPlotPoint) => /*html*/ `
      <ul class="tooltip-content">
        <li><strong>X:</strong> ${x}</li>
        <li><strong>Y:</strong> ${y}</li>
      </ul>`
  );
  tooltip.setStyles(/*css*/ `
      .tooltip-content {
        font-family: sans-serif;
        width: 7em;
        background: #AAA;
        color: #333;
        border-radius: 4px;
        padding: 8px 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-size: 14px;

        li {
          margin: 0;
          padding: 0;
          list-style: none;
          display: inline-block;
        }
      }
    `.trim()
  );

  svg
    .selectAll("circle")
    .on("mouseover", (event, d) => {
      tooltip.show(d as Record<string, { x: number; y: number }>, event.currentTarget);
    })
    .on("mouseout", () => {
      tooltip.hide();
    });
}

createScatterPlot(scatterPlotData, SVG_SELECTOR, SVG_WIDTH, SVG_HEIGHT);
