# tipviz

Framework-agnostic tooltip Web Component for data-visualization UIs.

## Features

- Lightweight, framework-agnostic Web Component written in TypeScript.
- Pluggable HTML content via `setHtml()` for rich tooltip markup.
- Customizable styles via `setStyles()` or `stylesheet` attribute.
- Multiple placement directions (`n`, `s`, `e`, `w`, `nw`, `ne`, `sw`, `se`).
- Fine-grained position offsets via `setOffset()`.
- Small, zero-runtime-dependency implementation intended for D3.js and vanilla apps.

## Prerequisites

- Node.js >= 18 (for development/build)
- Optional: `pnpm` if you prefer the workspace default lockfile, otherwise `npm` is supported

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/MetalbolicX/tipviz.git
cd tipviz
pnpm install # or: npm install
```

Development and build commands (from `package.json`):

```bash
pnpm run dev    # start dev server (vite)
pnpm run build  # generate docs/build using tsdown
```

## Usage

You can import the component from the built bundle or register and use it directly in the browser during development.

Minimal example (module):

```html
<script type="module">
  import { TipVizTooltip } from './dist/index.mjs';

  const tooltip = new TipVizTooltip();
  document.body.appendChild(tooltip);

  tooltip.setHtml(data => `<div class="tooltip-content">${data.label}</div>`);

  // show the tooltip next to an element
  const el = document.getElementById('point');
  tooltip.show({ label: 'Value: 42' }, el);

  // hide
  // tooltip.hide();
</script>
```

Or use the lazy helper exported from the components index to define the element when needed:

```ts
import { defineTooltip } from './src/components/tooltip/index.mts';
await defineTooltip(); // safely defines <tip-viz-tooltip>
```

## API (key methods & attributes)

- `setHtml(fn: HtmlCallback)` — provide HTML string for tooltip content
- `setStyles(css: string)` — apply scoped CSS (uses adoptedStyleSheets when available)
- `setDirection(fn: DirectionFn)` — provide placement logic returning one of `n|s|e|w|nw|ne|sw|se`
- `setOffset(fn: OffsetCallback)` — return `[x, y]` offsets in pixels
- `show(data: Record<string, unknown>, target: Element)` — render and position the tooltip
- `hide()` — hide the tooltip

Attributes observed by the element:

- `transition-duration` — animation duration in milliseconds
- `stylesheet` — URL to a CSS stylesheet to load inside the shadow root

Events:

- `show` — fired when tooltip is shown (detail includes `{ target, data, direction, position }`)
- `hide` — fired when tooltip is hidden

## Examples & Docs

Full API and examples are available in the documentation site:

[View documentation](https://metalbolicx.github.io/tipviz/#/api-reference)

## Contributing

Contributions welcome — please open issues or PRs on GitHub. Follow standard pull request workflow and keep changes small and focused.

## License

Released under the [MIT](LICENSE) license.

--
Tip: the component is designed to be embedded in D3 visualizations or any DOM-based UI where positional tooltips are required.
