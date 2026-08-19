import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { createAuthMiddleware } from "../middleware/auth.js";
import { curateRoutes } from "../routes/curate.js";

function buildStore() {
  return {
    validateApiKey: vi.fn().mockResolvedValue({
      id: "key-id",
      orgId: "org-a",
      repoId: "repo-a",
      name: "test-key",
    }),
    getById: vi.fn(),
    deprecate: vi.fn(),
    supersede: vi.fn(),
    pin: vi.fn(),
  } as unknown as RemoteStore & {
    getById: ReturnType<typeof vi.fn>;
    deprecate: ReturnType<typeof vi.fn>;
    supersede: ReturnType<typeof vi.fn>;
    pin: ReturnType<typeof vi.fn>;
  };
}

async function buildCurateApp(store: RemoteStore) {
  const app = Fastify();
  app.addHook("onRequest", createAuthMiddleware(store));
  await curateRoutes(app, store);
  return app;
}

describe("curate routes", () => {
  it.each([
    ["deprecate", "/v1/memory/memory-id/deprecate", "deprecate"],
    ["pin", "/v1/memory/memory-id/pin", "pin"],
  ] as const)(
    "does not let a repository-scoped API key %s another repository's memory",
    async (_operation, url, storeMethod) => {
      const store = buildStore();
      store.getById.mockResolvedValue({
        id: "memory-id",
        orgId: "org-a",
        repoId: "repo-b",
      });
      const app = await buildCurateApp(store);

      const response = await app.inject({
        method: "POST",
        url,
        headers: { authorization: "Bearer valid-token" },
        payload: {},
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({ error: "Forbidden" });
      expect(store[storeMethod]).not.toHaveBeenCalled();

      await app.close();
    },
  );

  it("does not let a repository-scoped API key supersede memories outside its repository", async () => {
    const store = buildStore();
    store.getById.mockImplementation(async (id: string) => ({
      id,
      orgId: "org-a",
      repoId: id === "old-id" ? "repo-a" : "repo-b",
    }));
    const app = await buildCurateApp(store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/memory/old-id/supersede",
      headers: { authorization: "Bearer valid-token" },
      payload: { newId: "new-id" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });
    expect(store.supersede).not.toHaveBeenCalled();

    await app.close();
  });

  it("does not let a repository-scoped API key reset another repository", async () => {
    const store = {
      validateApiKey: vi.fn().mockResolvedValue({
        id: "key-id",
        orgId: "org-a",
        repoId: "repo-a",
        name: "test-key",
      }),
      resetAll: vi.fn().mockResolvedValue({ memories: 1 }),
    } as unknown as RemoteStore;
    const app = Fastify();
    app.addHook("onRequest", createAuthMiddleware(store));
    await curateRoutes(app, store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/memories/reset",
      headers: { authorization: "Bearer valid-token" },
      payload: { orgId: "org-a", repoId: "repo-b" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });
    expect(store.resetAll).not.toHaveBeenCalled();

    const ownRepoResponse = await app.inject({
      method: "POST",
      url: "/v1/memories/reset",
      headers: { authorization: "Bearer valid-token" },
      payload: { orgId: "org-a", repoId: "repo-a" },
    });

    expect(ownRepoResponse.statusCode).toBe(200);
    expect(store.resetAll).toHaveBeenCalledOnce();
    expect(store.resetAll).toHaveBeenCalledWith("org-a", "repo-a");

    await app.close();
  });

  it("does not let a repository-scoped API key run lifecycle maintenance on another repository", async () => {
    const store = {
      validateApiKey: vi.fn().mockResolvedValue({
        id: "key-id",
        orgId: "org-a",
        repoId: "repo-a",
        name: "test-key",
      }),
      list: vi.fn(),
    } as unknown as RemoteStore;
    const app = Fastify();
    app.addHook("onRequest", createAuthMiddleware(store));
    await curateRoutes(app, store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/lifecycle/run",
      headers: { authorization: "Bearer valid-token" },
      payload: { orgId: "org-a", repoId: "repo-b", dryRun: false },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });
    expect(store.list).not.toHaveBeenCalled();

    await app.close();
  });
});
