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

#### Project setup (quick)

Create a Vite + TypeScript project and install the libraries you'll need:

```sh
npx create-vite@latest my-scatterplot --template vanilla-ts
cd my-scatterplot
npm install
npm install d3 tipviz
```

Notes:
- Install `tipviz` from npm when using Vite so the component is bundled with your app.
- You can also use the CDN build instead (see the earlier CDN examples) but the steps below assume the npm package.

#### Add the tooltip element to `index.html`

Put the tooltip element in your page body so it's available to scripts and sits on the same stacking context as your chart. You can pass attributes like `transition-duration` or `stylesheet` here:

```html
<svg id="chart2" width="400" height="200"></svg>
<tip-viz-tooltip id="tooltip2" transition-duration="200"></tip-viz-tooltip>
<script type="module" src="/src/main.ts"></script>
```

Why this matters:
- The `<tip-viz-tooltip>` element must exist in the DOM before you call its methods from your code.
- Keeping it in the document body avoids many positioning issues — if you encounter odd placement, ensure the element is a child of `document.body`.

#### main.ts — register the component and use it

Importing the package registers the custom element. Importing the types is optional but useful in TypeScript.

```ts
import * as d3 from "d3";
import "tipviz"; // registers <tip-viz-tooltip>
import type { TipVizTooltip } from "tipviz"; // provides TS types

const svg = d3.select("#chart2");
const tooltip = document.getElementById("tooltip2") as TipVizTooltip;

// Provide HTML for the tooltip. The function receives the data you pass to `show()`.
tooltip.setHtml(({ value }) => `
  <div class="tooltip-content">
    <strong>${value}</strong>
  </div>
`);

// Small offset so the tooltip doesn't sit directly on the target
tooltip.setOffset(() => [8, 0]);

// Example data and scales
const data = [
  { x: 80, y: 80, value: 10 },
  { x: 200, y: 120, value: 20 },
  { x: 320, y: 60, value: 30 }
];

const xScale = d3.scaleLinear().domain([0, d3.max(data, d => d.x)!]).range([40, 360]);
const yScale = d3.scaleLinear().domain([0, d3.max(data, d => d.y)!]).range([160, 40]);

svg.selectAll("circle")
  .data(data)
  .join("circle")
  .attr("cx", d => xScale(d.x))
  .attr("cy", d => yScale(d.y))
  .attr("r", 12)
  .attr("fill", "orange")
  .on("mouseenter", (event, d) => {
    // Pass the data object and the DOM element used for placement
    tooltip.show(d, event.currentTarget as Element);
  })
  .on("mouseleave", () => tooltip.hide());
```

Helpful tips from the API reference:
- `import "tipviz"` registers the custom element so `document.getElementById()` returns a usable `TipVizTooltip` instance.
- Use `tooltip.setHtml(fn)` to supply HTML; `fn` receives the data object you pass to `show()`.
- Use `tooltip.setOffset(fn)` and `tooltip.setDirection(fn)` to fine-tune placement behavior.
- If you want scoped CSS inside the component, either set the `stylesheet` attribute on the element or call `tooltip.setStyles(cssString)` / `tooltip.loadStylesheet(url)`.

Run the dev server:

```sh
npm run dev
```

Open the local address shown by Vite and hover the points — the tooltip should appear. If the tooltip looks unstyled, check that you either provided styles via the `stylesheet` attribute or called `tooltip.setStyles()` from your code.
