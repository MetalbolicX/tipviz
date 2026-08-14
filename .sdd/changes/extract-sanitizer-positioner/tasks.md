# Tasks: Extract Sanitizer and Positioner

## Review Workload Forecast

Estimated changed lines: 350–420; Delivery strategy: single-pr.

Decision needed before apply: No  
Chained PRs recommended: No  
Chain strategy: pending  
400-line budget risk: Medium

Suggested work units: sanitizer — `pnpm test src/components/tooltip/__tests__/sanitizer.test.mts`; runtime N/A; rollback sanitizer files/delegation. Positioner — `pnpm test src/components/tooltip/__tests__/positioner.test.mts`; runtime N/A; rollback positioner files/delegation. Docs/final — full gates; runtime N/A; rollback README row.

## Phase 0: Setup

- [ ] **0.1** (Prereq: green `advisor/004-agents-md-refresh`) Create `advisor/005-extract-modules`; make no code changes. Verify: `git branch --show-current` plus `git merge-base HEAD advisor/004-agents-md-refresh` confirms the branch and base.

## Phase 1: Sanitizer TDD Cycle

- [ ] **1.1 RED** (Prereq: 0.1) Create `src/components/tooltip/__tests__/sanitizer.test.mts`; call `sanitizeHtml(html, config)` directly. Names: `removes script elements`; `removes iframe elements`; `removes object elements`; `removes iframe element entirely (srcdoc attribute is moot — parent gone)`; `removes button element entirely (formaction attribute is moot — parent gone)`; `strips srcdoc from iframe when iframe is NOT in removeElements`; `strips formaction from button when button is NOT in removeElements`; `strips on* event-handler attributes by default`; `strips javascript: URLs from href by default`. Add `data:image/` kept, bare `data:` removed, and `vbscript:` removed. Verify: `pnpm test src/components/tooltip/__tests__/sanitizer.test.mts` exits non-zero.
- [ ] **1.2 GREEN** (Prereq: 1.1) Create `src/components/tooltip/sanitizer.mts` with `sanitizeHtml(html: string, config: SanitizerConfig): string` and `export { SANITIZER_CONFIG } from "./constants.mjs"`; copy `tooltip.mts:298–356` byte-equivalently. Commit `feat(sanitizer): extract sanitizeHtml with byte-equivalent behavior`. Verify: `pnpm test src/components/tooltip/__tests__/sanitizer.test.mts` exits 0; 12 tests pass.
- [ ] **1.3 REFACTOR** (Prereq: 1.2) In `src/components/tooltip/tooltip.mts`, import `sanitizeHtml`; set line 155 to `sanitizeHtml(htmlString, this.#sanitizerConfig)` and line 201 to `sanitizeHtml(this.#templateHtml, this.#sanitizerConfig)`; keep `#sanitizerConfig`, delete `#sanitize`, and delete `src/components/tooltip/__tests__/sanitizer.characterization.test.mts`. Commit `refactor(tooltip): delegate sanitization to sanitizeHtml; remove #sanitize`. Verify: `pnpm test && pnpm run typecheck && pnpm run test:cov` passes; 54+ tests, zero skipped, coverage ≥90/73/90.

## Phase 2: Positioner TDD Cycle

- [ ] **2.1 RED** (Prereq: 1.3) Create `src/components/tooltip/__tests__/positioner.test.mts`; direct-call `getCoordinates(dir, targetRect, tooltipRect)` with literal rects and pinned vectors. Preserve exact names: `positions tooltip to the north (n)`, `south (s)`, `east (e)`, `west (w)`, `northwest (nw)`, `northeast (ne)`, `southwest (sw)`, `southeast (se)`. Verify: `pnpm test src/components/tooltip/__tests__/positioner.test.mts` exits non-zero.
- [ ] **2.2 GREEN** (Prereq: 2.1) Create `src/components/tooltip/positioner.mts` with `getCoordinates(dir: Direction, targetRect: DOMRect, tooltipRect: DOMRect): { top: number; left: number }`; copy `tooltip.mts:471–483` byte-equivalently, including north default. Commit `feat(positioner): extract getCoordinates with byte-equivalent behavior`. Verify: `pnpm test src/components/tooltip/__tests__/positioner.test.mts` exits 0; 8 tests pass.
- [ ] **2.3 REFACTOR** (Prereq: 2.2) In `src/components/tooltip/tooltip.mts`, import `getCoordinates`, preserve target-then-tooltip rect reads and the reflow comment in `show()`, call `getCoordinates(dir, targetRect, tooltipRect)`, delete `#getCoordinates`, and delete `src/components/tooltip/__tests__/positioner.characterization.test.mts`. Commit `refactor(tooltip): delegate positioning to getCoordinates; remove #getCoordinates`. Verify: `pnpm test && pnpm run typecheck && pnpm run test:cov` passes; 54+ tests, zero skipped, coverage ≥90/73/90.

## Phase 3: Documentation and Final Verification

- [ ] **3.1** (Prereq: 2.3) Add the `extract-sanitizer-positioner` row pointing to `.sdd/changes/extract-sanitizer-positioner/` with `DONE` in `plans/README.md`. Commit `docs(plans): mark extract-sanitizer-positioner complete`. Verify: `grep "extract-sanitizer-positioner" plans/README.md` returns the DONE row.
- [ ] **3.2** (Prereq: 3.1) Run `pnpm test`, `pnpm run typecheck`, and `pnpm run test:cov` (≥90/73/90); inspect `git diff advisor/004-agents-md-refresh..HEAD --stat` for two modules, two test files, `tooltip.mts`, and `plans/README.md`; verify `grep -c "innerHTML" src/components/tooltip/tooltip.mts` returns `2` and `wc -l src/components/tooltip/tooltip.mts` is below 477.
