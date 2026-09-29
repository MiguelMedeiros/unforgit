import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Runtime transitive packages with published advisories whose fixes must stay
// in the lockfile. Keep this list aligned with pnpm.overrides in package.json.
const patchedMinimums: Record<string, string> = {
  // GHSA-58mr-gqgx-xq4g: host confusion via unclosed bracket in URI authority.
  "fast-uri": "3.1.7",
  // GHSA-2vr4-cq9g-pvrc: NAT64 local-use range not classified (SSRF bypass).
  "ip-address": "10.5.1",
};

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

function lockedVersions(name: string): string[] {
  const lockfile = fs.readFileSync(path.resolve("pnpm-lock.yaml"), "utf-8");
  const pattern = new RegExp(`^  '?${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}@(\\d+\\.\\d+\\.\\d+)'?:`, "gm");
  return [...new Set([...lockfile.matchAll(pattern)].map((match) => match[1]))];
}

describe("dependency security overrides", () => {
  const rootPackage = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf-8")) as {
    pnpm?: { overrides?: Record<string, string> };
  };
  const overrides = rootPackage.pnpm?.overrides ?? {};

  for (const [name, minimum] of Object.entries(patchedMinimums)) {
    it(`does not pin ${name} below patched ${minimum}`, () => {
      const override = overrides[name];
      expect(override, `${name} override`).toBeDefined();
      const floor = override.replace(/^[\^~]/, "");
      expect(compareSemver(floor, minimum)).toBeGreaterThanOrEqual(0);
    });

    it(`locks only patched ${name} versions`, () => {
      const versions = lockedVersions(name);
      expect(versions.length).toBeGreaterThan(0);
      for (const version of versions) {
        expect(compareSemver(version, minimum), `${name}@${version}`).toBeGreaterThanOrEqual(0);
      }
    });
  }
});
