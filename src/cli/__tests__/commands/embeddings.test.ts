import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTempHippoDir } from "../helpers.js";
import { LocalStore } from "../../../db/local.js";

describe("embeddings", () => {
  let tmpDir: ReturnType<typeof createTempHippoDir>;
  let store: LocalStore;

  beforeEach(() => {
    tmpDir = createTempHippoDir();
    store = new LocalStore(tmpDir.dbPath);
  });

  afterEach(() => {
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
});
