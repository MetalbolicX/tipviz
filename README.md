# tipviz

<div align="center">
  <img src="./docs/_media/tipviz-logo.svg" alt="tipviz Logo" width="200" height="200" />
</div>

> `tipviz` Discover insights on hover with a D3.js tooltip.

**Supported Versions:**

![D3.js](https://img.shields.io/badge/D3.js->=7.9.0-blue)

## Features

- Customizable templateting for tooltips.
- Customizable styles for tooltips.
- Easy integration with existing D3.js projects.

## 🚀 Quick Installation

Add the required dependencies to your project:

```sh
npm i tipviz
```

## 🙌 Hello World Example

```ts
import { select } from "d3";
import { TipViz } from "tipviz";

// Create SVG
const svg = select("body")
  .append("svg")
  .attr("width", 400)
  .attr("height", 200);

// Create SVG
const svg = select("body")
  .append("svg")
  .attr("width", 400)
  .attr("height", 200);

// Draw a circle
svg.append("circle")
  .attr("cx", 200)
  .attr("cy", 100)
  .attr("r", 40)
  .attr("fill", "steelblue");

// Initialize tooltip
const tooltip = new TipViz();
tooltip.attachTo(svg);

// Show/hide tooltip on events
svg.selectAll("circle")
  .on("mouseover", function (event, d) {
    tooltip.show("Hello World", this);
  })
  .on("mouseout", () => tooltip.hide());
```

## 📚 Documentation

<div align="center">

  [![view - Documentation](https://img.shields.io/badge/view-Documentation-blue?style=for-the-badge)](https://metalbolicx.github.io/tipviz/#/api-reference)

</div>

## ✍ Do you want to learn more?

- Learn more about [D3.js](https://d3js.org/).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Technologies used

<table style="border: none;">
  <tr>
    <td align="center">
      <a href="https://d3js.org/" target="_blank">
        <img src="https://upload.wikimedia.org/wikipedia/commons/1/15/Logo_D3.svg" alt="D3.js" width="42" height="42" /><br/>
        <b>D3.js</b><br/>
      </a>
    </td>
  </tr>
</table>

## License

Released under [MIT](/LICENSE) by [@MetalbolicX](https://github.com/MetalbolicX).
