# AGENTS.md

## What this is

A tiny, dependency-free Web Component (`<tip-viz-tooltip>`) for positional tooltips. Designed for D3 visualizations and any DOM-based UI. TypeScript, no framework.

## Commands

```bash
pnpm install          # install deps
pnpm run dev          # vite dev server (index.html + examples/)
pnpm run build        # vite build (docs/examples, NOT the library)
pnpm run tsdown:build # library build — outputs dist/ (cjs, es, umd, dts)
pnpm run docs         # docsify dev server for docs/
pnpm test             # vitest — unit + characterization tests (~54 passing)
pnpm run typecheck    # tsc --noEmit
pnpm run test:cov     # vitest --coverage
pnpm run lint         # eslint src/ (currently crashes — TS 7.0 / eslint incompatibility; see Quirks)
```

Use `pnpm run tsdown:build` when you need the distributable library. `pnpm run build` builds the demo/docs page.

## Source layout

- `src/components/tooltip/tooltip.mts` — canonical component implementation
- `src/components/tooltip/types.mts` — exported types (Direction, HtmlCallback, etc.)
- `src/components/tooltip/constants.mts` — defaults (direction, offset, duration)
- `src/components/tooltip/index.mts` — component re-exports
- `src/index.mts` — library entry point (tsdown reads this); auto-registers the custom element and re-exports public types
- `src/types/sanitizer.d.ts` — type augmentation for the native DOM Sanitizer API (`Element.setHTML`)
- `src/components/tooltip/__tests__/*.test.mts` — unit and characterization tests
- `src/__tests__/integration.test.mts` — integration tests
- `examples/main.ts` — D3 scatter-plot demo, imports from `../dist/`
- `index.html` — vite dev entry that loads `examples/main.ts`

## Quirks and gotchas

- **Two build tools, two purposes:** `vite` for dev/docs, `tsdown` for the distributable library. Don't confuse them.
- **`.mts` extension matters.** tsdown config has `fixedExtension: true` and the entry is `./src/index.mts`. Library source files should use `.mts`.
- **Tests exist.** Characterization and unit tests live in `src/components/tooltip/__tests__/` and `src/__tests__/`. Run with `pnpm test`. Integration tests in `src/__tests__/`. Coverage gate: lines 90 %, branches 73 %, functions 90 %.
- **innerHTML and the sanitizer.** Modern browsers use native `element.setHTML(html, { sanitizer })`. For jsdom and older browsers the hand-rolled `#sanitizeFallback` uses `innerHTML`. The ESLint `no-restricted-properties` rule forbids `innerHTML` globally; the component uses an eslint-disable comment for the fallback path. Lint cleanup (Plan 003) is in progress.
- **pnpm run lint crashes.** TypeScript 7.0 and the current eslint-config are incompatible — `parserServices` is undefined in the type checker pass. This is a known issue tracked separately; do not attempt to fix in other plans.
- **Position assumes body.** The tooltip calculates position using `window.scrollY/scrollX`, so it expects to be appended to `document.body`.
- **Styles applied three ways:** `setStyles(css)`, `loadStylesheet(url)` attribute, or the `stylesheet` HTML attribute. Uses `CSSStyleSheet.replaceSync` with a fallback to `<style>` injection.

## Style conventions

See `.github/instructions/` for full rules. Key points:
- Double quotes, semicolons, no `var`, no `for` loops, no `.push()` (use spread), no `innerHTML`.
- kebab-case filenames, camelCase variables, PascalCase classes.
- Comment only to explain WHY, not WHAT.

## v3.0 API summary

The component exposes a typed class `TipVizTooltip` auto-registered as `<tip-viz-tooltip>`.

**Core lifecycle:**
```ts
const tip = document.querySelector("tip-viz-tooltip") as TipVizTooltip;
tip.setTemplate("<div [data-bind]=\"label\"></div>");  // template with binding placeholders
tip.setData({ label: "My Label", value: 42 });        // data to interpolate into [data-bind] slots
tip.setSanitizerConfig({ allowDataImages: true });     // optional sanitizer policy
```

**Callbacks (settable after construction):**
```ts
tip.directionCallback = (el) => "top";
tip.htmlCallback      = (data) => render(data);
tip.showCallback      = (el, dir) => { /* custom show logic */ };
tip.hideCallback      = (el) => { /* custom hide logic */ };
tip.positionCallback  = (el, dir) => ({ x: 10, y: 20 });
```

**Other state:**
```ts
tip.setStyles(".tip { color: red }");  // CSS string
tip.loadStylesheet("https://example.com/tip.css");  // or via attribute
tip.show(targetEl);   // show tooltip anchored to targetEl
tip.hide();           // hide tooltip
```

**Breaking change vs pre-v3.0:** Pre-v3.0 (commit `e063a24`) used direct property assignment for `direction`, `html`, `show`, `hide`, and `position` callbacks. v3.0 replaced these with typed setter methods (`setDirectionCallback`, `setHtmlCallback`, etc.) and added `setTemplate`/`setData` for declarative data binding. Update pre-v3.0 consumers by replacing direct assignment with the corresponding setter method.
