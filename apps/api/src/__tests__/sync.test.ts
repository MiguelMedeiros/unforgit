import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { createAuthMiddleware } from "../middleware/auth.js";
import { syncRoutes } from "../routes/sync.js";

function buildStore() {
  return {
    applyTombstone: vi.fn(),
    getAllLinks: vi.fn(),
    getById: vi.fn(),
    getUnsyncedTombstones: vi.fn(),
    hardDelete: vi.fn(),
    list: vi.fn(),
    restore: vi.fn(),
    upsertFromLocal: vi.fn(),
    validateApiKey: vi.fn(),
  } as unknown as RemoteStore & {
    applyTombstone: ReturnType<typeof vi.fn>;
    getAllLinks: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    getUnsyncedTombstones: ReturnType<typeof vi.fn>;
    hardDelete: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
    upsertFromLocal: ReturnType<typeof vi.fn>;
    validateApiKey: ReturnType<typeof vi.fn>;
  };
}

async function buildSyncApp(store: RemoteStore) {
  const app = Fastify();
  await app.register(syncRoutes, { store });
  return app;
}

describe("sync routes", () => {
  it("rejects a missing push body before calling the store", async () => {
    const store = buildStore();
    const app = await buildSyncApp(store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/sync/push",
    });

    expect(response.statusCode).toBe(400);
    expect(store.upsertFromLocal).not.toHaveBeenCalled();

    await app.close();
  });

  it("rejects a missing tombstone body before calling the store", async () => {
    const store = buildStore();
    const app = await buildSyncApp(store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/sync/tombstones",
    });

    expect(response.statusCode).toBe(400);
    expect(store.applyTombstone).not.toHaveBeenCalled();

    await app.close();
  });

  it("does not let a repository-scoped API key hard-delete another repository's memory", async () => {
    const store = buildStore();
    store.validateApiKey.mockResolvedValue({
      id: "key-id",
      orgId: "org-a",
      repoId: "repo-a",
      name: "test-key",
    });
    store.getById.mockResolvedValue({
      id: "memory-id",
      orgId: "org-a",
      repoId: "repo-b",
    });
    store.hardDelete.mockResolvedValue(true);

    const app = Fastify();
    app.addHook("onRequest", createAuthMiddleware(store));
    await app.register(syncRoutes, { store });

    const response = await app.inject({
      method: "DELETE",
      url: "/v1/memory/memory-id",
      headers: { authorization: "Bearer valid-token" },
      payload: { hardDelete: true },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });
    expect(store.hardDelete).not.toHaveBeenCalled();

    await app.close();
  });

  it("does not let a repository-scoped API key tombstone another repository's memory", async () => {
    const store = buildStore();
    store.validateApiKey.mockResolvedValue({
      id: "key-id",
      orgId: "org-a",
      repoId: "repo-a",
      name: "test-key",
    });
    store.getById.mockResolvedValue({
      id: "memory-id",
      orgId: "org-a",
      repoId: "repo-b",
    });

    const app = Fastify();
    app.addHook("onRequest", createAuthMiddleware(store));
    await app.register(syncRoutes, { store });

    const response = await app.inject({
      method: "POST",
      url: "/v1/sync/tombstones",
      headers: { authorization: "Bearer valid-token" },
      payload: {
        memoryId: "memory-id",
        orgId: "org-a",
        repoId: "repo-a",
        deletedAt: new Date().toISOString(),
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });
    expect(store.applyTombstone).not.toHaveBeenCalled();

    await app.close();
  });

  it.each([
    ["/v1/sync/pull?orgId=org-a&repoId=repo-b", "list"],
    ["/v1/sync/tombstones?orgId=org-a&repoId=repo-b", "getUnsyncedTombstones"],
    ["/v1/sync/links?orgId=org-a&repoId=repo-b", "getAllLinks"],
  ] as const)(
    "does not let a repository-scoped API key read another repository via %s",
    async (url, storeMethod) => {
      const store = buildStore();
      store.validateApiKey.mockResolvedValue({
        id: "key-id",
        orgId: "org-a",
        repoId: "repo-a",
        name: "test-key",
      });
      const app = Fastify();
      app.addHook("onRequest", createAuthMiddleware(store));
      await app.register(syncRoutes, { store });

      const response = await app.inject({
        method: "GET",
        url,
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({ error: "Forbidden" });
      expect(store[storeMethod]).not.toHaveBeenCalled();

      await app.close();
    },
  );

  it.each([
    ["/v1/sync/push", "upsertFromLocal", { orgId: "org-a", repoId: "repo-b" }],
    [
      "/v1/sync/tombstones",
      "applyTombstone",
      { orgId: "org-a", repoId: "repo-b" },
    ],
  ] as const)(
    "does not let a repository-scoped API key write another repository via %s",
    async (url, storeMethod, payload) => {
      const store = buildStore();
      store.validateApiKey.mockResolvedValue({
        id: "key-id",
        orgId: "org-a",
        repoId: "repo-a",
        name: "test-key",
      });
      const app = Fastify();
      app.addHook("onRequest", createAuthMiddleware(store));
      await app.register(syncRoutes, { store });

      const response = await app.inject({
        method: "POST",
        url,
        headers: { authorization: "Bearer valid-token" },
        payload,
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({ error: "Forbidden" });
      expect(store[storeMethod]).not.toHaveBeenCalled();

      await app.close();
    },
  );

  it("does not let a repository-scoped API key restore another repository's memory", async () => {
    const store = buildStore();
    store.validateApiKey.mockResolvedValue({
      id: "key-id",
      orgId: "org-a",
      repoId: "repo-a",
      name: "test-key",
    });
    store.getById.mockResolvedValue({
      id: "memory-id",
      orgId: "org-a",
      repoId: "repo-b",
    });
    const app = Fastify();
    app.addHook("onRequest", createAuthMiddleware(store));
    await app.register(syncRoutes, { store });

    const response = await app.inject({
      method: "POST",
      url: "/v1/memory/memory-id/restore",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });
    expect(store.restore).not.toHaveBeenCalled();

    await app.close();
  });
});
