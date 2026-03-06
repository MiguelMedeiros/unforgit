import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTempHippoDir } from "../helpers.js";
import { LocalStore } from "../../../db/local.js";

describe("recall logic", () => {
  let tmp: ReturnType<typeof createTempHippoDir>;
  let store: LocalStore;

  beforeEach(() => {
    tmp = createTempHippoDir();
    store = new LocalStore(tmp.dbPath);

    store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "episodic",
      text: "Found a bug in the authentication module",
      tags: ["bug", "auth"],
    });

    store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "semantic",
      text: "We use JWT tokens for session management",
      tags: ["auth", "jwt"],
    });

    store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "procedural",
      text: "To deploy, run make release then kubectl apply",
      tags: ["deploy"],
    });
  });

  afterEach(() => {
    store.close();
    tmp.cleanup();
  });

  it("recalls memories matching a text query", () => {
    const results = store.recall({
      orgId: "test-org",
      repoId: "test-repo",
      query: "authentication",
      k: 10,
    });

    expect(results.length).toBeGreaterThan(0);
    const texts = results.map((r) => r.text);
    expect(texts.some((t) => t.includes("authentication"))).toBe(true);
  });

  it("filters by memory type", () => {
    const results = store.recall({
      orgId: "test-org",
      repoId: "test-repo",
      query: "auth",
      types: ["semantic"],
      k: 10,
    });

    for (const r of results) {
      expect(r.memoryType).toBe("semantic");
    }
  });

  it("filters by tags", () => {
    const results = store.recall({
      orgId: "test-org",
      repoId: "test-repo",
      query: "deploy",
      tags: ["deploy"],
      k: 10,
    });

    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.tags).toContain("deploy");
    }
  });

  it("respects limit k", () => {
    const results = store.recall({
      orgId: "test-org",
      repoId: "test-repo",
      query: "anything",
      k: 1,
    });

    expect(results.length).toBeLessThanOrEqual(1);
  });

  it("returns empty array when no matches", () => {
    const results = store.recall({
      orgId: "test-org",
      repoId: "test-repo",
      query: "zzzzzznonexistent",
      k: 10,
    });

    expect(results).toEqual([]);
  });
});
