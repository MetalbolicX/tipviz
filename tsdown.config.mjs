import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/index.mts",
  format: ["cjs", "es", "umd"],
  platform: "browser",
  minify: true,
  dts: true,
  tsconfig: true,
  outDir: "./dist",
  fixedExtension: true,
  outputOptions: {
    name: "TipVizTooltip",
  },
});
