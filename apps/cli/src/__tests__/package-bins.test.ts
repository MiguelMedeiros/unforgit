import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("published package binaries", () => {
  it("includes both CLI and MCP binaries in the unforgit package", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve("apps/cli/package.json"), "utf-8"),
    ) as { bin?: Record<string, string> };

    expect(packageJson.bin).toMatchObject({
      unforgit: "dist/index.js",
      "unforgit-mcp": "dist/mcp.js",
    });

    const distMcp = path.resolve("apps/cli/dist/mcp.js");
    if (!fs.existsSync(distMcp)) {
      execFileSync("pnpm", ["--filter", "unforgit", "build"], {
        cwd: path.resolve("."),
        stdio: "inherit",
      });
    }

    const packDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-pack-"));
    try {
      const tarball = execFileSync(
        "npm",
        ["pack", "--pack-destination", packDir, "./apps/cli", "--silent"],
        { cwd: path.resolve("."), encoding: "utf-8" },
      ).trim();
      const contents = execFileSync("tar", ["-tzf", path.join(packDir, tarball)], {
        encoding: "utf-8",
      });
      expect(contents).toContain("package/dist/index.js");
      expect(contents).toContain("package/dist/mcp.js");
      expect(contents).toContain("package/package.json");
    } finally {
      fs.rmSync(packDir, { recursive: true, force: true });
    }
  });

  it("keeps MCP startup logs off stdout so stdio protocol stays clean", () => {
    execFileSync("pnpm", ["--filter", "unforgit", "build"], {
      cwd: path.resolve("."),
      stdio: "inherit",
    });

    const result = spawnSync(process.execPath, [path.resolve("apps/cli/dist/mcp.js")], {
      cwd: path.resolve("."),
      encoding: "utf-8",
      timeout: 1_000,
    });

    // The MCP server is expected to keep running until the client connects or exits.
    // The important invariant is that startup diagnostics never pollute stdout.
    expect(result.stdout).toBe("");
  });
});
