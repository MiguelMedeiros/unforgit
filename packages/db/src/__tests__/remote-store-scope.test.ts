import { describe, expect, it, vi } from "vitest";
import { RemoteStore } from "../remote.js";

const id = "3e7dd5df-ff40-4bc1-8419-1e165fe6c2ab";
const row = {
  id,
  orgId: "org-a",
  repoId: "repo-a",
  scopeType: "repo",
  memoryType: "semantic",
  visibility: "repo",
  status: "active",
  text: "replacement memory",
  summary: null,
  tags: [],
  sourceRefs: null,
  confidence: null,
  ttlSeconds: null,
  supersedesId: null,
  version: 1,
  deletedAt: null,
  deletedBy: null,
  createdAt: new Date("2026-09-09T00:00:00.000Z"),
  updatedAt: new Date("2026-09-09T00:00:00.000Z"),
};

function buildStore(queryResult: Array<{ id: string }>) {
  const prisma = {
    $queryRaw: vi.fn().mockResolvedValue(queryResult),
    $transaction: vi.fn(async (operation: unknown) => {
      if (typeof operation === "function") {
        return operation(prisma);
      }
      return operation;
    }),
    memory: {
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn().mockResolvedValue(row),
      updateMany: vi.fn(),
    },
    tombstone: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  const store = new RemoteStore("postgresql://localhost/unforgit", {
    autoEmbeddingEnabled: false,
  });
  Object.defineProperty(store, "prisma", { value: prisma });
  return { prisma, store };
}

const input = {
  id,
  orgId: "org-a",
  repoId: "repo-a",
  memoryType: "semantic" as const,
  text: "replacement memory",
};

describe("RemoteStore.storeWithinScope", () => {
  it("uses the regular create path when the caller does not provide an ID", async () => {
    const { prisma, store } = buildStore([{ id }]);
    const storeSpy = vi.spyOn(store, "store").mockResolvedValue(
      row as unknown as Awaited<ReturnType<RemoteStore["store"]>>,
    );
    const inputWithoutId = { ...input, id: undefined };

    await expect(
      store.storeWithinScope(inputWithoutId, {
        orgId: "org-a",
        repoId: "repo-a",
      }),
    ).resolves.toMatchObject({ id });
    expect(storeSpy).toHaveBeenCalledWith(inputWithoutId);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("fails closed when the payload is outside the authorized scope", async () => {
    const { prisma, store } = buildStore([{ id }]);

    await expect(
      store.storeWithinScope(input, { orgId: "org-b", repoId: null }),
    ).resolves.toBeUndefined();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("returns undefined when an explicit ID collides outside the authorized scope", async () => {
    const { prisma, store } = buildStore([]);

    await expect(
      store.storeWithinScope(input, { orgId: "org-a", repoId: "repo-a" }),
    ).resolves.toBeUndefined();
    expect(prisma.memory.findUnique).not.toHaveBeenCalled();

    const query = prisma.$queryRaw.mock.calls[0][0] as {
      text: string;
      values: unknown[];
    };
    expect(query.text).toContain('ON CONFLICT ("id") DO UPDATE');
    expect(query.text).toContain('LOWER("memories"."org_id")');
    expect(query.text).toContain('LOWER("memories"."repo_id")');
    expect(query.text).toContain('RETURNING "id"');
    expect(query.values).toContain("org-a");
    expect(query.values).toContain("repo-a");
  });

  it("returns the atomically stored memory when the scope guard succeeds", async () => {
    const { prisma, store } = buildStore([{ id }]);

    await expect(
      store.storeWithinScope(input, { orgId: "org-a", repoId: "repo-a" }),
    ).resolves.toMatchObject({
      id,
      orgId: "org-a",
      repoId: "repo-a",
      text: "replacement memory",
    });
    expect(prisma.memory.findUnique).toHaveBeenCalledWith({ where: { id } });
  });

  it("allows an organization-wide key to update another repository in its organization", async () => {
    const { prisma, store } = buildStore([{ id }]);

    await expect(
      store.storeWithinScope(input, { orgId: "org-a", repoId: null }),
    ).resolves.toMatchObject({ id });

    const query = prisma.$queryRaw.mock.calls[0][0] as {
      text: string;
      values: unknown[];
    };
    expect(query.text).toContain("::text IS NULL");
    expect(query.values).toContain(null);
  });
});

describe("RemoteStore.hardDelete", () => {
  it("fails closed when the memory no longer matches the authorized repository", async () => {
    const { prisma, store } = buildStore([]);
    prisma.memory.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      store.hardDelete(id, { orgId: "Org-A", repoId: "Repo-A" }),
    ).resolves.toBe(false);
    expect(prisma.memory.deleteMany).toHaveBeenCalledWith({
      where: {
        id,
        orgId: { equals: "Org-A", mode: "insensitive" },
        repoId: { equals: "Repo-A", mode: "insensitive" },
      },
    });
  });
});

describe("RemoteStore.deprecate", () => {
  it("fails closed when the memory leaves the authorized repository before the final write", async () => {
    const { prisma, store } = buildStore([]);
    prisma.memory.findFirst.mockResolvedValue(row);
    prisma.memory.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      store.deprecate(id, "outdated", {
        orgId: "Org-A",
        repoId: "Repo-A",
      }),
    ).resolves.toBe(false);

    expect(prisma.memory.findFirst).toHaveBeenCalledWith({
      where: {
        id,
        orgId: { equals: "Org-A", mode: "insensitive" },
        repoId: { equals: "Repo-A", mode: "insensitive" },
      },
    });
    expect(prisma.memory.updateMany).toHaveBeenCalledWith({
      where: {
        id,
        orgId: { equals: "Org-A", mode: "insensitive" },
        repoId: { equals: "Repo-A", mode: "insensitive" },
      },
      data: {
        status: "deprecated",
        sourceRefs: { deprecation_reason: "outdated" },
      },
    });
  });
});

describe("RemoteStore scoped soft delete and restore", () => {
  it("fails closed when a soft-delete target no longer matches the authorized repository", async () => {
    const { prisma, store } = buildStore([]);
    prisma.memory.findFirst.mockResolvedValue(null);

    await expect(
      store.softDelete(
        { id, deletedBy: "api-key" },
        { orgId: "Org-A", repoId: "Repo-A" },
      ),
    ).resolves.toBe(false);

    expect(prisma.memory.findFirst).toHaveBeenCalledWith({
      where: {
        id,
        orgId: { equals: "Org-A", mode: "insensitive" },
        repoId: { equals: "Repo-A", mode: "insensitive" },
      },
    });
    expect(prisma.memory.updateMany).not.toHaveBeenCalled();
    expect(prisma.tombstone.upsert).not.toHaveBeenCalled();
  });

  it("fails closed when a restore target no longer matches the authorized repository", async () => {
    const { prisma, store } = buildStore([]);
    prisma.memory.findFirst.mockResolvedValue(null);

    await expect(
      store.restore(id, { orgId: "Org-A", repoId: "Repo-A" }),
    ).resolves.toBe(false);

    expect(prisma.memory.findFirst).toHaveBeenCalledWith({
      where: {
        id,
        status: "deleted",
        orgId: { equals: "Org-A", mode: "insensitive" },
        repoId: { equals: "Repo-A", mode: "insensitive" },
      },
    });
    expect(prisma.memory.updateMany).not.toHaveBeenCalled();
    expect(prisma.tombstone.deleteMany).not.toHaveBeenCalled();
  });

  it("soft-deletes a matching memory and creates its tombstone in one serializable transaction", async () => {
    const { prisma, store } = buildStore([]);
    prisma.memory.findFirst.mockResolvedValue(row);
    prisma.memory.updateMany.mockResolvedValue({ count: 1 });
    prisma.tombstone.updateMany.mockResolvedValue({ count: 0 });
    prisma.tombstone.create.mockResolvedValue({});

    await expect(
      store.softDelete(
        { id, deletedBy: "api-key" },
        { orgId: "Org-A", repoId: "Repo-A" },
      ),
    ).resolves.toBe(true);

    expect(prisma.memory.updateMany).toHaveBeenCalledWith({
      where: {
        id,
        orgId: { equals: "Org-A", mode: "insensitive" },
        repoId: { equals: "Repo-A", mode: "insensitive" },
        version: 1,
      },
      data: {
        status: "deleted",
        deletedAt: expect.any(Date),
        deletedBy: "api-key",
        version: { increment: 1 },
      },
    });
    expect(prisma.tombstone.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orgId: "org-a", repoId: "repo-a" }),
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "Serializable" },
    );
  });

  it("rolls back soft deletion when the memory ID has a tombstone in another scope", async () => {
    const { prisma, store } = buildStore([]);
    prisma.memory.findFirst.mockResolvedValue(row);
    prisma.memory.updateMany.mockResolvedValue({ count: 1 });
    prisma.tombstone.updateMany.mockResolvedValue({ count: 0 });
    prisma.tombstone.create.mockRejectedValue(new Error("Unique constraint"));

    await expect(
      store.softDelete(
        { id, deletedBy: "api-key" },
        { orgId: "Org-A", repoId: "Repo-A" },
      ),
    ).resolves.toBe(false);

    expect(prisma.tombstone.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          memoryId: id,
          orgId: { equals: "org-a", mode: "insensitive" },
          repoId: { equals: "repo-a", mode: "insensitive" },
        },
      }),
    );
    expect(prisma.tombstone.upsert).not.toHaveBeenCalled();
  });

  it("restores a matching memory and removes its tombstone in one serializable transaction", async () => {
    const { prisma, store } = buildStore([]);
    prisma.memory.findFirst.mockResolvedValue({ ...row, status: "deleted" });
    prisma.memory.updateMany.mockResolvedValue({ count: 1 });
    prisma.tombstone.findFirst.mockResolvedValue({ memoryId: id });
    prisma.tombstone.deleteMany.mockResolvedValue({ count: 1 });

    await expect(
      store.restore(id, { orgId: "Org-A", repoId: "Repo-A" }),
    ).resolves.toBe(true);

    expect(prisma.memory.updateMany).toHaveBeenCalledWith({
      where: {
        id,
        status: "deleted",
        orgId: { equals: "Org-A", mode: "insensitive" },
        repoId: { equals: "Repo-A", mode: "insensitive" },
        version: 1,
      },
      data: {
        status: "active",
        deletedAt: null,
        deletedBy: null,
        version: { increment: 1 },
      },
    });
    expect(prisma.tombstone.deleteMany).toHaveBeenCalledWith({
      where: {
        memoryId: id,
        orgId: { equals: "org-a", mode: "insensitive" },
        repoId: { equals: "repo-a", mode: "insensitive" },
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "Serializable" },
    );
  });

  it("keeps the authorized scope when applying a tombstone to an existing memory", async () => {
    const { store } = buildStore([]);
    const softDelete = vi.spyOn(store, "softDelete").mockResolvedValue(false);
    const tombstone = {
      id: "tombstone-id",
      memoryId: id,
      orgId: "org-a",
      repoId: "repo-a",
      deletedAt: new Date("2026-09-18T12:00:00.000Z"),
    };

    await expect(
      store.applyTombstone(tombstone, { orgId: "org-a", repoId: "repo-a" }),
    ).resolves.toBe(false);
    expect(softDelete).toHaveBeenCalledWith(
      { id, deletedBy: undefined },
      { orgId: "org-a", repoId: "repo-a" },
    );
  });

  it("rejects a tombstone payload outside the authorized scope", async () => {
    const { prisma, store } = buildStore([]);

    await expect(
      store.applyTombstone(
        {
          id: "tombstone-id",
          memoryId: id,
          orgId: "org-a",
          repoId: "repo-b",
          deletedAt: new Date("2026-09-18T12:00:00.000Z"),
        },
        { orgId: "org-a", repoId: "repo-a" },
      ),
    ).resolves.toBe(false);
    expect(prisma.memory.findUnique).not.toHaveBeenCalled();
  });

  it("does not overwrite an out-of-scope tombstone with the same memory ID", async () => {
    const { prisma, store } = buildStore([]);
    prisma.memory.findUnique.mockResolvedValue(null);
    prisma.tombstone.updateMany.mockResolvedValue({ count: 0 });
    prisma.tombstone.create.mockRejectedValue(new Error("Unique constraint"));

    await expect(
      store.applyTombstone(
        {
          id: "tombstone-id",
          memoryId: id,
          orgId: "org-a",
          repoId: "repo-a",
          deletedAt: new Date("2026-09-18T12:00:00.000Z"),
        },
        { orgId: "org-a", repoId: "repo-a" },
      ),
    ).resolves.toBe(false);

    expect(prisma.tombstone.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          memoryId: id,
          orgId: { equals: "org-a", mode: "insensitive" },
          repoId: { equals: "repo-a", mode: "insensitive" },
        },
      }),
    );
    expect(prisma.tombstone.upsert).not.toHaveBeenCalled();
  });
});
