# Plan 003: Lint under TS 7 via the TS6 compatibility alias, plus a Biome parity pilot

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in "STOP conditions" occurs, stop and report — do
> not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat e57af9c..HEAD -- package.json eslint.config.mjs .github/workflows/ci.yml src/ AGENTS.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Discipline

**Direct execution** (mechanical toolchain chore) — no SDD artifact, no new
behavior tests. The gates are the commands themselves: `tsc --version`,
`tsc6 --version`, `pnpm run lint`, `pnpm run typecheck`, `pnpm test`.
This file **supersedes** the original `plans/003-enforce-lint-baseline.md`
(lost from disk; only `plans/README.md` survived) and replaces its old
"pin TypeScript to 5.x" Step 0 with the official TS7 side-by-side strategy.

## Status

- **Priority**: P1 (last remaining plan; it gates CI's lint job)
- **Effort**: M
- **Risk**: MED (dependency alias swap touches the whole toolchain; mitigated
  by the verification gates at every step)
- **Depends on**: plans 001 (lint script + CI), 005 (current code shape post-extraction)
- **Category**: dx | tech-debt
- **Planned at**: commit `e57af9c`, 2026-08-14
- **Branch**: `advisor/003-lint-baseline` (stacked on `advisor/005-extract-modules`)

## Why this matters

`pnpm run lint` crashes at startup: `typescript-eslint@8.67.0` needs the
TypeScript JS compiler API (peer range `>=4.8.4 <6.1.0`), but the repo has
`typescript@^7.0.2` — the Go rewrite, which ships **no JS API at all**. So CI's
lint job runs with `continue-on-error: true` and every ESLint rule in
`eslint.config.mjs` (including the custom `innerHTML`/`.push()`/`for-loop`
bans) is unenforced theater.

TypeScript's official 7.0 migration path solves exactly this: keep TS 7 as the
typechecker (`tsc`), and alias the `typescript` package name to the
compatibility build `@typescript/typescript6` so tools that import the TS6 API
(like typescript-eslint) keep working. In parallel, the user approved a
**Biome parity pilot**: Biome 2.x parses TypeScript itself (no compiler
dependency) and could lint TS7 directly, but its type-inference rules cover
less than typescript-eslint (their own docs estimate ~75% for
`noFloatingPromises`) and it cannot map jsdoc/perfectionist/unicorn plugins
1:1 — so it runs **alongside** ESLint, ungated, while we build a rule-by-rule
parity matrix. Promotion to replacement is a separate future decision.

## Current state

`package.json` devDependencies (lines 58-73) — the problem and the plugins:

```json
"@eslint/js": "^10.0.1",
"eslint-plugin-jsdoc": "^64.1.0",
"eslint-plugin-perfectionist": "^5.10.1",
"eslint-plugin-unicorn": "^73.0.0",
"typescript": "^7.0.2",
"typescript-eslint": "^8.67.0",
```

Scripts (lines 30-40): `"lint": "eslint src/"`, `"typecheck": "tsc --noEmit"`.

The crash (verified, ESLint 10.8.1):

```
Error: typescript-eslint does not support TS 7.0.
    at .../typescript-eslint@8.67.0_.../dist/index.js:52:11
```

`eslint.config.mjs` (119 lines) uses: `@eslint/js` recommended,
`tseslint.configs.strictTypeChecked` + `stylisticTypeChecked` (both need type
info), `perfectionist.configs["recommended-natural"]`, plugins `jsdoc` +
`unicorn`, `parserOptions.projectService: true`, plus custom rules:
`no-restricted-properties` on `innerHTML`, `no-restricted-syntax` selectors
banning `+` string concat with literals, `.push()` calls, and `ForStatement`;
`unicorn/filename-case` with regex `^[a-z0-9-]+(\.[a-z0-9-]+)*$`;
`@typescript-eslint/naming-convention`; jsdoc require/check rules.

Known post-005 lint debt to fix once lint runs:
- `src/components/tooltip/tooltip.mts` — 2 `innerHTML` assignments
  (`setTemplate` ~line 157, `setSanitizerConfig` ~line 203).
- `src/components/tooltip/tooltip.mts` `#cacheBoundElements` — uses `.push()`
  (~line 220 in the pre-refactor file; locate live).
- `src/components/tooltip/sanitizer.mts` — has exactly **2 documented
  `eslint-disable-next-line no-restricted-properties`** comments (DOMParser
  parse + `doc.body.innerHTML` read). These are intentional and stay.
- `.github/workflows/ci.yml` — lint step has `continue-on-error: true`.
- `AGENTS.md` — documents the lint crash as a known quirk; must be updated.

Facts the executor must not re-derive:
- `@typescript/typescript6` exposes a `tsc6` binary (NOT `tsc`) and re-exports
  the TS 6.0 JS API. `typescript@7.0.2` (aliased or direct) exposes `tsc`.
  Result after the swap: `tsc` → TS7, `tsc6` → TS6, `import "typescript"`
  → TS6 API for typescript-eslint. No bin conflict.
- TS6.0.2 satisfies typescript-eslint's peer range (`<6.1.0`).
- `pnpm exec tsc --version` currently prints `Version 7.0.2`.
- Tests: 57 passing, 0 skipped. Coverage floors: lines ≥90 / branches ≥73 /
  functions ≥90 in `vitest.config.mts`.
- Official alias pattern (TypeScript 7.0 announcement, "Running Side-by-Side
  with TypeScript 6.0"):

```json
{
  "devDependencies": {
    "@typescript/native": "npm:typescript@^7.0.2",
    "typescript": "npm:@typescript/typescript6@^6.0.2"
  }
}
```

## Commands you will need

| Purpose          | Command                          | Expected on success |
|------------------|----------------------------------|---------------------|
| Install          | `pnpm install`                   | exit 0              |
| TS7 version      | `pnpm exec tsc --version`        | `Version 7.x`       |
| TS6 version      | `pnpm exec tsc6 --version`       | `Version 6.x`       |
| Typecheck (TS7)  | `pnpm run typecheck`             | exit 0              |
| Lint             | `pnpm run lint`                  | exit 0 (after Step 4) |
| Tests            | `pnpm test`                      | 57 passed, 0 skipped |
| Coverage         | `pnpm run test:cov`              | floors met          |
| Biome            | `pnpm exec biome ci src/`        | runs, exit code recorded (not a gate) |

## Scope

**In scope**:
- `package.json` (dependency aliases; optionally a `lint:biome` script)
- `pnpm-lock.yaml` (via install)
- `src/components/tooltip/tooltip.mts` (fix `innerHTML` + `.push()` violations)
- `biome.json` (create, via `biome migrate` + manual pruning)
- `plans/biome-parity-matrix.md` (create)
- `.github/workflows/ci.yml` (lint blocking; add ungated Biome job)
- `AGENTS.md` (lint quirk rewrite: dual-tsc + pilot)
- `plans/README.md` (status row)

**Out of scope**:
- `eslint.config.mjs` rule changes — the rules are the policy; the code moves
  to meet them. Exception: you may add NOTHING. If a rule is genuinely
  unfixable, STOP.
- Deleting or weakening the 2 documented `eslint-disable` comments in
  `sanitizer.mts`.
- Replacing ESLint with Biome (pilot only — parity matrix informs a future decision).
- `tsconfig.json` changes (typecheck already passes under TS7).
- Public API of `TipVizTooltip` — unchanged.

## Git workflow

- Branch: `advisor/003-lint-baseline` from `advisor/005-extract-modules`.
- Conventional commits, one per logical unit (suggested messages inline below).
- Do NOT push. Do NOT open a PR.

## Steps

### Step 1: Branch + alias swap

```bash
git checkout advisor/005-extract-modules
git checkout -b advisor/003-lint-baseline
```

In `package.json` devDependencies: delete `"typescript": "^7.0.2"` and add:

```json
"@typescript/native": "npm:typescript@^7.0.2",
"typescript": "npm:@typescript/typescript6@^6.0.2",
```

Then `pnpm install`.

**Verify**: `pnpm exec tsc --version` → `Version 7.x`; `pnpm exec tsc6 --version`
→ `Version 6.x`. If `tsc` resolves to 6.x (bin collision), STOP and report.

**Verify**: `pnpm run typecheck` (TS7) → exit 0. `pnpm test` → 57 passed.
`pnpm run tsdown:build` → exit 0 (dts generation must survive the alias; if it
breaks, STOP).

Commit: `chore(deps): run tsc as TS7 with TS6 compat alias for typescript-eslint`

### Step 2: Confirm lint runs; capture the real violation list

Run `pnpm run lint 2>&1 | head -60`. It must START (no crash). Record every
violation (file:line:rule) in the plan execution notes.

**Verify**: no `typescript-eslint does not support` error. Violations are
expected (that's the point) — likely the 2 `innerHTML` assignments, the
`.push()` call(s), plus whatever `strictTypeChecked`/`stylisticTypeChecked`/
perfectionist/unicorn/jsdoc flag on code written while lint was dead.

Commit: nothing yet.

### Step 3: Fix violations (code to rules)

- `tooltip.mts` `innerHTML` assignments → replace with the fragment pattern:
  ```ts
  const fragment = document.createRange().createContextualFragment(sanitized);
  this.#tooltipDiv.replaceChildren(fragment);
  ```
  Apply at both `setTemplate` and `setSanitizerConfig`. Behavior-identical
  (children replaced, then `#cacheBoundElements()` re-runs).
- `.push()` in `#cacheBoundElements` → `this.#boundElements.set(dataKey, existing ? [...existing, node] : [node]);`
- Remaining violations: fix mechanically (perfectionist import order, naming,
  jsdoc warn-level). Warn-level jsdoc rules do NOT block exit 0 — verify with
  the actual run; if `--max-warnings` is not set, warnings pass.
- Any `for` loop or `+` concat violations: convert to `for...of`/template
  literals.

Every fix must keep `pnpm test` green — run after each file.

**Verify**: `pnpm run lint` → exit 0. `pnpm test` → 57 passed. `pnpm run
typecheck` → exit 0. `grep -c "eslint-disable" src/components/tooltip/*.mts`
→ exactly 2 (both in `sanitizer.mts`).

Commit: `refactor(tooltip): satisfy lint rules (innerHTML sinks, push, style rules)`

### Step 4: Make CI lint blocking

In `.github/workflows/ci.yml`: remove `continue-on-error: true` from the lint
step (leave a one-line comment that Plan 003 made it blocking).

**Verify**: workflow YAML parses; the lint step is blocking.

Commit: `ci: enforce lint as a blocking gate`

### Step 5: Biome parity pilot (alongside, NOT replacing)

1. `pnpm add -D @biomejs/biome` (2.x latest).
2. `pnpm exec biome migrate eslint --write` — converts what it can from
   `eslint.config.mjs` into `biome.json`. Expect partial coverage; capture the
   migration report output (it lists unmapped rules).
3. Prune `biome.json` manually: keep only rule groups with real equivalents;
   disable formatter conflicts (ESLint owns style policy for now); set
   `"vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true }`.
4. Run `pnpm exec biome ci src/` — record the exit code and finding counts.
   Fix ONLY findings that are real bugs; style conflicts with ESLint policy →
   disable that Biome rule (ESLint wins during the pilot).
5. Write `plans/biome-parity-matrix.md`: one row per current ESLint rule/
   plugin area — `no-restricted-properties innerHTML`, the 3 custom
   `no-restricted-syntax` selectors, `strictTypeChecked` (per-rule sample),
   `stylisticTypeChecked`, perfectionist natural ordering, unicorn
   (filename-case + prefer-node-protocol), jsdoc rules, naming-convention —
   columns: Biome equivalent (exact rule name) | partial | none | notes.
   End with a recommendation paragraph: what could move to Biome today
   (likely: formatter + syntactic rules), what cannot (type-aware, plugins).
6. Add an optional `"lint:biome": "biome ci src/"` script to `package.json`.

**Verify**: `biome.json` exists and is valid (`pnpm exec biome rage --formatter`-
free sanity: just run `pnpm run lint:biome` and confirm it executes);
`plans/biome-parity-matrix.md` exists with ≥10 rows; `pnpm run lint` still
exit 0.

Commit: `chore(lint): add Biome 2.x parity pilot alongside ESLint`

### Step 6: CI Biome job (non-blocking)

Add a separate `biome` job to `.github/workflows/ci.yml` running
`pnpm run lint:biome` with `continue-on-error: true` and a comment:
`# Parity pilot — not a gate. See plans/biome-parity-matrix.md`.

**Verify**: workflow valid; lint job blocking, biome job explicitly non-blocking.

Commit: `ci: add non-blocking Biome parity job`

### Step 7: Docs

`AGENTS.md`: replace the "pnpm run lint crashes" quirk with: lint works via the
dual-tsc setup (`tsc` = TS7 typecheck, `tsc6` = TS6 for typescript-eslint's
compiler API; both from `@typescript/native` + `typescript` aliases); Biome
runs as a non-blocking pilot; `sanitizer.mts` holds the only 2 intentional
`eslint-disable` comments. Also note `pnpm run lint:biome`.

`plans/README.md`: mark plan 003 row DONE.

**Verify**: `grep -n "crashes" AGENTS.md` → nothing about lint;
`grep -n "lint:biome\|tsc6" AGENTS.md` → present.

Commit: `docs(agents): document dual-tsc lint toolchain and Biome pilot`

## Test plan

- No new behavior tests (mechanical plan). Regression = existing suite:
  `pnpm test` → 57 passed, 0 skipped after every step.
- `pnpm run test:cov` → floors met (lines ≥90, branches ≥73, functions ≥90).
- `pnpm run tsdown:build` → exit 0 (library build unaffected by alias).

## Done criteria

- [ ] `pnpm exec tsc --version` → 7.x; `pnpm exec tsc6 --version` → 6.x
- [ ] `pnpm run lint` → exit 0, no startup crash
- [ ] `pnpm run typecheck` → exit 0 (running TS7)
- [ ] `pnpm test` → 57 passed, 0 skipped; `pnpm run test:cov` floors met
- [ ] `pnpm run tsdown:build` → exit 0
- [ ] Exactly 2 `eslint-disable` comments in `src/components/tooltip/` (sanitizer.mts)
- [ ] CI: lint blocking (no `continue-on-error`), Biome job non-blocking
- [ ] `biome.json` + `plans/biome-parity-matrix.md` (≥10 rows + recommendation)
- [ ] `AGENTS.md` documents dual-tsc + pilot; no stale "lint crashes" claim
- [ ] `plans/README.md` row 003 → DONE
- [ ] No files outside the in-scope list modified (`git status`)

## STOP conditions

- `tsc` resolves to 6.x after the swap, or `tsc6` is missing.
- `pnpm run tsdown:build` breaks under the alias (dts generation failing).
- typescript-eslint still crashes under the TS6 alias (it shouldn't — 6.0.2 is
  inside `>=4.8.4 <6.1.0`; if it does, report the exact error).
- Lint reports > 50 violations — mass-fixing beyond `src/` means the plan's
  estimate is wrong; report before continuing.
- A fix requires changing `eslint.config.mjs` or weakening a rule — report;
  that is a policy decision, not an executor call.
- `biome migrate eslint` crashes on the flat config — record the failure,
  skip to hand-writing a minimal `biome.json`, and note it in the matrix.

## Maintenance notes

- When typescript-eslint ships TS7.1+ API support (tracked in their issue
  #10940), the alias pair can collapse back to plain `typescript@^7` —
  the parity matrix then becomes the input for the Biome-vs-ESLint decision.
- If Biome is later promoted, do it rule-group by rule-group (formatter first),
  removing the corresponding ESLint duties in the same commit so there is
  never zero coverage for a rule.
- The 2 `sanitizer.mts` disables exist because `no-restricted-properties`
  bans `innerHTML` reads too; if the rule is ever scoped to writes only,
  delete them.
