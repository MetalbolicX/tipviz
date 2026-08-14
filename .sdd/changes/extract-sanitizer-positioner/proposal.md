# Proposal: extract-sanitizer-positioner

## Intent

`TipVizTooltip` (`src/components/tooltip/tooltip.mts`, 477 lines) is the repo's god class: six responsibilities, sanitizer and positioner logic untestable in isolation, every change risks collateral damage. Extract sanitization and positioning into standalone stateless modules so each is directly unit-testable, the class shrinks toward lifecycle + templating concerns, and future work (native Sanitizer adoption, lint cleanup) lands on smaller targets. Pure structural refactor — zero behavior change.

## Scope

### In Scope
- `sanitizer.mts` — `#sanitize` (lines 298–356) → pure fn `sanitizeHtml(html: string, config: SanitizerConfig): string`.
- `positioner.mts` — `#getCoordinates` (lines 459–476) → pure fn `getCoordinates(dir: Direction, targetRect: DOMRect, tooltipRect: DOMRect): Coordinates`.
- `tooltip.mts` rewires call sites (`setTemplate`, `setSanitizerConfig`, `show`); keeps `#sanitizerConfig` field, `setSanitizerConfig()`, `#tooltipDiv`.
- Test moves: `sanitizer.characterization.test.mts` → `sanitizer.test.mts`; `positioner.characterization.test.mts` → `positioner.test.mts`; invocations re-pointed to direct fn calls, assertions unchanged. `tooltip.test.mts` + integration tests untouched.

### Out of Scope
- Extracting templating, data binding, a11y, styles (stay in `tooltip.mts`).
- Adopting native DOM Sanitizer / `setHTML` — separate future plan; `src/types/sanitizer.d.ts` stays as-is.
- Any behavior change, public API change, `constants.mts` change, `src/index.mts` re-export additions.

## Capabilities

### New Capabilities
- `tooltip-sanitizer`: standalone HTML sanitization (element removal, attribute rules incl. `RegExp`, URL-scheme blocking) as a pure function.
- `tooltip-positioner`: 8-direction coordinate math (rects in, `{ top, left }` out) as a pure function.

### Modified Capabilities
- `tooltip-component`: internal composition only (delegates to extracted modules); every externally observable requirement unchanged.

## Approach

**Sanitizer — parameter-passing, not factory.** Config is read fresh per call today; `setSanitizerConfig` mutates the field then re-applies the template. A factory adds a rebuild-on-swap invariant (stale-closure bug vector); an explicit `config` param keeps the module stateless. Both call sites already hold `this`.

**Positioner — rects in, coords out.** `show()` reads `target.getBoundingClientRect()` and `#tooltipDiv.getBoundingClientRect()` — preserving the deliberate synchronous-reflow read, in the original sequence — then calls `getCoordinates(dir, targetRect, tooltipRect)`. No `HTMLElement` in either module's public API; `DOMRect` is plain data, so direction tests need no DOM measurement.

- New files use `.mts` + `.mjs` import specifiers (tsdown `fixedExtension`).
- Module exports are internal — library entry `src/index.mts` untouched.
- `show` event detail passes positioner output verbatim; `{ top, left }` shape unchanged.
- Design note: `doc.body.innerHTML` read moves into `sanitizer.mts`; carry whatever ESLint `no-restricted-properties` strategy lands with the lint plan into the new file.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/tooltip/sanitizer.mts` | New | `sanitizeHtml(html, config)` |
| `src/components/tooltip/positioner.mts` | New | `getCoordinates(dir, targetRect, tooltipRect)` + `Coordinates` type |
| `src/components/tooltip/tooltip.mts` | Modified | Two methods removed, call sites rewired (~120 lines lighter) |
| `src/components/tooltip/__tests__/` | Modified | Characterization tests moved/renamed/re-pointed |
| `.sdd/changes/extract-sanitizer-positioner/` | New | This artifact set |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Public API drift (methods, events, attributes, Shadow DOM) | Low | Untouched `tooltip.test.mts` + integration tests stay green |
| `show` event `position` field changes | Low | Detail passes positioner output verbatim; characterization asserts values |
| jsdom fallback path breaks (no native Sanitizer) | Low | Logic moves byte-equivalent; no native-path assumptions |
| Coverage drops below 90/73/90 floors | Low | Moved tests cover extracted fns; CI `test:cov` gate |
| Reflow-forcing rect read lost or reordered | Medium | `show()` reads tooltip rect at original sequence point; WHY comment |
| Stale factory on config swap | Eliminated | Param-passing by design |

## Rollback Plan

Single `git revert`: `sanitizer.mts`/`positioner.mts` and their tests are new files; `tooltip.mts` and moved tests restore from parent. No config, data, or API migrations to undo.

## Dependencies

- None new. Prerequisite: 54/54 tests green on `advisor/004-agents-md-refresh`.

## Success Criteria

- [ ] `tooltip.mts` shorter by sanitizer + positioner (~120 lines)
- [ ] All 54 tests pass, 0 skipped
- [ ] Coverage ≥ floors: lines 90, branches 73, functions 90
- [ ] `TipVizTooltip` public API unchanged (methods, signatures, attributes)
- [ ] `show` payload `{ target, data, direction, position }` unchanged
- [ ] Shadow DOM structure unchanged
- [ ] `pnpm run typecheck` exits 0
