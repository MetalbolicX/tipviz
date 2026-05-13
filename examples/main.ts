import * as d3 from "d3";
import "../dist/index.mjs";
import { TipVizTooltip } from "../dist/index.mjs";

const SVG_SELECTOR = "#chart";
const SVG_WIDTH = 600;
const SVG_HEIGHT = 400;
const POINT_RADIUS = 5;

interface ScatterPlotPoint {
  x: number;
  y: number;
  name?: string;
  value?: number;
}

const scatterPlotData: ScatterPlotPoint[] = [
  { x: 34, y: 78, name: "Alpha", value: 120 },
  { x: 109, y: 280, name: "Beta", value: 95 },
  { x: 310, y: 120, name: "Gamma", value: 210 },
  { x: 79, y: 411, name: "Delta", value: 67 },
  { x: 420, y: 220, name: "Epsilon", value: 180 },
  { x: 233, y: 145, name: "Zeta", value: 155 },
  { x: 333, y: 96, name: "Eta", value: 88 },
  { x: 222, y: 333, name: "Theta", value: 142 },
  { x: 78, y: 320, name: "Iota", value: 200 },
  { x: 21, y: 123, name: "Kappa", value: 76 },
];

const createScatterPlot = (
  data: ScatterPlotPoint[],
  svgSelector: string,
  width: number,
  height: number,
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
    "tip-viz-tooltip#tooltip",
  );
  if (!tooltip) {
    throw new Error("Tooltip element not found in the document.");
  }

  tooltip.setTemplate(`
    <div class="tooltip-container">
      <div class="tooltip-header">Point Data</div>
      <div class="tooltip-row">
        <span class="label">Name</span>
        <span class="value" data-bind="name"></span>
      </div>
      <div class="tooltip-row">
        <span class="label">X Value</span>
        <span class="value" data-bind="x"></span>
      </div>
      <div class="tooltip-row">
        <span class="label">Y Value</span>
        <span class="value" data-bind="y"></span>
      </div>
      <div class="tooltip-row">
        <span class="label">Score</span>
        <span class="value" data-bind="value"></span>
      </div>
    </div>
  `);

  tooltip.setStyles(`
    .tooltip-container {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-width: 120px;
      background: #ffffff;
      color: #1a1a1a;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      border: 1px solid #e1e4e8;
    }

    .tooltip-header {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #707070;
      margin-bottom: 8px;
      border-bottom: 1px solid #f0f0f0;
      padding-bottom: 4px;
    }

    .tooltip-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 4px;
    }

    .tooltip-row:last-child {
      margin-bottom: 0;
    }

    .label {
      font-size: 12px;
      color: #666;
    }

    .value {
      font-size: 12px;
      font-weight: 600;
      color: #000;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }
  `.trim());

  svg
    .selectAll("circle")
    .on("mouseover", (event, d) => {
      tooltip.setData({
        name: d.name ?? "",
        x: d.x,
        y: d.y,
        value: d.value ?? 0,
      });
      tooltip.show(event.currentTarget);
    })
    .on("mouseout", () => {
      tooltip.hide();
    });
};

createScatterPlot(scatterPlotData, SVG_SELECTOR, SVG_WIDTH, SVG_HEIGHT);

const button = document.querySelector<HTMLButtonElement>("button");
if (!button) {
  throw new Error("Button element not found in the document.");
}

button.addEventListener("click", () => {
  const tooltip = document.querySelector<TipVizTooltip>(
    "tip-viz-tooltip#button",
  );
  if (!tooltip) {
    throw new Error("Tooltip element not found in the document.");
  }

  tooltip.setTemplate(`
    <div class="tooltip-content">
      <p>You clicked the button!</p>
    </div>
  `);
  tooltip.show(button);
});