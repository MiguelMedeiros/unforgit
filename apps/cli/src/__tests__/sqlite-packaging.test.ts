import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type PackageManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: { node?: string };
};

function readManifest(relativePath: string): PackageManifest {
  return JSON.parse(
    fs.readFileSync(path.resolve(relativePath), "utf-8"),
  ) as PackageManifest;
}

describe("SQLite packaging contract", () => {
  it("publishes the CLI for Node 24+ without a native SQLite install dependency", () => {
    const cli = readManifest("apps/cli/package.json");
    const db = readManifest("packages/db/package.json");

    expect(cli.engines?.node).toBe(">=24");
    expect(cli.dependencies).not.toHaveProperty("better-sqlite3");
    expect(db.dependencies).not.toHaveProperty("better-sqlite3");
    expect(db.devDependencies).not.toHaveProperty("@types/better-sqlite3");
  });

  it("runs packed CLI smoke coverage on supported Node and operating systems", () => {
    const workflow = fs.readFileSync(
      path.resolve(".github/workflows/ci.yml"),
      "utf-8",
    );

    expect(workflow).toContain("node-version: 24");
    expect(workflow).toContain("node: 26");
    expect(workflow).toContain("os: ubuntu-latest");
    expect(workflow).toContain("os: macos-latest");
    expect(workflow).toContain("os: windows-latest");
    expect(workflow).toContain("pnpm smoke:packed-cli");
  });

  it("preserves the node: protocol when bundling the built-in SQLite import", () => {
    for (const configPath of [
      "packages/db/tsup.config.ts",
      "apps/cli/tsup.config.ts",
    ]) {
      const config = fs.readFileSync(path.resolve(configPath), "utf-8");
      expect(config).toContain("removeNodeProtocol: false");
      expect(config).toContain('external: ["node:sqlite"');
    }
  });

  it("runs API build and runtime images on a node:sqlite-compatible release", () => {
    const dockerfile = fs.readFileSync(
      path.resolve("apps/api/Dockerfile"),
      "utf-8",
    );

    expect(dockerfile.match(/FROM node:24-alpine/g)).toHaveLength(2);
  });
});
