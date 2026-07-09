import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");
const pluginRoot = path.join(repoRoot, "plugins", "claude-code", "unforgit");
const marketplacePath = path.join(
  repoRoot,
  "plugins",
  "claude-code",
  ".claude-plugin",
  "marketplace.json",
);

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

describe("Claude Code plugin artifacts", () => {
  it("ships a valid plugin manifest with immutable unforgit slug", () => {
    const manifest = readJson<{
      name: string;
      version: string;
      description: string;
      author: { name: string };
      homepage: string;
      repository: string;
      keywords: string[];
    }>(path.join(pluginRoot, ".claude-plugin", "plugin.json"));

    expect(manifest.name).toBe("unforgit");
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(manifest.description).toContain("repository memory");
    expect(manifest.author.name).toBe("Unforgit");
    expect(manifest.homepage).toBe("https://github.com/MiguelMedeiros/unforgit");
    expect(manifest.repository).toBe("https://github.com/MiguelMedeiros/unforgit");
    expect(manifest.keywords).toEqual(
      expect.arrayContaining(["memory", "mcp", "agents"]),
    );
  });

  it("registers the Unforgit MCP server without embedding secrets", () => {
    const mcp = readJson<{
      mcpServers: Record<string, { command: string; args: string[]; env?: unknown }>;
    }>(path.join(pluginRoot, ".mcp.json"));

    expect(mcp.mcpServers.unforgit).toEqual({
      command: "unforgit-mcp",
      args: [],
    });
    expect(JSON.stringify(mcp)).not.toMatch(/OPENAI_API_KEY|sk-[a-zA-Z0-9]|token|secret|password/i);
  });

  it("includes memory skills and slash commands for core workflows", () => {
    const skill = fs.readFileSync(
      path.join(pluginRoot, "skills", "unforgit-memory", "SKILL.md"),
      "utf-8",
    );
    expect(skill).toContain("unforgit_recall");
    expect(skill).toContain("unforgit_add");
    expect(skill).toContain("Do not save secrets");
    expect(skill).toContain("Do not save temporary progress");

    for (const command of [
      "unforgit.md",
      "unforgit-recall.md",
      "unforgit-remember.md",
      "unforgit-health.md",
      "unforgit-curate.md",
    ]) {
      const body = fs.readFileSync(path.join(pluginRoot, "commands", command), "utf-8");
      expect(body).toContain("Unforgit");
    }
  });

  it("publishes a Claude Code marketplace catalog entry pointing at the plugin subdir", () => {
    const marketplace = readJson<{
      $schema: string;
      name: string;
      plugins: Array<{
        name: string;
        category: string;
        source: string | { source: string; url: string; path: string; ref?: string };
      }>;
    }>(marketplacePath);

    expect(marketplace.$schema).toBe("https://anthropic.com/claude-code/marketplace.schema.json");
    expect(marketplace.name).toBe("unforgit-claude-code-marketplace");
    expect(marketplace.plugins).toHaveLength(1);
    expect(marketplace.plugins[0]).toMatchObject({
      name: "unforgit",
      category: "development",
      source: {
        source: "git-subdir",
        url: "https://github.com/MiguelMedeiros/unforgit.git",
        path: "plugins/claude-code/unforgit",
      },
    });
  });

  it("documents marketplace installation in public docs", () => {
    const readme = fs.readFileSync(path.join(repoRoot, "README.md"), "utf-8");
    const mcpDocs = fs.readFileSync(path.join(repoRoot, "docs", "mcp.md"), "utf-8");

    for (const docs of [readme, mcpDocs]) {
      expect(docs).toContain("/plugin marketplace add MiguelMedeiros/unforgit");
      expect(docs).toContain("/plugin install unforgit");
    }
  });
});
