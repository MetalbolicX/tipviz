# Tutorials

This page demonstrates how to use the `TipViz` tooltip utility in different scenarios.

## Usage

### Basic Tooltip

Tooltips are a fantastic way to provide extra information to users when they interact with elements on your webpage. In this tutorial, you'll learn how to easily add a tooltip to an SVG element using the `TipVizTooltip` component, even if you're new to web development. We'll use a CDN for quick setup—no build tools or package managers required! 🚀.

#### Add the Web Component via CDN

First, include the `TipVizTooltip` web component in your HTML using a CDN. This means you don't need to install anything—just copy and paste!

```html
<!-- Add this in your <head> or before your closing </body> tag -->
<script type="module" src="https://unpkg.com/tipviz/dist/tipviz.min.js"></script>
```

This line loads the TipVizTooltip component so you can use it anywhere in your HTML 🌐.

#### Set Up Your HTML

Add an SVG element and the tooltip component to your HTML. The SVG will hold your chart, and the tooltip will display information.

```html
<!-- In your HTML -->
<svg id="chart" width="400" height="200"></svg>
<tip-viz-tooltip id="tooltip" transition-duration="200"></tip-viz-tooltip>
```

- The `svg` is where you'll draw shapes.
- The `<tip-viz-tooltip>` is the custom element that shows the tooltip.
- The `transition-duration` attribute controls how quickly the tooltip fades in/out (in milliseconds).

#### Add JavaScript

Now, add a script to draw a circle and connect the tooltip. You can place this in a `<script>` tag at the end of your HTML file.

```html
<script type="module">
  // Get references to the SVG and tooltip elements
  const svg = document.getElementById("chart");
  const tooltip = document.getElementById("tooltip");

  // Draw a blue circle in the SVG
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "200");
  circle.setAttribute("cy", "100");
  circle.setAttribute("r", "40");
  circle.setAttribute("fill", "steelblue");
  svg.appendChild(circle);

  // Set the tooltip's HTML content and styles
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

  // Show the tooltip when the mouse enters the circle
  circle.addEventListener("mouseenter", (event) => {
    tooltip.show({}, circle);
  });

  // Hide the tooltip when the mouse leaves the circle
  circle.addEventListener("mouseleave", () => {
    tooltip.hide();
  });
</script>
```

What’s Happening? 🤔

- You create a circle in the SVG.
- You set up the tooltip’s content and style.
- When you hover over the circle, the tooltip appears. When you move your mouse away, it disappears.

With just a few lines of code and a CDN link, you can add beautiful, interactive tooltips to your SVG graphics using the TipVizTooltip web component! 🥳.

### Beginner step-by-step (CDN + local CSS file)

This short step-by-step is aimed at a junior developer who wants the simplest working setup using the CDN and a local CSS file to style the tooltip.

Prerequisites: a basic HTML file and a place to save `tooltip.css`.

1) Add the CDN script and the tooltip element. Place the script near the end of `body` so DOM elements are available:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>TipViz demo</title>
  </head>
  <body>
    <svg id="chart" width="400" height="200"></svg>

    <!-- tooltip element; the `stylesheet` attribute will load tooltip.css into the shadow root -->
    <tip-viz-tooltip id="tooltip" transition-duration="200" stylesheet="tooltip.css"></tip-viz-tooltip>

    <script type="module" src="https://unpkg.com/tipviz/dist/tipviz.min.js"></script>
    <script type="module" src="./demo.js"></script>
  </body>
</html>
```

2) Create `tooltip.css` (save next to your HTML). This file will be loaded inside the component shadow root and scope only to the tooltip's internals.

```css
/* tooltip.css */
.tipviz-tooltip {
  font-family: system-ui, Arial, sans-serif;
}
.tooltip-content {
  background: #222;
  color: #fff;
  padding: 8px 10px;
  border-radius: 4px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.25);
  font-size: 13px;
}
```

3) Create `demo.js` (basic interaction). This file draws a circle and uses the tooltip API from [the reference](./api-reference.md) to set content and show/hide on hover.:

```js
// demo.js
const svg = document.getElementById('chart');
const tooltip = document.getElementById('tooltip');

// create a point
const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
circle.setAttribute('cx', '200');
circle.setAttribute('cy', '100');
circle.setAttribute('r', '28');
circle.setAttribute('fill', 'tomato');
svg.appendChild(circle);

// supply HTML for the tooltip
tooltip.setHtml((data) => `
  <div class="tooltip-content">
    <strong>${data.title}</strong>
    <div>${data.value}</div>
  </div>
`);

// show/hide using the DOM element as the placement target
circle.addEventListener('mouseenter', () => tooltip.show({ title: 'Point A', value: 42 }, circle));
circle.addEventListener('mouseleave', () => tooltip.hide());

// Note: the component will load tooltip.css automatically because of the `stylesheet` attribute
```

4) Open the HTML file in the browser. Hover over the circle — you should see the styled tooltip appear.
5) Customization notes (quick reference from the API):
  - To change how the tooltip decides where to appear, use `tooltip.setDirection(fn)` where `fn` returns one of `n|s|e|w|nw|ne|sw|se`.
  - To fine-tune position, use `tooltip.setOffset(fn)` returning `[topOffset, leftOffset]` in pixels.
  - To inject styles programmatically, call `tooltip.setStyles(cssString)` (useful for small overrides).
  - If you don't see correct positioning when the tooltip moves with page scroll, ensure your `<tip-viz-tooltip>` element is appended to `document.body` (this example keeps it in the page body already).

If you'd like, I can also add a short example that shows `setDirection` logic or how to use `loadStylesheet(url)` dynamically instead of the `stylesheet` attribute.

### Usage with D3.js, TypeScript and Vite

In this section, you will learn how to create a simple scatter plot using D3.js, TypeScript, and Vite, and enhance it with interactive tooltips using the `TipVizTooltip` web component.

#### Project Setup with Vite and TypeScript

First, create a new project using Vite, which is a fast build tool for modern web projects. Vite makes it easy to use TypeScript and bundle your code for production. 🛠️

Open your terminal and run:

```sh
npm create vite@latest my-scatterplot -- --template vanilla-ts
cd my-scatterplot
npm install
```

Install the necessary dependencies:

```sh
npm install d3 tipviz
```

#### Set Up Your HTML with Vite

Edit your `index.html` to include an SVG for the chart and the tooltip component:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Scatter Plot with D3.js and TipVizTooltip</title>
  </head>
  <body>
    <svg id="chart2" width="400" height="200"></svg>
    <tip-viz-tooltip id="tooltip2" transition-duration="200"></tip-viz-tooltip>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

#### Write the TypeScript Code

Create or edit `src/main.ts` as follows:

```ts
import * as d3 from "d3";
import "tipviz"; // Register the TipVizTooltip web component
import { type TipVizTooltip } from "tipviz"; // Use the types from TypesScript

// Register the web component (this is done by the import)
const svg = d3.select("#chart2");
const tooltip = document.getElementById("tooltip2") as TipVizTooltip;
tooltip.setHtml(() => `<strong>Value:</strong> ${d.value}`);
tooltip.setOffset(() => [10, 10]);

// Example data for the scatter plot
const data = [
  { x: 80, y: 80, value: 10 },
  { x: 200, y: 120, value: 20 },
  { x: 320, y: 60, value: 30 }
];

// Create scales for positioning
const xScale = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.x)!])
  .range([40, 360]);

const yScale = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.y)!])
  .range([160, 40]);

// Draw circles for each data point
svg.selectAll("circle")
  .data(data)
  .join("circle")
  .attr("cx", d => xScale(d.x))
  .attr("cy", d => yScale(d.y))
  .attr("r", 25)
  .attr("fill", "orange")
  .on("mouseenter", function(event, d) {
    tooltip.show(d, this);
  })
  .on("mouseleave", function() {
    tooltip.hide();
  });
```

#### Run and Build Your Project

To start your development server and see the scatter plot in action, run:

```sh
npm run dev
```

Open your browser to the provided local address. Hover over the orange circles to see the tooltips! 🖱️✨

When you are ready to build for production, use:

```sh
npm run build
```

Vite will bundle your code, including the `TipVizTooltip` web component, for deployment.

You have now created an interactive scatter plot using D3.js, TypeScript, and Vite, enhanced with a modern, customizable tooltip using the TipVizTooltip web component.
