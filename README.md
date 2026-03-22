# tipviz

Framework-agnostic tooltip Web Component for data-visualization UIs.

## Overview

- Tiny, dependency-free Web Component written in TypeScript.
- Designed for D3 and any DOM-based UI where positional tooltips are needed.

## Installation

Choose one of the options below.

- CDN (UMD): add the UMD bundle to a page — useful for simple demos or static sites:

```html
<script src="https://cdn.jsdelivr.net/npm/tipviz@2.0.2/dist/index.umd.js"></script>
<script>
  const tooltip = document.createElement('tip-viz-tooltip');
  document.body.appendChild(tooltip);
  tooltip.setHtml(d => `<div>${d.label}</div>`);
  // ...use tooltip.show(data, target) / tooltip.hide()
</script>
```

- ESM (browser/module bundlers): import the module so the custom element is registered:

```html
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/tipviz@2.0.2/dist/index.mjs';

  const tooltip = document.createElement('tip-viz-tooltip');
  document.body.appendChild(tooltip);
  tooltip.setHtml(data => `<div class="tip">${data.value}</div>`);
  // tooltip.show({ value: 42 }, someElement);
</script>
```

- npm (framework projects / bundlers):

```bash
npm install tipviz
# or pnpm add tipviz
```

Then import in your app (React, Vue, Svelte, etc.):

```js
import 'tipviz'; // registers <tip-viz-tooltip>

// create and use from DOM or framework refs
const tooltip = document.createElement('tip-viz-tooltip');
document.body.appendChild(tooltip);
```

## Quick Usage

The component exposes a small JS API for content, placement and styling.

```js
// create or query the element
const tooltip = document.querySelector('tip-viz-tooltip') || document.createElement('tip-viz-tooltip');
document.body.appendChild(tooltip);

// content
tooltip.setHtml((data, target) => `<div class="tooltip-content">${data.label}</div>`);

// placement and tuning
tooltip.setDirection((data, target) => 'n');           // 'n'|'s'|'e'|'w'|'nw'|'ne'|'sw'|'se'
tooltip.setOffset((data, target) => [0, 8]);           // [x, y] pixels

// styles
tooltip.setStyles(`.tipviz-tooltip { background: rgba(0,0,0,0.85); color: white; padding: 6px; border-radius: 4px; }`);
tooltip.loadStylesheet('https://example.com/tooltip.css'); // loads inside shadow root

// show / hide
tooltip.show({ label: 'Value: 42' }, someElement);
tooltip.hide();

// listen to events
tooltip.addEventListener('show', e => console.log('shown', e.detail));
tooltip.addEventListener('hide', () => console.log('hidden'));
```

## API (summary)

- Methods
  - `setHtml(fn: HtmlCallback)` — set HTML content generator
  - `setStyles(css: string)` — apply scoped CSS (adoptedStyleSheets when available)
  - `loadStylesheet(url: string)` — insert external stylesheet into shadow root
  - `setDirection(fn: DirectionFn)` — placement callback returning `n|s|e|w|nw|ne|sw|se`
  - `setOffset(fn: OffsetCallback)` — return `[x, y]` offset in pixels
  - `show(data: Record<string, unknown>, target: Element)` — render and position tooltip
  - `hide()` — hide the tooltip

- Attributes
  - `transition-duration` — opacity transition time (ms)
  - `stylesheet` — URL to load inside the component shadow root

- Events
  - `show` — dispatched when tooltip is shown; `detail` contains `{ target, data, direction, position }`
  - `hide` — dispatched when tooltip is hidden

## Development

- Requirements: Node.js >= 18

Install and run locally:

```bash
git clone https://github.com/MetalbolicX/tipviz.git
cd tipviz
pnpm install       # or: npm install
pnpm run dev       # vite dev server
pnpm run build     # build docs / bundles (tsdown)
```

## Docs & Examples

Comprehensive API docs and examples are hosted at the project site:

[https://metalbolicx.github.io/tipviz](https://metalbolicx.github.io/tipviz)

## Contributing

Contributions are welcome — open issues or PRs on GitHub. Keep changes focused and include examples/tests where appropriate.

## License

MIT — see the LICENSE file.

---
Small note: the primary runtime element is `<tip-viz-tooltip>` (class `TipVizTooltip`).
