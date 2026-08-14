# Proposal: add-testing-policy

## Intent

Establish a strict-TDD foundation for tipviz: define what "strict TDD" means
for `src/components/` changes, set a coverage threshold, and wire CI to enforce
the test+lint+typecheck gate on every push and PR. Also correct the documented
claim that "no tests exist" (Plan 004).

## Scope

### In Scope
- Strict TDD rule: every behavior change or bug fix in `src/components/` ships a
  failing test first (red), then the implementation (green), then any refactor.
  Pure config/docs/chore changes are exempt.
- Coverage threshold: ≥90% lines/branches/functions on `src/components/tooltip/tooltip.mts`
  via `vitest --coverage` (provider `v8`).
- CI contract: push and PR must run `pnpm run test:cov && pnpm run lint && pnpm run typecheck`.
  A failing check blocks merge.
- Contribution rule: `AGENTS.md` and `README.md` must reflect that tests exist.
- Characterization tests for sanitizer (some intentionally RED, skipped, referencing
  Plan 002) and positioner (all 8 directions, characterization-pass today).

### Out of Scope
- Fixing the sanitizer bug itself (Plan 002).
- Refactoring the god class (Plan 005).
- Making the code pass lint today (Plan 003).

## Capabilities

### New Capabilities
- `strict-tdd-policy`: Documents and enforces test-first development for `src/components/`.
- `coverage-gate`: Automated coverage threshold enforcement in CI.
- `ci-test-lint-typecheck`: Unified CI gate combining test, coverage, lint, and typecheck.

### Modified Capabilities
- None.

## Approach

1. Add `vitest.config.mts` coverage block (provider `v8`, thresholds 90/90/90,
   include `src/components/**/*.mts`, exclude `**/*.test.mts`).
2. Add npm scripts: `lint`, `typecheck`, `test:cov`.
3. Write `sanitizer.characterization.test.mts` — covers current behavior (removes
   `<script>`, `<iframe>`, `<object>`, `srcdoc`, `formaction`); RED cases for
   `on*` handlers and `javascript:` URLs are skipped with Plan 002 references.
4. Write `positioner.characterization.test.mts` — covers all 8 directions, passes today.
5. Add `.github/workflows/ci.yml` — lint job uses `continue-on-error` (Plan 003
   will remove it).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `vitest.config.mts` | Modified | Added coverage configuration |
| `package.json` | Modified | Added lint/typecheck/test:cov scripts |
| `.github/workflows/ci.yml` | New | CI gate for test+cov+lint+typecheck |
| `src/components/tooltip/__tests__/sanitizer.characterization.test.mts` | New | Sanitizer behavior characterization |
| `src/components/tooltip/__tests__/positioner.characterization.test.mts` | New | Positioner 8-direction characterization |
| `AGENTS.md` | Modified | Removes "No tests" claim |
| `README.md` | Modified | Removes "No tests" claim |
| `.sdd/changes/add-testing-policy/` | New | SDD spec artifacts |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Coverage floor too high, gate fails today | Medium | Lower to measured floor; record gap in spec |
| Lint fails today (innerHTML, .push()) | High | `continue-on-error` in CI; Plan 003 fixes |
| Characterization reveals unexpected behavior | Low | Report STOP condition; do not edit source |

## Rollback Plan

Revert the branch `advisor/001-tdd-foundation` or cherry-pick only the
configuration commits. Characterization tests are new files; no existing behavior
is changed.

## Dependencies

- None (Plan 001 has no dependencies).

## Success Criteria

- [ ] `pnpm run test:cov` exits 0; threshold passes at recorded floor
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run lint` script exists (passing is Plan 003, not a gate)
- [ ] `.github/workflows/ci.yml` runs test+cov+typecheck (lint gated per Plan 003)
- [ ] Sanitizer characterization has ≥1 skipped RED test citing Plan 002
- [ ] Positioner characterization covers all 8 directions and passes
- [ ] SDD `add-testing-policy` spec exists
- [ ] `plans/README.md` Plan 001 status row updated to DONE
