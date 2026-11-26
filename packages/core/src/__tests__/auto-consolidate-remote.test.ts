import { describe, expect, it, vi } from "vitest";
import type { IRemoteStore } from "unforgit-db";
import { findConsolidationCandidatesRemote } from "../auto-consolidate-remote.js";

function memory(id: string) {
  return {
    id,
    orgId: "org",
    repoId: "repo",
    memoryType: "semantic",
    text: `memory ${id}`,
    tags: [],
    status: "active",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
}

function storeWithPairs(pairs: Array<[string, string, number]>): IRemoteStore {
  const ids = pairs.flatMap(([a, b]) => [a, b]);
  const similar = new Map<string, Array<{ id: string; score: number }>>();
  for (const [a, b, score] of pairs) {
    similar.set(a, [{ id: b, score }]);
    similar.set(b, [{ id: a, score }]);
  }

  return {
    list: vi.fn(async () => ids.map(memory)),
    findSimilar: vi.fn(async ({ memoryId }: { memoryId: string }) => similar.get(memoryId) ?? []),
  } as unknown as IRemoteStore;
}

describe("findConsolidationCandidatesRemote pagination", () => {
  const pairs: Array<[string, string, number]> = [
    ["a1", "a2", 0.95],
    ["b1", "b2", 0.9],
    ["c1", "c2", 0.85],
  ];

  it("returns the next page of candidate groups when offset is provided", async () => {
    const firstPage = await findConsolidationCandidatesRemote(storeWithPairs(pairs), "org", "repo", {
      threshold: 0.5,
      maxGroups: 1,
    });
    const secondPage = await findConsolidationCandidatesRemote(storeWithPairs(pairs), "org", "repo", {
      threshold: 0.5,
      maxGroups: 1,
      offset: 1,
    });

    const firstIds = firstPage.candidates.flatMap((c) => c.memories.map((m) => m.id)).sort();
    const secondIds = secondPage.candidates.flatMap((c) => c.memories.map((m) => m.id)).sort();

    expect(firstPage.totalCandidateGroups).toBe(3);
    expect(secondPage.totalCandidateGroups).toBe(3);
    expect(firstIds).toEqual(["a1", "a2"]);
    expect(secondIds).toEqual(["b1", "b2"]);
  });

  it("returns no candidates when offset is past the last group", async () => {
    const result = await findConsolidationCandidatesRemote(storeWithPairs(pairs), "org", "repo", {
      threshold: 0.5,
      maxGroups: 10,
      offset: 3,
    });

    expect(result.candidates).toEqual([]);
    expect(result.totalCandidateGroups).toBe(3);
  });
});
