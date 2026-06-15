import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { LocalStore } from "unforgit-db";
import type { AppConfig } from "unforgit-shared";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const tsxPath = path.join(repoRoot, "apps", "mcp", "node_modules", ".bin", "tsx");
const mcpEntry = path.join(repoRoot, "apps", "mcp", "src", "index.ts");

type TempRepo = {
  dir: string;
  dataDir: string;
  dbPath: string;
  cleanup: () => void;
};

function createTempRepo(configOverrides?: Partial<AppConfig>): TempRepo {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-mcp-e2e-"));
  const dataDir = path.join(dir, ".unforgit");
  fs.mkdirSync(dataDir, { recursive: true });

  const config: AppConfig = {
    remote: {
      url: "http://localhost:3737",
      orgId: "test-org",
      repoId: "test-repo",
      ...configOverrides?.remote,
    },
    defaults: {
      visibility: "auto",
      memoryType: "episodic",
      ...configOverrides?.defaults,
    },
    sync: {
      enabled: false,
      intervalMs: 60000,
      debounceMs: 5000,
      autoResolveConflicts: "last_write_wins",
      ...configOverrides?.sync,
    },
    embeddings: {
      enabled: true,
      provider: "local",
      model: "local-hash-v1",
      autoGenerate: true,
      ...configOverrides?.embeddings,
    },
  };

  const configText = `remote:
  url: ${config.remote.url}
  orgId: ${config.remote.orgId}
  repoId: ${config.remote.repoId}
defaults:
  visibility: ${config.defaults.visibility}
  memoryType: ${config.defaults.memoryType}
sync:
  enabled: ${config.sync.enabled}
  intervalMs: ${config.sync.intervalMs}
  debounceMs: ${config.sync.debounceMs}
  autoResolveConflicts: ${config.sync.autoResolveConflicts}
embeddings:
  enabled: ${config.embeddings.enabled}
  provider: ${config.embeddings.provider ?? "local"}
  model: ${config.embeddings.model}
  autoGenerate: ${config.embeddings.autoGenerate}
`;

  fs.writeFileSync(path.join(dataDir, "unforgit.yaml"), configText, "utf-8");

  return {
    dir,
    dataDir,
    dbPath: path.join(dataDir, "local.db"),
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

async function connectMcp(cwd: string): Promise<{ client: Client; transport: StdioClientTransport }> {
  const transport = new StdioClientTransport({
    command: tsxPath,
    args: [mcpEntry],
    cwd,
    env: {
      ...process.env,
      NODE_ENV: "test",
      NODE_OPTIONS: [process.env.NODE_OPTIONS, "--conditions source"].filter(Boolean).join(" "),
    },
  });
  const client = new Client({ name: "unforgit-mcp-e2e-test", version: "0.0.0" });
  await client.connect(transport);
  return { client, transport };
}

type TextContent = { type: "text"; text: string };

function getText(result: Awaited<ReturnType<Client["callTool"]>>): string {
  return (result.content as TextContent[])
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");
}

describe("unforgit MCP server E2E", () => {
  let temp: TempRepo | undefined;
  let client: Client | undefined;
  let transport: StdioClientTransport | undefined;

  afterEach(async () => {
    await client?.close();
    await transport?.close();
    client = undefined;
    transport = undefined;
    temp?.cleanup();
    temp = undefined;
  });

  it("supports agent read and write tools against a local-first repository", async () => {
    temp = createTempRepo();
    const store = new LocalStore(temp.dbPath);
    try {
      store.store({
        orgId: "test-org",
        repoId: "test-repo",
        memoryType: "semantic",
        text: "Hermes agents should recall repository conventions before editing code.",
        tags: ["hermes", "workflow"],
      });
    } finally {
      store.close();
    }

    ({ client, transport } = await connectMcp(temp.dir));

    const recallResult = await client.callTool({
      name: "unforgit_recall",
      arguments: { query: "repository conventions", k: 5 },
    });
    expect(getText(recallResult)).toContain("Hermes agents should recall repository conventions");

    const addResult = await client.callTool({
      name: "unforgit_add",
      arguments: {
        text: "MCP writes should stay local-first and sync later.",
        type: "semantic",
        tags: ["mcp", "write"],
      },
    });
    expect(getText(addResult)).toContain("Memory stored:");

    const followupRecall = await client.callTool({
      name: "unforgit_recall",
      arguments: { query: "sync later", tags: ["mcp"], k: 5 },
    });
    expect(getText(followupRecall)).toContain("MCP writes should stay local-first and sync later.");
  }, 20_000);

  it("surfaces a clear tool error when the repository is not initialized", async () => {
    temp = {
      dir: fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-mcp-uninitialized-")),
      dataDir: "",
      dbPath: "",
      cleanup() {
        fs.rmSync(this.dir, { recursive: true, force: true });
      },
    };

    ({ client, transport } = await connectMcp(temp.dir));

    const result = await client.callTool({
      name: "unforgit_recall",
      arguments: { query: "anything" },
    });

    expect(result.isError).toBe(true);
    expect(getText(result)).toMatch(/Unforgit not initialized.*unforgit init/);
  }, 20_000);
});
