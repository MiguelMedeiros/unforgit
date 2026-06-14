import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import YAML from "yaml";
import { createTempDataDir, runCommand } from "../helpers.js";
import { LocalStore } from "unforgit-db";

describe("doctor command", () => {
  let tmp: ReturnType<typeof createTempDataDir>;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    tmp?.cleanup();
  });

  it("returns machine-readable errors and suggested fixes for uninitialized repositories", async () => {
    tmp = createTempDataDir();
    tmp.cleanup();
    process.chdir(originalCwd);

    const result = await runCommand(["doctor", "--json"]);

    expect(result.exitCode).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.summary).toMatchObject({ errors: 1, warnings: 0, ok: 0 });
    expect(payload.results[0]).toMatchObject({
      check: "initialization",
      status: "error",
      fix: "Run 'unforgit init' in the repository root.",
    });
  });

  it("reports local memory, embedding, tombstone, and sync diagnostics without requiring a remote", async () => {
    tmp = createTempDataDir({ remote: { url: "" } });
    process.chdir(tmp.dir);

    const store = new LocalStore(tmp.dbPath);
    try {
      store.store({
        orgId: "test-org",
        repoId: "test-repo",
        scopeType: "repo",
        memoryType: "semantic",
        visibility: "private",
        text: "Doctor test memory",
        tags: [],
      });
    } finally {
      store.close();
    }

    const result = await runCommand(["doctor", "--json"]);

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.summary.errors).toBe(0);
    expect(payload.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ check: "memory-stats", status: "ok" }),
        expect.objectContaining({ check: "embeddings", status: "warn", fix: "Run 'unforgit embeddings backfill'." }),
        expect.objectContaining({ check: "tombstones", status: "ok" }),
        expect.objectContaining({
          check: "sync",
          status: "warn",
          fix: "Run 'unforgit push' to publish local memory changes, or configure/disable sync if this repository is intentionally local-only.",
        }),
        expect.objectContaining({ check: "remote", status: "warn", fix: "Run 'unforgit remote add origin <url>' if this repo should sync remotely." }),
      ]),
    );
    expect(result.stdout).not.toContain(process.env.OPENAI_API_KEY ?? "__missing_openai_key__");
  });

  it("reports localhost remote API offline separately from local memory/provider health", async () => {
    tmp = createTempDataDir({ remote: { url: "http://127.0.0.1:9" } });
    process.chdir(tmp.dir);

    const config = YAML.parse(fs.readFileSync(tmp.configPath, "utf-8"));
    config.sync.enabled = false;
    fs.writeFileSync(tmp.configPath, YAML.stringify(config), "utf-8");

    const store = new LocalStore(tmp.dbPath);
    try {
      const memory = store.store({
        orgId: "test-org",
        repoId: "test-repo",
        scopeType: "repo",
        memoryType: "semantic",
        visibility: "private",
        text: "Local provider should remain healthy when remote API is offline",
        tags: [],
      });
      await store.storeEmbedding(memory.id, [0.1, 0.2, 0.3], "local-hash-multilingual-v1", "local");
    } finally {
      store.close();
    }

    const result = await runCommand(["doctor", "--json"]);

    expect(result.exitCode).toBe(1);
    const payload = JSON.parse(result.stdout);
    expect(payload.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ check: "embedding-provider", status: "ok" }),
        expect.objectContaining({ check: "openai", status: "ok" }),
        expect.objectContaining({ check: "remote", status: "error" }),
      ]),
    );
    const remote = payload.results.find((r: { check: string }) => r.check === "remote");
    expect(remote.message).toContain("Local memory and local embeddings still work");
    expect(remote.fix).toContain("remote.url points to localhost");
  });
});
