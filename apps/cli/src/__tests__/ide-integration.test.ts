import { describe, it, expect, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setupIdes, parseIdeOption } from "../ide-integration.js";

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

  it("accepts common aliases for CLI IDE setup", () => {
    expect(parseIdeOption("claude-code")).toEqual(["claude"]);
    expect(parseIdeOption("claude_code,copilot")).toEqual(["claude", "vscode"]);
  });

  it("creates Cline project MCP config and workspace rules", () => {
    const dir = makeTempDir();

    const [result] = setupIdes(dir, ["cline"]);

    expect(result.ide).toBe("cline");
    const mcp = JSON.parse(fs.readFileSync(path.join(dir, ".cline", "mcp.json"), "utf-8"));
    expect(mcp.mcpServers.unforgit).toEqual({ command: "unforgit-mcp", args: [] });
    const rules = fs.readFileSync(path.join(dir, ".clinerules", "unforgit-memory.md"), "utf-8");
    expect(rules).toContain("Unforgit Memory Integration");
  });

  it("creates Roo project MCP config and rules", () => {
    const dir = makeTempDir();

    const [result] = setupIdes(dir, ["roo"]);

    expect(result.ide).toBe("roo");
    const mcp = JSON.parse(fs.readFileSync(path.join(dir, ".roo", "mcp.json"), "utf-8"));
    expect(mcp.mcpServers.unforgit).toEqual({ command: "unforgit-mcp", args: [] });
    const rules = fs.readFileSync(path.join(dir, ".roo", "rules", "unforgit-memory.md"), "utf-8");
    expect(rules).toContain("Unforgit Memory Integration");
  });

  it("creates Codex project MCP config and AGENTS instructions", () => {
    const dir = makeTempDir();

    const [result] = setupIdes(dir, ["codex"]);

    expect(result.ide).toBe("codex");
    const toml = fs.readFileSync(path.join(dir, ".codex", "config.toml"), "utf-8");
    expect(toml).toContain("[mcp_servers.unforgit]");
    expect(toml).toContain('command = "unforgit-mcp"');
    expect(toml).toContain("args = []");
    const agents = fs.readFileSync(path.join(dir, "AGENTS.md"), "utf-8");
    expect(agents).toContain("Unforgit Memory Integration");
  });

  it("creates OpenCode project config and AGENTS instructions", () => {
    const dir = makeTempDir();

    const [result] = setupIdes(dir, ["opencode"]);

    expect(result.ide).toBe("opencode");
    const config = JSON.parse(fs.readFileSync(path.join(dir, "opencode.json"), "utf-8"));
    expect(config.mcp.unforgit).toEqual({
      type: "local",
      command: ["unforgit-mcp"],
      enabled: true,
    });
    const agents = fs.readFileSync(path.join(dir, "AGENTS.md"), "utf-8");
    expect(agents).toContain("Unforgit Memory Integration");
  });
});
