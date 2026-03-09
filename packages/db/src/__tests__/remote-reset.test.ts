import { describe, it, expect, vi } from "vitest";
import { RemoteStore } from "../remote.js";

describe("RemoteStore.resetAll", () => {
  it("ignores missing embeddings and usage tables for older schemas", async () => {
    const store = new RemoteStore("postgresql://user:pass@localhost:5432/test");

    const prisma = {
      memory: {
        findMany: vi.fn().mockResolvedValue([{ id: "m1" }, { id: "m2" }]),
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      memoryEmbedding: {
        deleteMany: vi.fn().mockRejectedValue({
          code: "P2021",
          message: "The table `public.memory_embeddings` does not exist in the current database.",
        }),
      },
      memoryUsage: {
        deleteMany: vi.fn().mockRejectedValue({
          code: "P2021",
          message: "The table `public.memory_usage` does not exist in the current database.",
        }),
      },
      memoryLink: {
        deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
      },
      tombstone: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
      $disconnect: vi.fn(),
    };

    (store as unknown as { prisma: typeof prisma }).prisma = prisma;

    await expect(store.resetAll("org", "repo")).resolves.toEqual({
      memoriesDeleted: 2,
      linksDeleted: 3,
      embeddingsDeleted: 0,
    });
  });
});
