# API Reference

This page documents the public API and types of the `tipviz` module, which provides a customizable tooltip as a Web Component.

---

## Web Component

### TipVizTooltip

A customizable tooltip utility built as a Web Component, compatible with any JavaScript project.

#### Usage

```html
<!-- In HTML -->
<tip-viz-tooltip id="tooltip" transition-duration="300"></tip-viz-tooltip>
```

```ts
// In JavaScript/TypeScript
import { TipVizTooltip } from 'tipviz';

// Get reference to element
const tooltip = document.getElementById('tooltip');

// Configure tooltip
tooltip.setHtml(data => `<div>${data.title}</div>`);
```

#### Attributes

| Attribute | Type | Description |
| --- | --- | --- |
| `transition-duration` | number | Sets the fade transition duration in milliseconds |

---

## Methods

### setHtml

```ts
setHtml(fn: HtmlCallback): void
```

Sets the HTML content for the tooltip.

- **fn**: A function that takes data and returns HTML content for the tooltip.

```ts
tooltip.setHtml((point) => `<div>${point.x}, ${point.y}</div>`);
```

---

### setStyles

```ts
setStyles(css: string): void
```

Sets the CSS styles for the tooltip. The styles will be scoped to the tooltip's shadow DOM.

- **css**: CSS string to apply to the tooltip content.

```ts
tooltip.setStyles(`
  .tooltip-content {
    background: black;
    color: white;
    padding: 5px;
    border-radius: 3px;
  }
`);
```

---

### setDirection

```ts
setDirection(fn: DirectionFn): void
```

Sets the direction callback for the tooltip.

- **fn**: Function returning the direction string.

```ts
tooltip.setDirection((target) => {
  return target.getBoundingClientRect().top < window.innerHeight / 2 ? "n" : "s";
});
```

---

### setOffset

```ts
setOffset(fn: OffsetCallback): void
```

Sets the offset callback for the tooltip.

- **fn**: Function returning the `[top, left]` offset.

```ts
tooltip.setOffset((target) => {
  return [10, 20]; // 10px top, 20px left
});
```

---

### show

```ts
show(data: Record<string, unknown>, target: Element): void
```

Shows the tooltip at the specified target element with the provided data.

- **data**: The data to display in the tooltip.
- **target**: The target element to position the tooltip relative to.

```ts
tooltip.show({ x: 100, y: 200 }, document.getElementById("myElement"));
```

---

### hide

```ts
hide(): void
```

Hides the tooltip.

```ts
tooltip.hide();
```

---

## Events

The component fires the following custom events:

### showEvent

Fired when the tooltip is shown.

```ts
tooltip.addEventListener('show', (event) => {
  const { target, data, direction, position } = event.detail;
  console.log('Tooltip shown', event.detail);
});
```

### hideEvent

Fired when the tooltip is hidden.

```ts
tooltip.addEventListener('hide', () => {
  console.log('Tooltip hidden');
});
```

---

## Types

### Direction

```ts
type Direction = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se"
```

Represents the position of the tooltip relative to the target element:

- `n`: North (above)
- `s`: South (below)
- `e`: East (right)
- `w`: West (left)
- `nw`: North-west (above and to the left)
- `ne`: North-east (above and to the right)
- `sw`: South-west (below and to the left)
- `se`: South-east (below and to the right)

---

### Offset

```ts
type Offset = [number, number]
```

An array representing [top, left] offset in pixels.

---

### DirectionCallback

```ts
type DirectionCallback = (target: Element) => { top: number; left: number }
```

A function that calculates position coordinates based on a target element.

---

### HtmlCallback

```ts
type HtmlCallback = (...args: any[]) => string
```

A function that generates HTML content for the tooltip.

---

### OffsetCallback

```ts
type OffsetCallback = (...args: any[]) => Offset
```

A function that returns the offset of the tooltip.

---

### DirectionFn

```ts
type DirectionFn = (...args: any[]) => Direction
```

A function that determines the direction of the tooltip.
