import { describe, expect, it, vi } from "vitest";
import { RemoteStore } from "../remote.js";

function buildStore() {
  const prisma = {
    $transaction: vi.fn(async (operations: unknown[]) => Promise.all(operations)),
    apiKey: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    user: {
      delete: vi.fn().mockResolvedValue({ id: "user-id" }),
    },
    userRepoAccess: {
      delete: vi.fn().mockResolvedValue({ id: "access-id" }),
      upsert: vi.fn().mockResolvedValue({
        id: "access-id",
        userId: "user-id",
        orgId: "allowed-org",
        repoId: "allowed-repo",
        permission: "read",
        grantedAt: new Date("2026-09-01T00:00:00.000Z"),
        grantedBy: null,
      }),
    },
  };
  const store = new RemoteStore("postgresql://localhost/unforgit");

  Object.defineProperty(store, "prisma", { value: prisma });

  return { prisma, store };
}

describe("RemoteStore user credential revocation", () => {
  it("deactivates a user's API keys when deleting the user", async () => {
    const { prisma, store } = buildStore();

    await expect(store.deleteUser("user-id")).resolves.toBe(true);

    expect(prisma.apiKey.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-id" },
      data: { isActive: false },
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: "user-id" } });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("deactivates scoped and org-wide API keys when revoking repository access", async () => {
    const { prisma, store } = buildStore();

    await expect(
      store.revokeRepoAccess("user-id", "Allowed-Org", "Allowed-Repo"),
    ).resolves.toBe(true);

    const accessScope = {
      userId: "user-id",
      orgId: "allowed-org",
      repoId: "allowed-repo",
    };
    expect(prisma.apiKey.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-id",
        orgId: "allowed-org",
        OR: [{ repoId: "allowed-repo" }, { repoId: null }],
      },
      data: { isActive: false },
    });
    expect(prisma.userRepoAccess.delete).toHaveBeenCalledWith({
      where: { userId_orgId_repoId: accessScope },
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("deactivates write-capable API keys when repository access becomes read-only", async () => {
    const { prisma, store } = buildStore();

    await store.upsertRepoAccess({
      userId: "user-id",
      orgId: "Allowed-Org",
      repoId: "Allowed-Repo",
      permission: "read",
    });

    expect(prisma.apiKey.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-id",
        orgId: "allowed-org",
        OR: [{ repoId: "allowed-repo" }, { repoId: null }],
      },
      data: { isActive: false },
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });
});
