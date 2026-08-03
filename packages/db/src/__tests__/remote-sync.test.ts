import { describe, expect, it, vi } from "vitest";
import type { Memory } from "unforgit-shared";
import { RemoteStore } from "../remote.js";

describe("RemoteStore.upsertFromLocal", () => {
  it("does not overwrite newer remote data when versions conflict", async () => {
    const store = new RemoteStore("postgresql://user:***@localhost:5432/test");
    const prisma = {
      memory: {
        findUnique: vi.fn().mockResolvedValue({
          id: "memory-1",
          version: 2,
          updatedAt: new Date("2026-08-03T12:00:00.000Z"),
        }),
        update: vi.fn(),
      },
      $disconnect: vi.fn(),
    };

    (store as unknown as { prisma: typeof prisma }).prisma = prisma;

    const staleMemory: Memory = {
      id: "memory-1",
      orgId: "org",
      repoId: "repo",
      scopeType: "repo",
      memoryType: "semantic",
      visibility: "repo",
      status: "active",
      text: "stale local content",
      tags: [],
      version: 3,
      createdAt: new Date("2026-08-03T10:00:00.000Z"),
      updatedAt: new Date("2026-08-03T11:00:00.000Z"),
    };

    await expect(store.upsertFromLocal(staleMemory)).resolves.toEqual({
      action: "skipped",
      conflict: true,
    });
    expect(prisma.memory.update).not.toHaveBeenCalled();
  });
});
