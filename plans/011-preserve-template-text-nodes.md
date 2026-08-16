# Plan 011: Preserve top-level text nodes when rendering tooltip templates

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat bdbc9eb..HEAD -- src/components/tooltip/tooltip.mts src/components/tooltip/__tests__/tooltip.test.mts`
> If either file changed since this plan was written (Plan 010 also edits
> `tooltip.mts` line 304 — that specific change is expected and fine),
> compare the "Current state" excerpts against the live code; on a mismatch
> beyond that, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (recommended to run AFTER Plan 010 — both edit `tooltip.mts`; serialize to avoid conflicts)
- **Category**: bug
- **Discipline**: strict TDD — red test first
- **Planned at**: commit `bdbc9eb`, 2026-08-15

## Why this matters

Both template render paths silently discard any text that sits at the top
level of the template string. `setTemplate("Hello World")` renders an EMPTY
tooltip — no error, no warning. `setTemplate("<strong>Tip</strong>: 42 items")`
renders `Tip` and drops `: 42 items`. The cause is one API mistake repeated in
two places: `replaceChildren(...fragment.children)`, where `children` is an
element-only collection that excludes Text nodes. The declarative
`template='...'` HTML attribute funnels into the same broken method, so
attribute users hit it too. Fixing both call sites to spread `childNodes`
makes text-only and mixed templates work, which is the most basic expectation
a consumer has of a tooltip template API.

## Current state

Files and their roles:

- `src/components/tooltip/tooltip.mts` — the component; two identical broken
  render lines.
- `src/components/tooltip/__tests__/tooltip.test.mts` — component tests; new
  tests go next to the existing v3.0 template tests.

`src/components/tooltip/tooltip.mts:307-310` — inside `setSanitizerConfig`
(re-render path):

```ts
      const fragment = this.ownerDocument
        .createRange()
        .createContextualFragment(sanitizeHtml(this.#templateHtml, this.#sanitizerConfig));
      this.#tooltipDiv.replaceChildren(...fragment.children);
```

`src/components/tooltip/tooltip.mts:349-352` — inside `setTemplate` (primary
path; the `template` attribute handler at line 137-138 and
`connectedCallback` at line 179-180 both call it):

```ts
    const fragment = this.ownerDocument
      .createRange()
      .createContextualFragment(sanitizeHtml(htmlString, this.#sanitizerConfig));
    this.#tooltipDiv.replaceChildren(...fragment.children);
```

Why `children` is wrong: `ParentNode.children` is an HTMLCollection of
Element nodes only. For `"Hello World"`, `createContextualFragment` produces
a fragment whose single child is a Text node — `children` is empty, so
`replaceChildren()` empties the tooltip box. `ParentNode.childNodes`
(NDL of all node types) is the correct source. Spreading it into
`replaceChildren` moves every node into `#tooltipDiv`, exactly like today's
behavior for elements.

Existing behavior that must not change:

- `#cacheBoundElements()` (tooltip.mts:454-470) queries
  `this.#tooltipDiv.querySelectorAll("[data-bind]")` — unaffected by Text nodes.
- Sanitization still runs before rendering (Plan 010 may have touched the
  sanitizer internals; irrelevant here).

### Repo conventions that apply

- Style: double quotes, semicolons, no `var`, no `for` loops, no `.push()`.
- Test style: model after `describe("setTemplate + setData (v3.0 API)")`
  (tooltip.test.mts:183). Tests query the box via the existing
  `getTooltipBox(tooltip)` helper (used at tooltip.test.mts:134).
- Full style rules: `.github/instructions/`.

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Install   | `pnpm install`                   | exit 0              |
| Tests     | `pnpm test`                      | all pass            |
| One file  | `pnpm test -- tooltip`           | tooltip tests pass  |
| Typecheck | `pnpm run typecheck`             | exit 0, no errors   |
| Lint      | `pnpm run lint`                  | exit 0              |

## Scope

**In scope** (the only files you should modify):

- `src/components/tooltip/tooltip.mts` (exactly the two `replaceChildren` lines)
- `src/components/tooltip/__tests__/tooltip.test.mts` (new tests)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):

- `sanitizer.mts`, `structural-styles.mts`, `constants.mts` — unrelated.
- The `data`/`template` attribute handler logic in
  `attributeChangedCallback`/`connectedCallback` — they already delegate to
  `setTemplate`.
- Positioning, `show()`/`hide()`, accessibility code.

## Git workflow

- Branch: `advisor/011-template-text-nodes`
- Commit per logical unit, conventional commits, e.g.:
  `test(tooltip): pin top-level text template rendering` then
  `fix(tooltip): render template text nodes via childNodes`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the red tests

In `src/components/tooltip/__tests__/tooltip.test.mts`, inside
`describe("setTemplate + setData (v3.0 API)")` (starts at line 183), add:

```ts
  it("renders a plain-text template", () => {
    tooltip.setTemplate("Hello World");
    expect(getTooltipBox(tooltip).textContent).toBe("Hello World");
  });

  it("preserves top-level text mixed with elements", () => {
    tooltip.setTemplate("<strong>Tip</strong>: 42 items");
    const box = getTooltipBox(tooltip);
    expect(box.textContent).toBe("Tip: 42 items");
    expect(box.querySelector("strong")?.textContent).toBe("Tip");
  });

  it("preserves top-level text when re-rendering via setSanitizerConfig", () => {
    tooltip.setTemplate("Value: <span data-bind=\"v\"></span>");
    tooltip.setData({ v: "42" });
    tooltip.setSanitizerConfig({});
    const box = getTooltipBox(tooltip);
    expect(box.textContent).toBe("Value: 42");
  });
```

Adjust helper names/imports to match the file's actual imports at the top of
the describe block (read lines 1-100 first; if `getTooltipBox` is named
differently, use the file's name). The third test intentionally calls
`setSanitizerConfig({})` — after Plan 010 that merges safely; if Plan 010 has
NOT landed, replace `{}` with `{ ...sanitizerConfig }` importing from
`../constants.mjs` to keep the test focused on text preservation.

**Verify**: `pnpm test -- tooltip` → the 3 new tests FAIL (empty
`textContent`) and all existing tests pass. If any new test passes, the code
has drifted — STOP.

### Step 2: Fix both render lines

In `src/components/tooltip/tooltip.mts`, change BOTH occurrences of:

```ts
this.#tooltipDiv.replaceChildren(...fragment.children);
```

(line ~310 inside `setSanitizerConfig`, and line ~352 inside `setTemplate`)
to:

```ts
this.#tooltipDiv.replaceChildren(...fragment.childNodes);
```

Touch nothing else. There must be exactly two occurrences — confirm with
`grep -n "replaceChildren" src/components/tooltip/tooltip.mts` before and
after (expect 2 matches both times).

**Verify**: `pnpm test` → ALL tests pass (existing + 3 new). Then
`pnpm run typecheck` → exit 0. Then `pnpm run lint` → exit 0.

## Test plan

- New: plain-text template; mixed element+text template (asserts both the
  combined textContent AND that the element survives); text preserved across
  the `setSanitizerConfig` re-render path (covers the second call site).
- Regression: the full existing suite (~91 tests at planning time) pins
  element templates, data binding, and the declarative `template` attribute
  (which flows through `setTemplate`).
- Verification: `pnpm test` → all pass including the 3 new tests.

## Done criteria

ALL must hold:

- [ ] `pnpm test` exits 0; the 3 new text-node tests exist and pass
- [ ] `grep -n "replaceChildren(...fragment.children)" src/components/tooltip/tooltip.mts` returns no matches
- [ ] `grep -cn "replaceChildren(...fragment.childNodes)" src/components/tooltip/tooltip.mts` returns 2
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run lint` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts at tooltip.mts:307-310 / :349-352 do not match the live code
  (beyond Plan 010's expected line-304 change).
- There are more or fewer than 2 `replaceChildren` call sites.
- Any previously-green test fails after step 2 (the change affected more
  than node selection — e.g. someone depends on empty textContent).
- The tests need `getTooltipBox` but no such helper exists and no equivalent
  is found in the test file.

## Maintenance notes

- `fragment.childNodes` is a live NodeList; spreading snapshots it — safe
  here because `replaceChildren` consumes it immediately. If a future change
  mutates the fragment between spread and call, re-snapshot.
- Reviewer focus in the PR: confirm no `querySelectorAll("[data-bind]")`
  behavior changed (it operates on `#tooltipDiv` AFTER the move — unaffected
  by Text siblings).
