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
