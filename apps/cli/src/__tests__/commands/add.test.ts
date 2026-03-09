import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTempHippoDir } from "../helpers.js";
import { LocalStore } from "@unforgit/db";

describe("add command logic", () => {
  let tmp: ReturnType<typeof createTempHippoDir>;
  let store: LocalStore;

  beforeEach(() => {
    tmp = createTempHippoDir();
    store = new LocalStore(tmp.dbPath);
  });

  afterEach(() => {
    store.close();
    tmp.cleanup();
  });

  it("stores a memory with correct fields", () => {
    const memory = store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "episodic",
      text: "Found a bug in the auth module",
      tags: ["bug", "auth"],
      confidence: 0.9,
    });

    expect(memory.id).toBeDefined();
    expect(memory.memoryType).toBe("episodic");
    expect(memory.text).toBe("Found a bug in the auth module");
    expect(memory.tags).toEqual(["bug", "auth"]);
    expect(memory.confidence).toBe(0.9);
    expect(memory.status).toBe("active");
  });

  it("stores memory with TTL", () => {
    const memory = store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "semantic",
      text: "Temporary convention",
      ttlSeconds: 3600,
    });

    expect(memory.ttlSeconds).toBe(3600);
  });

  it("retrieves stored memory by id", () => {
    const created = store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "semantic",
      text: "test",
    });

    const found = store.getById(created.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(created.id);
    expect(found!.text).toBe("test");
  });

  it("returns undefined for non-existent memory", () => {
    const found = store.getById("non-existent-id");
    expect(found).toBeUndefined();
  });
});
