# Plan 013: Document and pin the data semantics asymmetry (attribute replaces, setData merges)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat bdbc9eb..HEAD -- src/components/tooltip/__tests__/tooltip.test.mts AGENTS.md docs/api-reference.md`
> Plan 010 also edits `AGENTS.md`/`docs/api-reference.md` (sanitizer
> sections) — expected. Any other mismatch with the excerpts below is a
> STOP condition.

## Status

- **Priority**: P3
- **Effort**: XS
- **Risk**: LOW
- **Depends on**: none (recommended LAST, after 010 — avoids overlapping doc edits)
- **Category**: docs | tests
- **Discipline**: direct — characterization test + doc edits; no behavior change
- **Planned at**: commit `bdbc9eb`, 2026-08-15

## Why this matters

The two ways to set data behave differently and no public doc says so:
setting the `data` HTML attribute REPLACES the whole data record, while
`setData()` MERGES shallowly. A consumer who mixes both APIs — e.g.
declarative `data` attribute at markup time, then imperative
`tip.setData({ score: 42 })` on interaction, then another
`setAttribute("data", ...)` update — silently loses every key not present in
the latest attribute value. The replace behavior is intentional (there is a
pinned test for it), and the merge behavior is intentional; the defect is
undocumented asymmetry plus zero test coverage of the merge side. This plan
changes no behavior: it pins the merge side with a characterization test and
states the asymmetry in both public docs.

## Current state

Files and their roles:

- `src/components/tooltip/__tests__/tooltip.test.mts` — contains the pinned
  REPLACE test; the new MERGE test goes beside it.
- `AGENTS.md` — v3.0 API summary consumed by every coding agent in this repo.
- `docs/api-reference.md` — public API docs.

`src/components/tooltip/tooltip.mts:144` — attribute path replaces (verbatim,
inside `attributeChangedCallback`):

```ts
        this.#data = { ...parsed };
```

`src/components/tooltip/tooltip.mts:277` — method path merges (verbatim,
inside `setData`):

```ts
    this.#data = { ...this.#data, ...data };
```

`src/components/tooltip/tooltip.mts:186` — the `connectedCallback` data
path also replaces: `this.#data = { ...parsed };`

Existing pinned REPLACE test — `tooltip.test.mts:131-144`
(`it("data attribute replace semantics")`):

```ts
    it("data attribute replace semantics", () => {
      // Use attributeChangedCallback directly to test replace semantics
      // (setAttribute before connect may not synchronously fire attributeChangedCallback in jsdom)
      tooltip.setTemplate("<span data-bind='a'></span><span data-bind='b'></span>");

      // Simulate first data attribute being set via attributeChangedCallback
      tooltip.attributeChangedCallback("data", "", JSON.stringify({ a: 1 }));
      expect(getTooltipBox(tooltip).querySelector("[data-bind='a']")?.textContent).toBe("1");

      // Simulate second data attribute replacing the first
      tooltip.attributeChangedCallback("data", JSON.stringify({ a: 1 }), JSON.stringify({ b: 2 }));
```

(Read the rest of the test body before editing near it.)

Verified facts at `bdbc9eb`:

- `grep -rn "merge" src/components/tooltip/__tests__/` → NO matches: the
  merge side is completely unpinned.
- `docs/api-reference.md` has NO section describing the `data` attribute's
  replace semantics or `setData`'s merge semantics (the Security section is
  at lines 237-262; `setData` docs live elsewhere in the file — locate with
  the step 3 grep).
- `AGENTS.md:60-63` shows the v3.0 calls (`tip.setData({ label: ..., value: ... })`
  and the declarative `data='{"label":"My Label"}'` example) with no
  semantics note.

### Repo conventions that apply

- Docs tone: match the existing bullet style in `docs/api-reference.md`.
- Test style: model after the REPLACE test at tooltip.test.mts:131.
- Full style rules: `.github/instructions/`.

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Install   | `pnpm install`                   | exit 0              |
| Tests     | `pnpm test`                      | all pass            |
| One file  | `pnpm test -- tooltip`           | tooltip tests pass  |
| Typecheck | `pnpm run typecheck`             | exit 0              |
| Lint      | `pnpm run lint`                  | exit 0              |

## Scope

**In scope** (the only files you should modify):

- `src/components/tooltip/__tests__/tooltip.test.mts` (one new test)
- `AGENTS.md` (v3.0 API summary, `setData`/`data` mentions only)
- `docs/api-reference.md` (`setData` and attribute docs sections only)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):

- `src/components/tooltip/tooltip.mts` — this plan intentionally changes NO
  behavior. If the characterization test in step 1 fails, that is a STOP
  condition, not something to fix.
- Sanitizer docs (Plan 010 owns that section).

## Git workflow

- Branch: `advisor/013-data-semantics-docs`
- Single logical commit is fine, e.g.:
  `docs(api): state data attribute replace vs setData merge semantics`
  (test included in the same commit is acceptable).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Characterization test for the merge side (must pass immediately)

In `src/components/tooltip/__tests__/tooltip.test.mts`, directly after
`it("data attribute replace semantics")` (line 131-144), add:

```ts
    it("setData merges shallowly (counterpart to data attribute replace)", () => {
      tooltip.setTemplate("<span data-bind='a'></span><span data-bind='b'></span><span data-bind='c'></span>");
      tooltip.setData({ a: 1, b: 2 });
      tooltip.setData({ c: 3 });

      const box = getTooltipBox(tooltip);
      expect(box.querySelector("[data-bind='a']")?.textContent).toBe("1");
      expect(box.querySelector("[data-bind='b']")?.textContent).toBe("2");
      expect(box.querySelector("[data-bind='c']")?.textContent).toBe("3");
    });
```

**Verify**: `pnpm test -- tooltip` → the new test PASSES on the first run.
This is a characterization test: it pins existing behavior. If it fails, the
merge behavior has changed since `bdbc9eb` — STOP and report; do NOT modify
`tooltip.mts`.

### Step 2: State the asymmetry in AGENTS.md

In `AGENTS.md`'s v3.0 API summary, find the `setData` line (~line 61):

```ts
tip.setData({ label: "My Label", value: 42 });    // data to interpolate into data-bind slots
```

Append a semantics note directly below the `setData`/attribute code block
(keep the surrounding format; exact placement: after the closing ``` of the
"Or via attributes" comment block, before "**Callbacks...**"):

```markdown
**Data semantics:** `setData()` merges shallowly into the existing record;
setting the `data` HTML attribute replaces the entire record. Mixing both
APIs means a later `data` attribute value drops keys set via `setData()`.
```

**Verify**: `grep -n "merges shallowly" AGENTS.md` → exactly 1 match.

### Step 3: State the asymmetry in docs/api-reference.md

Locate the sections:

```bash
grep -n "setData\|## Attributes\|data attribute" docs/api-reference.md
```

Expected: at least one `setData` heading/section and one attributes section
list `data`. In the `setData` section add one sentence:

```markdown
`setData()` performs a shallow merge into the existing data record — keys
not present in the argument are preserved.
```

In the section documenting the `data` attribute (add a short paragraph if
none exists):

```markdown
Setting the `data` attribute replaces the entire data record (unlike
`setData()`, which merges). After an attribute update, keys previously
supplied only via `setData()` are gone.
```

**Verify**: `grep -n "shallow merge" docs/api-reference.md` → 1 match;
`grep -n "replaces the entire data record" docs/api-reference.md` → 1 match.

### Step 4: Full gate

**Verify**: `pnpm test` → all pass. `pnpm run typecheck` → exit 0.
`pnpm run lint` → exit 0.

## Test plan

- New: one characterization test pinning the shallow-merge behavior of
  `setData()` across two calls with disjoint keys (a=1,b=2 then c=3 → all
  three render). It pairs with the existing replace test at line 131 so both
  halves of the asymmetry are pinned.
- No other behavioral tests: this plan must not alter runtime behavior.

## Done criteria

ALL must hold:

- [ ] `pnpm test` exits 0 with the new merge characterization test
- [ ] `grep -c "merges shallowly" AGENTS.md` returns 1
- [ ] `grep -c "shallow merge" docs/api-reference.md` returns 1
- [ ] `git status` shows NO change to `src/components/tooltip/tooltip.mts`
- [ ] `pnpm run typecheck` and `pnpm run lint` exit 0
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The step-1 characterization test fails (merge behavior changed — the docs
  you are about to write would be lies; re-audit first).
- The excerpts at tooltip.mts:144/:186/:277 do not match the live code
  (beyond Plans 010/011/012 expected edits elsewhere in the file).
- `docs/api-reference.md` has no findable `setData`/attributes sections even
  after the step-3 grep (file restructured — report the actual headings).

## Maintenance notes

- If a future version unifies the semantics (all-merge or all-replace),
  update BOTH pinned tests (line ~131 replace test and the new merge test)
  and both doc notes in the same change — the tests are the tripwire.
- Reviewer focus: the PR must contain zero source changes; a diff touching
  `tooltip.mts` means scope creep.
