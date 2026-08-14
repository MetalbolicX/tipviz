# Archive: extract-sanitizer-positioner

## Change Summary

| Field | Value |
|-------|-------|
| Change name | `extract-sanitizer-positioner` |
| SDD phase complete | 2026-08-14 |
| Branch | `advisor/005-extract-modules` (stacked on `advisor/004-agents-md-refresh`) |
| Commits | 7 (see §"Commit History" below) |
| Verification verdict | **PASS — 20/20 requirements** (see `verification.md`) |

## Implementation Output

| Category | Detail |
|----------|--------|
| New files | `sanitizer.mts`, `positioner.mts`, `sanitizer.test.mts`, `positioner.test.mts` |
| Deleted files | `sanitizer.characterization.test.mts`, `positioner.characterization.test.mts` |
| Modified files | `tooltip.mts` (404 lines, 2 `innerHTML` uses), `plans/README.md` |
| Tests | 57 passed, 0 skipped |
| Coverage | lines 94.75% / branches 82.90% / functions 93.54% (all floors cleared) |
| Typecheck | `pnpm run typecheck` exit 0 |

## Commit History

| # | SHA | Message |
|---|-----|---------|
| 1 | `2066d53` | feat(sanitizer): extract sanitizeHtml with byte-equivalent behavior |
| 2 | `8f68e87` | refactor(tooltip): delegate sanitization to sanitizeHtml; remove #sanitize |
| 3 | `6138f98` | feat(positioner): extract getCoordinates with byte-equivalent behavior |
| 4 | `4b56ee4` | refactor(tooltip): delegate positioning to getCoordinates; remove #getCoordinates |
| 5 | `2fdeff2` | docs(plans): mark extract-sanitizer-positioner complete |
| 6 | `44071bd` | docs(tooltip): fix post-extraction doc drift; clarify eslint-disable scope in sanitizer.mts |
| 7 | `9ebda0f` | sdd(extract-sanitizer-positioner): verify phase — 20/20 requirements PASS |

## Post-Apply Fixes (commit `44071bd`)

The orchestrator applied two corrections after the verify phase closed:

1. **`tooltip.mts` JSDoc drift fixed.** `setTemplate` JSDoc (lines 146–148) updated to reference `sanitizeHtml` directly instead of the removed `#sanitize` method.

2. **`sanitizer.mts` eslint-disable prose comment added.** Lines 3–11 added an honest explanation of why two narrowly-scoped `// eslint-disable-next-line no-restricted-properties` directives are present (lines 13 and 69). The comment clarifies: the module legitimately needs `DOMParser` + `doc.body.innerHTML` for parsed-Document read (not DOM injection); the project's ESLint rule forbids `innerHTML` globally to protect injection sinks; only the two targeted lines are disabled.

## Deferrals

The following items were explicitly scoped out of this change and recorded for future work:

| Item | Description | Priority |
|------|-------------|----------|
| Plan 003 | `pnpm run lint` crashes due to TS 7.0 / eslint incompatibility. The two `eslint-disable` directives in `sanitizer.mts` are intentional and scoped. Once Plan 003 lands the toolchain fix, the exception could be narrowed via ESLint overrides rather than file-level disable comments. | P2 |
| Native DOM Sanitizer adoption | `setSanitizerConfig` still accepts `RegExp` in `removeAttributes`, requiring `as unknown as SanitizerConfig` due to the ambient `SanitizerConfig.removeAttributes` type being `string[]` only. Migrating to `Element.setHTML(html, { sanitizer })` would require either dropping RegExp support or extending the type augmentation in `src/types/sanitizer.d.ts`. | Future |
| D4 — `no-auto-reposition` | `attributeChangedCallback` does not trigger reposition after initial connect. Minor correctness bug; fold into a future lifecycle-cleanup change. | LOW |
| P3 — `loadStylesheet` URL scheme allowlist | `loadStylesheet` has no URL scheme validation. Browsers block `javascript:` on stylesheet links, so real risk is tiny. Revisit if sanitizer scope expands to URL attributes generally. | LOW |

## Spec Contract (20/20 PASS — from `verification.md`)

| Module | Requirements | Status |
|--------|-------------|--------|
| `sanitizer.mts` | R1–R8 | PASS |
| `positioner.mts` | R9–R12 | PASS |
| `tooltip.mts` | R13–R20 | PASS |

Full evidence table in `verification.md` §"Spec compliance".

## Behavior Preservation

- 54 pre-existing tests pass unchanged
- 3 new sanitizer tests added (12 total in `sanitizer.test.mts`)
- 0 pre-existing tests broken
- Rollback safety: single `git revert` restores prior state

## SDD Cycle Complete

All phases executed in order: explore → propose → spec → design → tasks → apply → verify → **archive**.
