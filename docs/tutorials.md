# Tutorials

This page demonstrates how to use the `TipViz` tooltip utility in different scenarios.

---

## Example 1: Basic Tooltip

Attach a tooltip to an SVG and show `Hello World` content on mouse events.

```ts
import { select } from "d3";
import { TipViz } from "tipviz";

// Create SVG
const svg = select("body")
  .append("svg")
  .attr("width", 400)
  .attr("height", 200);

// Create SVG
const svg = select("body")
  .append("svg")
  .attr("width", 400)
  .attr("height", 200);

// Draw a circle
svg.append("circle")
  .attr("cx", 200)
  .attr("cy", 100)
  .attr("r", 40)
  .attr("fill", "steelblue");

// Initialize tooltip
const tooltip = new TipViz();
tooltip.attachTo(svg);

// Show/hide tooltip on events
svg.selectAll("circle")
  .on("mouseover", function (event, d) {
    tooltip.show("Hello World", this);
  })
  .on("mouseout", () => tooltip.hide());
```

---

## Example 2: Custom HTML and Offset

Customize the tooltip content and position using `setHtml` and `setOffset`.

```ts
import { select } from "d3";
import { TipViz } from "tipviz";

const svg = select("body")
  .append("svg")
  .attr("width", 400)
  .attr("height", 200);

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
  .attr("fill", "orange");

const tooltip = new TipViz()
  .setHtml(d => `<strong>Value:</strong> ${d.value}`)
  .setOffset(() => [10, 10]);

tooltip.attachTo(svg);

svg.selectAll("circle")
  .on("mouseenter", function (event, d) {
    tooltip.show(d, this);
  })
  .on("mouseleave", () => tooltip.hide());
```

---

## Example 3: Dynamic Direction and Styling

Set the tooltip direction dynamically and style the tooltip.

```ts
import { select } from "d3";
import { TipViz } from "tipviz";

const svg = select("body")
  .append("svg")
  .attr("width", 400)
  .attr("height", 200);

const data = [
  { x: 60, y: 60, label: "NW", dir: "nw" },
  { x: 340, y: 60, label: "NE", dir: "ne" },
  { x: 60, y: 160, label: "SW", dir: "sw" },
  { x: 340, y: 160, label: "SE", dir: "se" }
];

svg.selectAll("rect")
  .data(data)
  .join("rect")
  .attr("x", d => d.x - 20)
  .attr("y", d => d.y - 20)
  .attr("width", 40)
  .attr("height", 40)
  .attr("fill", "teal");

const tooltip = new TipViz()
  .setHtml(d => `Label: ${d.label}`)
  .setDirection(d => d.dir)
  .style("background", "#222")
  .style("color", "#fff")
  .style("padding", "8px")
  .style("border-radius", "4px");

tooltip.attachTo(svg);

svg.selectAll("rect")
  .on("mousemove", function (event, d) {
    tooltip.show(d, this);
  })
  .on("mouseleave", () => tooltip.hide());
```

---

## Example 4: Tooltip with Custom Root Element

```ts
import { select } from "d3";
import { TipViz } from "tipviz";

const svg = select("body")
  .append("svg")
  .attr("width", 400)
  .attr("height", 200);

const tooltipRoot = select("body")
  .append("div")
  .attr("class", "tooltip-root");

const tooltip = new TipViz()
  .setHtml(d => `Value: ${d.value}`)
  .setOffset(() => [10, 10])
  .setRootElement(tooltipRoot.node());

tooltip.attachTo(svg);

svg.selectAll("circle")
  .on("mouseenter", function (event, d) {
    tooltip.show(d, this);
  })
  .on("mouseleave", () => tooltip.hide());
```

---
