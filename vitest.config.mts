import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.mts"],
    globals: true,
  },
  coverage: {
    provider: "v8",
    include: ["src/components/**/*.mts"],
    exclude: ["**/*.test.mts"],
    thresholds: {
      lines: 90,
      branches: 73,
      functions: 90,
    },
  },
});
