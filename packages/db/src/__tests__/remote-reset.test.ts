import { describe, it, expect, vi } from "vitest";
import { RemoteStore } from "../remote.js";

describe("RemoteStore.resetAll", () => {
  it("scopes every delete inside one serializable transaction", async () => {
    const store = new RemoteStore("postgresql://user:***@localhost:5432/test");
    const embeddingDelete = Promise.resolve({ count: 1 });
    const usageDelete = Promise.resolve({ count: 1 });
    const linkDelete = Promise.resolve({ count: 1 });
    const tombstoneDelete = Promise.resolve({ count: 1 });
    const memoryDelete = Promise.resolve({ count: 1 });
    const transactionError = new Error("transaction failed");

    const prisma = {
      memory: {
        deleteMany: vi.fn().mockReturnValue(memoryDelete),
      },
      memoryEmbedding: {
        deleteMany: vi.fn().mockReturnValue(embeddingDelete),
      },
      memoryUsage: {
        deleteMany: vi.fn().mockReturnValue(usageDelete),
      },
      memoryLink: {
        deleteMany: vi.fn().mockReturnValue(linkDelete),
      },
      tombstone: {
        deleteMany: vi.fn().mockReturnValue(tombstoneDelete),
      },
      $transaction: vi.fn().mockRejectedValue(transactionError),
      $disconnect: vi.fn(),
    };

    (store as unknown as { prisma: typeof prisma }).prisma = prisma;

    await expect(store.resetAll("org", "repo")).rejects.toThrow("transaction failed");
    expect(prisma.memoryEmbedding.deleteMany).toHaveBeenCalledWith({
      where: { memory: { is: { orgId: "org", repoId: "repo" } } },
    });
    expect(prisma.memoryUsage.deleteMany).toHaveBeenCalledWith({
      where: { memory: { is: { orgId: "org", repoId: "repo" } } },
    });
    expect(prisma.memoryLink.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { source: { is: { orgId: "org", repoId: "repo" } } },
          { target: { is: { orgId: "org", repoId: "repo" } } },
        ],
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(
      [embeddingDelete, usageDelete, linkDelete, tombstoneDelete, memoryDelete],
      { isolationLevel: "Serializable" },
    );
  });

  it("retries serializable transaction conflicts", async () => {
    const store = new RemoteStore("postgresql://user:***@localhost:5432/test");
    const prisma = {
      memory: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
      memoryEmbedding: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      memoryUsage: { deleteMany: vi.fn().mockResolvedValue({ count: 3 }) },
      memoryLink: { deleteMany: vi.fn().mockResolvedValue({ count: 4 }) },
      tombstone: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      $transaction: vi.fn()
        .mockRejectedValueOnce({ code: "P2034", message: "write conflict" })
        .mockImplementationOnce(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
      $disconnect: vi.fn(),
    };

    (store as unknown as { prisma: typeof prisma }).prisma = prisma;

    await expect(store.resetAll("org", "repo")).resolves.toEqual({
      memoriesDeleted: 2,
      linksDeleted: 4,
      embeddingsDeleted: 1,
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it("ignores missing embeddings and usage tables for older schemas", async () => {
    const store = new RemoteStore("postgresql://user:pass@localhost:5432/test");

    const prisma = {
      memory: {
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
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });
});
