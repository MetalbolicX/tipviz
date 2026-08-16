# Plan 012: Fix stylesheet loading for cross-document tooltips and report the failing URL on error

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat bdbc9eb..HEAD -- src/components/tooltip/tooltip.mts src/components/tooltip/__tests__/tooltip.test.mts`
> Plans 010 (line 304) and 011 (two `replaceChildren` lines) also edit
> `tooltip.mts` — those specific changes are expected. Any other mismatch
> with the "Current state" excerpts is a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S/M
- **Risk**: LOW
- **Depends on**: none (recommended AFTER Plans 010/011 — same file; serialize)
- **Category**: bug
- **Discipline**: strict TDD — red test first where jsdom allows
- **Planned at**: commit `bdbc9eb`, 2026-08-15

## Why this matters

The component advertises iframe/cross-document support (per AGENTS.md:
"Document-scoped positioning + adoptedCallback... works correctly inside
iframes"), and most of the code honors it via `this.ownerDocument`. Three
stylesheet-path lines still use the global `document`:

1. `tooltip.mts:261` — `loadStylesheet` creates the `<link>` with
   `document.createElement`. For a tooltip living in an iframe document,
   this creates a node owned by the parent document and appends it into the
   iframe's shadow root — a cross-document ownership bug (and a guaranteed
   `HierarchyRequestError` in browsers for the `<style>` case below).
2. `tooltip.mts:427` — the `<style>` fallback in `#applyConsumerStyles`'s
   catch block does the same. This is the path taken whenever
   `new CSSStyleSheet()` is unavailable or throws — precisely the degraded
   environment where the fallback exists. The adoption-specific sibling
   `#injectConsumerStyleElement` (tooltip.mts:521-527) already does it
   correctly with `this.ownerDocument.createElement`; the catch fallback was
   simply never updated to match.
3. `tooltip.mts:264-267` — the `<link>` error handler captures
   `const linkHref = link.href;` BEFORE `link.href = stylesheetUrl` is
   assigned at line 270, so a failed stylesheet load logs
   `[tip-viz-tooltip] Failed to load stylesheet: ` with an EMPTY URL —
   the one piece of information the message exists to convey.

## Current state

Files and their roles:

- `src/components/tooltip/tooltip.mts` — the component; all three fixes land
  in `loadStylesheet` (lines 247-271) and `#applyConsumerStyles`
  (lines 419-433).
- `src/components/tooltip/__tests__/tooltip.test.mts` — component tests. The
  suite already contains adoption tests (from earlier adoption plans — find
  them with `grep -n "adopt" src/components/tooltip/__tests__/tooltip.test.mts`)
  and stylesheet tests around lines 445-459.

`src/components/tooltip/tooltip.mts:259-270` — `loadStylesheet` link
creation + broken error capture:

```ts
    let link = this.#shadow.querySelector<HTMLLinkElement>("link[data-tipviz-link]");
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("data-tipviz-link", "");
      link.setAttribute("rel", "stylesheet");
      const linkHref = link.href;
      link.addEventListener("error", () => {
        console.warn(`[tip-viz-tooltip] Failed to load stylesheet: ${linkHref}`);
      });
      this.#shadow.insertBefore(link, this.#tooltipDiv);
    }
    link.href = stylesheetUrl;
```

`src/components/tooltip/tooltip.mts:419-433` — `#applyConsumerStyles` with
the wrong-document fallback:

```ts
  #applyConsumerStyles() {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(this.#stylesText);

      setAdoptedStyleSheets(this.#shadow, [...getAdoptedStyleSheets(this.#shadow), sheet]);
      this.#adoptedStylesheet = sheet;
    } catch (error) {
      const style = document.createElement("style");
      style.setAttribute("data-tipviz", "1");
      style.textContent = this.#stylesText;
      this.#shadow.appendChild(style);
      console.debug("[tip-viz-tooltip] adoptedStyleSheets unavailable, using <style> injection:", error);
    }
  }
```

Reference for the CORRECT pattern already in the file —
`tooltip.mts:521-527`:

```ts
  #injectConsumerStyleElement() {
    this.#removeInlineStyles();
    const style = this.ownerDocument.createElement("style");
    style.setAttribute("data-tipviz", "1");
    style.textContent = this.#stylesText;
    this.#shadow.appendChild(style);
  }
```

Environment facts the executor must know:

- jsdom (vitest) cannot construct `CSSStyleSheet` reliably — the catch path
  may already be the one exercised under test. Prior sessions mocked
  `CSSStyleSheet` to force specific paths; reuse that pattern (see
  `grep -n "CSSStyleSheet" src/components/tooltip/__tests__/tooltip.test.mts`).
- No browser e2e harness is committed to this repo (verified at `bdbc9eb`:
  no playwright in `package.json`, no e2e files). Browser-only verification
  is OPTIONAL here (step 5) and must not block the plan.

### Repo conventions that apply

- Style: double quotes, semicolons, no `var`, no `for` loops, no `.push()`.
- Test style: model after `describe("ownerDocument body attachment")`
  (tooltip.test.mts:461) and the stylesheet tests at tooltip.test.mts:445-459
  (they query `style[data-tipviz]` / `link[data-tipviz-link]` in
  `tooltip.shadowRoot`).
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

- `src/components/tooltip/tooltip.mts` (lines ~261, ~264-267, ~427)
- `src/components/tooltip/__tests__/tooltip.test.mts` (new tests)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):

- `structural-styles.mts` and its `getAdoptedStyleSheets`/
  `setAdoptedStyleSheets` helpers — correct as-is.
- `#injectConsumerStyleElement` — already correct.
- The structural stylesheet system, positioning, template/data paths
  (Plans 010/011).
- Adding any playwright/browser dependency to `package.json`.

## Git workflow

- Branch: `advisor/012-stylesheet-ownerdocument`
- Commit per logical unit, conventional commits, e.g.:
  `test(tooltip): pin stylesheet error URL reporting` then
  `fix(tooltip): create stylesheet nodes in the owner document`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Red test — error handler must report the URL

In `src/components/tooltip/__tests__/tooltip.test.mts`, next to
`it("loadStylesheet with empty url removes the link")` (line ~453), add:

```ts
it("loadStylesheet error handler reports the failing URL", () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    tooltip.loadStylesheet("/definitely-missing.css");
    const link = tooltip.shadowRoot?.querySelector("link[data-tipviz-link]");
    link?.dispatchEvent(new Event("error"));
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain("/definitely-missing.css");
  } finally {
    warnSpy.mockRestore();
  }
});
```

Match the file's existing `vi` import (it already uses vitest). Keep the
try/finally mock cleanup convention used elsewhere in the suite.

**Verify**: `pnpm test -- tooltip` → this test FAILS (current warning
message contains an empty URL) and all others pass.

### Step 2: Fix the error capture

In `src/components/tooltip/tooltip.mts`, inside `loadStylesheet`, replace:

```ts
      const linkHref = link.href;
      link.addEventListener("error", () => {
        console.warn(`[tip-viz-tooltip] Failed to load stylesheet: ${linkHref}`);
      });
```

with:

```ts
      // WHY: capture the requested URL — link.href is still empty here
      // because href is assigned after this block.
      link.addEventListener("error", () => {
        console.warn(`[tip-viz-tooltip] Failed to load stylesheet: ${stylesheetUrl}`);
      });
```

**Verify**: `pnpm test -- tooltip` → the step-1 test now PASSES; no other
test regressed.

### Step 3: Fix node ownership in both fallback/creation sites

Two one-line changes in `src/components/tooltip/tooltip.mts`:

1. Line ~261, in `loadStylesheet`:
   `link = document.createElement("link");` →
   `link = this.ownerDocument.createElement("link");`
2. Line ~427, in `#applyConsumerStyles` catch block:
   `const style = document.createElement("style");` →
   `const style = this.ownerDocument.createElement("style");`

Confirm exactly two sites changed:
`git diff -- src/components/tooltip/tooltip.mts` should show only these two
lines (plus step 2's block).

**Verify**: `pnpm test` → ALL tests pass. `pnpm run typecheck` → exit 0.
`pnpm run lint` → exit 0.

### Step 4: Cross-document assertion (jsdom)

Add a test that pins the link-creation fix. First inspect the suite's
existing adoption harness:

`grep -n "adopt" src/components/tooltip/__tests__/tooltip.test.mts`

Reuse that harness pattern. The test's intent:

```ts
it("creates the stylesheet link in the tooltip's owner document", () => {
  const otherDoc = document.implementation.createHTMLDocument("adopted");
  otherDoc.body.appendChild(tooltip); // triggers adoption into otherDoc
  tooltip.loadStylesheet("/styles.css");
  const link = tooltip.shadowRoot?.querySelector("link[data-tipviz-link]");
  expect(link?.ownerDocument).toBe(otherDoc);
});
```

Adapt the setup lines to whatever the existing adoption tests do to move the
element between documents (they already solve registry/upgrade quirks in
jsdom). If — and only if — jsdom cannot express this scenario even with the
existing harness (e.g. `appendChild` across documents throws in this jsdom
version), mark the test `it.skip` with a one-line comment referencing real
browser verification, and note it in the report. Do not hack around jsdom
limitations with brittle stubs.

**Verify**: `pnpm test -- tooltip` → the new test passes (or is explicitly
skipped with justification). `pnpm test` → all pass.

### Step 5 (OPTIONAL, non-blocking): real-browser spot check

If a global `playwright` CLI is available in the environment (it is NOT a
repo dependency), a live check is welcome: create a page with an iframe,
move a tooltip into the iframe document, force the `<style>` fallback by
deleting `window.CSSStyleSheet`, call `setStyles(".x{color:red}")`, and
confirm no `HierarchyRequestError` in the console. If the tool is absent or
misbehaves, SKIP this step entirely and say so in the report — jsdom tests
from steps 1-4 are the required gate.

## Test plan

- New: error handler reports the requested URL (red→green, steps 1-2);
  cross-document link ownership (step 4); the `<style>` fallback ownership
  fix is covered mechanically by the code change + existing fallback tests
  (`it("empty string to setStyles() clears all styles")` at line 445
  exercises the same query path).
- Regression: full suite must stay green — the suite has adoption coverage
  from prior plans that would catch accidental breakage of
  `#injectConsumerStyleElement`/adoptedCallback.
- Verification: `pnpm test` → all pass; `pnpm run typecheck` → exit 0;
  `pnpm run lint` → exit 0.

## Done criteria

ALL must hold:

- [ ] `pnpm test` exits 0; error-URL test present and passing
- [ ] `grep -n "document.createElement" src/components/tooltip/tooltip.mts` returns NO matches inside `loadStylesheet`/`#applyConsumerStyles` (the only remaining `document.createElement` uses, if any, must be outside stylesheet paths — verify by reading the grep hits)
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run lint` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts at tooltip.mts:259-270 / :419-433 do not match the live code
  (beyond Plans 010/011 expected changes).
- Fixing ownership makes any previously-green adoption or stylesheet test
  fail (indicates an undocumented dependency on the old behavior).
- The adoption harness in the suite cannot be reused for step 4 AND the
  naive `otherDoc.body.appendChild(tooltip)` approach also fails in jsdom —
  report instead of inventing stubs.
- You find yourself editing `structural-styles.mts` — out of scope.

## Maintenance notes

- A prior (uncommitted) session observed that when `CSSStyleSheet` is mocked
  to throw, a consumer `<style data-tipviz>` fallback appeared absent after
  adoption. That observation was never committed or resolved; if this plan's
  step 4 tests fail in a way that echoes it, STOP and report — it may be a
  separate pre-existing bug worth its own finding.
- Reviewer focus: the PR should be a pure ownership/observability change —
  no behavior change in the happy path.
- If a browser e2e harness ever lands in-repo, promote step 5 to a required
  gate and add the `<style>` fallback ownership scenario to it.
