# Exploration: extract-sanitizer-positioner

## Current State

The `TipVizTooltip` class (`src/components/tooltip/tooltip.mts`, 477 lines) bundles six responsibilities that Plan 005 proposes to separate:

1. **Custom element lifecycle** — `connectedCallback`, `disconnectedCallback`, `attributeChangedCallback`
2. **Templating + data binding** — `setTemplate`, `setData`, `#cacheBoundElements`, `#applyDataToBoundElements`
3. **Sanitization** — `#sanitize` (lines 298–356)
4. **Positioning** — `#getCoordinates` (lines 459–476)
5. **A11y / ARIA** — `#ensureAccessibleHostAttributes`, `#setDescribedBy`, `#clearDescribedBy`
6. **Styles** — `setStyles`, `loadStylesheet`, `#removeInlineStyles`, `#removeStylesheetLink`, `#removeAdoptedStylesheet`

The native DOM Sanitizer type augmentation (`src/types/sanitizer.d.ts`) exists from Plan 003-native, but **`#sanitizeNative` and `#sanitizeFallback` do not yet exist in the codebase** — the rename described in the plan has not been applied. The current `#sanitize` is the hand-rolled fallback that handles both dangerous-element removal and attribute-based rules (including `RegExp` on `removeAttributes`, which the native DOM `SanitizerConfig` does not support).

---

## Extraction Boundaries

### `src/components/tooltip/sanitizer.mts` — Extracted sanitizer

**What moves:**
- `#sanitize` (lines 298–356 in `tooltip.mts`)

**Precise signature:**
```ts
// Currently: private method on TipVizTooltip
#sanitize(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const it = doc.createNodeIterator(doc.body, NodeFilter.SHOW_ELEMENT);
  let node: Element | null;
  const removeQueue: Element[] = [];
  const config = this.#sanitizerConfig;   // ← reads instance state
  const dangerousElements = new Set(config.removeElements ?? []);
  const dangerousAttrRules = config.removeAttributes ?? [];
  // ... full implementation
}
```

**State touched:** `this.#sanitizerConfig` (private field, set by `setSanitizerConfig`)

**Called from:** `setTemplate` (line 155) and `setSanitizerConfig` (line 201)

**Inputs:** `html: string` + current `SanitizerConfig` (from `this.#sanitizerConfig`)

**Output:** sanitized HTML string

**Impure:** yes — reads `this.#sanitizerConfig` per instance

**What does NOT move with it:**
- `this.#sanitizerConfig` field — stays in `TipVizTooltip`
- `setSanitizerConfig()` public method — stays (it sets `this.#sanitizerConfig`)
- The `SANITIZER_CONFIG` constant (`constants.mts`) — stays; is the default value

**Dependency to resolve:** The extracted module cannot reach `this.#sanitizerConfig` directly. Resolution options:
- Pass `SanitizerConfig` as an explicit parameter to the extracted function → cleanest, makes dependency explicit
- Wrap in a factory: `createSanitizer(config: SanitizerConfig) => { sanitize(html) }` → preserves per-instance config
- Keep sanitizer as a class method but move the file → still needs `config` passed in

### `src/components/tooltip/positioner.mts` — Extracted positioner

**What moves:**
- `#getCoordinates` (lines 459–476 in `tooltip.mts`)

**Precise signature:**
```ts
#getCoordinates(dir: Direction, target: Element): { top: number; left: number } {
  const rect = target.getBoundingClientRect();
  const tooltipRect = this.#tooltipDiv.getBoundingClientRect();  // ← reads internal DOM
  switch (dir) { /* 8-direction math */ }
}
```

**State touched:** `this.#tooltipDiv` (private field — the tooltip's own div element)

**Called from:** `show()` (line 389)

**Inputs:** `dir: Direction`, `target: Element`

**Output:** `{ top: number; left: number }`

**Impure:** yes — reads `this.#tooltipDiv.getBoundingClientRect()` (DOM measurement), but **no tooltip instance state other than the DOM element itself**

**What does NOT move with it:**
- `this.#tooltipDiv` creation or initialization — stays in `TipVizTooltip` constructor
- The `show()` method that calls `#getCoordinates` — stays in `TipVizTooltip`
- `Direction` type (`types.mts`) — stays; imported by both

**Key finding:** The positioner is **nearly pure**. The only impurity is `this.#tooltipDiv.getBoundingClientRect()` — it reads the tooltip's own DOM size. This means the positioner **cannot be a standalone pure function** without passing the tooltip element or its rect as a parameter. Options:
- Pass `tooltipEl: HTMLDivElement` as a parameter → the caller (`show()`) passes `this.#tooltipDiv`
- Pass `(target: Element, tooltipEl: HTMLDivElement)` → both rects come from caller
- Keep as a method on `TipVizTooltip` but in a separate file → still needs `this.#tooltipDiv` access

### Stays in `TipVizTooltip`

Everything else: custom element lifecycle, templating, data binding, a11y, styles, all lifecycle methods, `show()`/`hide()`, `setSanitizerConfig()`, all private state fields.

---

## Public API Surfaces That Must NOT Change

These are the contracts the refactor must preserve byte-for-byte:

**Class:** `TipVizTooltip extends HTMLElement`

**Public methods:**
- `static get observedAttributes(): string[]`
- `loadStylesheet(url: string): void`
- `setTemplate(htmlString: string): void`
- `setData(data: Record<string, string | number>): void`
- `setSanitizerConfig(config: SanitizerConfig): void`
- `setDirection<TData extends TooltipData>(fn: DirectionFn<TData>): void`
- `setOffset<TData extends TooltipData>(fn: OffsetCallback<TData>): void`
- `setStyles(css: string): void`
- `show(target: Element): void`
- `hide(): void`

**Public events (detail payload must be unchanged):**
- `show` → `{ target: Element, data: Record<string, string | number>, direction: Direction, position: { top: number, left: number } }`
- `hide` → `Event`

**HTML attributes:**
- `transition-duration` (string)
- `stylesheet` (string URL)
- `no-auto-reposition` (boolean flag)

**Shadow DOM structure (must not change):
- `div.tipviz-tooltip[part=tooltip-box][role=tooltip][aria-hidden]` — the tooltip box
- `link[data-tipviz-link]` — stylesheet link
- `style[data-tipviz]` — inline fallback style (when adoptedStyleSheets unavailable)

**Exported types** (`types.mts`): `Direction`, `Offset`, `TooltipData`, `OffsetCallback`, `DirectionFn` — unchanged.

---

## Behavior-Preserving Confirmation

**Yes — this refactor is behavior-preserving if:**

1. The extracted `sanitizer.mts` produces identical HTML output for all inputs (no change to the sanitization logic itself)
2. The extracted `positioner.mts` produces identical `{ top, left }` coordinates for all 8 directions with the same inputs
3. The public API of `TipVizTooltip` is unchanged — same methods, same signatures, same event detail shape
4. The shadow DOM structure is unchanged
5. All 54+ existing tests continue to pass

**Evidence that behavior is preserved:**
- Sanitizer characterization tests (`sanitizer.characterization.test.mts`) — 10 cases covering element removal, attribute stripping, `on*` handlers, `javascript:` URLs — all pass today and must pass after extraction
- Positioner characterization tests (`positioner.characterization.test.mts`) — 8 direction cases, all pass today and must pass after extraction
- Unit tests (`tooltip.test.mts`) — 24 cases covering API, events, data binding, styles — all pass today and must pass after extraction
- The refactor moves code only; no logic changes

---

## Risks and Complications

### 1. Sanitizer config coupling (HIGH complexity)
The `#sanitize` method reads `this.#sanitizerConfig`. This is instance state. The sanitizer cannot be a simple pure function without passing the config. Recommended pattern: factory function or class method that receives `SanitizerConfig` as a parameter. The `setSanitizerConfig()` method stays in `TipVizTooltip` and would pass the config to the sanitizer module.

### 2. jsdom / native Sanitizer boundary (MEDIUM)
`src/types/sanitizer.d.ts` adds the `Sanitizer` / `setHTML` type augmentation for environments that lack it (jsdom). The native path (`#sanitizeNative`) does not exist in code yet — Plan 003-native described it but the rename `#sanitize` → `#sanitizeFallback` + `#sanitizeNative` has not been applied. The extraction should plan for both paths (native vs. fallback) even though only the fallback currently exists. The `as unknown as SanitizerConfig` cast in `constants.mts` handles RegExp support that native config doesn't have — this cast lives in `constants.mts` and moves with nothing.

### 3. Positioner impure DOM read (MEDIUM)
`#getCoordinates` calls `this.#tooltipDiv.getBoundingClientRect()`. The positioner is not a pure function — it reads DOM state. It cannot be extracted as a standalone pure function without the caller passing the tooltip element or its measured rect. This is a design constraint the `sdd-design` phase must address: pass `tooltipEl: HTMLDivElement` as a parameter from `show()`.

### 4. The `show` event `position` field
The `show` event detail includes `{ position: coordinates }` where `coordinates` is the raw output of `#getCoordinates`. This contract must be preserved — the positioner's output shape is part of the public event API.

### 5. No `plans/005-extract-sanitizer-positioner.md` file exists
The plan described in the context does not yet have a file at `plans/005-extract-sanitizer-positioner.md`. The `plans/README.md` references Plan 005 but the actual plan document does not exist. The `sdd-propose` phase will need to create it or work from this exploration.

### 6. `Direction` type import
Both modules need `Direction` from `types.mts`. After extraction, `positioner.mts` will import from `../types.mjs` and `tooltip.mts` will import from `./types.mjs` — both import from the same types file, which stays in place.

---

## SDD Artifact Location Confirmation

**Confirmed:** This repo stores SDD artifacts at `.sdd/changes/<change-name>/` (not `openspec/changes/`).

Reference layout from `add-testing-policy`:
```
.sdd/changes/add-testing-policy/
  proposal.md   ← scope, approach, risks
  spec.md       ← requirements, contracts
  tasks.md      ← implementation checklist
```

For `extract-sanitizer-positioner`, the expected artifact layout:
```
.sdd/changes/extract-sanitizer-positioner/
  exploration.md   ← this document
  proposal.md     ← (sdd-propose phase)
  spec.md         ← (sdd-spec phase)
  design.md       ← (sdd-design phase)
  tasks.md        ← (sdd-tasks phase)
```

---

## Summary of Extraction Units

| Module | Methods | State read | Difficulty |
|--------|---------|------------|------------|
| `sanitizer.mts` | `#sanitize` (→ extracted fn or class) | `SanitizerConfig` (passed in) | Medium — needs config injection |
| `positioner.mts` | `#getCoordinates` | `tooltipEl.getBoundingClientRect()` (passed in) | Medium — needs DOM element param |
| `tooltip.mts` (remnant) | Everything else | All original private state | Low — no logic changes |
