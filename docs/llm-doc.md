# tipviz — Quick Reference

A tiny, dependency-free Web Component (`<tip-viz-tooltip>`) for positional tooltips. Works with any DOM-based UI, including D3 visualizations.

---

## Installation

**CDN (ESM — recommended for static pages):**

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/tipviz@latest/dist/index.mjs"></script>
```

**CDN (UMD — no ES modules):**

```html
<script src="https://cdn.jsdelivr.net/npm/tipviz@latest/dist/index.umd.js"></script>
```

**npm:**

```bash
npm i tipviz
# or: pnpm add tipviz
```

Then import once in your app entry to register the element:

```ts
import "tipviz";
```

---

## Usage

### 1. Place the element in HTML

```html
<body>
  <svg id="chart"></svg>
  <tip-viz-tooltip id="tooltip"></tip-viz-tooltip>
</body>
```

> [!Note] The component automatically moves itself to `document.body` on connect. This means you can place it anywhere in your HTML (including inside a framework's root container like React's `<div id="root">`) and it will still position correctly. Use `no-auto-reposition` to disable this.

### 2. Configure and show

```ts
const tooltip = document.getElementById("tooltip");

// 1. Set the HTML content (receives the data passed to show())
tooltip.setHtml((data) => `<div>${data.label}: ${data.value}</div>`);

// 2. Optional: set a fixed direction or compute it dynamically
tooltip.setDirection(() => "n"); // "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se"

// 3. Optional: shift position by [x, y] pixels (x→left, y→top)
tooltip.setOffset(() => [0, 8]);

// 4. Optional: CSS string (uses CSSStyleSheet with <style> fallback)
tooltip.setStyles(`
  .tipviz-tooltip { background: rgba(0,0,0,0.85); color: white; padding: 6px; border-radius: 4px; }
`);

// 5. Show / hide on interaction
element.addEventListener("mouseenter", (e) => tooltip.show(someData, e.currentTarget));
element.addEventListener("mouseleave", () => tooltip.hide());
```

---

## API

### Methods

| Method | Signature | Description |
|--------|----------|-------------|
| `setHtml` | `(fn: (data, target) => string) => void` | Sets the HTML content generator |
| `setDirection` | `(fn: (data, target) => Direction) => void` | Sets the placement direction |
| `setOffset` | `(fn: (data, target) => [x, y]) => void` | Sets pixel offset `[x, y]` |
| `setStyles` | `(css: string) => void` | Applies CSS via adoptedStyleSheets |
| `loadStylesheet` | `(url: string) => void` | Injects a `<link>` into shadow root |
| `show` | `(data: object, target: Element) => void` | Renders and positions the tooltip |
| `hide` | `() => void` | Hides the tooltip |

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `transition-duration` | number | `200` | Fade duration in ms |
| `stylesheet` | string | — | URL to load inside shadow root |
| `no-auto-reposition` | boolean | — | Prevents the element from moving to `document.body` on connect |

### Events

```ts
tooltip.addEventListener("show", (e) => {
  // e.detail.target    — the target Element
  // e.detail.data      — the data object passed to show()
  // e.detail.direction — resolved direction string
  // e.detail.position  — { top, left } coordinates
});

tooltip.addEventListener("hide", () => { /* ... */ });
```

---

## Styling

**Three ways to style the tooltip:**

```ts
// 1. setStyles() — CSS string injected into shadow root
tooltip.setStyles(`.tipviz-tooltip { background: black; color: white; }`);

// 2. stylesheet attribute — external CSS file loaded into shadow root
// <tip-viz-tooltip stylesheet="/tooltip.css"></tip-viz-tooltip>

// 3. ::part() — style from outside the shadow DOM
// CSS:
tip-viz-tooltip::part(tooltip-box) { background: black; color: white; }
```

---

## Offset Semantics

`Offset = [x, y]`

- **`x`** — horizontal shift added to `left` (positive = right)
- **`y`** — vertical shift added to `top` (positive = down)

```ts
tooltip.setOffset(() => [10, 0]); // shift 10px to the right
tooltip.setOffset(() => [0, 8]);  // shift 8px down
```

---

## Complete D3 Example

```ts
import * as d3 from "d3";
import "tipviz";

const tooltip = document.getElementById("tooltip") as TipVizTooltip;

tooltip.setHtml(({ x, y }) => `<div>X: ${x} &nbsp; Y: ${y}</div>`);
tooltip.setStyles(`
  .tipviz-tooltip { background: rgba(0,0,0,0.85); color: white; padding: 6px; border-radius: 4px; font-size: 13px; }
`);

d3.select("#chart")
  .selectAll("circle")
  .data([{ x: 80, y: 120 }, { x: 200, y: 60 }])
  .join("circle")
  .attr("cx", (d) => d.x)
  .attr("cy", (d) => d.y)
  .attr("r", 8)
  .attr("fill", "steelblue")
  .on("mouseenter", (e, d) => tooltip.show(d, e.currentTarget))
  .on("mouseleave", () => tooltip.hide());
```

---

## Notes

- The tooltip uses `window.scrollY`/`window.scrollX` for positioning and auto-moves itself to `document.body` on connect (opt out with `no-auto-reposition`).
- Default direction is `"n"` (above the target).
- Default transition duration is `200ms`.
- HTML content is set via the browser's `setHTML()` API (with a `createContextualFragment` fallback) — no manual `innerHTML` usage required.
