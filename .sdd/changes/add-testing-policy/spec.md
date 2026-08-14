# Spec: add-testing-policy

> Version: 1.0.0
> Change: add-testing-policy
> Status: accepted

## Strict TDD Rule

Every behavior change or bug fix targeting `src/components/` **must** follow the
red-green-refactor cycle:

1. **Red**: Write a failing test that describes the desired or fixed behavior.
   The test must fail with the current codebase.
2. **Green**: Implement the change to make the test pass. No other refactoring.
3. **Refactor** (optional): Clean up implementation _after_ the test passes.

**Exemptions**: Pure config changes, documentation updates, dependency bumps, and
build-tool changes are exempt from this rule.

## Coverage Threshold

- File in scope: `src/components/tooltip/tooltip.mts`
- Provider: `v8` (built into `@vitest/coverage-v8`, included with vitest)
- Thresholds (initial floor — raise opportunistically, never lower):
  - Lines: ≥90%
  - Branches: ≥90%
  - Functions: ≥90%
- Include glob: `src/components/**/*.mts`
- Exclude glob: `**/*.test.mts`

If `pnpm run test:cov` threshold check **fails at 90%**, lower to the _measured
floor_ reported by vitest. Record the floor in this spec. The gate passes today
and the bar rises in subsequent PRs.

## CI Contract

Every push and pull request **must** run and pass:

```
pnpm run typecheck && pnpm run lint && pnpm run test:cov
```

- `typecheck`: `tsc --noEmit` — blocks merge on failure.
- `lint`: `eslint src/` — **currently** `continue-on-error: true` because the
  codebase violates the ESLint rules (Plan 003 removes the flag).
- `test:cov`: `vitest run --coverage` — blocks merge on threshold failure.

A failing check **blocks merge**.

## Contribution Rule

`AGENTS.md` and `README.md` must accurately reflect that tests exist. The "No
tests" claim in those files must be corrected.

## Measured Coverage Floor (Step 2 baseline)

> Baseline from `pnpm run test:cov` with existing tests + coverage config added.

- Lines: 90.9% (≥90% threshold — passes)
- Branches: 73.78% (≥73% threshold — passes; 90% would fail)
- Functions: 93.54% (≥90% threshold — passes)

Branches threshold set to 73 as the floor. Raise opportunistically in later PRs.

## Sanitizer Characterization Contract (Plan 002 inputs)

These tests are **RED** (intentionally skipped) and represent the contract Plan
002 must satisfy:

| Case | Expected | Current | Plan 002 unskip |
|------|----------|---------|-----------------|
| `<script>` element | Removed | Removed | — |
| `<iframe>` element | Removed | Removed | — |
| `<object>` element | Removed | Removed | — |
| `srcdoc` attribute | Removed | Removed | — |
| `formaction` attribute | Removed | Removed | — |
| `on*` event handlers (`<img src=x onerror="...">`) | `onerror` null | NOT null | Plan 002 |
| `javascript:` URLs in `href` | Sanitized | NOT sanitized | Plan 002 |

## Positioner Characterization Contract (Plan 005 inputs)

All 8 directions must compute correct `top`/`left` given fixed target/tooltip
rects. These tests **pass today** (characterization, not bug-finding):

| Direction | Description |
|-----------|-------------|
| `n` | North (above target) |
| `s` | South (below target) |
| `e` | East (right of target) |
| `w` | West (left of target) |
| `nw` | North-west |
| `ne` | North-east |
| `sw` | South-west |
| `se` | South-east |

## References

- Plan 001: Establish strict-TDD foundation (`plans/001-tdd-foundation.md`)
- Plan 002: Fix the sanitizer (`plans/002-sanitizer-fix.md`)
- Plan 003: Make the code obey its own lint rules
- Plan 005: Decompose the god class
