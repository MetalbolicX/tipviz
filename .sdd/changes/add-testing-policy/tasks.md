# Tasks: add-testing-policy

> Change: add-testing-policy
> Generated: 2026-08-13

## Implementation Tasks

### Step 1 — SDD artifacts
- [x] Create `.sdd/changes/add-testing-policy/proposal.md`
- [x] Create `.sdd/changes/add-testing-policy/spec.md`
- [x] Verify spec is consistent and complete

### Step 2 — Vitest coverage config
- [ ] Edit `vitest.config.mts` — add `coverage` block (provider `v8`, thresholds,
  include/exclude globs, keep existing jsdom/globals config)
- [ ] Run `pnpm install` if `@vitest/coverage-v8` needed
- [ ] Run `pnpm run test:cov` and record measured floor if threshold fails at 90%
- [ ] Update `spec.md` with measured floor values

### Step 3 — npm scripts
- [ ] Add to `package.json` scripts: `"lint": "eslint src/"`, `"typecheck": "tsc --noEmit"`,
  `"test:cov": "vitest run --coverage"`

### Step 4 — Sanitizer characterization tests
- [ ] Create `src/components/tooltip/__tests__/sanitizer.characterization.test.mts`
- [ ] Copy `createRect`, `mockRect`, `getTooltipBox` helpers (do not import private internals)
- [ ] Test: default config removes `<script>`, `<iframe>`, `<object>` elements
- [ ] Test: default config removes `srcdoc` and `formaction` attributes
- [ ] RED (skip): default config strips `on*` handlers — skip with `it.skip(..., "Plan 002")`
- [ ] RED (skip): default config strips `javascript:` URLs — skip with `it.skip(..., "Plan 002")`
- [ ] Run `pnpm test` — verify exit 0 with 2 skips

### Step 5 — Positioner characterization tests
- [ ] Create `src/components/tooltip/__tests__/positioner.characterization.test.mts`
- [ ] Use `createRect`, `mockRect`, `getTooltipBox` helpers (copy pattern)
- [ ] Cover all 8 directions (`n`, `s`, `e`, `w`, `nw`, `ne`, `sw`, `se`)
- [ ] Assert computed `top`/`left` for each direction
- [ ] Run `pnpm test` — verify all 8 direction cases pass

### Step 6 — CI workflow
- [ ] Create `.github/workflows/ci.yml`
- [ ] Trigger: push + pull_request
- [ ] Node 18 (per `engines.node`)
- [ ] `pnpm install` + cache `~/.local/share/pnpm/store`
- [ ] Run: `pnpm run typecheck && pnpm run lint && pnpm run test:cov`
- [ ] `continue-on-error: true` on lint step (Plan 003 will remove)
- [ ] typecheck and test:cov must block

### Step 7 — Documentation correction
- [ ] Update `AGENTS.md` — remove "No tests" claim
- [ ] Update `README.md` — remove "No tests" claim

### Step 8 — plans/README.md
- [ ] Change Plan 001 status from `TODO` to `DONE`

## Verification Gates

All must pass on the branch before declaring done:

```
pnpm install
pnpm run test:cov          # exit 0; threshold met or floor recorded
pnpm run typecheck         # exit 0
pnpm test                  # exit 0; 2 sanitizer skips expected
pnpm run lint              # script exists (failure = Plan 003, not a gate)
ls .github/workflows/ci.yml
ls src/components/tooltip/__tests__/sanitizer.characterization.test.mts
ls src/components/tooltip/__tests__/positioner.characterization.test.mts
```

## Notes

- Measured coverage floor: [TO BE FILLED AFTER FIRST test:cov RUN]
- Lint currently fails (innerHTML, .push(), etc.) — this is Plan 003's job, not a gate here.
- The 2 skipped sanitizer tests are intentional RED cases — Plan 002 unskips them.
