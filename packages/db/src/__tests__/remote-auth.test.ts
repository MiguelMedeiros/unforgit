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
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    userRepoAccess: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "stale-access-id",
          userId: "user-id",
          orgId: "stale-org",
          repoId: "stale-repo",
          permission: "write",
          grantedBy: null,
        },
      ]),
      upsert: vi.fn().mockResolvedValue({
        id: "current-access-id",
        userId: "user-id",
        orgId: "allowed-org",
        repoId: "allowed-repo",
        permission: "write",
      }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
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
      create: vi.fn().mockResolvedValue({
        id: "key-id",
        key: "hk_generated",
        name: "repo-key",
        label: "automation",
        orgId: "allowed-org",
        repoId: "allowed-repo",
      }),
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
  it("persists normalized repository scope when creating an API key", async () => {
    const { prisma, store } = buildStore();

    await expect(
      store.createApiKey("repo-key", "Allowed-Org", {
        label: "automation",
        repoId: "Allowed-Repo",
      }),
    ).resolves.toMatchObject({
      orgId: "allowed-org",
      repoId: "allowed-repo",
    });

    expect(prisma.apiKey.create).toHaveBeenCalledWith({
      data: {
        key: expect.stringMatching(/^hk_[a-f0-9]{32}$/),
        name: "repo-key",
        orgId: "allowed-org",
        repoId: "allowed-repo",
        label: "automation",
      },
    });
  });

  it("preserves the legacy label argument for organization-wide API keys", async () => {
    const { prisma, store } = buildStore();
    prisma.apiKey.create.mockResolvedValueOnce({
      id: "key-id",
      key: "hk_generated",
      name: "organization-key",
      label: "automation",
      orgId: "allowed-org",
      repoId: null,
    });

    await expect(
      store.createApiKey("organization-key", "Allowed-Org", "automation"),
    ).resolves.toMatchObject({
      orgId: "allowed-org",
      repoId: null,
      label: "automation",
    });

    expect(prisma.apiKey.create).toHaveBeenCalledWith({
      data: {
        key: expect.stringMatching(/^hk_[a-f0-9]{32}$/),
        name: "organization-key",
        orgId: "allowed-org",
        repoId: null,
        label: "automation",
      },
    });
  });

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

  it("atomically replaces GitHub repository access and revokes stale keys", async () => {
    const { store, transactionClient } = buildStore();

    await store.syncUserRepoAccess("user-id", [
      {
        orgId: "Allowed-Org",
        repoId: "Allowed-Repo",
        permission: "write",
      },
    ]);

    expect(transactionClient.userRepoAccess.upsert).toHaveBeenCalledWith({
      where: {
        userId_orgId_repoId: {
          userId: "user-id",
          orgId: "allowed-org",
          repoId: "allowed-repo",
        },
      },
      create: {
        userId: "user-id",
        orgId: "allowed-org",
        repoId: "allowed-repo",
        permission: "write",
        grantedBy: null,
      },
      update: { permission: "write", grantedBy: null },
    });
    expect(transactionClient.apiKey.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-id",
        orgId: "stale-org",
        OR: [{ repoId: "stale-repo" }, { repoId: null }],
      },
      data: { isActive: false },
    });
    expect(transactionClient.userRepoAccess.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["stale-access-id"] },
      },
    });
    expect(transactionClient.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it("preserves manual administrator grants during a GitHub access refresh", async () => {
    const { store, transactionClient } = buildStore();
    transactionClient.userRepoAccess.findMany.mockResolvedValueOnce([
      {
        id: "manual-access-id",
        userId: "user-id",
        orgId: "allowed-org",
        repoId: "allowed-repo",
        permission: "admin",
        grantedBy: "admin-user-id",
      },
    ]);

    await store.syncUserRepoAccess("user-id", [
      {
        orgId: "Allowed-Org",
        repoId: "Allowed-Repo",
        permission: "read",
      },
    ]);

    expect(transactionClient.userRepoAccess.upsert).not.toHaveBeenCalled();
    expect(transactionClient.userRepoAccess.deleteMany).not.toHaveBeenCalled();
    expect(transactionClient.apiKey.updateMany).not.toHaveBeenCalled();
  });

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
