# Plan 003b: Clear the lint backlog (no `--fix`)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in "STOP conditions" occurs, stop and report — do
> not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 8a2c264..HEAD -- package.json src/ AGENTS.md plans/`
> Compare the in-scope paths below against the working tree; any mismatch is
> a STOP condition.

## Discipline

**Direct execution** (mechanical cleanup), one category at a time, with a
short commit per category so a bad change can be reverted in isolation. **No
`eslint --fix` — ever. No exceptions, even with `--rule` scoping.** Every change is by hand. This rule is non-negotiable
because the prior `--fix` runs (both unscoped and perfectionist-scoped) rewrote
files that must remain byte-stable (`sanitizer.mts`'s documented disables, the
`.d.ts` augmentation), and the prior unscoped `--fix` also destroyed those
disables.

This plan **supersedes** the "Step 3 fix violations" section of
`plans/003-lint-toolchain-baseline.md` (the original was scoped at 3-5
violations; reality is 161 errors + 188 warnings).

## Status

- **Priority**: P1
- **Effort**: M (was misjudged at S in the original plan)
- **Risk**: MED (mechanical edits across many files; mitigated by per-category
  commits, each with a working-tree test gate)
- **Depends on**: plans/003-lint-toolchain-baseline.md Steps 1 + 2a (already
  landed: commits `a18e22d`, `8a2c264`)
- **Category**: dx | tech-debt
- **Planned at**: commit `8a2c264`, 2026-08-14
- **Branch**: `advisor/003-lint-baseline` (the same branch — this plan extends it)

## Why this matters

`pnpm run lint` reports **349 problems (161 errors + 188 warnings)**. Errors
block exit 0; warnings do not. The errors cluster into ~20 rule categories.
Lying with a `continue-on-error` for 349 problems is a poor trade; clearing
them is the real value of the lint toolchain we already installed.

`eslint --fix` is **forbidden** in this plan. The previous attempt's `--fix`
run produced ugly formatting (JSDoc comments between export/const, comments
inside for-of headers) and — critically — silently removed one of the two
documented `eslint-disable-next-line no-restricted-properties` comments from
`src/components/tooltip/sanitizer.mts`. That contract is non-negotiable and
no automation will be allowed to touch it.

## Current state (verified at plan write-time)

Branch: `advisor/003-lint-baseline` at `8a2c264`. Working tree clean.

`pnpm run lint` error distribution (errors only — warnings are non-blocking):

| Count | Rule | Category |
|------:|------|----------|
| 49    | `perfectionist/sort-objects`           | sort literal/object keys |
| 17    | `@typescript-eslint/no-unnecessary-type-assertion` | drop `as Foo` |
| 15    | `perfectionist/sort-classes`           | sort class members |
| 11    | `@typescript-eslint/naming-convention` | rename identifiers |
| 7     | `perfectionist/sort-union-types`       | sort union members |
| 6     | `@typescript-eslint/restrict-template-expressions` | wrap with `String()` / `?? ""` |
| 5     | `perfectionist/sort-modules`           | reorder module exports |
| 5     | `perfectionist/sort-imports`           | reorder imports |
| 4     | `perfectionist/sort-switch-case`       | reorder switch cases |
| 4     | `perfectionist/sort-named-imports`     | reorder named imports |
| 4     | `@typescript-eslint/no-unsafe-member-access` | guard optional access |
| 4     | `@typescript-eslint/no-unnecessary-condition` | drop redundant guards |
| 3     | `perfectionist/sort-object-types`      | reorder types |
| 3     | `@typescript-eslint/no-unused-vars`    | remove unused |
| 2     | `perfectionist/sort-sets`              | reorder Set members |
| 2     | `perfectionist/sort-interfaces`        | reorder interface members |
| 2     | `no-restricted-syntax` (`.push()` / `for`) | replace with spread / `for...of` |
| 2     | `no-restricted-properties` (`innerHTML`) | replace with `createContextualFragment` |
| 2     | `@typescript-eslint/no-useless-default-assignment` | drop useless `?? default` |
| 2     | `@typescript-eslint/no-empty-function` | give arrow bodies or use `void` |
| 1     | `@typescript-eslint/no-unused-private-class-members` | remove `#field` |
| 1     | `@typescript-eslint/prefer-optional-chain` | collapse `a && a.b` → `a?.b` |
| 1     | `@typescript-eslint/no-non-null-assertion` | replace `!` with guard |
| 1     | `@typescript-eslint/no-non-null-asserted-optional-chain` | guard optional access |
| 1     | `@typescript-eslint/no-extraneous-class` | drop wrapping class |
| 1     | `@typescript-eslint/no-empty-object-type` | use `Record<string, never>` |
| 1     | `@typescript-eslint/dot-notation` | bracket → dot |
| 1     | `@typescript-eslint/consistent-type-definitions` | `interface` → `type` or vice versa |
| 1     | `@typescript-eslint/consistent-generic-constructors` | reorder generic args |
| 1     | `perfectionist/sort-named-exports`     | reorder named exports |
| 1     | `semi` (1 stray)                       | add semicolon |

Warnings (188): `jsdoc/require-jsdoc` × 187 + 1 stray `semi`. Warnings do
NOT block exit 0; ignore unless time permits at the end.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Tests     | `pnpm test`              | 57 passed, 0 skipped |
| Typecheck | `pnpm run typecheck`     | exit 0              |
| Lint      | `pnpm run lint`          | exit 0              |
| Lint filter | `pnpm exec eslint src/ --no-warn-ignored --rule '{"<rule>":["error"]}'` | filtered output |

## Scope

**In scope** (only files under `src/` are touched — never `eslint.config.mjs`,
never `package.json`, never `.github/workflows/ci.yml`, never `AGENTS.md`):

- All `.mts` files under `src/components/`, `src/__tests__/`, `src/types/`,
  `src/index.mts` — whatever the lint output flags.

**Out of scope** (forbidden to modify):

- `eslint.config.mjs` — no rule changes. If a rule truly can't be satisfied,
  STOP and report.
- `src/components/tooltip/sanitizer.mts` may be modified, but **only** to fix
  the 4 lint errors it currently reports (line 13 unused-disable, line 27
  `.push()`, line 33 sort-sets, line 36 naming-convention). After those fixes
  the file MUST end up with exactly **one** `eslint-disable-next-line
  no-restricted-properties` directive (line 69, before `return doc.body.innerHTML`
  — that one is genuinely needed). Allowed sanitizer edits:
  - Delete the `eslint-disable-next-line no-restricted-properties` on line 13 (it's an "Unused eslint-disable directive" — DOMParser line doesn't trigger `no-restricted-properties`).
  - Replace `removeQueue.push(node)` on line 27 with `removeQueue = [...removeQueue, node];` (or any equivalent non-mutating construction).
  - Reorder the `Set` literal on line 33 to alphabetical: `["action", "background", "formaction", "href", "poster", "src", "xlink:href"]`.
  - Rename `shouldRemove` to a name that satisfies naming-convention (e.g., `markRemove`). The current name is flagged because the boolean naming rule expects `is*`/`has*`/`can*`/`should*`/`will*`/`did*` prefix — and "shouldRemove" starts with `should` BUT the variable's mutation pattern doesn't match; rename to `markRemove` or `isRemovable` is simplest.
- `src/types/sanitizer.d.ts` must stay byte-identical to commit `9413f8c`.
- `package.json`, `pnpm-lock.yaml`, `.github/`, `AGENTS.md`, `plans/`.

## Git workflow

- Same branch: `advisor/003-lint-baseline` (no new branch).
- **One commit per category** (Steps 1-9 below each end with one commit).
- Conventional-commit messages; mention the rule category in the body.
- Do NOT push. Do NOT open a PR.

## Steps

### Step 0 — Confirm starting state

```bash
git status                                  # clean
git log --oneline -2                        # 8a2c264, a18e22d
grep -c "eslint-disable" src/components/tooltip/sanitizer.mts   # 2 (the comment block mentions eslint-disable; 2 actual directives at lines 13 and 69)
grep -c "eslint-disable-next-line no-restricted-properties" src/components/tooltip/sanitizer.mts   # 2
pnpm test                                   # 57 passed, 0 skipped
pnpm run lint 2>&1 | tail -3                # "160 errors, 188 warnings"
```

If any check fails, STOP — the working tree was not clean when this plan
started.

### Step 1 — perfectionist sort-* (95 errors across 7 sub-rules)

All mechanical. Run `pnpm exec eslint src/ --rule '{"perfectionist/sort-objects":["error"]}'` etc. and fix the reported line:column entries by reordering keys, named imports, class members, union types, switch cases, object types, sets, interfaces, named exports.

You MAY NOT use `pnpm exec eslint src/ --fix --rule ...` even with a `--rule` scope. The previous attempt's scoped perfectionist `--fix` rewrote `src/components/tooltip/sanitizer.mts` and `src/types/sanitizer.d.ts` even when only perfectionist sub-rules were scoped. Hand-fix EVERY perfectionist finding by reading the lint output line:column and reordering the keys/members/imports yourself. Verify after: `pnpm run lint 2>&1 | grep -c "perfectionist"` should drop to 0.

Commit: `style(perfectionist): reorder object/class/import/union members per natural order`

### Step 2 — `@typescript-eslint/no-unnecessary-type-assertion` (17)

Drop the `as Foo` (or `<Foo>bar`) where TS already infers the type. Pure deletion.

Commit: `refactor: drop unnecessary type assertions`

### Step 3 — `@typescript-eslint/naming-convention` (11)

Likely UPPER_CASE constants (e.g., `DEFAULT_DIRECTION` → `defaultDirection`) or test-file `TARGET_RECT` → `targetRect`. Rename and update all usages.

Commit: `refactor(naming): convert UPPER_CASE constants to camelCase (per eslint naming-convention)`

### Step 4 — `@typescript-eslint/restrict-template-expressions` (6)

Wrap with `String(value)` or `value ?? ""`. Likely sites: `tooltip.mts` around the `show` event dispatch (uses `data` and `position` in template literals). Verify by reading the line and choosing the right wrap.

Commit: `fix: wrap template-literal expressions to satisfy restrict-template-expressions`

### Step 5 — type-safety bundle (no-unsafe-member-access 4, no-unnecessary-condition 4, no-unused-vars 3, prefer-optional-chain 1, no-non-null-assertion 1, no-non-null-asserted-optional-chain 1, no-useless-default-assignment 2)

Total: 16. Each is a small targeted fix. For `no-unsafe-member-access`, add `?.` or a guard. For `no-unnecessary-condition`, drop the guard. For `no-unused-vars`, remove the declaration + references. For `prefer-optional-chain`, collapse `x && x.y` → `x?.y`. For `!` cases, add a guard or restructure. For useless defaults, drop `?? default`.

Commit: `fix: type-safety lint cleanup (unsafe-member-access, unnecessary-condition, unused-vars, prefer-optional-chain)`

### Step 6 — `no-restricted-syntax` (2) + `no-restricted-properties` (2) — the original Step 3 work

Apply the plan's original Step 3 fixes:

- `tooltip.mts` `innerHTML` assignments (both `setTemplate` and `setSanitizerConfig`):
  ```ts
  const fragment = document.createRange().createContextualFragment(sanitized);
  this.#tooltipDiv.replaceChildren(fragment);
  ```
- `#cacheBoundElements` `.push()` → spread:
  ```ts
  this.#boundElements.set(dataKey, existing ? [...existing, node] : [node]);
  ```
- Any `for` loops → `for...of`.

Commit: `refactor(tooltip): replace innerHTML + push with eslint-compliant equivalents`

### Step 7 — stylistic bundle (no-extraneous-class 1, no-empty-object-type 1, dot-notation 1, consistent-type-definitions 1, consistent-generic-constructors 1, no-empty-function 2, semi 1, no-unused-private-class-members 1)

Total: 9. Small fixes.

Commit: `style: cleanup stylistic lint findings (consistent type defs, dot notation, no-extraneous-class)`

### Step 8 — verify the gate is green

```bash
pnpm run lint                                        # exit 0
pnpm test                                            # 57 passed, 0 skipped
pnpm run typecheck                                   # exit 0
grep -c "eslint-disable-next-line no-restricted-properties" src/components/tooltip/sanitizer.mts   # exactly 1 (line 69 only — line 13's unused disable is removed)
```

If lint exit is non-zero, count remaining: `pnpm run lint 2>&1 | grep -E "^\s+[0-9]+:[0-9]+\s+error" | wc -l`. Whatever remains, fix and commit before declaring done. **Do not** add `eslint-disable` comments anywhere except to protect the 2 documented disables in `sanitizer.mts`.

### Step 9 — update `plans/README.md`

Change the Plan 003 row to DONE (the toolchain part) and add a note that the lint backlog was cleared by plan 003b. Also add a new row for 003b → DONE.

Commit: `docs(plans): mark 003 + 003b done — toolchain + backlog cleared`

## Test plan

- No new behavior tests. Regression = existing suite at every commit.
- After every commit: `pnpm test` (57 passed, 0 skipped) and `pnpm run typecheck`
  (exit 0) must hold.
- After Step 8: `pnpm run lint` exit 0.
- Optional at the end: clear the 187 jsdoc warnings, but only if time permits
  without expanding scope. Warnings do NOT block exit 0.

## Done criteria

- [ ] `pnpm run lint` exit 0 (errors = 0; warnings may remain)
- [ ] `pnpm test` 57 passed, 0 skipped (after every commit)
- [ ] `pnpm run typecheck` exit 0
- [ ] `grep -c "eslint-disable" src/components/tooltip/sanitizer.mts` = 3 (still 1 doc + 2 disables)
- [ ] `git status` — only files under `src/` and `plans/README.md` modified (plus the committed toolchain commits already on the branch)
- [ ] No file under `eslint.config.mjs` / `package.json` / `biome.*` / `.github/` modified
- [ ] `plans/README.md` shows 003 + 003b DONE

## STOP conditions

- Any violation requires modifying `eslint.config.mjs`, `package.json`, or removing/weakening one of the 2 documented `eslint-disable` comments in `sanitizer.mts`.
- A fix would change observable behavior of `TipVizTooltip` — STOP and report (this plan is lint cleanup, not behavior change).
- `pnpm test` drops below 57 passed at any commit.
- `--fix` appears in any command in the working tree — STOP and revert that attempt. No exceptions, even with `--rule` scoping.
- `pnpm run typecheck` exits non-zero.
- New `eslint-disable` comment anywhere outside the 2 documented in `sanitizer.mts` — STOP and revert.

## Maintenance notes

- The perfectionist sort-* category was the bulk of the debt (~95 of 161 errors). Future PRs that touch object literals or named imports will re-introduce drift if sort rules change. The CI lint job (still `continue-on-error: true` until Plan 003 Steps 4-7) should be made blocking immediately after this plan — that's a separate commit, see plan 003 Step 4.
- The 187 jsdoc warnings are non-blocking by ESLint default config (`--max-warnings` not set). Address them only if the team wants stricter enforcement.
- `pnpm exec eslint --fix` is now documented as forbidden on this branch for any cleanup involving `sanitizer.mts`. Future lint-cleanup plans should repeat the prohibition.