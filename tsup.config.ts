import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { "server/index": "src/server/index.ts" },
    format: ["esm"],
    target: "node20",
    outDir: "dist",
    clean: true,
    sourcemap: true,
    dts: true,
  },
  {
    entry: { "cli/index": "src/cli/index.ts" },
    format: ["esm"],
    target: "node20",
    outDir: "dist",
    banner: { js: "#!/usr/bin/env node" },
    sourcemap: true,
  },
  {
    entry: { "tools/index": "src/tools/index.ts" },
    format: ["esm"],
    target: "node20",
    outDir: "dist",
    sourcemap: true,
    dts: true,
  },
  {
    entry: { "mcp/index": "src/mcp/index.ts" },
    format: ["esm"],
    target: "node20",
    outDir: "dist",
    banner: { js: "#!/usr/bin/env node" },
    sourcemap: true,
  },
]);
