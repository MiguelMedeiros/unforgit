import { describe, expect, it, vi } from "vitest";
import { RemoteStore } from "../remote.js";

function buildStore() {
  const transactionClient = {
    $queryRaw: vi.fn().mockResolvedValue([{ permission: "write" }]),
    apiKey: {
      create: vi.fn().mockResolvedValue({
        id: "key-id",
        key: "hk_generated",
        name: "user-key",
        label: null,
        orgId: "allowed-org",
        repoId: "allowed-repo",
        userId: "user-id",
      }),
    },
  };
  const prisma = {
    $transaction: vi.fn(async (operation: unknown) =>
      typeof operation === "function"
        ? (operation as (client: typeof transactionClient) => Promise<unknown>)(
            transactionClient,
          )
        : Promise.all(operation as Promise<unknown>[]),
    ),
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

  return { prisma, store, transactionClient };
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

  it.each(["read", "none"])(
    "deactivates write-capable API keys when repository access becomes %s",
    async (permission) => {
      const { prisma, store } = buildStore();

      await store.upsertRepoAccess({
        userId: "user-id",
        orgId: "Allowed-Org",
        repoId: "Allowed-Repo",
        permission,
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
    },
  );

  it("locks repository access while creating a user API key", async () => {
    const { store, transactionClient } = buildStore();

    await expect(
      store.createApiKeyForUserWithWriteAccess(
        "user-key",
        "Allowed-Org",
        "Allowed-Repo",
        "user-id",
        "user-id",
      ),
    ).resolves.toMatchObject({
      id: "key-id",
      orgId: "allowed-org",
      repoId: "allowed-repo",
    });

    expect(transactionClient.$queryRaw).toHaveBeenCalledOnce();
    expect(transactionClient.apiKey.create).toHaveBeenCalledOnce();
  });

  it("does not create a key when locked repository access is read-only", async () => {
    const { store, transactionClient } = buildStore();
    transactionClient.$queryRaw.mockResolvedValue([{ permission: "read" }]);

    await expect(
      store.createApiKeyForUserWithWriteAccess(
        "user-key",
        "Allowed-Org",
        "Allowed-Repo",
        "user-id",
        "user-id",
      ),
    ).resolves.toBeNull();

    expect(transactionClient.apiKey.create).not.toHaveBeenCalled();
  });
});
