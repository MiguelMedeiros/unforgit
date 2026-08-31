import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node24",
  removeNodeProtocol: false,
  outDir: "dist",
  external: ["node:sqlite"],
  clean: true,
  sourcemap: true,
  dts: true,
});
