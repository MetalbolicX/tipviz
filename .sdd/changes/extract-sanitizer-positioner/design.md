# Design: Extract Sanitizer and Positioner

## Technical Approach

Extract the two state-independent algorithms from `TipVizTooltip` into small `.mts` modules. `tooltip.mts` remains responsible for instance state, DOM ownership, lifecycle, offsets, scrolling, and event dispatch. The sanitizer receives its configuration explicitly; `show()` measures both rectangles and passes plain data to the positioner. This preserves behavior while making both algorithms directly unit-testable. `.sdd/changes/extract-sanitizer-positioner/` is canonical; no `plans/005-extract-sanitizer-positioner.md` is created.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Sanitizer state | `sanitizeHtml(html, config)` | Factory or retained private method | Explicit per-call config is stateless and cannot become stale after `setSanitizerConfig()` mutates instance state. |
| Positioner boundary | `getCoordinates(dir, targetRect, tooltipRect)` | Passing elements or retaining DOM reads in the module | Rects are the only required data; the module stays free of `HTMLElement` and `this`. |
| Tooltip integration | Inline/direct call sites; remove both private methods | Thin wrappers | Wrappers add no value once state and measurements are supplied by the caller. |
| Test migration | Direct-call unit files | More DOM characterization around the class | Tests isolate each contract while untouched tooltip/integration tests protect composition and public behavior. |

## Data Flow

```text
setTemplate / setSanitizerConfig
    └─ html + current config ─→ sanitizeHtml ─→ tooltipDiv.innerHTML

show(target)
    ├─ target.getBoundingClientRect()
    ├─ tooltipDiv.getBoundingClientRect()  [same sequence point]
    └─ dir + rects ─→ getCoordinates ─→ style position + show event detail
```

Offsets and `window.scrollX/Y` remain in `tooltip.mts`; the show event receives the raw `{ top, left }` result.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/components/tooltip/sanitizer.mts` | Create | Byte-equivalent pure sanitizer and `SANITIZER_CONFIG` re-export. |
| `src/components/tooltip/positioner.mts` | Create | Pure eight-direction coordinate calculation. |
| `src/components/tooltip/__tests__/sanitizer.test.mts` | Create | Twelve direct-call cases: nine moved cases plus `data:image/`, bare `data:`, and `vbscript:` coverage. |
| `src/components/tooltip/__tests__/positioner.test.mts` | Create | Eight direct-call direction-vector cases using literal rect data. |
| `src/components/tooltip/tooltip.mts` | Modify | Add module imports, inline sanitizer calls, measure rects in `show()`, and remove `#sanitize`/`#getCoordinates`. |
| `src/components/tooltip/__tests__/sanitizer.characterization.test.mts` | Delete | Replaced by `sanitizer.test.mts`; must not remain empty or duplicate tests. |
| `src/components/tooltip/__tests__/positioner.characterization.test.mts` | Delete | Replaced by `positioner.test.mts`; must not remain empty or duplicate tests. |
| `plans/README.md` | Modify | Add the canonical SDD reference for Plan 005; do not recreate the plan file. |

## Interfaces / Contracts

```ts
// sanitizer.mts
export function sanitizeHtml(html: string, config: SanitizerConfig): string;
export { SANITIZER_CONFIG } from "./constants.mjs";

// positioner.mts
export function getCoordinates(dir: Direction, targetRect: DOMRect, tooltipRect: DOMRect): { top: number; left: number };
```

`sanitizer.mts` must not reference `HTMLElement`, `this`, or mutable module state. It copies the current `#sanitize` body without improvements. `positioner.mts` imports `Direction` from `./types.mjs` and mirrors the existing switch, including the default north result. `tooltip.mts` uses `sanitizeHtml(htmlString, this.#sanitizerConfig)` at both existing template application points. In `show()`, the target rect read precedes the tooltip rect read and the existing synchronous-layout comment remains at that sequence point before `getCoordinates(dir, targetRect, tooltipRect)`.

## Testing Strategy and TDD Order

Cycle 1 is sanitizer-first: (1) create the signature-only placeholder and direct-call tests (RED); (2) copy the sanitizer implementation (GREEN); (3) rewire `tooltip.mts`, delete the old characterization file, and run the full gates (REFACTOR). Cycle 2 repeats the same RED/GREEN/REFACTOR sequence for positioner, then removes its old characterization file. `tooltip.test.mts` and `integration.test.mts` remain untouched. Final expected count is 54 existing tests plus 3 new sanitizer cases, with zero skipped.

Apply on `advisor/005-extract-modules`, stacked on `advisor/004-agents-md-refresh`. Each cycle gets three commits: test-red, implementation-green, and refactor-and-remove. Finish with `docs(plans): mark extract-sanitizer-positioner done`; do not push or open a PR.

Each cycle and the final state require `pnpm test` (54+ passing, zero skipped), `pnpm run typecheck`, and `pnpm run test:cov` meeting lines 90%, branches 73%, and functions 90%. Confirm `tooltip.mts` has only delegation/removed code, and `grep -c "innerHTML" src/components/tooltip/tooltip.mts` returns `2` (down from `3`).

## Size and Coverage Impact

The new modules add approximately 50 sanitizer lines and 25 positioner lines while the two private implementations remove 77 lines from `tooltip.mts`; imports and call-site wiring are expected to leave the spec-pinned net reduction of roughly 30–40 lines. Direct tests retain all moved coverage and add three sanitizer cases, so coverage should remain above the existing floors.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary is being changed.

## Migration / Rollout

No migration required. This is an internal, behavior-preserving module extraction.

## Risk Register

- Copy sanitizer and positioner logic byte-equivalently; do not improve while extracting.
- Preserve the tooltip rect read and its ordering, including the reflow comment.
- Use `.mjs` import specifiers from `.mts`, especially `./constants.mjs`.
- Delete, rather than empty, both old characterization files.

## Open Questions

None; architectural and test-count decisions are resolved by the spec.
