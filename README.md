# tipviz

> Drop-in tooltip web component for data visualizations. Zero dependencies, works anywhere.

Add rich, interactive tooltips to D3 charts or any DOM element with a few lines of code. The `<tip-viz-tooltip>` custom element handles positioning, HTML content, and styling — no framework required.

## Features

- **Framework-agnostic** — vanilla JS, React, Vue, Svelte, D3… if it renders HTML, tooltips work
- **Shadow DOM encapsulation** — styles don't leak in or out
- **Auto-positioning** — moves itself to `document.body` for correct scroll-aware placement
- **Three styling modes** — `setStyles()`, `stylesheet` attribute, or CSS `::part()`
- **Template + data binding** — `setTemplate()` + `setData()` for O(1) DOM updates
- **8 directional placements** — `n`, `s`, `e`, `w`, `nw`, `ne`, `sw`, `se`
- **Typed API** — full TypeScript types included

## Installation

**CDN (ESM)** — add one script tag and go:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/tipviz@latest/dist/index.mjs"></script>
```

**CDN (UMD)** — no ES modules support:

```html
<script src="https://cdn.jsdelivr.net/npm/tipviz@latest/dist/index.umd.js"></script>
```

**npm / pnpm / yarn / bun**:

```bash
npm i tipviz
# pnpm add tipviz / yarn add tipviz / bun add tipviz
```

---

## Quick Usage

```js
// 1. Place in HTML (anywhere — it auto-moves to body)
<tip-viz-tooltip id="tooltip"></tip-viz-tooltip>

// 2. Configure
const tooltip = document.getElementById("tooltip");
tooltip.setTemplate(`<div data-bind="label"></div>`);
tooltip.setDirection(() => "n");          // n | s | e | w | nw | ne | sw | se
tooltip.setOffset(() => [0, 8]);        // [x, y] — x→left, y→top
tooltip.setStyles(`
  .tipviz-tooltip { background: rgba(0,0,0,0.85); color: white; padding: 6px; border-radius: 4px; }
`);

// 3. Show / hide on interaction
element.addEventListener("mouseenter", (e) => {
  tooltip.setData({ label: "Hello World" });
  tooltip.show(e.currentTarget);
});
element.addEventListener("mouseleave", () => tooltip.hide());
```

---

## API Reference

### Methods

| Method | Description |
|--------|-------------|
| `setTemplate(html)` | Sets the HTML template with `[data-bind]` binding attributes |
| `setData(data)` | Updates bound elements with matching `data-bind` keys |
| `setDirection(fn)` | Sets the placement direction callback `(data, target) => Direction` |
| `setOffset(fn)` | Sets the pixel offset callback `(data, target) => [x, y]` |
| `setStyles(css)` | Injects CSS via `CSSStyleSheet` with `<style>` fallback |
| `loadStylesheet(url)` | Loads an external stylesheet into the shadow root |
| `setSanitizerConfig(config)` | Overrides the default sanitization config |
| `show(target)` | Positions and reveals the tooltip |
| `hide()` | Hides the tooltip |

### Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `transition-duration` | `200` | Fade duration in milliseconds |
| `stylesheet` | — | URL to load inside the shadow root |
| `no-auto-reposition` | — | Opt out of auto-moving to `document.body` |

### Events

```js
tooltip.addEventListener("show", (e) => {
  console.log(e.detail.target, e.detail.data, e.detail.direction, e.detail.position);
});
tooltip.addEventListener("hide", () => { /* ... */ });
```

---

## Styling

Three independent options:

```js
// 1. CSS string injected into shadow root
tooltip.setStyles(`.tipviz-tooltip { background: black; color: white; }`);

// 2. External stylesheet loaded into shadow root
// <tip-viz-tooltip stylesheet="/tooltip.css"></tip-viz-tooltip>

// 3. CSS ::part() from outside the shadow DOM
// tip-viz-tooltip::part(tooltip-box) { background: black; color: white; }
```

---

## Documentation

- [Quick Reference](https://metalbolicx.github.io/tipviz/#/llm-doc) — compact API cheat sheet
- [Getting Started](https://metalbolicx.github.io/tipviz/#/getting-started) — step-by-step setup
- [API Reference](https://metalbolicx.github.io/tipviz/#/api-reference) — full API documentation
- [Tutorials](https://metalbolicx.github.io/tipviz/#/tutorials) — D3 integration examples

---

## Development

**Requirements:** Node.js >= 18

```bash
git clone https://github.com/MetalbolicX/tipviz.git
cd tipviz
pnpm install

pnpm run dev           # vite dev server (demo + examples)
pnpm run build         # vite build (docs / demo)
pnpm run tsdown:build  # library build → dist/ (cjs, es, umd, dts)
pnpm run test          # unit + integration tests
pnpm run test:watch    # watch mode
pnpm run validate      # lint + typecheck + tests (reusable validation)
```

Typecheck and lint (also available as `pnpm run validate`):

```bash
npx tsc --noEmit
npx eslint src/
```

### Release & publish workflow

**Dry-run (local, no registry contact):**

```bash
pnpm run tsdown:build
pnpm run validate
pnpm run publish:dry-run
```

**Real publish (requires npm OTP + registry credentials):**

```bash
pnpm run tsdown:build   # triggered automatically by prepack
pnpm run validate        # triggered automatically by prepublishOnly
npm publish             # or: pnpm publish
```

> `prepublishOnly` and `prepack` run automatically on `npm publish`/`pnpm pack` so validation and the library build are guaranteed. Use `publish:dry-run` to inspect exactly what would be published before touching any registry.

---

## License

MIT — see the [LICENSE](LICENSE) file.
