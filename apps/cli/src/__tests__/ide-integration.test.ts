import { describe, it, expect, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setupIdes } from "../ide-integration.js";

describe("IDE integration setup", () => {
  const dirs: string[] = [];

  function makeTempDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-ide-test-"));
    dirs.push(dir);
    return dir;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of dirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  it("does not clobber markdown files created during setup", () => {
    const dir = makeTempDir();
    const claudePath = path.join(dir, "CLAUDE.md");
    let injectedConcurrentCreate = false;
    const realOpenSync = fs.openSync;
    const realWriteFileSync = fs.writeFileSync;

    vi.spyOn(fs, "openSync").mockImplementation((target, flags, mode) => {
      if (target === claudePath && !injectedConcurrentCreate) {
        injectedConcurrentCreate = true;
        realWriteFileSync(claudePath, "# Existing project instructions\n", "utf-8");
      }
      return realOpenSync(target, flags, mode);
    });

    vi.spyOn(fs, "writeFileSync").mockImplementation((target, data, options) => {
      if (target === claudePath && !injectedConcurrentCreate) {
        injectedConcurrentCreate = true;
        realWriteFileSync(claudePath, "# Existing project instructions\n", "utf-8");
      }
      return realWriteFileSync(target, data, options);
    });

    const [result] = setupIdes(dir, ["claude"]);

    expect(result.rules?.action).toBe("updated");
    const content = fs.readFileSync(claudePath, "utf-8");
    expect(content).toContain("# Existing project instructions");
    expect(content).toContain("Unforgit Memory Integration");
  });

  it("does not clobber MCP JSON files created during setup", () => {
    const dir = makeTempDir();
    const mcpPath = path.join(dir, ".mcp.json");
    let injectedConcurrentCreate = false;
    const realOpenSync = fs.openSync;
    const realWriteFileSync = fs.writeFileSync;

    function createExistingMcpFile(): void {
      fs.mkdirSync(path.dirname(mcpPath), { recursive: true });
      realWriteFileSync(
        mcpPath,
        JSON.stringify({ mcpServers: { existing: { command: "existing-mcp" } } }, null, 2) + "\n",
        "utf-8",
      );
    }

    vi.spyOn(fs, "openSync").mockImplementation((target, flags, mode) => {
      if (target === mcpPath && !injectedConcurrentCreate) {
        injectedConcurrentCreate = true;
        createExistingMcpFile();
      }
      return realOpenSync(target, flags, mode);
    });

    vi.spyOn(fs, "writeFileSync").mockImplementation((target, data, options) => {
      if (target === mcpPath && !injectedConcurrentCreate) {
        injectedConcurrentCreate = true;
        createExistingMcpFile();
      }
      return realWriteFileSync(target, data, options);
    });

    const [result] = setupIdes(dir, ["claude"]);

    expect(result.mcp?.action).toBe("updated");
    const config = JSON.parse(fs.readFileSync(mcpPath, "utf-8"));
    expect(config.mcpServers.existing).toEqual({ command: "existing-mcp" });
    expect(config.mcpServers.unforgit).toEqual({ command: "unforgit-mcp", args: [] });
  });
});
