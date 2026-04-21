# Getting Started

## Pre-requisites

To work with Node.js, you must have version 18 or higher installed.

Check your Node.js version with the following command:

```sh
node -v
```

If you do not have Node.js installed in your current environment, or the installed version is too low, you can use [nvm](https://github.com/nvm-sh/nvm) to install the latest version of Node.js.

## Setup the project

[Vite](https://vitejs.dev/) is a build tool that allows you to create a project quickly and easily. It is recommended to use it to set up the project.

To create a new project with Vite, you can use the following commands:

<!-- tabs:start -->

### **npm**

```sh
npm create vite@latest
```

### **pnpm**

```sh
pnpm create vite
```

### **yarn**

```sh
yarn create vite
```

### **bun**

```sh
bun create vite
```

### **deno**

```sh
deno init --npm vite
```

<!-- tabs:end -->

## Usage

To use the `tipviz` web component, you can either install it using Node.js or include it via a CDN.

### Install using a package manager

To install the `tipviz` web component using any JavaScript package manager, you can use the following command:

<!-- tabs:start -->

#### **npm**

```sh
npm i tipviz
```

#### **pnpm**

```sh
pnpm add tipviz
```

#### **yarn**

```sh
yarn add tipviz
```

#### **bun**

```sh
bun add tipviz
```

#### **deno**

```sh
deno add --npm tipviz
```

<!-- tabs:end -->

### Add the tooltip element to your HTML

Place `<tip-viz-tooltip>` in the `<body>`, alongside your chart or UI elements:

```html
<svg id="chart" width="600" height="400"></svg>
<tip-viz-tooltip id="tooltip"></tip-viz-tooltip>
```

> [!Note] The tooltip element must be a child of `document.body` for correct positioning via `window.scrollY`/`window.scrollX`.

### Register and use the component

In your JavaScript or TypeScript entry file, import `tipviz` to register the custom element, then configure and use it:

```ts
import "tipviz"; // registers <tip-viz-tooltip>
import type { TipVizTooltip } from "tipviz";

const tooltip = document.getElementById("tooltip") as TipVizTooltip;

// Set the HTML content returned by the callback
tooltip.setHtml(({ label, value }) => `
  <div class="tip">
    <strong>${label}</strong>
    <span>${value}</span>
  </div>
`);

// Optional: set a fixed direction or compute it dynamically
tooltip.setDirection(() => "n");

// Optional: shift the tooltip by [x, y] pixels
tooltip.setOffset(() => [0, 8]);

// Optional: style the tooltip
tooltip.setStyles(`
  .tipviz-tooltip { background: rgba(0,0,0,0.85); color: white; padding: 6px; border-radius: 4px; }
`);

// Show / hide on hover
const circles = document.querySelectorAll("circle");
circles.forEach(circle => {
  circle.addEventListener("mouseenter", (e) => {
    tooltip.show({ label: "Point", value: 42 }, e.currentTarget as Element);
  });
  circle.addEventListener("mouseleave", () => tooltip.hide());
});
```
