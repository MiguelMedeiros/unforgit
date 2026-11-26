import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { LocalStore } from "../local.js";

const scope = { orgId: "test-org", repoId: "test-repo" };

describe("LocalStore consolidation integrity", () => {
  let tmpDir: string;
  let store: LocalStore;
  let a: string;
  let b: string;
  let c: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-local-consolidation-"));
    store = new LocalStore(path.join(tmpDir, "local.db"));
    a = store.store({ ...scope, memoryType: "semantic", text: "alpha fact", tags: [] }).id;
    b = store.store({ ...scope, memoryType: "semantic", text: "beta fact", tags: [] }).id;
    c = store.store({ ...scope, memoryType: "semantic", text: "gamma fact", tags: [] }).id;
  });

  afterEach(() => {
    store.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function consolidations() {
    return store
      .list({ ...scope, limit: 100 })
      .filter((memory) => memory.isConsolidation);
  }

  it("rejects a consolidation whose source IDs are one memory repeated, leaving no partial consolidation", () => {
    expect(() =>
      store.consolidateMemories({ ...scope, sourceIds: [a, a], consolidatedText: "merged" }),
    ).toThrow(/at least 2 distinct source memories/i);

    expect(consolidations()).toHaveLength(0);
    expect(store.getLinks({ memoryId: a })).toHaveLength(0);
  });

  it("deduplicates repeated source IDs when at least two distinct memories are given", () => {
    const result = store.consolidateMemories({
      ...scope,
      sourceIds: [a, b, a],
      consolidatedText: "merged",
    });

    expect(result.sourceIds).toEqual([a, b]);
    expect(result.sourcesPreserved).toBe(2);
    expect(
      store.getLinks({ memoryId: result.consolidatedId, linkType: "derived_from" }),
    ).toHaveLength(2);
  });

  it("reconsolidates when an additional source is already part of the consolidation", () => {
    const first = store.consolidateMemories({
      ...scope,
      sourceIds: [a, b],
      consolidatedText: "v1",
    });

    const second = store.reconsolidate({
      ...scope,
      existingConsolidationId: first.consolidatedId,
      additionalSourceIds: [b, c, c],
      newText: "v2",
    });

    expect(second.version).toBe(2);
    expect(store.getById(first.consolidatedId)?.status).toBe("superseded");
    expect(consolidations().filter((m) => m.status === "active").map((m) => m.id)).toEqual([
      second.consolidatedId,
    ]);
    const newLinks = store
      .getLinks({ memoryId: second.consolidatedId, linkType: "derived_from" })
      .filter((link) => link.sourceId === second.consolidatedId)
      .map((link) => link.targetId)
      .sort();
    expect(newLinks).toEqual([first.consolidatedId, c].sort());
  });

  it("rejects a reconsolidation that lists the consolidation as its own source without leaving an orphan", () => {
    const first = store.consolidateMemories({
      ...scope,
      sourceIds: [a, b],
      consolidatedText: "v1",
    });

    expect(() =>
      store.reconsolidate({
        ...scope,
        existingConsolidationId: first.consolidatedId,
        additionalSourceIds: [first.consolidatedId],
        newText: "v2",
      }),
    ).toThrow();

    expect(store.getById(first.consolidatedId)?.status).toBe("active");
    expect(consolidations().map((m) => m.id)).toEqual([first.consolidatedId]);
  });
});
