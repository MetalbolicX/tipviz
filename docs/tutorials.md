# Tutorials

This page demonstrates how to use the `TipViz` tooltip utility in different scenarios.

---

## Example 1: Basic Tooltip


Attach a tooltip to an SVG and show `Hello World` content on mouse events using the TipVizTooltip Web Component.

```html
<!-- In your HTML -->
<svg id="chart" width="400" height="200"></svg>
<tip-viz-tooltip id="tooltip" transition-duration="200"></tip-viz-tooltip>
```

```ts
// In your main.ts or script
import { TipVizTooltip } from "tipviz";

const svg = document.getElementById("chart") as SVGSVGElement;
const tooltip = document.getElementById("tooltip") as TipVizTooltip;

// Draw a circle
const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
circle.setAttribute("cx", "200");
circle.setAttribute("cy", "100");
circle.setAttribute("r", "40");
circle.setAttribute("fill", "steelblue");
svg.appendChild(circle);

// Set tooltip content
tooltip.setHtml(() => `<div class='tooltip-content'>Hello World</div>`);
tooltip.setStyles(`
  .tooltip-content {
    background: #fff;
    color: #333;
    border-radius: 4px;
    padding: 8px 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    font-size: 14px;
  }
`);

// Show/hide tooltip on events
circle.addEventListener("mouseenter", (event) => {
  tooltip.show({}, circle);
});
circle.addEventListener("mouseleave", () => {
  tooltip.hide();
});
```

---

## Example 2: Custom HTML and Offset


Customize the tooltip content and position using `setHtml` and `setOffset` with d3.js for SVG/data, and the TipVizTooltip Web Component for the tooltip logic.

```html
<!-- In your HTML -->
<svg id="chart2" width="400" height="200"></svg>
<tip-viz-tooltip id="tooltip2" transition-duration="200"></tip-viz-tooltip>
```

```ts
// In your main.ts or script
import { select } from "d3";
import { TipVizTooltip } from "tipviz";

const svg = select("#chart2");
const tooltip = document.getElementById("tooltip2") as TipVizTooltip;

const data = [
  { x: 80, y: 80, value: 10 },
  { x: 200, y: 120, value: 20 },
  { x: 320, y: 60, value: 30 }
];

svg.selectAll("circle")
  .data(data)
  .join("circle")
  .attr("cx", d => d.x)
  .attr("cy", d => d.y)
  .attr("r", 25)
  .attr("fill", "orange")
  .on("mouseenter", function(event, d) {
    tooltip.setHtml(() => `<strong>Value:</strong> ${d.value}`);
    tooltip.setOffset(() => [10, 10]);
    tooltip.show(d, this);
  })
  .on("mouseleave", function() {
    tooltip.hide();
  });
```

---
