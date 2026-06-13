import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createTempDataDir, runCommand } from "../helpers.js";
import { buildBackfillJsonPayload } from "../../commands/embeddings.js";
import { LocalStore } from "unforgit-db";

describe("embeddings", () => {
  let tmpDir: ReturnType<typeof createTempDataDir>;
  let store: LocalStore;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpDir = createTempDataDir({ remote: { url: "" } });
    store = new LocalStore(tmpDir.dbPath);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    store.close();
    tmpDir.cleanup();
  });

  it("clearEmbeddings removes all embeddings", () => {
    store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "episodic",
      text: "test memory",
      tags: [],
      visibility: "auto",
    });

    const deleted = store.clearEmbeddings();
    expect(deleted).toBeGreaterThanOrEqual(0);
  });

  it("getEmbeddingStats returns correct counts", () => {
    store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "episodic",
      text: "test memory 1",
      tags: [],
      visibility: "auto",
    });
    store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "semantic",
      text: "test memory 2",
      tags: [],
      visibility: "auto",
    });

    const stats = store.getEmbeddingStats("test-org", "test-repo");
    expect(stats.total).toBe(2);
    expect(stats.withoutEmbedding).toBe(2);
    expect(stats.withEmbedding).toBe(0);
  });

  it("getMemoriesWithoutEmbeddings returns only memories without embeddings", () => {
    store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "episodic",
      text: "no embedding",
      tags: [],
      visibility: "auto",
    });

    const without = store.getMemoriesWithoutEmbeddings("test-org", "test-repo");
    expect(without.length).toBe(1);
    expect(without[0].text).toBe("no embedding");
  });

  it("backfill --dry-run --json reports planned work without requiring an OpenAI key", async () => {
    process.chdir(tmpDir.dir);
    store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "semantic",
      text: "needs embedding",
      tags: [],
      visibility: "auto",
    });

    const result = await runCommand(["embeddings", "backfill", "--dry-run", "--json"]);

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toMatchObject({
      dryRun: true,
      provider: "local",
      model: "local-hash-multilingual-v1",
      planned: 1,
      processed: 0,
      errors: 0,
      statsBefore: {
        total: 1,
        withEmbedding: 0,
        withoutEmbedding: 1,
        coverage: 0,
      },
      statsAfter: {
        total: 1,
        withEmbedding: 0,
        withoutEmbedding: 1,
        coverage: 0,
      },
    });
    expect(payload.memories[0]).toMatchObject({ textPreview: "needs embedding" });
  });

  it("backfill generates local embeddings without requiring an OpenAI key", async () => {
    process.chdir(tmpDir.dir);
    const originalOpenAI = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const memory = store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "semantic",
      text: "política de release local-first",
      tags: [],
      visibility: "auto",
    });
    store.close();

    try {
      const result = await runCommand(["embeddings", "backfill", "--json", "--delay", "1"]);

      expect(result.exitCode).toBe(0);
      const payload = JSON.parse(result.stdout);
      expect(payload).toMatchObject({
        dryRun: false,
        provider: "local",
        model: "local-hash-multilingual-v1",
        planned: 1,
        processed: 1,
        errors: 0,
        statsAfter: { total: 1, withEmbedding: 1, withoutEmbedding: 0, coverage: 100 },
      });

      store = new LocalStore(tmpDir.dbPath);
      const embedding = store.getEmbedding(memory.id);
      expect(embedding).toHaveLength(384);
    } finally {
      if (originalOpenAI) {
        process.env.OPENAI_API_KEY = originalOpenAI;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    }
  });

  it("embeddings clear creates a recoverable backup by default", async () => {
    process.chdir(tmpDir.dir);
    const memory = store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "semantic",
      text: "embedded memory",
      tags: [],
      visibility: "auto",
    });
    await store.storeEmbedding(memory.id, [0.1, 0.2, 0.3], "test-model");
    store.close();

    const result = await runCommand(["embeddings", "clear", "--yes"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Created local embeddings backup:");
    const backupRoot = path.join(tmpDir.dataDir, "backups");
    const backupNames = fs
      .readdirSync(backupRoot)
      .filter((name) => name.startsWith("embeddings-clear-"));
    expect(backupNames).toHaveLength(1);

    const backupStore = new LocalStore(path.join(backupRoot, backupNames[0], "local.db"));
    try {
      const embedding = backupStore.getEmbedding(memory.id);
      expect(embedding).toBeDefined();
      expect(embedding?.[0]).toBeCloseTo(0.1);
    } finally {
      backupStore.close();
    }

    store = new LocalStore(tmpDir.dbPath);
    expect(store.getEmbedding(memory.id)).toBeUndefined();
  });

  it("embeddings clear --no-backup skips backup creation", async () => {
    process.chdir(tmpDir.dir);
    const memory = store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "semantic",
      text: "embedded memory without backup",
      tags: [],
      visibility: "auto",
    });
    await store.storeEmbedding(memory.id, [0.4, 0.5, 0.6], "test-model");
    store.close();

    const result = await runCommand(["embeddings", "clear", "--yes", "--no-backup"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain("Created local embeddings backup:");
    expect(fs.existsSync(path.join(tmpDir.dataDir, "backups"))).toBe(false);

    store = new LocalStore(tmpDir.dbPath);
    expect(store.getEmbedding(memory.id)).toBeUndefined();
  });

  it("builds post-run backfill JSON with before/after coverage and failure details", () => {
    const payload = buildBackfillJsonPayload({
      dryRun: false,
      model: "text-embedding-3-small",
      statsBefore: { total: 4, withEmbedding: 1, withoutEmbedding: 3 },
      statsAfter: { total: 4, withEmbedding: 3, withoutEmbedding: 1 },
      planned: 3,
      processed: 2,
      failures: [{ id: "mem-3", textPreview: "failed memory", error: "rate limited" }],
    });

    expect(payload).toMatchObject({
      dryRun: false,
      model: "text-embedding-3-small",
      planned: 3,
      processed: 2,
      errors: 1,
      failures: [{ id: "mem-3", textPreview: "failed memory", error: "rate limited" }],
      statsBefore: { total: 4, withEmbedding: 1, withoutEmbedding: 3, coverage: 25 },
      statsAfter: { total: 4, withEmbedding: 3, withoutEmbedding: 1, coverage: 75 },
    });
  });
});
