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
  // GHSA-6j4f-fj2g-mc7p, GHSA-qhr7-859c-m2p7, GHSA-q2hr-2g5m-vwhr: brace
  // expansion recursion/quadratic-time denial of service.
  "brace-expansion": "5.0.12",
  // GHSA-jqcg-44mw-7w3h: IP spoofing via IPv4-mapped IPv6 trust subnet.
  "proxy-addr": "2.0.8",
  // GHSA-68fv-2mgg-jv7q: event-loop denial of service via indexed source-map
  // section offsets.
  "source-map-js": "1.2.2",
  // GHSA-wq5f-xc86-pv6w: sharp advisory fixed in 0.35.5.
  sharp: "0.35.5",
};

// Overrides may be keyed by bare name ("fast-uri") or by a selector with a
// version range ("brace-expansion@<5.0.12").
function overrideFor(overrides: Record<string, string>, name: string): string | undefined {
  if (overrides[name] !== undefined) return overrides[name];
  const key = Object.keys(overrides).find((candidate) => candidate.startsWith(`${name}@`));
  return key === undefined ? undefined : overrides[key];
}

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

// Direct dependencies with published advisories. Each entry lists the patched
// minimum per affected major line; locked versions on unlisted majors are not
// affected by the advisory and are ignored.
const directPatchedMinimums: Record<string, string[]> = {
  // GHSA-vcvr-r3jv-pc5j: remote code execution in next/og ImageResponse
  // (affects >=16.2.0 <16.3.6 only).
  // GHSA-4jqv-mc3x-m676, GHSA-mcj8-r9mp-w47p: SSG/ISR cache poisoning and
  // related issues on the 15.x line (fixed in 15.5.27).
  next: ["16.3.6", "15.5.27"],
  // GHSA-6qxp-vccf-f47h: OAuth client could send credentials to an
  // authorization server chosen by the MCP server.
  "@modelcontextprotocol/sdk": ["1.31.0"],
  // GHSA-667r-xxjv-c9mm, GHSA-p68q-wchp-6fh7, GHSA-hwr6-493r-vm6h,
  // GHSA-9q9j-q6p8-xq58, GHSA-4mh8-r7rc-xpvc: validation/auth bypass and
  // HTTP/2 trailer denial of service.
  fastify: ["5.12.5"],
};

describe("direct dependency security floors", () => {
  for (const [name, minimums] of Object.entries(directPatchedMinimums)) {
    it(`locks only patched ${name} versions on affected major lines`, () => {
      const versions = lockedVersions(name);
      expect(versions.length).toBeGreaterThan(0);
      for (const version of versions) {
        const major = version.split(".")[0];
        const minimum = minimums.find((candidate) => candidate.split(".")[0] === major);
        if (minimum === undefined) continue;
        expect(compareSemver(version, minimum), `${name}@${version}`).toBeGreaterThanOrEqual(0);
      }
    });
  }
});

// The website ships from its own npm lockfile (apps/website/Dockerfile runs
// npm ci), so its resolved versions need the same advisory floors.
const websitePatchedMinimums: Record<string, string> = {
  next: "15.5.27",
  sharp: "0.35.5",
  "source-map-js": "1.2.2",
};

describe("website lockfile security floors", () => {
  const websiteLock = JSON.parse(
    fs.readFileSync(path.resolve("apps/website/package-lock.json"), "utf-8"),
  ) as { packages: Record<string, { version?: string }> };

  for (const [name, minimum] of Object.entries(websitePatchedMinimums)) {
    it(`locks only patched ${name} versions in the website lockfile`, () => {
      const versions = Object.entries(websiteLock.packages)
        .filter(([key]) => key.endsWith(`node_modules/${name}`))
        .map(([, entry]) => entry.version ?? "");
      expect(versions.length).toBeGreaterThan(0);
      for (const version of versions) {
        expect(compareSemver(version, minimum), `${name}@${version}`).toBeGreaterThanOrEqual(0);
      }
    });
  }
});

describe("dependency security overrides", () => {
  const rootPackage = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf-8")) as {
    pnpm?: { overrides?: Record<string, string> };
  };
  const overrides = rootPackage.pnpm?.overrides ?? {};

  for (const [name, minimum] of Object.entries(patchedMinimums)) {
    it(`does not pin ${name} below patched ${minimum}`, () => {
      const override = overrideFor(overrides, name);
      expect(override, `${name} override`).toBeDefined();
      const floor = (override ?? "").replace(/^[\^~]/, "");
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
