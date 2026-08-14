# Spec: extract-sanitizer-positioner

Baseline: `src/components/tooltip/tooltip.mts` @ 477 lines; 54 tests passing, 0 skipped; coverage floors met. Pure structural refactor — zero behavior change.

## Scope

| Boundary | Items |
|---|---|
| IN | New `sanitizer.mts` + `positioner.mts`; `tooltip.mts` delegates to them; 2 characterization test files become direct-call test files; `plans/README.md` index points to `.sdd/changes/extract-sanitizer-positioner/` |
| OUT | Templating, data binding, a11y, styles; native Sanitizer adoption; public API changes; new dependencies; `constants.mts` / `src/index.mts` changes; re-creating `plans/005-extract-sanitizer-positioner.md` |

## Capability: tooltip-sanitizer (NEW)

### Requirement: Pure `sanitizeHtml` API

The module MUST export exactly:

```ts
export function sanitizeHtml(html: string, config: SanitizerConfig): string;
export { SANITIZER_CONFIG }; // re-exported from ./constants.mjs for convenience
```

MUST NOT reference `HTMLElement` or `this`; MUST NOT hold module-level mutable state. `SanitizerConfig` is the ambient DOM augmentation type (`src/types/sanitizer.d.ts`, untouched). Size: ~50 lines.

#### Scenario: direct invocation
- GIVEN any HTML string and a `SanitizerConfig`
- WHEN `sanitizeHtml(html, config)` is called
- THEN a sanitized HTML string is returned — no `TipVizTooltip` instance involved

### Requirement: Byte-equivalent sanitization behavior

For identical `(html, config)` inputs, output MUST be byte-equivalent to current `#sanitize` (`tooltip.mts:298–356`): parse with `DOMParser` (`"text/html"`); walk `doc.body` elements via `NodeIterator` + `NodeFilter.SHOW_ELEMENT`; queue elements whose lowercased `tagName` is in `new Set(config.removeElements ?? [])` and remove after the walk; remove an attribute when any rule in `config.removeAttributes ?? []` matches (string equality OR `rule instanceof RegExp && rule.test(name)`); independently remove URL attributes (`href, src, xlink:href, action, formaction, background, poster`) whose trimmed, lowercased value starts with `javascript:`, `vbscript:`, or `data:` (unless `data:image/`); return `doc.body.innerHTML`.

#### Scenario: element removal
- GIVEN default config and `<div><script>alert(1)</script><span>safe</span></div>`
- WHEN sanitized THEN no `script` element remains; `<span>safe</span>` survives

#### Scenario: RegExp attribute rule
- GIVEN default config and `<img src='x' onerror='alert(1)' alt='x'>`
- WHEN sanitized THEN `onerror` absent; `src` and `alt` survive

#### Scenario: URL scheme policy
- GIVEN default config and an element carrying a URL attribute
- WHEN value starts `javascript:` or `vbscript:` or bare `data:` THEN attribute removed
- WHEN value starts `data:image/` THEN attribute kept

#### Scenario: defense-in-depth custom config
- GIVEN a config that keeps `iframe` and sets `removeAttributes: ["srcdoc", "formaction"]`
- WHEN sanitizing `<iframe srcdoc='<h1>x</h1>' width='200'></iframe>`
- THEN the `iframe` survives and `srcdoc` is removed

## Capability: tooltip-positioner (NEW)

### Requirement: Pure `getCoordinates` API

The module MUST export exactly:

```ts
export function getCoordinates(
  dir: Direction, targetRect: DOMRect, tooltipRect: DOMRect,
): { top: number; left: number };
```

MUST NOT reference `HTMLElement` or `this`. Imports `Direction` from `./types.mjs`. MAY export a `Coordinates` type alias; nothing re-exported from `src/index.mts`. Size: ~25 lines.

### Requirement: Direction math mirrors `tooltip.mts:459–476`

With `t = targetRect`, `w = tooltipRect.width`, `h = tooltipRect.height`:

| dir | top | left |
|---|---|---|
| n (and default) | `t.top − h` | `t.left + t.width/2 − w/2` |
| s | `t.bottom` | `t.left + t.width/2 − w/2` |
| e | `t.top + t.height/2 − h/2` | `t.right` |
| w | `t.top + t.height/2 − h/2` | `t.left − w` |
| nw | `t.top − h` | `t.left − w` |
| ne | `t.top − h` | `t.right` |
| sw | `t.bottom` | `t.left − w` |
| se | `t.bottom` | `t.right` |

Unknown `dir` values MUST return the `n` result (preserves the current `default:` arm).

#### Scenario: pinned vectors
- GIVEN target `{top:100,left:50,width:80,height:40}`, tooltip `{width:20,height:10}`
- WHEN `getCoordinates` runs per direction
- THEN exactly: n(90,80) s(140,80) e(115,130) w(115,30) nw(90,30) ne(90,130) sw(140,30) se(140,130)

## Capability: tooltip-component (MODIFIED)

### Requirement: Delegation replaces inline implementations

(Previously: `#sanitize` and `#getCoordinates` contained the full logic.)

`tooltip.mts` MUST:
- Reduce `#sanitize(html)` to `return sanitizeHtml(html, this.#sanitizerConfig)`. Call sites `setTemplate` (L155) and `setSanitizerConfig` (L201) unchanged; the `#sanitizerConfig` field and `setSanitizerConfig` ownership stay on the class.
- Reduce `#getCoordinates(dir, target)` to: read `target.getBoundingClientRect()`, then `this.#tooltipDiv.getBoundingClientRect()` — the deliberate reflow-forcing read stays at its original sequence point with its WHY comment (L462) — then `return getCoordinates(dir, targetRect, tooltipRect)`.
- Add imports: `sanitizeHtml` from `./sanitizer.mjs`, `getCoordinates` from `./positioner.mjs`.
- Keep every private method name, public method signature, event, attribute, and shadow-DOM node unchanged.

#### Scenario: show path preserved
- GIVEN template + data set and a connected target
- WHEN `show(target)`
- THEN `show` detail `{ target, data, direction, position }` carries raw positioner output — `{ top, left }` without scroll/offset, which are added only to style values — identical to pre-refactor

## Test Contract

Pinned: 54 tests passing, 0 skipped, before and after; zero existing cases dropped.

| File | Contract |
|---|---|
| `sanitizer.characterization.test.mts` — **9 cases** (resolved; exploration's "10" was a miscount) | Replaced by `sanitizer.test.mts`: direct `sanitizeHtml` calls, 1:1 case mapping, assertions re-targeted to the `DOMParser`-parsed returned string with identical semantics; original file deleted |
| `positioner.characterization.test.mts` — 8 cases | Replaced by `positioner.test.mts`: direct `getCoordinates` calls with literal rect objects asserting the pinned vectors; no DOM, custom elements, or mocks; original file deleted |
| `tooltip.test.mts`, `integration.test.mts` | Untouched; stay green (integration covers the full DOM path) |
| New sanitizer cases — SHOULD | `data:image/` kept, bare `data:` removed, `vbscript:` removed (currently untested; cheap as direct calls) |
| Coverage | Floors per `vitest.config.mts`: lines ≥90%, branches ≥73%, functions ≥90% |

## Behavior-Preservation Gates

1. `TipVizTooltip` public API byte-identical: `observedAttributes`, `loadStylesheet`, `setTemplate`, `setData`, `setSanitizerConfig`, `setDirection`, `setOffset`, `setStyles`, `show`, `hide`.
2. Attributes `transition-duration`, `stylesheet`, `no-auto-reposition`; `show`/`hide` events; shadow DOM (`div.tipviz-tooltip[part=tooltip-box][role=tooltip][aria-hidden]`, `link[data-tipviz-link]`, `style[data-tipviz]`) — all unchanged.
3. All 9 sanitizer behaviors and all 8 direction outputs match the current implementation for identical inputs.
4. `pnpm run typecheck` exits 0.

## Non-Functional Requirements

- `tooltip.mts`: net 30–40 lines removed (gross −77 = L298–356 + L459–476; delegate bodies and imports add back the difference). Supersedes proposal's "~120 lines lighter".
- New modules small: sanitizer ~50 lines, positioner ~25 lines.
- `.mts` files with `.mjs` import specifiers (tsdown `fixedExtension`); no new dependencies; no new `src/index.mts` exports — consuming code unchanged.
- The `doc.body.innerHTML` return moves into `sanitizer.mts` carrying the repo's `no-restricted-properties` handling; final lint strategy is owned by the lint plan.
- `plans/README.md` updated to reference `.sdd/changes/extract-sanitizer-positioner/`; `plans/005-extract-sanitizer-positioner.md` NOT created (SDD folder is canonical).
