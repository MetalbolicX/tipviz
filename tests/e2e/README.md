# e2e Browser Harness

Manual browser verification for three invariants that cannot be tested in jsdom:

- `::part(tooltip-box)` cascade from page-level CSS
- iframe adoption (template/data + consumer styles preserved)
- `--tip-transition-duration` set via inline style on the tooltip box

## Prerequisites

- Global `playwright-cli` must be installed and in `$PATH`
- A browser (Chrome, Firefox, or WebKit) must be installed via `playwright-cli install`

## Build

```bash
pnpm run tsdown:build
```

This produces the ESM bundle at `dist/index.mjs`.

## Serve

In one terminal, serve the project root:

```bash
python3 -m http.server 8741
```

Keep this server running while you run the verifications below.

## Verification Commands

After starting the server, run each `playwright-cli` command in a **separate terminal** (the `open` command blocks).

### Scenario A — `::part(tooltip-box)` cascade

```bash
playwright-cli -s=part open http://localhost:8741/tests/e2e/harness.html
```

Then, with that browser open:

```bash
playwright-cli -s=part eval '() => {
  const tip = document.createElement("tip-viz-tooltip");
  tip.setTemplate("<span>part-test</span>");
  document.body.appendChild(tip);
  const target = document.getElementById("target-part");
  tip.show(target);
  return new Promise(resolve => {
    setTimeout(() => {
      const box = tip.shadowRoot.querySelector("[data-tipviz-tooltip-box]");
      resolve({ background: window.getComputedStyle(box).backgroundColor });
    }, 100);
  });
}'
```

**Expected output**: `background: rgb(12, 34, 56)`

The page-level `::part(tooltip-box)` rule (`rgb(12, 34, 56)`) wins over the structural stylesheet because the structural sheet's `:where([data-tipviz-tooltip-box])` selector has specificity `0` and sets no background.

---

### Scenario B — iframe adoption (template/data + consumer styles survive)

```bash
playwright-cli -s=adopt open http://localhost:8741/tests/e2e/harness.html
```

Then:

```bash
playwright-cli -s=adopt eval '() => {
  const tip = document.createElement("tip-viz-tooltip");
  tip.setTemplate("<span>iframe-test</span>");
  tip.setStyles(".tipviz-tooltip { color: rgb(1, 2, 3); }");
  const iframe = document.getElementById("adoption-frame");
  const iframeDoc = iframe.contentDocument;
  const adopted = iframeDoc.adoptNode(tip);
  iframeDoc.body.appendChild(adopted);
  const tgt = iframeDoc.createElement("div");
  tgt.style.cssText = "position:absolute;top:50px;left:50px;width:100px;height:50px;background:#eee;";
  iframeDoc.body.appendChild(tgt);
  adopted.show(tgt);
  return new Promise(resolve => {
    setTimeout(() => {
      const sr = adopted.shadowRoot;
      const box = sr.querySelector("[data-tipviz-tooltip-box]");
      const span = box.querySelector("span");
      const iframeWin = iframe.contentWindow;
      const computed = iframeWin.getComputedStyle(box);
      // check consumer stylesheet survived
      let hasConsumerStyle = false;
      for (const sheet of sr.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.cssText.includes("rgb(1, 2, 3)")) hasConsumerStyle = true;
          }
        } catch(e) {}
      }
      resolve({
        dataVisible: box.getAttribute("data-visible"),
        spanText: span ? span.textContent : "NO SPAN",
        consumerStyleFound: hasConsumerStyle,
        left: box.style.left,
        top: box.style.top,
        consoleErrors: window.__consoleErrors || []
      });
    }, 300);
  });
}'
```

**Expected values**:
- `dataVisible: "true"`
- `spanText: "iframe-test"`
- `consumerStyleFound: true`
- `left` and `top` are numeric (e.g. `"120px"`, `"45px"`)

Also verify no console errors appeared.

---

### Scenario C — `transition-duration` via inline style

```bash
playwright-cli -s=transition open http://localhost:8741/tests/e2e/harness.html
```

Then:

```bash
playwright-cli -s=transition eval '() => {
  const tip = document.createElement("tip-viz-tooltip");
  tip.setTemplate("<span>td-test</span>");
  document.body.appendChild(tip);
  const target = document.getElementById("target-transition");
  tip.show(target);
  tip.setAttribute("transition-duration", "500");
  return new Promise(resolve => {
    setTimeout(() => {
      const box = tip.shadowRoot.querySelector("[data-tipviz-tooltip-box]");
      const computed = window.getComputedStyle(box);
      resolve({
        transitionDuration: computed.getPropertyValue("--tip-transition-duration")
      });
    }, 100);
  });
}'
```

**Expected output**: `transitionDuration: "500ms"`

The attribute drives `#updateTransitionDuration` which calls `this.#tooltipDiv.style.setProperty("--tip-transition-duration", value)`, so `getComputedStyle(box).getPropertyValue("--tip-transition-duration")` returns the value set on the element's inline style.

---

## Cleanup

After all verifications, stop the HTTP server:

```bash
kill $(lsof -ti:8741)
```

## Not Wired Into CI

These are manual browser-only verifications. They are **not** run by `pnpm test` and are not part of the CI pipeline. They exist because:

- jsdom does not implement `getComputedStyle` for Shadow DOM `::part` pseudo-elements
- jsdom does not support `adoptNode` across iframes
- `getComputedStyle` on inline custom properties requires a real browser

Run `pnpm test` for the automated test suite (~90 passing).
