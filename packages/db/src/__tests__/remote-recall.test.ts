import { describe, expect, it, vi } from "vitest";
import { RemoteStore } from "../remote.js";

function buildStoreWithPrisma() {
  const store = new RemoteStore("postgresql://user:***@localhost:5432/test");
  const prisma = {
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    $disconnect: vi.fn(),
  };

  (store as unknown as { prisma: typeof prisma }).prisma = prisma;
  (store as unknown as { getUsageStats: RemoteStore["getUsageStats"] }).getUsageStats = vi.fn().mockResolvedValue([]);

  return { store, prisma };
}

describe("RemoteStore.recall", () => {
  it("applies recall filters to the PostgreSQL FTS query", async () => {
    const { store, prisma } = buildStoreWithPrisma();
    const from = new Date("2026-01-01T00:00:00.000Z");
    const to = new Date("2026-01-31T00:00:00.000Z");

    await store.recall({
      orgId: "org",
      repoId: "repo",
      query: "security hardening",
      types: ["episodic", "semantic"],
      tags: ["security", "api"],
      timeRange: { from, to },
      k: 3,
    });

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    const [sql, ...params] = prisma.$queryRawUnsafe.mock.calls[0];

    expect(sql).toContain("m.status = $4");
    expect(sql).toContain("m.ttl_seconds IS NULL");
    expect(sql).toContain("m.memory_type IN ($5, $6)");
    expect(sql).toContain("m.tags && ARRAY[$7, $8]::text[]");
    expect(sql).toContain("m.created_at >= $9");
    expect(sql).toContain("m.created_at <= $10");
    expect(sql).toContain("LIMIT $11");
    expect(params).toEqual([
      "security hardening",
      "org",
      "repo",
      "active",
      "episodic",
      "semantic",
      "security",
      "api",
      from,
      to,
      6,
    ]);
  });

  it("honors includeDeprecated and includeExpired for PostgreSQL FTS recall", async () => {
    const { store, prisma } = buildStoreWithPrisma();

    await store.recall({
      orgId: "org",
      repoId: "repo",
      query: "deprecated memory",
      includeDeprecated: true,
      includeExpired: true,
    });

    const [sql, ...params] = prisma.$queryRawUnsafe.mock.calls[0];

    expect(sql).not.toContain("m.status =");
    expect(sql).not.toContain("m.ttl_seconds");
    expect(sql).toContain("LIMIT $4");
    expect(params).toEqual(["deprecated memory", "org", "repo", 20]);
  });
});
