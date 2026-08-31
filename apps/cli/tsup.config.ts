import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    mcp: "../mcp/src/index.ts",
  },
  format: ["esm"],
  platform: "node",
  target: "node24",
  removeNodeProtocol: false,
  outDir: "dist",
  banner: { js: "#!/usr/bin/env node" },
  clean: true,
  sourcemap: true,
  noExternal: [/^unforgit-/],
  external: ["node:sqlite", "yaml"],
});
