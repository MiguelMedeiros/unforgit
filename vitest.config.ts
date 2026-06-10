import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "unforgit-shared": resolve(__dirname, "packages/shared/src/index.ts"),
      "unforgit-core": resolve(__dirname, "packages/core/src/index.ts"),
      "unforgit-db": resolve(__dirname, "packages/db/src/index.ts"),
      "unforgit-config": resolve(__dirname, "packages/config/src/index.ts"),
      "@unforgit/tools": resolve(__dirname, "packages/tools/src/index.ts"),
    },
  },
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
