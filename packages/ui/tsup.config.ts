import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "primitives/index": "src/primitives/index.ts",
    "components/index": "src/components/index.ts",
    "hooks/index": "src/hooks/index.ts",
    "constants/index": "src/constants/index.ts",
    "utils/index": "src/utils/index.ts",
  },
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "next", "next/dynamic"],
  treeshake: true,
  minify: false,
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
