import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTempDataDir } from "../helpers.js";
import { LocalStore } from "unforgit-db";

describe("reset", () => {
  let tmpDir: ReturnType<typeof createTempDataDir>;
  let store: LocalStore;

  beforeEach(() => {
    tmpDir = createTempDataDir();
    store = new LocalStore(tmpDir.dbPath);
  });

  afterEach(() => {
    store.close();
    tmpDir.cleanup();
  });

  it("resetAll deletes all memories", () => {
    store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "episodic",
      text: "memory 1",
      tags: [],
      visibility: "auto",
    });
    store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "semantic",
      text: "memory 2",
      tags: [],
      visibility: "auto",
    });

    const before = store.list({ orgId: "test-org", repoId: "test-repo" });
    expect(before.length).toBe(2);

    const result = store.resetAll();
    expect(result.memoriesDeleted).toBe(2);

    const after = store.list({ orgId: "test-org", repoId: "test-repo" });
    expect(after.length).toBe(0);
  });

  it("resetAll deletes links too", () => {
    const m1 = store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "episodic",
      text: "memory 1",
      tags: [],
      visibility: "auto",
    });
    const m2 = store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "episodic",
      text: "memory 2",
      tags: [],
      visibility: "auto",
    });

    store.link({ sourceId: m1.id, targetId: m2.id, linkType: "related_to" });

    const result = store.resetAll();
    expect(result.memoriesDeleted).toBe(2);
    expect(result.linksDeleted).toBe(1);
  });

  it("resetAll handles empty database", () => {
    const result = store.resetAll();
    expect(result.memoriesDeleted).toBe(0);
    expect(result.linksDeleted).toBe(0);
    expect(result.embeddingsDeleted).toBe(0);
  });
});
