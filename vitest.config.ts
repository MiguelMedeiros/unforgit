import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/cli/**", "src/core/**"],
      thresholds: {
        lines: 80,
        branches: 80,
      },
    },
    testTimeout: 15_000,
  },
});
