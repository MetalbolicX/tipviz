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
```

Use `pnpm run tsdown:build` when you need the distributable library. `pnpm run build` builds the demo/docs page.

## Source layout

- `src/components/tooltip/tooltip.mts` — the real implementation
- `src/components/tooltip/types.mts` — exported types (Direction, HtmlCallback, etc.)
- `src/components/tooltip/constants.mts` — defaults (direction, offset, duration)
- `src/index.mts` — library entry point (tsdown reads this); re-exports and auto-registers the custom element
- `src/tipviz.ts` + `src/index.ts` — **older duplicate** of the component. Not used by the build. Avoid editing; the `.mts` component files are canonical.
- `examples/main.ts` — D3 scatter-plot demo, imports from `../dist/`
- `index.html` — vite dev entry that loads `examples/main.ts`

## Quirks and gotchas

- **Two build tools, two purposes:** `vite` for dev/docs, `tsdown` for the distributable library. Don't confuse them.
- **Duplicate code:** `src/tipviz.ts` contains an older copy of `TipVizTooltip`. The canonical version is `src/components/tooltip/tooltip.mts`. Keep changes in the component directory.
- **No tests.** There are no test files, test runner config, or CI workflows. Verify changes manually via `pnpm run dev`.
- **No lint/typecheck scripts in package.json.** ESLint and TypeScript are configured but not wired to npm scripts. Run manually if needed:
  - Typecheck: `npx tsc --noEmit`
  - Lint: `npx eslint src/`
- **`.mts` extension matters.** tsdown config has `fixedExtension: true` and the entry is `./src/index.mts`. Library source files should use `.mts`.
- **innerHTML in component.** The tooltip's `show()` method uses `innerHTML` on internal shadow DOM elements (not `document.createRange().createContextualFragment()`). The older `tipviz.ts` used the fragment approach. ESLint forbids `innerHTML` globally — the component code may need a disable comment if linting it.
- **Position assumes body.** The tooltip calculates position using `window.scrollY/scrollX`, so it expects to be appended to `document.body`.
- **Styles applied three ways:** `setStyles(css)`, `loadStylesheet(url)` attribute, or the `stylesheet` HTML attribute. Uses `CSSStyleSheet.replaceSync` with a fallback to `<style>` injection.

## Style conventions

See `.github/instructions/` for full rules. Key points:
- Double quotes, semicolons, no `var`, no `for` loops, no `.push()` (use spread), no `innerHTML`.
- kebab-case filenames, camelCase variables, PascalCase classes.
- Comment only to explain WHY, not WHAT.
