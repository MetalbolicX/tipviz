# API Reference

This page documents the public API, attributes, types and usage examples for the `TipVizTooltip` Web Component.

---

## Web Component

### TipVizTooltip

A lightweight, framework-agnostic tooltip implemented as a Web Component. It exposes imperative methods to set content, styling and placement behavior, and it emits `show`/`hide` events when visibility changes.

#### Usage (HTML)

```html
<tip-viz-tooltip id="tooltip" transition-duration="300" stylesheet="/tooltip.css"></tip-viz-tooltip>
```

#### Getting the element (JS)

```js
const tooltip = document.getElementById('tooltip');
// tooltip is an instance of the custom element and exposes the methods below
```

#### Observed attributes

- `transition-duration` (number): optional; controls the fade duration for show/hide in milliseconds.
- `stylesheet` (string): optional; URL to a stylesheet that will be added inside the component's shadow root.

---

## Methods

- **`loadStylesheet(url: string): void`**
  - Loads or updates a `<link rel="stylesheet">` inside the component shadow root using the provided `url`.

- **`setHtml(fn: HtmlCallback): void`**
  - Sets the callback used to render HTML content into the tooltip. When `show` is called the component sets `innerHTML` on the tooltip box using the returned string from this function.

- **`setDirection(fn: DirectionFn): void`**
  - Sets the callback that determines the placement `Direction` for a given `data` and `target`.

- **`setOffset(fn: OffsetCallback): void`**
  - Sets the callback that returns an `Offset` pair applied to the computed coordinates. The offset is interpreted as `[topOffset, leftOffset]` (numbers in pixels). These values are added to the computed `top` and `left` respectively.

- **`setStyles(css: string): void`**
  - Applies scoped CSS to the component. Prefers the modern `CSSStyleSheet` + `adoptedStyleSheets` APIs and falls back to injecting a `<style>` element when unavailable.

- **`show(data: Record<string, unknown>, target: Element): void`**
  - Renders content (via `setHtml`), computes placement (via `setDirection` and `setOffset`), positions the tooltip relative to `target`, makes it visible and dispatches a bubbling, composed `show` event with details: `{ target, data, direction, position }`.

- **`hide(): void`**
  - Hides the tooltip (sets opacity to `0`, disables pointer events) and dispatches a bubbling, composed `hide` event.

---

## Events

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
type Offset = [number, number]; // [topOffset, leftOffset]
```

An array of pixel offsets applied to the computed top and left coordinates.

- **`DirectionCallback`**

```ts
type DirectionCallback = (target: Element) => { top: number; left: number };
```

Used internally / available in the types file — returns coordinates for a given target.

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

tooltip.setOffset(() => [6, 0]); // shift 6px down from computed top

tooltip.setStyles(`
  .tipviz-tooltip { background: rgba(0,0,0,0.8); color: white; padding: 6px; border-radius: 4px; }
`);

// Show and hide
tooltip.show({ title: 'Point A', value: 42 }, document.querySelector('#point-a'));
// later
tooltip.hide();
```

---
