import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Images built from the repository root context. A COPY source that no longer
// exists (for example a removed patches/ directory) breaks `docker build`, which
// CI does not run, so guard the sources statically.
const rootContextDockerfiles = ["apps/api/Dockerfile", "apps/admin/Dockerfile"];

function copySources(dockerfile: string): string[] {
  const sources: string[] = [];
  for (const rawLine of dockerfile.split("\n")) {
    const line = rawLine.trim();
    if (!/^COPY\s/i.test(line)) continue;
    const args = line
      .split(/\s+/)
      .slice(1)
      .filter((arg) => !arg.startsWith("--"));
    // Skip copies from earlier build stages (COPY --from=...).
    if (/--from=/i.test(line)) continue;
    sources.push(...args.slice(0, -1));
  }
  return sources;
}

describe("root-context Dockerfile COPY sources", () => {
  for (const dockerfilePath of rootContextDockerfiles) {
    it(`${dockerfilePath} only copies paths that exist in the repository`, () => {
      const dockerfile = fs.readFileSync(path.resolve(dockerfilePath), "utf-8");
      const sources = copySources(dockerfile);
      expect(sources.length).toBeGreaterThan(0);
      for (const source of sources) {
        expect(fs.existsSync(path.resolve(source)), `${dockerfilePath}: COPY ${source}`).toBe(true);
      }
    });
  }
});
