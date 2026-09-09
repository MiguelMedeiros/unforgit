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
    memory: {
      findUnique: vi.fn().mockResolvedValue(row),
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