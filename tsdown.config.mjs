import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  platform: "browser",
  format: ["esm", "cjs"],
  dts: true,
  minify: true,
});
