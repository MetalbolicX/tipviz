import * as d3 from "d3";
import "./src/tipviz";

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

function createScatterPlot(
  data: ScatterPlotPoint[],
  svgSelector: string,
  width: number,
  height: number
): void {
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
    .enter()
    .append("circle")
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
    (point) => /*html*/ `
      <ul class="tooltip-content">
        <li><strong>X:</strong> ${point.x}</li>
        <li><strong>Y:</strong> ${point.y}</li>
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
      }
      .tooltip-content strong {
        display: block;
        margin-bottom: 4px;
        font-weight: bold;
      }
      .tooltip-content li {
        margin: 0;
        padding: 0;
        list-style: none;
        display: inline-block;
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
