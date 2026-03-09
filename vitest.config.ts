import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "packages/*/src/**/__tests__/**/*.test.ts",
      "apps/*/src/**/__tests__/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      include: [
        "packages/core/src/**",
        "packages/shared/src/**",
        "apps/cli/src/**",
      ],
      thresholds: {
        lines: 80,
        branches: 80,
      },
    },
    testTimeout: 15_000,
  },
});
