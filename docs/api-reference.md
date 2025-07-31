# API Reference

This page documents the public API and types of the `tipviz` module, which you can use with the tooltip.

---

## Object

### TipViz

A tooltip utility for D3.js SVG visualizations (TypeScript, d3 v7).

#### Constructor

```ts
new TipViz()
```

Creates a new tooltip instance.

---

## Methods

### attachTo

```ts
attachTo(vis: Selection<SVGSVGElement, unknown, null, undefined>): void
```

Attaches the tooltip to a D3 SVG selection. Initializes the SVG point for coordinate calculations.

- **vis**: D3 selection of the SVG element.

---

### show

```ts
show(...args: any[]): this
```

Shows the tooltip with the given data and event context. The last argument should be the SVG element to anchor the tooltip.

- **args**: Data, event, and the SVG element (last argument).

---


### styles

```ts
styles(css: string): this
```

Sets custom CSS styles for the tooltip HTML content. The styles will be scoped to the direct children of the tooltip node.

- **css**: CSS string to apply to the tooltip content.

---

### hide

```ts
hide(): this
```

Hides the tooltip.

---

### attr

```ts
attr(name: string, value?: string): this | string | null
```

Gets or sets an attribute on the tooltip node.

- **name**: Attribute name.
- **value**: Attribute value (optional).

---

### style

```ts
style(name: string, value?: string): this | string | null
```

Gets or sets a style property on the tooltip node.

- **name**: Style property name.
- **value**: Style property value (optional).

---

### setDirection

```ts
setDirection(fn: DirectionFn): this
```

Sets the direction callback for the tooltip.

- **fn**: Function returning the direction string.

---

### setOffset

```ts
setOffset(fn: OffsetCallback): this
```

Sets the offset callback for the tooltip.

- **fn**: Function returning the `[x, y]` offset.

---

### setHtml

```ts
setHtml(fn: HtmlCallback): this
```

Sets the HTML content callback for the tooltip.

- **fn**: Function returning the HTML string.

---

### setRootElement

```ts
setRootElement(el: HTMLElement): this
```

Sets the root element to which the tooltip node will be appended.

- **el**: The root HTML element.

---

### destroy

```ts
destroy(): this
```

Destroys the tooltip node and removes it from the DOM.

---

## Types

### Direction

```ts
type Direction = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se"
```

---

### Offset

```ts
type Offset = [number, number]
```

---

### DirectionCallback

```ts
type DirectionCallback = (target: SVGGraphicsElement) => { top: number; left: number }
```

---

### HtmlCallback

```ts
type HtmlCallback = (...args: any[]) => string
```

---

### OffsetCallback

```ts
type OffsetCallback = (...args: any[]) => Offset
```

---

### DirectionFn

```ts
type DirectionFn = (...args: any[]) => Direction
```
