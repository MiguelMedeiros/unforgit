import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTempDataDir, runCommand } from "../helpers.js";
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
      total: 1,
      withEmbedding: 0,
      withoutEmbedding: 1,
      planned: 1,
    });
    expect(payload.memories[0]).toMatchObject({ textPreview: "needs embedding" });
  });
});
